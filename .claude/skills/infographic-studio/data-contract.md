# Data Contract — Anti-Hallucination Layer

Cette référence est **la plus importante** du skill. Elle décrit comment garantir que toute donnée affichée dans une infographie sort de la BDD ninetyXI et que tout manque est rendu visible.

---

## Principe absolu

> **Une infographie publiée sur X depuis ninetyXI engage la crédibilité du projet.**
>
> **Aucun chiffre, nom, score ou statistique ne doit jamais être inventé, deviné, mocké ou hardcodé dans le code livré.**

---

## Le Resolver Pattern

Toute génération d'infographie passe par un **resolver** qui transforme `(templateId, formValues)` en `{ resolved, missing }`.

### Contrat

```js
// backend/src/services/v4/InfographicResolverServiceV4.js

/**
 * @param {string} templateId  - ex: 'player-comparison'
 * @param {object} formValues  - inputs du formulaire (player_a_id, player_b_id, season, ...)
 * @returns {Promise<{ resolved: object, missing: Array<MissingField> }>}
 *
 * Garanties :
 * - resolved ne contient QUE des données issues de db.all/db.get (lecture v4.*)
 * - Chaque champ requis par le template qui n'a pas pu être résolu est listé dans missing[]
 * - Aucune valeur par défaut hardcodée (pas de `goals ?? 0`)
 * - Aucun fallback fictif (pas de "Joueur X" si name est NULL)
 */
async function resolve(templateId, formValues) { ... }
```

### Type `MissingField`

```ts
type MissingField = {
  fieldPath: string;       // ex: 'players[0].stats.xG'
  reason: string;          // 'no row in v4.season_player_stats for (player_id=123, season=2025)'
  humanLabel: string;      // 'xG manquant pour Mbappé sur saison 2025-26'
  severity: 'critical' | 'optional';  // critical = bloque l'export PNG sans confirmation
};
```

### Exemple concret — `player-comparison`

Template demande pour chaque joueur : `name`, `photo`, `club_logo`, `goals`, `assists`, `xG`, `minutes_played`.

```js
async function resolvePlayerComparison(formValues) {
  const validated = PlayerComparisonFormSchema.parse(formValues);
  const { player_a_id, player_b_id, season } = validated;

  const missing = [];
  const resolved = { players: [] };

  for (const [idx, playerId] of [player_a_id, player_b_id].entries()) {
    const person = await db.get(
      'SELECT id, first_name, last_name, photo_url FROM v4.people WHERE id = $1',
      [playerId]
    );

    if (!person) {
      // Erreur dure : le joueur n'existe pas. C'est une 404, pas un missing field.
      throw new Error(`Player ${playerId} not found in v4.people`);
    }

    const stats = await db.get(
      `SELECT goals, assists, xg, minutes_played
       FROM v4.season_player_stats
       WHERE player_id = $1 AND season = $2`,
      [playerId, season]
    );

    const player = {
      id: person.id,
      name: `${person.first_name} ${person.last_name}`,
      photo: person.photo_url,  // peut être NULL — détecté plus bas
      goals: stats?.goals,
      assists: stats?.assists,
      xG: stats?.xg,
      minutes_played: stats?.minutes_played,
    };

    // Détection des manques (ne PAS substituer de valeur)
    if (!person.photo_url) {
      missing.push({
        fieldPath: `players[${idx}].photo`,
        reason: `photo_url IS NULL in v4.people for id=${playerId}`,
        humanLabel: `Photo manquante pour ${player.name}`,
        severity: 'optional',  // on peut afficher l'infographie sans photo
      });
    }
    if (stats?.xg == null) {
      missing.push({
        fieldPath: `players[${idx}].xG`,
        reason: `xg IS NULL in v4.season_player_stats for player_id=${playerId}, season=${season}`,
        humanLabel: `xG non disponible pour ${player.name} (saison ${season})`,
        severity: 'critical',  // une compa xG sans xG = nope
      });
    }
    if (stats == null) {
      missing.push({
        fieldPath: `players[${idx}].stats`,
        reason: `no row in v4.season_player_stats for (player_id=${playerId}, season=${season})`,
        humanLabel: `Aucune stat de saison pour ${player.name} (saison ${season})`,
        severity: 'critical',
      });
    }

    resolved.players.push(player);
  }

  return { resolved, missing };
}
```

---

## Comment l'UI consomme `{ resolved, missing }`

### Côté preview

Le composant template reçoit en props `{ resolved, missing }`. Pour chaque champ, il vérifie si ce champ est dans `missing` :

```jsx
function PlayerCard({ player, missingFields }) {
  const isMissing = (path) => missingFields.some(m => m.fieldPath === path);

  return (
    <div className="ds-card">
      {player.photo
        ? <img src={player.photo} alt={player.name} />
        : <MissingDataBadge label="Photo" severity="optional" />}

      <h3>{player.name}</h3>

      <div className="stat">
        <span>Buts</span>
        {player.goals != null
          ? <span>{player.goals}</span>
          : <MissingDataBadge label="Buts" severity="critical" />}
      </div>

      <div className="stat">
        <span>xG</span>
        {player.xG != null
          ? <span>{player.xG.toFixed(2)}</span>
          : <MissingDataBadge label="xG" severity="critical" />}
      </div>
    </div>
  );
}
```

### Côté export PNG

Avant de lancer Puppeteer, le contrôleur `InfographicExportControllerV4` :

1. Appelle le resolver
2. Si `missing` contient au moins un `severity: 'critical'` ET la requête ne contient pas `confirmIncomplete: true` → renvoie `400 { success: false, error: 'critical_data_missing', missing: [...] }`
3. Sinon, lance Puppeteer

L'utilisateur voit dans l'UI la liste des manques avant de cliquer "Exporter quand même".

---

## Patterns interdits

### ❌ Fallback hardcodé

```js
// JAMAIS
const goals = stats?.goals ?? 0;
const name = person.last_name ?? 'Joueur inconnu';
const photo = person.photo_url || '/static/default-player.png';  // sauf si la DS impose un placeholder explicite
```

### ❌ Valeur "raisonnable" inventée pour un dev

```js
// JAMAIS — même temporairement
const xG = stats.xg ?? Math.random() * 20;  // pour "voir comment ça rend"
```

### ❌ Mock dans le code livré

```js
// JAMAIS dans backend/src/ ou frontend/src/
const MOCK_MBAPPE = { name: 'Kylian Mbappé', goals: 31, xG: 28.4 };
```

`vi.mock()` est autorisé **uniquement** dans `*.test.js`. Aucun seed, aucun mock dans le code de production.

### ❌ Affichage silencieux

```jsx
// JAMAIS — masquer un manque, c'est mentir au lecteur
{player.xG && <span>xG: {player.xG}</span>}  // si xG manque, on n'affiche rien → l'utilisateur croit que c'est zéro
```

✅ Toujours rendre le manque visible (`<MissingDataBadge />`).

---

## UX du manque de donnée

### `<MissingDataBadge />` — composant DS

À créer dans `frontend/src/design-system/components/MissingDataBadge.jsx` (vérifier d'abord qu'il n'existe pas déjà).

Variants :
- `severity='critical'` → badge rouge, icône ⚠, texte "Donnée requise : [label]"
- `severity='optional'` → badge gris, icône ℹ, texte "Optionnel : [label] non disponible"

Utilisation :
```jsx
<MissingDataBadge label="xG saison 2025-26" severity="critical" />
```

### Banner global de manques

En haut de la preview, si `missing.length > 0`, afficher un banner récapitulatif :

```
⚠ 3 données manquantes : xG (Mbappé), photo (Haaland), assists (Haaland)
   → ces manques apparaîtront dans l'export PNG.
   [Exporter quand même] [Annuler]
```

---

## Checklist de revue de code (resolver)

Avant de merger un resolver, vérifier :

- [ ] Aucun `??` qui pose une valeur par défaut (sauf pour des params optionnels du formulaire eux-mêmes)
- [ ] Aucun `||` qui remplace `null/undefined/0/""` par une valeur
- [ ] Toutes les requêtes SQL sont parameterized (`$1`, `$2`)
- [ ] Toutes les requêtes lisent `v4.*` exclusivement (pas de `v3.*` sauf dépendance documentée)
- [ ] Le resolver ne fait **aucun** `INSERT`, `UPDATE`, `DELETE`
- [ ] Chaque champ critique du template est soit dans `resolved`, soit dans `missing`
- [ ] Les `humanLabel` sont en français et lisibles (pas de stack SQL)
- [ ] Test unitaire : un cas où `stats IS NULL` produit un `missing[]` non vide
- [ ] Test unitaire : un cas avec données complètes produit `missing.length === 0`

---

## Synthèse

| Situation | Comportement attendu |
|-----------|---------------------|
| Donnée présente en DB | Affichée telle quelle |
| Donnée manquante (NULL) | `<MissingDataBadge />` rendu, ajouté à `missing[]` |
| Entité inexistante (player_id invalide) | 404 `{ success: false, error }` — pas un missing |
| Donnée corrompue (type incohérent) | Erreur dure dans le resolver — log + 500 |
| Champ optionnel manquant | Badge `severity='optional'`, export autorisé |
| Champ critique manquant | Badge `severity='critical'`, export bloqué sauf `confirmIncomplete: true` |
