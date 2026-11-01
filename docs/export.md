# Export — périmètre

Aetheris propose deux exports complémentaires.

## 1. Export d'un roman (impression / PDF)

- Déclencheur : bouton **Export** sur la page d'un roman (`/novels/[id]`), ou URL directe
  `/novels/[id]/print`.
- Contenu : page de titre, synopsis et chapitres rendus en HTML imprimable. Le PDF est
  produit par le navigateur (impression), pas par le serveur.
- Droits : l'auteur et les collaborateurs voient tous les chapitres ; un lecteur
  anonyme ne voit que les chapitres publiés d'un roman publié.

## 2. Archive auteur (ZIP JSON)

- Déclencheur : bouton **Exporter mes romans** sur `/novels` (utilisateur connecté),
  route `GET /novels/export`.
- Périmètre : **uniquement les romans où `authorId` est l'utilisateur connecté**.
  Les romans dont il est simple collaborateur ne sont jamais inclus.
- Fichier : `aetheris-romans-AAAA-MM-JJ.zip` (téléchargement, 401 si non connecté).
- Contenu :
  - `lisez-moi.txt` — description du format et du périmètre ;
  - un `NN-titre.json` par roman, dans l'ordre de la liste (limite 200 romans) ;
  - chaque JSON contient titre, synopsis, statut, genre, tags, dates, `coverImage`
    (URL ou data-url) et les chapitres triés par `position`.
  - chaque chapitre contient ses métadonnées, `content` (document TipTap/ProseMirror
    brut) et `text` (texte brut extrait pour lecture).

## Exclusions

- Aucune image binaire (couverture comprise) n'est téléchargée : `coverImage` reste une
  référence textuelle.
- Liens de partage, collaborateurs, rôles et historique des versions ne sont pas exportés.
- L'archive est une sauvegarde de lecture/réimportation, pas un format d'échange
  garanti entre versions : le champ `version` du JSON permet de refuser un format futur.

## Limites

- 200 romans maximum par archive (les plus récemment modifiés).
- L'archive est générée en mémoire : un très gros corpus peut être lent ou lourd.
- Le ZIP n'est pas chiffré ; il contient l'intégralité du texte des romans exportés.
