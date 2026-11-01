# Stockage des images — Vercel Blob

> Décision arrêtée le **2026-11-01**. Les tarifs ci-dessous sont ceux constatés à cette
> date et **susceptibles d'évoluer** : vérifier la grille officielle Vercel avant tout
> dimensionnement.

## Décision

Les images uploadées (couvertures, illustrations, handouts, portraits) sont stockées dans
**Vercel Blob**, via `@vercel/blob@^2.8.2` déjà installé dans `apps/web`.

Pourquoi ce choix :

- **Service natif du déploiement** : Aetheris tourne sur Vercel Services ; Blob est
  provisionné et facturé dans le même projet, sans compte tiers ni clé séparée.
- **URLs publiques servies par CDN** : aucune route de proxy d'images à maintenir.
- **Aucun serveur à exploiter** : pas de bucket, de CORS ni de signature à gérer.

## Limites et coûts

| Offre | Stockage        | Transfert             | Opérations simples | Opérations avancées (dont uploads) |
| ----- | --------------- | --------------------- | ------------------ | ---------------------------------- |
| Hobby | 1 Go            | 10 Go/mois            | 10 000/mois        | 2 000/mois                         |
| Pro   | 0,023 $/Go-mois | à partir de 0,05 $/Go | 0,40 $/million     | 5 $/million                        |

En Hobby, l'accès est **coupé** au-delà des quotas : stockage plein ou opérations
épuisées rendent les images indisponibles jusqu'au mois suivant. Les limites applicatives
(200 Mo et 500 fichiers par utilisateur) bornent la consommation avant cette coupure.

## Architecture

```txt
navigateur
  │  multipart/form-data
  ▼
POST /api/uploads       session obligatoire + validation MIME / taille / quota
  │  @vercel/blob put()
  ▼
Vercel Blob             clé aléatoire u/<userId>/<usage>/<uuid>.<ext>
  │  URL publique renvoyée
  ▼
base de données         seule l'URL est conservée, lecture directe depuis le CDN
```

## Sécurité

- **MIME sniffé côté serveur** (le `Content-Type` client ne fait pas foi) : allowlist PNG,
  JPEG, WebP, GIF ; **SVG refusé** (scripts embarqués = XSS).
- **8 Mo maximum** par fichier, **quota 200 Mo / 500 fichiers** par utilisateur.
- **Nom aléatoire** `u/<userId>/<usage>/<uuid>.<ext>` ; le nom d'origine n'est jamais conservé.
- **URL http(s) uniquement** pour les nouveaux uploads et les champs externes ;
  `javascript:`, `data:` et consorts sont rejetés. Les anciennes couvertures `data:image`
  restent lisibles côté serveur pour compatibilité (`isValidCoverImage`), mais ne peuvent
  plus être créées par le nouvel upload.
- **Le secret reste côté serveur** : jamais exposé au navigateur (pas de préfixe `NEXT_PUBLIC_`).

## État déployé

| Élément             | Valeur                                              |
| ------------------- | --------------------------------------------------- |
| Store               | `aetheris-blob` (`store_jTTswl1CarB52twA`)          |
| Région              | `fra1` (Francfort)                                  |
| Accès               | public — les URL sont servies par le CDN Vercel     |
| Environnements liés | Production, Preview                                 |
| Développement local | token lecture/écriture dans le `.env` (non commité) |

Créé le **2026-11-01** avec :

```bash
vercel blob create-store aetheris-blob --access public --region fra1 \
  --environment production --environment preview --yes
```

L'environnement `development` de Vercel n'est **pas** connecté au store : l'OIDC seul ne
suffit donc pas en local (`OIDC is enabled for this project, but not for the "development"
environment`). Pour passer à l'OIDC plus tard : connecter le store à Development dans le
dashboard Vercel, puis `vercel env pull`.

## Configuration

1. Créer le store (voir ci-dessus) : il injecte `BLOB_READ_WRITE_TOKEN` dans les
   environnements choisis.
2. En local, placer un token lecture/écriture dans le `.env` racine (jamais commité).
   `vercel env pull --environment=preview` fournit la valeur quand le dashboard refuse
   de l'afficher.
3. En local **sans** token exploitable, l'API `POST /api/uploads` répond **503** avec un
   message explicite et l'UI propose de coller une URL `http(s)` existante. Un token
   présent mais refusé par Vercel produit le même 503, jamais un 500 sans corps.

## Alternative : Cloudflare R2

À envisager si le volume dépasse largement l'offre Pro, si l'egress devient le poste
dominant (R2 : 10 Go gratuits, egress gratuit), ou en cas de sortie de Vercel.

Ce qu'il faudrait changer, **non implémenté aujourd'hui** :

- remplacer `@vercel/blob` par un client S3 (`@aws-sdk/client-s3`) ;
- réécrire la route d'upload (PUT signé ou proxy) ;
- configurer le CORS du bucket et la signature des requêtes ;
- adapter la suppression et l'exploitation (console R2 au lieu du dashboard Vercel).

## Exploitation

- **Rotation du token** : créer un nouveau token, remplacer la variable, redéployer, révoquer l'ancien.
- **Blob orphelin** : supprimer via le dashboard Vercel (Storage → Blob) ou `del()` de
  `@vercel/blob`, après avoir vérifié qu'aucune ligne en base ne référence l'URL.
- **Blobs des tests E2E** : quand un token est configuré, `e2e/onboarding.spec.ts` envoie
  un PNG de 12 octets à chaque exécution (préfixe `u/<userId>/cover/`).
  `cleanup-e2e.mjs` ne supprime que les lignes en base : les blobs restent et se
  suppriment avec `vercel blob delete` / le dashboard, sous le quota de 1 Go (Hobby).
- **Quota** : suivre l'usage dans Vercel (Usage) ; alerter bien avant 1 Go en Hobby et
  surveiller les réponses 503 (token absent) et les refus de quota.
