# Trends Scraper — X.com Football

Pipeline de scraping des trends football sur X.com (anciennement Twitter). Pattern à 3 scripts : scraper Python (Playwright, sans DB), writer Node (DB uniquement), orchestrateur Python (enchaîne et vérifie l'atomicité).

---

## Pourquoi un scraper et pas l'API X

L'utilisateur a explicitement choisi le scraping (gratuit, fragile, contrôlé) plutôt que l'API X officielle (payante, fiable). Ce choix est **assumé** : les CGU X interdisent strictement le scraping automatisé à grande échelle. **Cadence basse obligatoire** (1 run/heure max, fenêtres aléatoires).

---

## Architecture (3 scripts)

```
.claude/skills/infographic-studio/scripts/
├── run-trends-scraper.py      # orchestrateur (enchaîne scrape + write + verify)
├── scrape-x-trends.py         # Playwright → JSON sur stdout
├── update-x-trends.js         # JSON sur stdin → DB
└── verify-trends-run.py       # rapport d'état
```

**Flux** :
1. `verify-trends-run.py` rapporte combien de trends ont été capturés dans les dernières 24h
2. `scrape-x-trends.py` ouvre `https://x.com/explore/tabs/sports`, attend le rendu, extrait la liste, dump JSON sur stdout
3. `update-x-trends.js` lit stdin, valide via Zod, upsert dans `v4.x_trends` avec dedup business key `(trend_label, captured_at::date)`
4. Ré-exécution de `verify-trends-run.py` pour confirmer

---

## Source de données

URL cible : `https://x.com/explore/tabs/sports`

Sélecteurs DOM (à confirmer en exploration manuelle — ces sélecteurs changent souvent côté X) :

```python
TREND_CONTAINER_SELECTOR = '[data-testid="trend"]'
TREND_LABEL_SELECTOR = 'div[dir="ltr"] span'
TREND_POSTCOUNT_SELECTOR = 'div:has(> span:contains("posts"))'  # exemple
```

**Important** : ces sélecteurs sont fragiles et **doivent être documentés et testés** avant chaque run. Le script `scrape-x-trends.py` doit logger les sélecteurs utilisés et lever une erreur claire si la structure DOM change.

---

## Format JSON intermédiaire

```json
{
  "captured_at": "2026-04-26T14:32:00Z",
  "source_url": "https://x.com/explore/tabs/sports",
  "trends": [
    {
      "rank_position": 1,
      "trend_label": "Mbappé",
      "trend_type": "topic",
      "post_count": 142000
    },
    {
      "rank_position": 2,
      "trend_label": "#ElClasico",
      "trend_type": "hashtag",
      "post_count": null
    }
  ]
}
```

`trend_type` est inféré côté Python :
- Commence par `#` → `hashtag`
- Match un nom dans `v4.matches` proches (ex: "Real Madrid - Barcelona") → `event`
- Sinon → `topic`

---

## Validation Zod (writer Node)

```js
// .claude/skills/infographic-studio/scripts/update-x-trends.js
import { z } from 'zod';

const TrendSchema = z.object({
  rank_position: z.number().int().min(1).max(50),
  trend_label: z.string().min(1).max(280),
  trend_type: z.enum(['hashtag', 'topic', 'event']),
  post_count: z.number().int().nonnegative().nullable(),
});

const PayloadSchema = z.object({
  captured_at: z.string().datetime(),
  source_url: z.string().url(),
  trends: z.array(TrendSchema).min(1).max(50),
});
```

---

## Insertion DB — pattern Upsert

Suivre `data-ingestion-standards.md`. Pseudo-code :

```js
async function upsertTrends(payload) {
  const validated = PayloadSchema.parse(payload);
  const client = await db.pool.connect();

  try {
    await client.query('BEGIN');
    let inserted = 0, updated = 0;

    for (const trend of validated.trends) {
      // business key : (trend_label, captured_at::date)
      const existing = await client.query(
        `SELECT id FROM v4.x_trends
         WHERE trend_label = $1 AND captured_at::date = $2::date`,
        [trend.trend_label, validated.captured_at]
      );

      if (existing.rows.length > 0) {
        await client.query(
          `UPDATE v4.x_trends
           SET rank_position = $1, post_count = $2, raw_payload = $3, captured_at = $4
           WHERE id = $5`,
          [trend.rank_position, trend.post_count, trend, validated.captured_at, existing.rows[0].id]
        );
        updated++;
      } else {
        await client.query(
          `INSERT INTO v4.x_trends (trend_label, trend_type, rank_position, post_count, captured_at, source_url, raw_payload)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [trend.trend_label, trend.trend_type, trend.rank_position, trend.post_count, validated.captured_at, validated.source_url, trend]
        );
        inserted++;
      }
    }

    await client.query('COMMIT');
    logger.info({ inserted, updated, total: validated.trends.length }, 'X trends upserted');
    return { inserted, updated, skipped: 0, errors: 0 };
  } catch (err) {
    await client.query('ROLLBACK');
    logger.error({ err }, 'X trends upsert failed — rollback');
    throw err;
  } finally {
    client.release();
  }
}
```

---

## Orchestrateur — `run-trends-scraper.py`

Options :

| Option | Défaut | Description |
|--------|--------|-------------|
| `--dry-run` | off | Aucune écriture DB |
| `--max-retries=N` | `2` | Nombre de tentatives en cas d'échec scraping |
| `--output=PATH` | stdout | Sauvegarder le JSON intermédiaire |
| `--user-agent=STR` | (pool) | Force un user-agent |
| `--headful` | off | Pour debug — Playwright en mode visible |

**Self-healing** : avant chaque run, supprimer les lignes `v4.x_trends` du jour avec `rank_position IS NULL` (artefact d'un scrape partiel qui a dépassé le timeout).

---

## Cadence et anti-banissement

- **1 run / heure maximum** (cron Docker — service `statfoot-scheduler` à ajouter)
- Jitter aléatoire de ±10 minutes pour éviter un pattern régulier
- Pool de user-agents (5 navigateurs récents, rotation aléatoire)
- En cas d'erreur 429/403 répétée : circuit breaker — pause 6h
- **Ne JAMAIS** lancer en parallèle plusieurs instances du scraper

---

## Tests (qa-automation)

- **Unit** : `update-x-trends.js` mocké avec un payload connu → vérifier que l'INSERT/UPDATE est correct
- **Unit** : payload invalide (Zod fail) → vérifier rejection
- **Integration** : run dry-run sur DB de test, vérifier que `v4.x_trends` n'a pas été touchée
- **Test fragilité** : un test "canary" qui échoue si le DOM X.com change — log clair pour alerter manuellement

---

## Limitations assumées

- Si X.com ajoute un capcha, le scraper s'arrête et logge un WARN. Pas de bypass automatique (interdit par les CGU).
- Si X exige un login pour `/explore/tabs/sports`, ce skill ne peut pas continuer en l'état. À ce moment-là, escalader à l'utilisateur pour décider entre :
  - Passer à l'API X officielle (changement de scope)
  - Utiliser une session authentifiée headful (risqué, ban du compte)
  - Abandonner l'auto-suggestion par trends et garder seulement les templates manuels

---

## Surveillance

`verify-trends-run.py` produit un rapport :

```
[trends-scraper] État DB v4.x_trends
  Lignes capturées dans les dernières 24h : 47
  Dernier run réussi : 2026-04-26T13:32:18Z (il y a 1h00)
  Top trend actuel : "Mbappé" (rang 1, 142k posts)
  Trends sans match BDD identifié : 12 / 47
```

Ce rapport est appelé en début et fin de chaque run par l'orchestrateur, et accessible standalone pour debug.
