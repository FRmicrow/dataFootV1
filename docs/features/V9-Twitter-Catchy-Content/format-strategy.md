# V9 — Stratégie format × template (Twitter-first)

**Mission :** Pour chaque template du Studio, dire **quel aspect** privilégier sur quel canal et **pourquoi**. Aujourd'hui chaque template propose les 3 aspects sans guide — l'utilisateur exporte parfois en 9:16 ce qui est conçu pour 16:9.

---

## 1. Le principe directeur

> **Un template = 1 aspect "prime" + 1 ou 2 aspects "fallback".**
> Les autres aspects sont *masqués* dans le sélecteur ou marqués "non recommandé".

Ce n'est pas une question d'élégance, c'est de cohérence narrative : un scatter goals/xG en 9:16 perd la moitié de sa lisibilité ; un classement à 20 lignes en 1:1 oblige à des cellules de 30 px.

---

## 2. Matrice template × aspect

| Template | 9:16 (1080×1920) | 1:1 (1080×1080) | 16:9 (1920×1080) | Canal cible prime |
|---|---|---|---|---|
| **MatchPreviewCard** | ✅ prime | 🟡 fallback | ❌ trop horizontal | X carrousel + IG Story |
| **DuoComparison** | 🟡 ok (player vs player vertical) | ✅ prime (côte-à-côte naturel) | ✅ ok (côte-à-côte large) | X single image (16:9 ou 1:1) |
| **NarrativeGrid v2** | ✅ prime (vertical-strip) | ✅ ok (square-grid) | 🟡 horizontal-list | X single (16:9), IG / TikTok (9:16) |
| **PowerGrid** (classements) | ❌ ≤ 8 lignes | ✅ prime (groupes WC) | 🟡 ok (poule complète) | X single (1:1) |
| **RaceTracker** (course) | ❌ écrase l'axe X | 🟡 ok | ✅ prime (axe horizontal naturel) | X single (16:9) |
| **StatSupremacy** (big-stat) | ✅ prime (chiffre XL vertical) | ✅ prime (carré équilibré) | 🟡 ok | X carrousel + Reels |

**Légende :**
- ✅ prime → recommandé par défaut, qualité maximale.
- 🟡 fallback → utilisable, à valider visuellement.
- ❌ → désactiver dans le sélecteur ou afficher un avertissement.

---

## 3. Justifications par template

### MatchPreviewCard — prime 9:16
- Lecture verticale naturelle : logo home → vs → logo away → ML probas → form → kickoff.
- Sur Twitter, fonctionne **idéalement en carrousel** avec 4 cards (4 matchs du week-end).
- En 16:9, l'espace horizontal force à étirer les blocs et perd l'équilibre vertical.

### DuoComparison — prime 1:1
- Comparaison côte-à-côte : la moitié gauche (joueur A) et la moitié droite (joueur B) demandent égale surface.
- Le 1:1 préserve le centre comme pivot.
- 16:9 reste OK quand on ajoute un graphe central.

### NarrativeGrid v2 — prime 9:16 + 1:1 (selon usage)
- Voir `narrative-grid-v2.md` § 5 : 3 layouts dédiés.
- 9:16 = "récit de saison" (10 matchs en strip).
- 1:1 = "snapshot Twitter".
- 16:9 = format "site web" plus que tweet pur.

### PowerGrid — prime 1:1 (groupes WC) ou 16:9 (championnat 20 équipes)
- Pour un groupe à 4 équipes (WC), le carré est parfait.
- Pour un classement complet ligue à 20 lignes, 16:9 ou A4 portrait — le 9:16 oblige à miniaturiser.
- ⛔ Ne **pas** activer 9:16 par défaut tant qu'on a > 8 lignes.

### RaceTracker — prime 16:9
- L'axe temporel est horizontal par nature.
- Bar race ou course Excel → besoin de largeur.
- 9:16 force à empiler les pistes verticalement → ce n'est plus une "course".

### StatSupremacy — prime 9:16 ou 1:1
- Big-stat = chiffre XL au centre.
- 9:16 maximise la hauteur de typographie.
- 1:1 permet un encadrement carré net (style Squawka).
- 16:9 noie le chiffre dans du blanc à gauche/droite.

---

## 4. Implémentation côté Studio

### 4.1 Mécanisme actuel

Le hub `TemplatesPlayground` propose les 3 aspects pour tous les templates uniformément (cf. `useFitScale.js` + `tplpg-canvas--{aspect}` dans `TemplatesPlayground.css`). Aucune restriction.

### 4.2 Changement V9 (proposition)

Étendre `TemplateRegistry.js` avec un descripteur de support :

```js
// frontend/src/components/v3/modules/studio/templates/TemplateRegistry.js
export const REGISTRY = [
  {
    id: 'match-preview-card',
    component: MatchPreviewCard,
    name: 'Match Preview Card',
    aspectsSupported: {
      '9:16': 'prime',
      '1:1':  'fallback',
      '16:9': 'discouraged',  // grisé dans le sélecteur
    },
    primeAspect: '9:16',
  },
  // … autres templates avec leur descripteur
];
```

**Effet UI :**
- Le bouton d'aspect "discouraged" est visuellement atténué + tooltip "format non recommandé pour ce visuel".
- Un badge "Format prime" apparaît à côté du selectbox.
- À l'ouverture d'un template, le sélecteur d'aspect arrive sur `primeAspect`.

### 4.3 Effort

- Ajout du champ `aspectsSupported` à 6 templates : 0.5 j.
- UI Studio : restituer le badge prime + désactiver les aspects discouraged : 1 j.
- MAJ tests `TemplatesPlayground.test.jsx` : 0.5 j.

**Total :** ~2 j.

---

## 5. Règles "exporter ready"

Avant d'exporter un visuel pour Twitter :

1. ✅ Aspect = `primeAspect` du template (sinon avertir).
2. ✅ Si `aspectsSupported[aspect] === 'discouraged'`, afficher une modale de confirmation.
3. ✅ Dimensions de sortie alignées sur § 6 du `twitter-playbook.md` (ex : 16:9 = 1200×675 ou 1920×1080 puis downscale).
4. ✅ Le fichier exporté inclut un suffixe lisible : `match-preview_real-vs-atletico_2026-04-25.png`.

---

## 6. Récap décisionnel

```
Choisir un template → Studio propose primeAspect par défaut
                   → Sélecteur d'aspect montre "fallback" en couleur normale
                   → "discouraged" grisé + tooltip
                   → Export vérifie l'aspect, propose le canal cible (X / IG / TikTok)
```

---

## 7. Hors scope V9

- Auto-pré-vue multi-aspect côte-à-côte (V10).
- Suggestion automatique du canal cible selon l'aspect (V10).
- Auto-crop intelligent quand l'utilisateur force un aspect non-prime (V11+).
