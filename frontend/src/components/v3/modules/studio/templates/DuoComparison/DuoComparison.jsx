import React, { forwardRef, useMemo } from 'react';
import PropTypes from 'prop-types';
import TemplateFrame from '../_shared/TemplateFrame';
import { assertValid } from '../_shared/validators';
import { contract } from './contract';
import demoData from './demo';
import './DuoComparison.css';

const SideBlock = ({ side, position }) => (
  <div className={`duo-side duo-side-${position} tpl-reveal`}>
    <div className="duo-side-heading">
      <div className="tpl-eyebrow">{side.subheading || position}</div>
      <div className="duo-side-title tpl-display">{side.heading}</div>
    </div>

    <div className="duo-members">
      {side.members.map((m, i) => (
        <div key={`${m.name}-${i}`} className="duo-member">
          <div className="duo-member-portrait">
            {m.portraitUrl ? (
              <img src={m.portraitUrl} alt={m.name} />
            ) : (
              <span className="duo-member-initial">
                {(m.name || '?').charAt(0)}
              </span>
            )}
          </div>
          <div className="duo-member-meta">
            <div className="duo-member-name">{m.name}</div>
            {m.role && <div className="duo-member-role tpl-soft">{m.role}</div>}
          </div>
        </div>
      ))}
    </div>

    <div className="duo-stats">
      {side.stats.map((s) => (
        <div key={s.label} className="duo-stat">
          <div className="duo-stat-label tpl-soft">{s.label}</div>
          <div className="duo-stat-value tpl-display">
            {s.value}
            {s.unit && <span className="duo-stat-unit tpl-soft"> {s.unit}</span>}
          </div>
        </div>
      ))}
    </div>
  </div>
);

SideBlock.propTypes = {
  side: PropTypes.object.isRequired,
  position: PropTypes.oneOf(['left', 'right']).isRequired,
};

/**
 * DuoComparison
 * DA par défaut : noir-gold. Pensé pour post 9:16 / 1:1, adapté en 16:9.
 */
const DuoComparison = forwardRef(function DuoComparison(
  { data = demoData, theme = 'noir-gold', fontPair, aspectRatio = '9:16', accent, scale },
  ref,
) {
  const safeData = useMemo(() => {
    assertValid(data, contract, 'DuoComparison');
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
      className="duo-comparison"
    >
      <header className="duo-header tpl-reveal">
        <span className="tpl-pill">Duel</span>
        <h1 className="duo-title tpl-display">{safeData.title}</h1>
        {safeData.subtitle && <p className="duo-subtitle tpl-soft">{safeData.subtitle}</p>}
      </header>

      <div className="duo-body">
        <SideBlock side={safeData.left} position="left" />
        <div className="duo-vs tpl-reveal" aria-hidden>
          <span>VS</span>
        </div>
        <SideBlock side={safeData.right} position="right" />
      </div>

      {safeData.verdict && (
        <footer className="duo-verdict tpl-reveal">
          <div className="tpl-divider" />
          <p className="duo-verdict-text">{safeData.verdict}</p>
          {safeData.footer?.source && (
            <p className="duo-footer-source tpl-soft">
              Source : {safeData.footer.source}
              {safeData.footer.era ? ` · ${safeData.footer.era}` : ''}
            </p>
          )}
        </footer>
      )}
    </TemplateFrame>
  );
});

DuoComparison.propTypes = {
  data: PropTypes.object,
  theme: PropTypes.string,
  fontPair: PropTypes.string,
  aspectRatio: PropTypes.oneOf(['9:16', '1:1', '16:9']),
  accent: PropTypes.string,
  scale: PropTypes.number,
};

export default DuoComparison;
