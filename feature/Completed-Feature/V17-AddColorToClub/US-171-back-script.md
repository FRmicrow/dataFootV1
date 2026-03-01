# US-171 : Script d'extraction automatique des couleurs des logos

**En tant que** Backend Engineer
**Je veux** créer un script capable d'extraire les couleurs dominantes d'un logo à partir d'une URL
**Afin de** peupler automatiquement la base de données sans intervention manuelle.

## Tâches
- [ ] Installer la dépendance `colorthief` dans le backend.
- [ ] Créer le script `backend/scripts/v3/extractClubColors.js`.
- [ ] Implémenter la logique de téléchargement temporaire de l'image (via axios).
- [ ] Utiliser `colorthief` pour obtenir la palette de 3 couleurs.
- [ ] Convertir les valeurs RGB en Hexadécimal.
- [ ] Mettre à jour les enregistrements dans la table `V3_Teams`.

## Exigences
- Le script doit pouvoir être lancé avec une limite (ex: `--limit 10`) pour les tests.
- La couleur primaire doit être la plus représentée sur le logo.
- Gestion des erreurs si l'image est inaccessible ou malformée.

## Critères d'acceptation
- Le script s'exécute sans erreur.
- Après exécution, les colonnes de couleur des clubs traités sont remplies avec des codes Hex valides.
