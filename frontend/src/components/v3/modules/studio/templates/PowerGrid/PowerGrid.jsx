import React, { forwardRef, useMemo } from 'react';
import PropTypes from 'prop-types';
import TemplateFrame from '../_shared/TemplateFrame';
import { assertValid } from '../_shared/validators';
import { contract } from './contract';
import demoData from './demo';
import './PowerGrid.css';

/**
 * PowerGrid — DA tactical-board.
 * Grille 2 à 4 colonnes : cellules ranked, score 0..100 barre.
 */
const PowerGrid = forwardRef(function PowerGrid(
  { data = demoData, theme = 'tactical-board', fontPair, aspectRatio = '9:16', accent, scale },
  ref,
) {
  const safeData = useMemo(() => {
    assertValid(data, contract, 'PowerGrid');
    return data;
  }, [data]);

  const cols = Math.min(4, Math.max(2, safeData.columns || 3));

  return (
    <TemplateFrame
      ref={ref}
      theme={theme}
      fontPair={fontPair}
      aspectRatio={aspectRatio}
      accent={accent}
      scale={scale}
      className="power-grid"
    >
      <header className="pg-header tpl-reveal">
        {safeData.eyebrow && <div className="tpl-eyebrow">{safeData.eyebrow}</div>}
        <h1 className="pg-title tpl-display">{safeData.headline}</h1>
        {safeData.subtitle && <p className="pg-subtitle tpl-soft">{safeData.subtitle}</p>}
      </header>

      <div
        className="pg-grid tpl-reveal"
        style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}
      >
        {safeData.cells.map((c, i) => (
          <div
            key={`${c.title}-${i}`}
            className="pg-cell"
            style={{ animationDelay: `${150 + i * 50}ms` }}
          >
            <div className="pg-cell-top">
              <span className="pg-rank tpl-display">
                {String(c.rank).padStart(2, '0')}
              </span>
              <div className="pg-cell-title-wrap">
                <div className="pg-title-inner tpl-display">{c.title}</div>
                {c.subtitle && <div className="pg-subtitle-inner tpl-soft">{c.subtitle}</div>}
              </div>
              {c.logoUrl && (
                <div className="pg-logo">
                  <img src={c.logoUrl} alt="" />
                </div>
              )}
            </div>
            <div className="pg-bar" role="img" aria-label={`Score ${c.score}`}>
              <div
                className="pg-bar-fill"
                style={{ width: `${Math.min(100, Math.max(0, c.score))}%` }}
              />
            </div>
            <div className="pg-cell-bottom">
              <span className="pg-score tpl-display">{c.score}</span>
              {c.meta && <span className="pg-meta tpl-soft">{c.meta}</span>}
            </div>
          </div>
        ))}
      </div>

      {safeData.source && (
        <footer className="pg-footer tpl-soft">Source · {safeData.source}</footer>
      )}
    </TemplateFrame>
  );
});

PowerGrid.propTypes = {
  data: PropTypes.object,
  theme: PropTypes.string,
  fontPair: PropTypes.string,
  aspectRatio: PropTypes.oneOf(['9:16', '1:1', '16:9']),
  accent: PropTypes.string,
  scale: PropTypes.number,
};

export default PowerGrid;
