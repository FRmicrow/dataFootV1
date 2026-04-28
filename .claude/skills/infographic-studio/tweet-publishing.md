# Tweet Publishing — Brouillons + Publication Manuelle

Système de gestion des brouillons de tweets avec leurs visuels associés. **Publication 100% manuelle** côté utilisateur (pas d'API X write, pas de cron de publication).

---

## Choix d'archi (validé)

> Brouillons stockés en DB, publication 100% manuelle depuis l'UI.

L'utilisateur :
1. Génère une infographie → exporte le PNG
2. Crée un brouillon de tweet (texte + PNG attaché + date prévue indicative)
3. Quand il est prêt à publier : clique "Ouvrir dans X" dans l'UI → ouverture du **web intent** X.com avec le texte préremplit + le PNG téléchargé
4. Sur X, l'utilisateur attache manuellement le PNG (téléchargé) et publie
5. De retour dans l'UI, l'utilisateur clique "Marquer comme publié" → statut → `posted`

**Aucune API X côté écriture n'est appelée.** Aucun cron ne publie. Le "scheduled_for" est une intention pour le tableau de bord, pas un trigger automatique.

---

## Modèle de données

Voir `architecture.md` pour le schéma SQL complet de `v4.scheduled_tweets`.

Statuts :

| Statut | Sémantique | Transition |
|--------|------------|------------|
| `draft` | Brouillon en cours d'édition | → `scheduled` (l'utilisateur fixe une date) ou `cancelled` |
| `scheduled` | Programmé (date indicative dans le futur) | → `posted` (clic manuel) ou `draft` (édition) ou `cancelled` |
| `posted` | Publié sur X (déclaré par l'utilisateur) | terminal |
| `cancelled` | Soft-delete | terminal |

Note : `scheduled` n'implique **aucune** publication automatique. C'est juste un libellé pour s'organiser.

---

## UI — `TweetDraftPanelV4`

Panneau dans la page `/studio/infographics`, colonne droite. 3 onglets :

| Onglet | Filtre | Tri |
|--------|--------|-----|
| Brouillons | `status = 'draft'` | `updated_at DESC` |
| Programmés | `status = 'scheduled'` | `scheduled_for ASC` |
| Publiés | `status = 'posted'` | `posted_at DESC` (limite 30 derniers) |

### Carte d'un brouillon

```
┌──────────────────────────────────────────┐
│ [thumbnail PNG 200×112]                  │
│                                          │
│ Mbappé vs Haaland — saison 2025-26       │
│ "Qui domine vraiment cette saison ? 🤔"  │
│                                          │
│ Template: player-comparison              │
│ Style: dark-observatory                  │
│                                          │
│ [📅 Programmer] [✏️ Éditer] [📤 Publier] │
│ [🗑 Annuler]                              │
└──────────────────────────────────────────┘
```

Actions :

- **📅 Programmer** : ouvre un date-picker, fixe `scheduled_for` et passe `status='scheduled'`
- **✏️ Éditer** : rouvre le formulaire avec les `form_values` du brouillon
- **📤 Publier** : ouvre un modal "Publier sur X" (voir ci-dessous)
- **🗑 Annuler** : passe à `cancelled` (soft-delete, restaurable depuis un onglet "corbeille")

---

## Publication manuelle — Web Intent X.com

L'utilisateur clique "📤 Publier" → modal :

```
┌──────────────────────────────────────────┐
│  Publier sur X                            │
│                                           │
│  ⚠ La publication sur X est manuelle.     │
│     ninetyXI ne publie pas pour toi.      │
│                                           │
│  Étapes :                                 │
│   1. [ Télécharger le PNG ] ← bouton 1    │
│   2. [ Ouvrir dans X ]      ← bouton 2    │
│   3. Sur X, attache le PNG téléchargé,   │
│      relis le texte, et publie.           │
│   4. Reviens ici et clique               │
│      "✅ J'ai publié" ci-dessous.          │
│                                           │
│  [ ✅ J'ai publié ]                       │
└──────────────────────────────────────────┘
```

### Bouton 1 — Télécharger le PNG

Lien direct vers `GET /api/v4/studio/tweets/:id/png` avec header `Content-Disposition: attachment; filename="ninetyxi-<id>.png"`.

### Bouton 2 — Ouvrir dans X

Construire l'URL du web intent :

```js
const intentUrl = new URL('https://x.com/intent/post');
intentUrl.searchParams.set('text', draft.tweet_text);
window.open(intentUrl.toString(), '_blank', 'noopener,noreferrer');
```

⚠️ **Limite connue** du web intent X.com : il ne supporte pas l'attachement automatique d'image. L'utilisateur doit attacher le PNG manuellement après ouverture (étape 3 du modal). C'est explicitement annoncé dans l'UI pour pas de surprise.

### "✅ J'ai publié"

Appelle `POST /api/v4/studio/tweets/:id/mark-posted` → `posted_at = NOW()`, `status = 'posted'`. Optionnel : champ texte pour l'URL du tweet réel (utile pour audit / analytics futurs).

---

## Pourquoi pas l'API X v2 ?

L'API X v2 propose `POST /2/tweets` avec attachement média. Mais :

1. **Coût** : palier de pricing élevé pour write access (Pro ≈ 5000$/mois en 2025)
2. **Complexité OAuth** : flux de connexion utilisateur à gérer
3. **Surface d'attaque** : si le token X est compromis, il publie au nom de l'utilisateur
4. **Choix utilisateur explicite** : tu as choisi "publication 100% manuelle" — on respecte

Si un jour tu changes d'avis, le skill peut être étendu : ajouter un `TweetPublisherServiceV4` qui appelle l'API X via `oauth4webapi` ou `twitter-api-v2`. La structure DB (`scheduled_tweets`) ne change pas — il suffira de remplacer "marquer comme publié" par un vrai POST API.

---

## Endpoints

| Méthode | Path | Description |
|---------|------|-------------|
| `GET`   | `/api/v4/studio/tweets`              | Liste avec filtre `?status=` |
| `GET`   | `/api/v4/studio/tweets/:id`          | Détail (incluant URL du PNG) |
| `POST`  | `/api/v4/studio/tweets`              | Crée un brouillon `{ tweet_text, template_id, form_values, style_variant, source_trend_id? }` |
| `PATCH` | `/api/v4/studio/tweets/:id`          | Met à jour texte / scheduled_for / status |
| `POST`  | `/api/v4/studio/tweets/:id/attach-png` | Génère + sauvegarde le PNG (appelle InfographicExportServiceV4) |
| `POST`  | `/api/v4/studio/tweets/:id/mark-posted` | `status='posted', posted_at=NOW()` |
| `DELETE`| `/api/v4/studio/tweets/:id`          | `status='cancelled'` (soft) |
| `GET`   | `/api/v4/studio/tweets/:id/png`      | Sert le PNG attaché (download) |

Toutes les routes en V4 pattern (controller V4 + service V4 + Zod + logger + response wrapper).

---

## Validation Zod

```js
// backend/src/schemas/v4/tweetDraftSchema.js
import { z } from 'zod';

export const TweetDraftCreateSchema = z.object({
  tweet_text: z.string().min(1).max(280),  // 280 chars Twitter
  template_id: z.string().regex(/^[a-z][a-z0-9-]+$/),
  form_values: z.record(z.unknown()),  // validé en aval par le manifest du template
  style_variant: z.string(),
  source_trend_id: z.number().int().positive().nullable().optional(),
});

export const TweetDraftPatchSchema = z.object({
  tweet_text: z.string().min(1).max(280).optional(),
  scheduled_for: z.string().datetime().nullable().optional(),
  status: z.enum(['draft', 'scheduled', 'posted', 'cancelled']).optional(),
});
```

---

## Tests (qa-automation)

- **Unit** : `TweetDraftServiceV4` avec mock DB — créer, lister, transitions de statut
- **Integration** : `POST /tweets` → `POST /tweets/:id/attach-png` → `GET /tweets/:id/png` retourne bien un PNG
- **Validation** : `tweet_text` > 280 chars → 400
- **Statuts** : transitions invalides (ex: `posted → draft`) → 400 ou ignored selon décision
- **Soft delete** : `DELETE /tweets/:id` → la ligne reste mais `status='cancelled'`

---

## Notes UX

### Compteur de caractères

Dans le formulaire d'édition de tweet, afficher un compteur 0/280 avec :
- vert ≤ 250
- orange 251–270
- rouge 271–280
- impossible > 280 (input max-length CSS + Zod)

### Aperçu pré-publication

Sur le bouton "Publier", le modal affiche un aperçu de comment le tweet apparaîtra (texte + miniature de l'infographie). Pas un mock du rendu Twitter exact, mais une représentation honnête.

### Historique des publications

Onglet "Publiés" — liste des 30 derniers tweets marqués `posted`. Si l'utilisateur a saisi l'URL du tweet réel, lien direct vers X.com.

---

## NEVER LIST

- ❌ Publier automatiquement sur X (jamais)
- ❌ Stocker un token OAuth X.com dans v4.scheduled_tweets
- ❌ Promettre dans l'UI un "envoi planifié" — c'est un libellé d'organisation, pas un cron
- ❌ Hard-delete d'un brouillon `posted` (audit trail)
- ❌ Publier sans PNG attaché (vérification serveur dans `mark-posted` ? optionnel — à discuter)
- ❌ Stocker le tweet text en clair dans les logs (PII potentielle si l'utilisateur écrit des choses sensibles)
