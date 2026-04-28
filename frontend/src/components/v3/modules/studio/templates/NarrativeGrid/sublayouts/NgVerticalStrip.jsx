import React from 'react';
import PropTypes from 'prop-types';
import { matchShape, summaryShape } from './shapes';
import { hasAnyXg, formatScore, formatXg, sideBadge } from './utils';

/**
 * NgVerticalStrip — layout 9:16 (1080×1920).
 *
 * Disposition : header narratif en haut, summary band, puis pile verticale
 * de cards-match. Lecture top-down, 8 à 10 matchs lisibles.
 */
export default function NgVerticalStrip({
  eyebrow,
  headline,
  subtitle,
  summary,
  matches,
  takeaway,
  source,
  coverage,
}) {
  const showXg = hasAnyXg(matches);

  return (
    <div className="ng-strip">
      <header className="ng-header tpl-reveal">
        {eyebrow && <div className="tpl-eyebrow">{eyebrow}</div>}
        <h1 className="ng-title tpl-display">{headline}</h1>
        {subtitle && <p className="ng-subtitle tpl-soft">{subtitle}</p>}
      </header>

      {summary && (
        <section className="ng-summary-band tpl-reveal">
          {summary.record && <span className="ng-summary-record tpl-display">{summary.record}</span>}
          {summary.goals_for_total != null && summary.goals_against_total != null && (
            <span className="ng-summary-cell">
              <span className="ng-summary-label">Buts</span>
              <span className="ng-summary-value tpl-display">
                {summary.goals_for_total} <span className="ng-summary-sep">/</span> {summary.goals_against_total}
              </span>
            </span>
          )}
          {summary.xg_for_avg != null && summary.xg_against_avg != null && (
            <span className="ng-summary-cell">
              <span className="ng-summary-label">xG/m</span>
              <span className="ng-summary-value tpl-display">
                {formatXg(summary.xg_for_avg)} <span className="ng-summary-sep">/</span> {formatXg(summary.xg_against_avg)}
              </span>
            </span>
          )}
        </section>
      )}

      {coverage?.partial && (
        <div className="ng-coverage tpl-reveal" role="status">
          Couverture incomplète — {coverage.received}/{coverage.requested} matchs.
        </div>
      )}

      <ol className="ng-strip-list tpl-reveal">
        {matches.map((m, i) => (
          <li
            key={`${m.opponent}-${m.match_date || i}`}
            className={`ng-strip-row ng-row-${m.result.toLowerCase()}`}
            style={{ animationDelay: `${200 + i * 60}ms` }}
          >
            <span className={`ng-pill ng-pill-${m.result.toLowerCase()}`} aria-label={`Résultat ${m.result}`}>
              {m.result === 'W' ? 'V' : m.result === 'D' ? 'N' : 'D'}
            </span>
            <div className="ng-strip-body">
              <div className="ng-strip-line-top">
                <span className="ng-opponent tpl-display">{m.opponent}</span>
                <span className="ng-strip-side tpl-soft">{sideBadge(m.isHome)}</span>
                <span className="ng-strip-score tpl-display">{formatScore(m.score)}</span>
              </div>
              <div className="ng-strip-line-bottom tpl-soft">
                {m.meta && <span>{m.meta}</span>}
                {showXg && m.xg && m.xg.for != null && m.xg.against != null && (
                  <span className="ng-strip-xg">
                    xG {formatXg(m.xg.for)} / {formatXg(m.xg.against)}
                  </span>
                )}
              </div>
            </div>
          </li>
        ))}
      </ol>

      <footer className="ng-footer tpl-reveal">
        {takeaway && <p className="ng-takeaway tpl-display">{takeaway}</p>}
        {source && <span className="ng-source tpl-soft">Source · {source}</span>}
      </footer>
    </div>
  );
}

NgVerticalStrip.propTypes = {
  eyebrow: PropTypes.string,
  headline: PropTypes.string.isRequired,
  subtitle: PropTypes.string,
  summary: summaryShape,
  matches: PropTypes.arrayOf(matchShape).isRequired,
  takeaway: PropTypes.string,
  source: PropTypes.string,
  coverage: PropTypes.shape({
    requested: PropTypes.number,
    received: PropTypes.number,
    partial: PropTypes.bool,
  }),
};
