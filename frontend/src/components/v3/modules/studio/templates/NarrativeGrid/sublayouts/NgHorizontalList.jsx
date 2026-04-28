import React from 'react';
import PropTypes from 'prop-types';
import { matchShape, summaryShape } from './shapes';
import { hasAnyXg, formatScore, formatXg, sideBadge, shortName } from './utils';

/**
 * NgHorizontalList — layout 16:9 (1920×1080).
 *
 * Disposition : colonne gauche fixée (~32%) avec eyebrow + headline + summary,
 * colonne droite fluide qui liste 1 match par ligne.
 */
export default function NgHorizontalList({
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
    <div className="ng-horiz">
      <aside className="ng-horiz-left tpl-reveal">
        {eyebrow && <div className="tpl-eyebrow">{eyebrow}</div>}
        <h1 className="ng-title tpl-display">{headline}</h1>
        {subtitle && <p className="ng-subtitle tpl-soft">{subtitle}</p>}

        {summary && (
          <dl className="ng-horiz-summary">
            {summary.record && (
              <div className="ng-horiz-summary-row">
                <dt className="tpl-soft">Bilan</dt>
                <dd className="tpl-display">{summary.record}</dd>
              </div>
            )}
            {summary.goals_for_total != null && summary.goals_against_total != null && (
              <div className="ng-horiz-summary-row">
                <dt className="tpl-soft">Buts</dt>
                <dd className="tpl-display">
                  {summary.goals_for_total} <span className="ng-summary-sep">/</span> {summary.goals_against_total}
                </dd>
              </div>
            )}
            {summary.xg_for_avg != null && summary.xg_against_avg != null && (
              <div className="ng-horiz-summary-row">
                <dt className="tpl-soft">xG / m</dt>
                <dd className="tpl-display">
                  {formatXg(summary.xg_for_avg)} <span className="ng-summary-sep">vs</span> {formatXg(summary.xg_against_avg)}
                </dd>
              </div>
            )}
          </dl>
        )}

        {coverage?.partial && (
          <div className="ng-coverage" role="status">
            Couverture incomplète — {coverage.received}/{coverage.requested} matchs.
          </div>
        )}

        {takeaway && <p className="ng-takeaway tpl-display">{takeaway}</p>}
        {source && <span className="ng-source tpl-soft">Source · {source}</span>}
      </aside>

      <ol className="ng-horiz-list tpl-reveal">
        {matches.map((m, i) => (
          <li
            key={`${m.opponent}-${m.match_date || i}`}
            className={`ng-horiz-row ng-row-${m.result.toLowerCase()}`}
            style={{ animationDelay: `${150 + i * 40}ms` }}
          >
            <span className="ng-horiz-opponent tpl-display">
              <span className="ng-opponent-short">{shortName(m.opponent)}</span>
              <span className="ng-opponent-full tpl-soft">{m.opponent}</span>
            </span>
            <span className="ng-horiz-score tpl-display">{formatScore(m.score)}</span>
            {showXg && (
              <span className="ng-horiz-xg tpl-soft">
                {m.xg && m.xg.for != null && m.xg.against != null
                  ? `xG ${formatXg(m.xg.for)} / ${formatXg(m.xg.against)}`
                  : ''}
              </span>
            )}
            <span className={`ng-pill ng-pill-${m.result.toLowerCase()}`}>
              {m.result === 'W' ? 'V' : m.result === 'D' ? 'N' : 'D'}
            </span>
            <span className="ng-horiz-side tpl-soft">{sideBadge(m.isHome)}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

NgHorizontalList.propTypes = {
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
