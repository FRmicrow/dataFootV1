# Render Pipeline — Preview Live + Export PNG

Comment l'infographie est rendue dans le navigateur (preview live) et comment elle est exportée en PNG haute qualité pour Twitter (Puppeteer).

---

## Choix d'archi (validé)

> Preview React live (composant rendu en temps réel dans `/studio/infographics`) + export final via Puppeteer headless qui screenshote une page dédiée `/studio/infographics/preview/:draftId`.

Avantage : **un seul code de rendu**. Pas de divergence entre ce que voit l'utilisateur et ce qui part sur Twitter.

---

## Preview live (côté React)

### Composant `InfographicPreviewV4`

```jsx
// frontend/src/components/v4/infographic/InfographicPreviewV4.jsx
import PlayerComparisonTemplate from './templates/PlayerComparisonTemplate';
import MatchRecapTemplate from './templates/MatchRecapTemplate';
// ... autres imports

const TEMPLATE_REGISTRY = {
  'player-comparison': PlayerComparisonTemplate,
  'match-recap': MatchRecapTemplate,
  // ...
};

export default function InfographicPreviewV4({ templateId, formValues, styleVariant }) {
  const [resolution, setResolution] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!templateId || !formValues) return;
    setLoading(true);
    api.post('/v4/studio/resolve', { templateId, formValues })
      .then(r => setResolution(r.data))
      .catch(/* error state */)
      .finally(() => setLoading(false));
  }, [templateId, formValues]);

  if (loading) return <Skeleton variant="infographic" />;
  if (!resolution) return <EmptyState message="Sélectionne un template et remplis le formulaire" />;

  const Template = TEMPLATE_REGISTRY[templateId];
  if (!Template) return <ErrorState message={`Template inconnu : ${templateId}`} />;

  return (
    <div className="infographic-preview-frame">
      {resolution.missing.length > 0 && (
        <MissingFieldsBanner missing={resolution.missing} />
      )}
      <Template
        resolved={resolution.resolved}
        missing={resolution.missing}
        styleVariant={styleVariant}
      />
    </div>
  );
}
```

### Dimensions canoniques

Toujours **1200×675** (ratio 16:9, taille recommandée Twitter pour aperçu in-feed).

```css
.infographic-preview-frame {
  width: 1200px;
  height: 675px;
  position: relative;
  overflow: hidden;
  /* on peut scaler avec transform pour l'affichage UI sur petit écran */
  transform: scale(var(--preview-scale, 0.75));
  transform-origin: top left;
}
```

Le composant template **ne doit pas** ajuster ces dimensions — c'est le frame qui les impose.

### Skeleton de chargement

Pendant l'attente du resolver, afficher un skeleton à dimensions identiques (1200×675 scaled). Voir composant DS `<Skeleton>`.

---

## Variants de style

3 variants minimum imposés par template (cf. `template-spec.md`). Implémentés comme 3 thèmes CSS qui surchargent les tokens via une classe parent :

```css
/* Dark Observatory */
.template-theme--dark-observatory {
  --tpl-bg: var(--color-neutral-950);
  --tpl-fg: var(--color-neutral-50);
  --tpl-accent: var(--color-primary-400);
  --tpl-glow: 0 0 24px hsl(var(--color-primary-h) 90% 60% / 0.4);
  background: var(--tpl-bg);
  color: var(--tpl-fg);
}

/* Editorial Sports */
.template-theme--editorial {
  --tpl-bg: var(--color-neutral-50);
  --tpl-fg: var(--color-neutral-950);
  --tpl-accent: var(--color-danger-500);
  --tpl-display-font: 'DM Sans', sans-serif;
  background: var(--tpl-bg);
  color: var(--tpl-fg);
}

/* Tactical Board */
.template-theme--tactical {
  --tpl-bg: var(--color-neutral-900);
  --tpl-fg: var(--color-neutral-100);
  --tpl-accent: var(--color-warning-500);
  --tpl-grid: repeating-linear-gradient(0deg, transparent 0 47px, hsl(var(--color-neutral-h) 10% 30% / 0.2) 47px 48px);
  background: var(--tpl-bg) var(--tpl-grid);
  color: var(--tpl-fg);
}
```

**Tous les composants enfants** doivent consommer `--tpl-fg`, `--tpl-bg`, `--tpl-accent`, `--tpl-display-font` — pas les tokens DS bruts directement.

Voir `visual-manifesto.md` pour les directions de tone (analytical / editorial / tactical / etc.).

---

## Export PNG (Puppeteer)

### Endpoint

```js
// backend/src/controllers/v4/infographicExportControllerV4.js
POST /api/v4/studio/export
Body: {
  templateId: 'player-comparison',
  formValues: { player_a_id: 123, player_b_id: 456, season: '2025-26' },
  styleVariant: 'dark-observatory',
  confirmIncomplete: false
}
Response: PNG stream (Content-Type: image/png) | { success: false, error: 'critical_data_missing', missing: [...] }
```

### Service `InfographicExportServiceV4`

```js
import puppeteer from 'puppeteer';
import pLimit from 'p-limit';

const exportLimit = pLimit(3);  // max 3 exports concurrents
const TIMEOUT_MS = 30_000;

export async function exportToPng({ templateId, formValues, styleVariant, confirmIncomplete }) {
  // 1. Resolver d'abord
  const { resolved, missing } = await resolverService.resolve(templateId, formValues);

  // 2. Bloquer si critical missing sans confirmation
  const hasCritical = missing.some(m => m.severity === 'critical');
  if (hasCritical && !confirmIncomplete) {
    throw new CriticalDataMissingError(missing);
  }

  // 3. Créer un draft transient (UUID en mémoire, pas en DB)
  const renderToken = crypto.randomUUID();
  rendererCache.set(renderToken, { templateId, formValues, styleVariant, resolved, missing }, { ttl: 60_000 });

  // 4. Lancer Puppeteer
  return exportLimit(() => screenshotPage(renderToken));
}

async function screenshotPage(renderToken) {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1200, height: 675, deviceScaleFactor: 2 });

    const url = `${process.env.FRONTEND_URL}/studio/infographics/preview/${renderToken}?embed=1`;
    await page.goto(url, { waitUntil: 'networkidle0', timeout: TIMEOUT_MS });

    // attendre que les fonts soient chargées
    await page.evaluate(() => document.fonts.ready);

    // attendre les images (photos de joueurs notamment)
    await page.evaluate(() =>
      Promise.all(
        Array.from(document.images).map(img =>
          img.complete ? null : new Promise(res => { img.onload = img.onerror = res; })
        )
      )
    );

    const pngBuffer = await page.screenshot({ type: 'png', omitBackground: false });
    return pngBuffer;
  } finally {
    await browser.close();
  }
}
```

### Page dédiée Puppeteer — `InfographicRenderOnlyPage`

```jsx
// frontend/src/components/v4/infographic/InfographicRenderOnlyPage.jsx
// Cette page est SANS layout (ni navbar, ni sidebar) — elle n'affiche que le composant template,
// dans ses dimensions exactes 1200×675.

export default function InfographicRenderOnlyPage() {
  const { renderToken } = useParams();
  const [embedData, setEmbedData] = useState(null);

  useEffect(() => {
    api.get(`/v4/studio/render-data/${renderToken}`).then(r => setEmbedData(r.data));
  }, [renderToken]);

  if (!embedData) return null;

  const Template = TEMPLATE_REGISTRY[embedData.templateId];
  return (
    <div style={{ width: 1200, height: 675 }}>
      <Template
        resolved={embedData.resolved}
        missing={embedData.missing}
        styleVariant={embedData.styleVariant}
      />
    </div>
  );
}
```

L'endpoint `/v4/studio/render-data/:token` est un endpoint **interne** qui sert le payload mis en cache. Token TTL 60s, à usage unique.

### Routing à isoler

`/studio/infographics/preview/:renderToken` doit **bypasser** `V3Layout` (le layout principal). Ajouter dans `App.jsx` :

```jsx
<Route path="/studio/infographics/preview/:renderToken" element={<InfographicRenderOnlyPage />} />
{/* le reste sous V3Layout */}
<Route element={<V3Layout />}>
  <Route path="/studio/infographics" element={<InfographicStudioPageV4 />} />
  {/* ... */}
</Route>
```

---

## Stockage des PNG exportés

Quand l'utilisateur "valide" un export pour l'attacher à un brouillon de tweet :

1. Le PNG buffer est sauvegardé sur disque dans `backend/uploads/infographics/<draftId>-<timestamp>.png`
2. Le chemin est stocké dans `v4.scheduled_tweets.png_path`
3. Endpoint `GET /api/v4/studio/tweets/:id/png` sert le fichier (avec contrôle d'accès)

**Ne pas** stocker les PNG en DB (BLOB) — fichiers + chemin en DB.

---

## Performance & robustesse

- **Timeout strict** : 30s par export, sinon kill du process Puppeteer
- **Concurrence limitée** : `p-limit(3)` — max 3 exports parallèles
- **Réutilisation de browser** : optionnel, mais pour V1 on lance un browser par export (simple, isolé)
- **Health check** : un endpoint `/api/v4/studio/export/health` qui lance un export "minimal" sur un template `_canary` pour vérifier que Puppeteer fonctionne

---

## Vérifications visuelles

Pour chaque template, livrer dans `docs/features/Vxx-Infographic-Studio/visual-checks/` :

- 3 PNG (un par variant) générés à partir de fixtures réelles (dump SQL d'un cas connu)
- Un README qui décrit ce qu'on doit voir et ce qu'on ne doit pas voir

Ces PNG servent de **régression visuelle manuelle**. Pas d'outil automatique pour V1.

---

## Sécurité

- Le token Puppeteer (`renderToken`) est à usage unique et expire en 60s — empêche l'accès à des données via URL devinée
- L'endpoint `/render-data/:token` n'est accessible qu'en local (`127.0.0.1`) ou via header secret partagé entre backend et Puppeteer (qui tourne sur la même machine)
- Toute donnée utilisateur (form value `text`) doit passer par `escapeHTML` avant rendu — voir skill `security/xss-prevention`

---

## NEVER LIST (rendering)

- ❌ Lancer Puppeteer sans timeout
- ❌ Stocker des PNG en BLOB DB
- ❌ Réutiliser un `renderToken` plus d'une fois
- ❌ Inclure du JS arbitraire dans la page de rendu (XSS)
- ❌ Diverger entre la preview React et le rendu Puppeteer (toujours le **même** composant)
- ❌ Hardcoder une URL frontend dans le service backend — utiliser `process.env.FRONTEND_URL`
