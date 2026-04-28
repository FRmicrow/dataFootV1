---
name: data-visualization
description: "Créer des graphiques et visualisations. Utiliser quand on implémente Recharts ou D3 dans le frontend."
risk: none
---

## When to use
Utilisez cette compétence pour afficher des statistiques, des tendances ou des comparaisons dans l’interface, par exemple dans un tableau de bord.

## Instructions
1. Déterminez le type de graphique adapté aux données (barres, lignes, secteurs, heatmap).
2. Sélectionnez une bibliothèque de visualisation compatible avec votre stack (Chart.js, Recharts) et installez-la.
3. Préparez les données en fonction du format attendu (listes de points, objets clés/valeurs).
4. Ajoutez des titres, légendes et annotations pour faciliter la compréhension.
5. Veillez à l’accessibilité (contraste des couleurs, étiquettes) et à la responsivité sur différents écrans.

## Example
Pour un graphique de ventes mensuelles, structurez les données sous forme de tableau `[ { mois: 'Janvier', ventes: 5000 }, ... ]`, puis passez-le à un composant `<LineChart>` en spécifiant les clés `x` et `y`.

## Limitations
Cette compétence se limite à la représentation visuelle. Les analyses statistiques ou les agrégations doivent être réalisées au préalable (backend ou service analytique).