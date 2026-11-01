# Temps réel — arbitrage d'hébergement (Socket.IO)

> Constat arrêté le **2026-11-01**. Ce document prépare la décision : il ne choisit pas
> encore, il borne les options et leurs conséquences.

## Constat actuel

| Élément            | État                                                                        |
| ------------------ | --------------------------------------------------------------------------- |
| Client             | `transports: ["websocket"]` forcé (`apps/web/src/lib/ws.ts:20-25`)          |
| Route              | `/socket.io/(.*)` → service `server` (`vercel.json:22`)                     |
| Rooms              | `campaign:${id}` et `:gm`, en mémoire du process (`campaign.gateway.ts:65`) |
| Adaptateur         | aucun — pas de `@socket.io/redis-adapter`, pas de `useWebSocketAdapter`     |
| Broadcasts         | `server.in(room).fetchSockets()` : instance locale uniquement               |
| Durée de connexion | bornée par la durée maximale de la fonction Vercel (aucun `maxDuration`)    |

Sur Vercel, le service NestJS est déployé comme **fonction** : chaque connexion WebSocket
est épinglée à une instance et fermée à la fin de son invocation. Rien ne garantit que
deux joueurs d'une même campagne atteignent la même instance ; sans adaptateur, ils ne se
voient alors pas, **sans erreur visible**.

Depuis le correctif 7.3, un client ne reçoit plus l'écho de ses propres commits
(`scene:state` exclut l'émetteur), mais cela ne règle pas le partitionnement.

## Option A — Instance unique

Deux variantes, très différentes :

**A1. Héberger le service Nest hors Vercel, en process long-running** (Fly.io, Railway,
Render, VPS) sur **une seule instance**. Les rooms vivent dans le process, tous les
clients partagent le même état.

- Coût : ~5-10 $/mois pour la plus petite instance (à vérifier).
- Code : **aucun changement** ; seuls `NEXT_PUBLIC_WS_URL` (ou le rewrite) et le CORS
  changent de cible.
- Limite : pas de haute disponibilité ; un redéploiement coupe les connexions (le client
  se reconnecte et réémet `campaign:join`). C'est acceptable pour 3-8 testeurs.
- Le debounce de persistance (500 ms) et le sweep de révocations (30 s) restent fiables,
  car le process ne gèle pas.

**A2. Rester sur Vercel Services.** Il n'existe pas de réglage « une seule instance » ;
on ne peut qu'augmenter `maxDuration`. Le partitionnement entre instances demeure. À
écarter pour l'alpha.

## Option B — Adaptateur Redis

Ajouter `@socket.io/redis-adapter` + un Redis managé (Upstash, Redis Cloud) côté serveur :

- broadcast et `fetchSockets()` passent par Redis → fan-out entre instances ;
- rooms partagées, quelle que soit l'instance qui reçoit la connexion ;
- coût : +1 service managé, +2 dépendances, secrets supplémentaires ;
- le transport étant **websocket-only**, les sticky sessions ne sont pas nécessaires
  (pas de fallback polling) ;
- les états en mémoire (debounce de scène, sweep, cache d'adhésion) restent locaux : il
  faut soit les déplacer dans Redis, soit accepter qu'ils soient dupliqués par instance.
  Le debounce de persistance devient par exemple une écriture par instance.

## Critères de décision

| Critère                   | A1 — process unique | A2 — Vercel seul  | B — Redis           |
| ------------------------- | ------------------- | ----------------- | ------------------- |
| Correct pour 3-8 testeurs | oui                 | non               | oui                 |
| Changement de code        | nul                 | nul               | adaptateur + config |
| Services à exploiter      | 1                   | 0                 | 2                   |
| Passe à l'échelle         | non (1 instance)    | non (partitionné) | oui                 |
| Coupure au déploiement    | oui                 | oui               | non (rolling)       |

## Recommandation

**A1 pour l'alpha** : coût minimal, zéro code, comportement identique aux E2E locaux.
Passer à **B** quand l'alpha dépasse une instance ou exige de la disponibilité continue.
La variante A2 ne satisfait aucun critère et n'est pas retenue.

## À vérifier avant de trancher

1. Le fournisseur retenu garantit-il les WebSockets entrants et le keep-alive ?
2. Le domaine `NEXT_PUBLIC_WS_URL` doit-il être servi en HTTPS (WSS) derrière le proxy ?
3. Le cookie de session doit être disponible sur ce sous-domaine (CORS + credentials) —
   voir le correctif `__Secure-` de la 7.3.
