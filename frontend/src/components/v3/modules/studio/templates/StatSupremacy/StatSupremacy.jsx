import React, { forwardRef, useMemo } from 'react';
import PropTypes from 'prop-types';
import TemplateFrame from '../_shared/TemplateFrame';
import { assertValid } from '../_shared/validators';
import { contract } from './contract';
import demoData from './demo';
import './StatSupremacy.css';

/**
 * Mini-sparkline en SVG pur (pas de dep externe).
 */
function Sparkline({ points, color }) {
  if (!points?.length) return null;
  const W = 600;
  const H = 120;
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const padY = (maxY - minY) * 0.1 || 1;
  const scaleX = (x) => ((x - minX) / ((maxX - minX) || 1)) * W;
  const scaleY = (y) =>
    H - ((y - (minY - padY)) / ((maxY + padY - (minY - padY)) || 1)) * H;
  const d = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${scaleX(p.x).toFixed(2)} ${scaleY(p.y).toFixed(2)}`)
    .join(' ');
  const area = `${d} L ${scaleX(maxX).toFixed(2)} ${H} L ${scaleX(minX).toFixed(2)} ${H} Z`;
  return (
    <svg className="sup-sparkline" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden>
      <path d={area} fill={color || 'var(--tpl-accent)'} opacity="0.18" />
      <path d={d} fill="none" stroke={color || 'var(--tpl-accent)'} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

Sparkline.propTypes = { points: PropTypes.array, color: PropTypes.string };

/**
 * StatSupremacy — DA editorial.
 * Format headline magazine + hero stat énorme + ranking latéral + sparkline.
 */
const StatSupremacy = forwardRef(function StatSupremacy(
  { data = demoData, theme = 'editorial', fontPair, aspectRatio = '9:16', accent, scale },
  ref,
) {
  const safeData = useMemo(() => {
    assertValid(data, contract, 'StatSupremacy');
    return data;
  }, [data]);

  const maxValue = Math.max(...safeData.subjects.map((s) => s.value));

  return (
    <TemplateFrame
      ref={ref}
      theme={theme}
      fontPair={fontPair}
      aspectRatio={aspectRatio}
      accent={accent}
      scale={scale}
      className="stat-supremacy"
    >
      <header className="sup-header tpl-reveal">
        {safeData.eyebrow && <div className="tpl-eyebrow">{safeData.eyebrow}</div>}
        <h1 className="sup-headline tpl-display">{safeData.headline}</h1>
      </header>

      <section className="sup-hero tpl-reveal">
        <div className="sup-hero-stat">
          <div className="sup-hero-value tpl-display">
            {safeData.heroStat.value}
            {safeData.heroStat.unit && (
              <span className="sup-hero-unit">{safeData.heroStat.unit}</span>
            )}
          </div>
          <div className="sup-hero-label">{safeData.heroStat.label}</div>
        </div>
        {safeData.trendline?.length > 0 && (
          <div className="sup-trend">
            <Sparkline points={safeData.trendline} />
          </div>
        )}
      </section>

      <section className="sup-ranking tpl-reveal">
        {safeData.subjects.map((s, i) => {
          const pct = maxValue > 0 ? (s.value / maxValue) * 100 : 0;
          return (
            <div key={s.name} className="sup-row" style={{ animationDelay: `${200 + i * 60}ms` }}>
              <div className="sup-row-rank">{String(i + 1).padStart(2, '0')}</div>
              <div className="sup-row-name tpl-display">{s.name}</div>
              <div className="sup-row-bar">
                <div
                  className="sup-row-bar-fill"
                  style={{
                    width: `${pct}%`,
                    background: s.color || 'var(--tpl-accent)',
                  }}
                />
              </div>
              <div className="sup-row-value tpl-display">{s.value}</div>
            </div>
          );
        })}
      </section>

      {safeData.source && (
        <footer className="sup-footer">
          <span className="tpl-soft">Source · {safeData.source}</span>
        </footer>
      )}
    </TemplateFrame>
  );
});

StatSupremacy.propTypes = {
  data: PropTypes.object,
  theme: PropTypes.string,
  fontPair: PropTypes.string,
  aspectRatio: PropTypes.oneOf(['9:16', '1:1', '16:9']),
  accent: PropTypes.string,
  scale: PropTypes.number,
};

export default StatSupremacy;
