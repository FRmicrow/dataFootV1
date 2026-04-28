# US-484 — Validation & QA

**En tant que** Product Owner, **je veux** m'assurer que le système de résolution fonctionne parfaitement sur un gros volume de données **afin de** garantir l'intégrité de la plateforme.

## Skills requis
`[QA]` `[DATABASE]`

## Critères d'acceptation
- [ ] Une batterie de tests unitaires couvre les heuristiques de matching.
- [ ] Un rapport de QA confirme l'absence de doublons créés lors d'imports tests massifs.
- [ ] Les logs montrent clairement les décisions de résolution (Match exact, Heuristique, Création).

## Scénarios de test
1. **Stress Test** : Simuler l'import de 1000 joueurs avec des légères variations de noms (accents, ordres).
2. **Audit** : Vérifier que `v4.people` ne gonfle pas inutilement.

## Notes techniques
- Utiliser Vitest pour les tests unitaires.
