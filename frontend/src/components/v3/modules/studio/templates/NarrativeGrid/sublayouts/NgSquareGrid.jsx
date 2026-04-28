import React from 'react';
import PropTypes from 'prop-types';
import { matchShape, summaryShape } from './shapes';
import { hasAnyXg, formatScore, formatXg, sideBadge, shortName } from './utils';

/**
 * NgSquareGrid — layout 1:1 (1080×1080).
 *
 * Tableau auto-suffisant : grille jusqu'à 5 colonnes × 2 lignes (10 matchs).
 * Header en haut, summary en bas. Chaque cellule = un match condensé.
 */
export default function NgSquareGrid({
  eyebrow,
  headline,
  subtitle,
  summary,
  matches,
  source,
  coverage,
}) {
  const showXg = hasAnyXg(matches);
  const cols = matches.length <= 6 ? 3 : matches.length <= 8 ? 4 : 5;

  return (
    <div className="ng-square">
      <header className="ng-header tpl-reveal">
        {eyebrow && <div className="tpl-eyebrow">{eyebrow}</div>}
        <h1 className="ng-title tpl-display">{headline}</h1>
        {subtitle && <p className="ng-subtitle tpl-soft">{subtitle}</p>}
      </header>

      {coverage?.partial && (
        <div className="ng-coverage tpl-reveal" role="status">
          Couverture incomplète — {coverage.received}/{coverage.requested} matchs.
        </div>
      )}

      <div
        className="ng-square-grid tpl-reveal"
        style={{ '--ng-square-cols': cols }}
      >
        {matches.map((m, i) => (
          <article
            key={`${m.opponent}-${m.match_date || i}`}
            className={`ng-square-cell ng-cell-${m.result.toLowerCase()}`}
            style={{ animationDelay: `${150 + i * 40}ms` }}
          >
            <header className="ng-square-cell-head">
              <span className="ng-opponent-short tpl-display">{shortName(m.opponent)}</span>
              <span className="ng-square-score tpl-display">{formatScore(m.score)}</span>
            </header>
            <div className="ng-square-cell-meta tpl-soft">
              <span className={`ng-pill ng-pill-${m.result.toLowerCase()}`}>
                {m.result === 'W' ? 'V' : m.result === 'D' ? 'N' : 'D'}
              </span>
              <span>{sideBadge(m.isHome)}</span>
            </div>
            {showXg && m.xg && m.xg.for != null && m.xg.against != null && (
              <div className="ng-square-cell-xg tpl-soft">
                <span>xG</span>
                <span className="tpl-display">{formatXg(m.xg.for)}</span>
                <span>/</span>
                <span className="tpl-display">{formatXg(m.xg.against)}</span>
              </div>
            )}
          </article>
        ))}
      </div>

      <footer className="ng-square-footer tpl-reveal">
        {summary && (
          <div className="ng-summary-line">
            {summary.record && <span className="tpl-display">{summary.record}</span>}
            {summary.goals_for_total != null && summary.goals_against_total != null && (
              <span>
                · GF <strong className="tpl-display">{summary.goals_for_total}</strong> / GA <strong className="tpl-display">{summary.goals_against_total}</strong>
              </span>
            )}
            {summary.xg_for_avg != null && summary.xg_against_avg != null && (
              <span>
                · xG/m <strong className="tpl-display">{formatXg(summary.xg_for_avg)}</strong> vs <strong className="tpl-display">{formatXg(summary.xg_against_avg)}</strong>
              </span>
            )}
          </div>
        )}
        {source && <span className="ng-source tpl-soft">Source · {source}</span>}
      </footer>
    </div>
  );
}

NgSquareGrid.propTypes = {
  eyebrow: PropTypes.string,
  headline: PropTypes.string.isRequired,
  subtitle: PropTypes.string,
  summary: summaryShape,
  matches: PropTypes.arrayOf(matchShape).isRequired,
  source: PropTypes.string,
  coverage: PropTypes.shape({
    requested: PropTypes.number,
    received: PropTypes.number,
    partial: PropTypes.bool,
  }),
};
