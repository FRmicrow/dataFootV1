import React, { forwardRef, useMemo } from 'react';
import PropTypes from 'prop-types';
import TemplateFrame from '../_shared/TemplateFrame';
import { assertValid } from '../_shared/validators';
import { contract } from './contract';
import demoData from './demo';
import './RaceTracker.css';

/**
 * RaceTracker — DA dark-observatory.
 * Line chart SVG pur : course cumulée sur X matchdays.
 */
const RaceTracker = forwardRef(function RaceTracker(
  { data = demoData, theme = 'dark-observatory', fontPair, aspectRatio = '9:16', accent, scale },
  ref,
) {
  const safeData = useMemo(() => {
    assertValid(data, contract, 'RaceTracker');
    return data;
  }, [data]);

  const chart = useMemo(() => {
    const W = 1000;
    const H = 520;
    const pad = { top: 40, right: 80, bottom: 60, left: 80 };
    const mds = safeData.timeline.map((t) => t.matchday);
    const allVals = safeData.timeline.flatMap((t) =>
      safeData.competitors.map((c) => t.values[c.name] ?? 0),
    );
    const minX = Math.min(...mds);
    const maxX = Math.max(...mds);
    const minY = 0;
    const maxY = Math.max(...allVals) * 1.08 || 1;

    const xScale = (x) =>
      pad.left + ((x - minX) / ((maxX - minX) || 1)) * (W - pad.left - pad.right);
    const yScale = (y) =>
      H - pad.bottom - ((y - minY) / ((maxY - minY) || 1)) * (H - pad.top - pad.bottom);

    const paths = safeData.competitors.map((c) => {
      const pts = safeData.timeline.map((t) => ({
        x: xScale(t.matchday),
        y: yScale(t.values[c.name] ?? 0),
        val: t.values[c.name] ?? 0,
        md: t.matchday,
      }));
      const d = pts
        .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
        .join(' ');
      return { ...c, pts, d };
    });

    return { W, H, pad, xScale, yScale, paths, minX, maxX, minY, maxY };
  }, [safeData]);

  // tick positions
  const xTicks = useMemo(() => {
    const mds = safeData.timeline.map((t) => t.matchday);
    return mds.filter((_, i, arr) => i === 0 || i === arr.length - 1 || i % Math.ceil(arr.length / 5) === 0);
  }, [safeData]);

  return (
    <TemplateFrame
      ref={ref}
      theme={theme}
      fontPair={fontPair}
      aspectRatio={aspectRatio}
      accent={accent}
      scale={scale}
      className="race-tracker"
    >
      <header className="race-header tpl-reveal">
        {safeData.eyebrow && <div className="tpl-eyebrow">{safeData.eyebrow}</div>}
        <h1 className="race-title tpl-display">{safeData.headline}</h1>
      </header>

      <div className="race-legend tpl-reveal">
        {safeData.competitors.map((c) => (
          <div key={c.name} className="race-legend-item">
            <span
              className="race-legend-dot"
              style={{ background: c.color || 'var(--tpl-accent)' }}
            />
            <span className="race-legend-name tpl-display">{c.name}</span>
          </div>
        ))}
      </div>

      <div className="race-chart-wrap tpl-reveal">
        <svg
          className="race-chart"
          viewBox={`0 0 ${chart.W} ${chart.H}`}
          preserveAspectRatio="xMidYMid meet"
          aria-hidden
        >
          {/* grid horizontal */}
          {[0, 0.25, 0.5, 0.75, 1].map((r) => {
            const y = chart.pad.top + r * (chart.H - chart.pad.top - chart.pad.bottom);
            return (
              <line
                key={r}
                x1={chart.pad.left}
                x2={chart.W - chart.pad.right}
                y1={y}
                y2={y}
                stroke="var(--tpl-grid)"
                strokeDasharray="4 6"
              />
            );
          })}

          {/* x-ticks */}
          {xTicks.map((md) => (
            <g key={md}>
              <line
                x1={chart.xScale(md)}
                x2={chart.xScale(md)}
                y1={chart.H - chart.pad.bottom}
                y2={chart.H - chart.pad.bottom + 6}
                stroke="var(--tpl-text-soft)"
              />
              <text
                x={chart.xScale(md)}
                y={chart.H - chart.pad.bottom + 28}
                fill="var(--tpl-text-soft)"
                fontSize="18"
                fontFamily="var(--tpl-font-body)"
                textAnchor="middle"
              >
                J{md}
              </text>
            </g>
          ))}

          {/* y-ticks */}
          {[0, 0.25, 0.5, 0.75, 1].map((r) => {
            const y = chart.pad.top + (1 - r) * (chart.H - chart.pad.top - chart.pad.bottom);
            const val = Math.round(chart.minY + r * (chart.maxY - chart.minY));
            return (
              <text
                key={`y-${r}`}
                x={chart.pad.left - 14}
                y={y + 6}
                fill="var(--tpl-text-soft)"
                fontSize="18"
                fontFamily="var(--tpl-font-body)"
                textAnchor="end"
              >
                {val}
              </text>
            );
          })}

          {/* event markers */}
          {safeData.events?.map((ev) => (
            <line
              key={`ev-${ev.matchday}-${ev.label}`}
              x1={chart.xScale(ev.matchday)}
              x2={chart.xScale(ev.matchday)}
              y1={chart.pad.top}
              y2={chart.H - chart.pad.bottom}
              stroke="var(--tpl-accent)"
              strokeDasharray="2 6"
              opacity="0.45"
            />
          ))}

          {/* lines + terminal dots */}
          {chart.paths.map((p) => {
            const last = p.pts[p.pts.length - 1];
            const color = p.color || 'var(--tpl-accent)';
            return (
              <g key={p.name}>
                <path
                  d={p.d}
                  fill="none"
                  stroke={color}
                  strokeWidth="5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ filter: 'drop-shadow(0 0 8px currentColor)', color }}
                />
                <circle cx={last.x} cy={last.y} r={10} fill={color} />
                <circle cx={last.x} cy={last.y} r={16} fill={color} opacity="0.25" />
                <text
                  x={last.x + 22}
                  y={last.y + 7}
                  fill={color}
                  fontFamily="var(--tpl-font-display)"
                  fontSize="28"
                  fontWeight="700"
                >
                  {last.val}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {safeData.events?.length > 0 && (
        <div className="race-events tpl-reveal">
          {safeData.events.map((ev) => (
            <span key={`${ev.matchday}-${ev.label}`} className="race-event">
              J{ev.matchday} · {ev.label}
            </span>
          ))}
        </div>
      )}

      {safeData.source && (
        <div className="race-source tpl-soft">Source · {safeData.source}</div>
      )}
    </TemplateFrame>
  );
});

RaceTracker.propTypes = {
  data: PropTypes.object,
  theme: PropTypes.string,
  fontPair: PropTypes.string,
  aspectRatio: PropTypes.oneOf(['9:16', '1:1', '16:9']),
  accent: PropTypes.string,
  scale: PropTypes.number,
};

export default RaceTracker;
