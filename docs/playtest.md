# Playtest — protocole testeur

> Alpha fermée, 3 à 8 testeurs. Objectif : vérifier qu'une partie courte tient
> debout et relever ce qui bloque. Durée prévue : **15 minutes** par personne.

## Avant de commencer

- Lien de l'application : fourni avec votre accès (branche **preview**).
- Un navigateur de bureau récent (Chrome, Firefox, Edge, Safari). Pas de mobile pour l'instant.
- Un compte par personne — le mot de passe fait au moins 8 caractères.
- Gardez cet onglet ouvert : `https://github.com/Pamacea/aetheris/issues/new?template=bug_report.md`

## Parcours MJ (~15 min)

1. **Compte et campagne.** Créez un compte, puis sur le tableau de bord cliquez sur
   **Campagne de démonstration**. Ouvrez-la : un wiki de trois notes, un handout,
   une fiche et une scène VTT sont déjà là.
2. **Campagne personnelle.** Créez votre propre campagne et notez son **code
   d'invitation** (visible dans les réglages de la campagne).
3. **Table virtuelle.** Ouvrez l'onglet VTT :
   - outil **Tokens** : placez un jeton sur la grille ;
   - dans l'en-tête du jeton, changez les **PV**, les **PV max** et la **CA** ;
   - outil **Grille** : chargez une carte (URL `https://…`), réglez le type et la taille ;
   - outil **Brouillard** : révélez puis masquez une zone.
4. **Chat et dés.** Envoyez un message, puis tapez `/roll 1d20+5` et `/calc 2+3`.
   Le résultat doit apparaître dans le chat.

## Parcours joueur (~10 min)

1. Rejoignez la campagne du MJ avec son **code d'invitation**.
2. Ouvrez la table : vous devez voir les jetons et les messages du MJ.
3. Modifiez les PV de **votre** jeton : c'est possible. Les autres champs ne doivent
   pas être modifiables.
4. Lancez un jet et vérifiez qu'il apparaît aussi chez le MJ.

## Ce qu'on attend de vos retours

Pour chaque problème, notez : **ce que vous avez fait**, **ce que vous attendiez**,
**ce qui s'est passé**, le navigateur, et la **référence** affichée par la page
d'erreur s'il y en a une. Une issue par problème, même courte.

- **Bloquant** : impossible de continuer (connexion, création, table qui ne charge pas).
- **Gênant** : ça marche mais mal (perte de saisie, action qui sursaute).
- **Cosmétique** : texte, alignement, couleur.

## Limites connues — pas la peine de les signaler

- Pas de mot de passe oublié ni d'email de vérification : demandez un nouveau compte au
  référent en cas d'oubli.
- Les invitations se partagent par **code**, aucun email n'est envoyé.
- Une seule scène par campagne, pas d'export de campagne.
- Les macros sont stockées dans le navigateur : elles disparaissent en navigation privée.
- Le temps réel tourne sur une instance unique pendant l'alpha. Si un autre joueur ne
  voit pas votre mise à jour, rechargez la page ; si le problème persiste, signalez-le.

## Après la séance

Répondez au référent avec : le nombre de minutes jouées, ce qui a bloqué, et les liens
des issues ouvertes. C'est ce qui décidera de ce qu'on corrige avant l'ouverture.
