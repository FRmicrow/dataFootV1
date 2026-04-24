import React, { forwardRef, useMemo } from 'react';
import PropTypes from 'prop-types';
import TemplateFrame from '../_shared/TemplateFrame';
import { assertValid } from '../_shared/validators';
import { contract } from './contract';
import demoData from './demo';
import './NarrativeGrid.css';

/**
 * Mixe l'accent du thème + une teinte sombre neutre selon l'intensité.
 * intensity ∈ [0..1]
 */
function cellStyle(intensity) {
  const clamped = Math.min(1, Math.max(0, intensity));
  // On passe par CSS custom property mixée : on laisse le background-color
  // se baser sur accent-soft et on joue sur l'opacité de l'overlay.
  return { '--tpl-cell-intensity': clamped.toFixed(3) };
}

const RESULT_PILL = { W: 'W', D: 'N', L: 'D' };

/**
 * NarrativeGrid — DA red-alert.
 * Heatmap : colonnes = matchs, lignes = KPIs.
 */
const NarrativeGrid = forwardRef(function NarrativeGrid(
  { data = demoData, theme = 'red-alert', fontPair, aspectRatio = '9:16', accent, scale },
  ref,
) {
  const safeData = useMemo(() => {
    assertValid(data, contract, 'NarrativeGrid');
    return data;
  }, [data]);

  return (
    <TemplateFrame
      ref={ref}
      theme={theme}
      fontPair={fontPair}
      aspectRatio={aspectRatio}
      accent={accent}
      scale={scale}
      className="narrative-grid"
    >
      <header className="ng-header tpl-reveal">
        {safeData.eyebrow && <div className="tpl-eyebrow">{safeData.eyebrow}</div>}
        <h1 className="ng-title tpl-display">{safeData.headline}</h1>
        {safeData.subtitle && <p className="ng-subtitle tpl-soft">{safeData.subtitle}</p>}
      </header>

      <div className="ng-grid-wrap tpl-reveal">
        <div className="ng-grid" style={{ '--ng-cols': safeData.matches.length }}>
          {/* Header row : adversaires */}
          <div className="ng-corner" aria-hidden />
          {safeData.matches.map((m, i) => (
            <div key={`${m.opponent}-${i}`} className="ng-col-header">
              <div className="ng-col-opponent tpl-display">{m.opponent}</div>
              <div className="ng-col-sub tpl-soft">
                <span className={`ng-pill ng-pill-${m.result.toLowerCase()}`}>
                  {RESULT_PILL[m.result]}
                </span>
                {m.isHome ? ' · Dom.' : ' · Ext.'}
                {m.meta && <span> · {m.meta}</span>}
              </div>
            </div>
          ))}

          {/* KPI rows */}
          {safeData.kpiLabels.map((kpiLabel, rowIdx) => (
            <React.Fragment key={kpiLabel}>
              <div className="ng-row-header tpl-display" style={{ animationDelay: `${150 + rowIdx * 80}ms` }}>
                {kpiLabel}
              </div>
              {safeData.matches.map((m, colIdx) => {
                const intensity = m.kpis[kpiLabel] ?? 0;
                return (
                  <div
                    key={`${kpiLabel}-${colIdx}`}
                    className="ng-cell"
                    style={{
                      ...cellStyle(intensity),
                      animationDelay: `${200 + rowIdx * 80 + colIdx * 20}ms`,
                    }}
                    title={`${kpiLabel} · ${m.opponent} : ${(intensity * 100).toFixed(0)}%`}
                  >
                    <span className="ng-cell-value">{Math.round(intensity * 100)}</span>
                  </div>
                );
              })}
            </React.Fragment>
          ))}
        </div>
      </div>

      <footer className="ng-footer tpl-reveal">
        {safeData.takeaway && (
          <p className="ng-takeaway tpl-display">{safeData.takeaway}</p>
        )}
        <div className="ng-legend tpl-soft">
          <span>Échelle : 0 (noir) → 100 (accent saturé)</span>
          {safeData.source && <span> · Source {safeData.source}</span>}
        </div>
      </footer>
    </TemplateFrame>
  );
});

NarrativeGrid.propTypes = {
  data: PropTypes.object,
  theme: PropTypes.string,
  fontPair: PropTypes.string,
  aspectRatio: PropTypes.oneOf(['9:16', '1:1', '16:9']),
  accent: PropTypes.string,
  scale: PropTypes.number,
};

export default NarrativeGrid;
