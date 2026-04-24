import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  MatchPreviewCard,
  useMatchPreviewBackend,
  THEME_IDS,
  TemplateFrame,
  exportNodeToPNG,
} from '../templates';
import { themes } from '../templates/_shared/themes';
import MatchListPicker from './MatchListPicker';
import './MatchPreviewStudio.css';

const ASPECTS = ['9:16', '1:1', '16:9'];

// Aligned 1:1 avec l'enum DataGapSchema du backend (contentPreviewSchemas.js).
const GAP_LABELS = {
  standings: 'Classement',
  recent_form: 'Forme récente',
  xg: 'xG saison',
  home_away_record: 'Record dom./ext.',
  h2h: 'Confrontations directes',
  ml_prediction: 'Prédiction ML',
  venue: 'Stade',
  competition_logo: 'Logo compétition',
  club_logos: 'Logos clubs',
};

/**
 * Observe la taille du wrapper pour adapter le scale du template natif
 * (1080×1920 / 1080×1080 / 1920×1080) au conteneur disponible.
 */
function useFitScale(wrapperRef, nativeW, nativeH) {
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return undefined;

    const update = () => {
      const { width, height } = el.getBoundingClientRect();
      if (width <= 0 || height <= 0) return;
      const s = Math.min(width / nativeW, height / nativeH);
      setScale(Number.isFinite(s) && s > 0 ? s : 1);
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, [wrapperRef, nativeW, nativeH]);

  return scale;
}

const ASPECT_DIMS = {
  '9:16': { w: 1080, h: 1920 },
  '1:1': { w: 1080, h: 1080 },
  '16:9': { w: 1920, h: 1080 },
};

const MatchPreviewStudio = () => {
  // Form state
  const [matchId, setMatchId] = useState(null);
  const [theme, setTheme] = useState('dark-observatory');
  const [accent, setAccent] = useState('');
  const [aspect, setAspect] = useState('9:16');
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState(null);

  // Data fetch via hook (fallback demo tant que pas de matchId)
  const { data, loading, error, dataGaps, isDemo } = useMatchPreviewBackend({ matchId });

  // Refs
  const frameRef = useRef(null);
  const wrapperRef = useRef(null);
  const { w: nativeW, h: nativeH } = ASPECT_DIMS[aspect];
  const fitScale = useFitScale(wrapperRef, nativeW, nativeH);

  const handleSelectMatch = useCallback((id) => {
    setMatchId(String(id));
    setExportError(null);
  }, []);

  const handleExport = useCallback(async () => {
    if (!frameRef.current) return;
    setExporting(true);
    setExportError(null);
    try {
      const matchLabel = data?.match?.match_id || 'demo';
      const filename = `match-preview-${matchLabel}-${aspect.replace(':', 'x')}.png`;
      await exportNodeToPNG(frameRef.current, { filename, pixelRatio: 2 });
    } catch (err) {
      setExportError(err?.message || 'Export PNG impossible');
    } finally {
      setExporting(false);
    }
  }, [aspect, data]);

  const freshAt = useMemo(() => {
    if (!data?.generated_at) return null;
    const d = new Date(data.generated_at);
    if (Number.isNaN(d.getTime())) return null;
    return d.toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }, [data]);

  const matchTitle = useMemo(() => {
    if (!data?.home || !data?.away) return '—';
    return `${data.home.short_name || data.home.name} vs ${data.away.short_name || data.away.name}`;
  }, [data]);

  return (
    <div className="mps">
      <aside className="mps-side">
        <MatchListPicker selectedMatchId={matchId} onSelect={handleSelectMatch} />

        <div className="mps-side-card">
          <div className="mps-side-card-title">Fiabilité des données</div>
          <p className="mps-side-card-body">
            Chaque bloc est tracé via <code>data_gaps</code> : si une source V4 est absente
            (prédiction, xG, H2H, forme…), l&apos;infographie l&apos;affiche explicitement plutôt
            que de combler par une valeur inventée.
          </p>
        </div>
      </aside>

      <section className="mps-stage">
        <div className="mps-toolbar">
          <div className="mps-toolbar-info">
            <div className="mps-toolbar-eyebrow">Infographie</div>
            <div className="mps-toolbar-title">{matchTitle}</div>
            <div className="mps-toolbar-meta">
              {loading && <span className="mps-chip mps-chip-loading">Chargement V4…</span>}
              {!loading && isDemo && (
                <span className="mps-chip mps-chip-demo">DÉMO — aucun match sélectionné</span>
              )}
              {!loading && !isDemo && (
                <span className="mps-chip mps-chip-fresh">
                  Données au {freshAt || '—'}
                </span>
              )}
              {error && (
                <span className="mps-chip mps-chip-error" title={error}>
                  ⚠ {error.length > 60 ? `${error.slice(0, 57)}…` : error}
                </span>
              )}
            </div>
          </div>

          <div className="mps-toolbar-controls">
            <div className="mps-toolbar-group">
              <span className="mps-toolbar-label">DA</span>
              <div className="mps-toolbar-pills">
                {THEME_IDS.map((id) => (
                  <button
                    key={id}
                    type="button"
                    className={`mps-pill ${theme === id ? 'is-active' : ''}`}
                    style={{ '--pill-accent': themes[id].accent }}
                    onClick={() => setTheme(id)}
                  >
                    <span className="mps-pill-dot" />
                    {themes[id].label}
                  </button>
                ))}
              </div>
            </div>

            <div className="mps-toolbar-group">
              <span className="mps-toolbar-label">Format</span>
              <div className="mps-toolbar-pills">
                {ASPECTS.map((a) => (
                  <button
                    key={a}
                    type="button"
                    className={`mps-pill mps-pill--mono ${aspect === a ? 'is-active' : ''}`}
                    onClick={() => setAspect(a)}
                  >
                    {a}
                  </button>
                ))}
              </div>
            </div>

            <div className="mps-toolbar-group">
              <label className="mps-toolbar-label" htmlFor="mps-accent">
                Accent
              </label>
              <div className="mps-accent-wrap">
                <input
                  id="mps-accent"
                  type="color"
                  value={accent || themes[theme].accent}
                  onChange={(e) => setAccent(e.target.value)}
                  className="mps-accent-input"
                />
                <button
                  type="button"
                  className="mps-accent-reset"
                  onClick={() => setAccent('')}
                  disabled={!accent}
                >
                  Reset
                </button>
              </div>
            </div>

            <button
              type="button"
              className="mps-export"
              onClick={handleExport}
              disabled={exporting}
            >
              {exporting ? 'Export…' : 'Exporter PNG'}
            </button>
          </div>
        </div>

        {exportError && (
          <div className="mps-export-error" role="alert">
            {exportError}
          </div>
        )}

        {dataGaps && dataGaps.length > 0 && (
          <div className="mps-gaps" role="status">
            <span className="mps-gaps-label">Sources V4 manquantes :</span>
            {dataGaps.map((g) => (
              <span key={g} className="mps-gap-chip">
                {GAP_LABELS[g] || g}
              </span>
            ))}
          </div>
        )}

        <div className={`mps-canvas mps-canvas--${aspect.replace(':', 'x')}`}>
          <div className="mps-canvas-wrap" ref={wrapperRef}>
            <div
              className="mps-canvas-scaler"
              style={{
                width: `${nativeW}px`,
                height: `${nativeH}px`,
                transform: `scale(${fitScale})`,
                transformOrigin: 'top left',
              }}
            >
              <TemplateFrame
                ref={frameRef}
                theme={theme}
                aspectRatio={aspect}
                accent={accent || undefined}
                scale={1}
                brandLabel="statFoot V4"
                className="match-preview-card"
              >
                <MatchPreviewCard
                  data={data}
                  theme={theme}
                  accent={accent || undefined}
                  aspectRatio={aspect}
                />
              </TemplateFrame>
            </div>
          </div>
        </div>

        <footer className="mps-footer">
          <span className="mps-footer-label">Match Preview Card</span>
          <span className="mps-footer-sep">·</span>
          <span>
            Aucune valeur inventée — toutes les stats proviennent des services V4
            (standings, xG, H2H, ML). Les sources absentes sont listées ci-dessus.
          </span>
        </footer>
      </section>
    </div>
  );
};

export default MatchPreviewStudio;
