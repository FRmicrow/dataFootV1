# US-222 : Polissage UI et Micro-interactions

**Rôle :** En tant qu'utilisateur du Hub StatFoot
**Objectif :** Ajouter des interactions subtiles et renforcer l'aspect premium
**Bénéfice :** Créer une "Wow experience" et rendre l'interface plus vivante (alive)

## Tâches
- [ ] Ajouter un effet de "glow" (lueur) progressif au survol des `Card` et `MetricCard`
- [ ] Implémenter des transitions de fondu (`AnimatePresence` de Framer Motion ou simple CSS transiton) pour les changements d'onglets
- [ ] Raffiner les espacements et la typographie sur la Dashboard
- [ ] Ajouter des tooltips personnalisés si nécessaire
- [ ] Optimiser les feedbacks visuels (états `:active`, `:focus`)

## Exigences
- Utiliser la variable `--glow-primary` pour les effets de lueur
- Les animations ne doivent pas ralentir l'utilisateur (rapides et fluides)
- Maintenir une cohérence stricte avec les `tokens.css`

## Critères d'Acceptation
- Le survol des éléments interactifs donne un retour visuel satisfaisant
- Le changement d'onglet est fluide, sans coupure nette
- L'interface se sent plus "réactive" et "premium" dès le premier coup d'œil
