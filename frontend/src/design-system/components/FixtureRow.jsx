import React from 'react';
import PropTypes from 'prop-types';
import './FixtureRow.css';

/**
 * FixtureRow — compact single-line layout:
 * [name] [logo] [xG] | [score H – score A] | [xG] [logo] [name]
 * compact=true → hides xG columns, allows name wrapping (for narrow contexts)
 */
const FixtureRow = ({
    homeTeam,
    awayTeam,
    scoreHome,
    scoreAway,
    xgHome,
    xgAway,
    status,
    date,
    active = false,
    onClick,
    compact = false,
}) => {
    const isFinished = status === 'FT';
    const isLive     = ['1H', '2H', 'HT', 'LIVE', 'P'].includes(status);

    const hasXg = !compact && xgHome != null && xgAway != null;

    const isNS = status === 'NS' || status === 'TBD';
    const kickoffTime = isNS
        ? new Date(date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
        : null;

    return (
        <div
            className={`ds-fixture-row${active ? ' is-active' : ''}${compact ? ' ds-fixture-row--compact' : ''}`}
            onClick={onClick}
            onKeyDown={(e) => {
                if (onClick && (e.key === 'Enter' || e.key === ' ')) {
                    e.preventDefault();
                    onClick(e);
                }
            }}
            role="button"
            tabIndex={0}
            aria-expanded={active}
        >
            <div className="ds-fr-grid">
                {/* Home name */}
                <span className="ds-fr-name ds-fr-name--home">{homeTeam.name}</span>

                {/* Home logo */}
                {homeTeam.logo
                    ? <img src={homeTeam.logo} alt="" className="ds-fr-logo" />
                    : <span className="ds-fr-logo ds-fr-logo--placeholder" />
                }

                {/* Home xG */}
                <span className="ds-fr-xg ds-fr-xg--home">
                    {hasXg ? xgHome.toFixed(2) : ''}
                </span>

                {/* Score / time — no badge, status communicated via color/dot */}
                <div className="ds-fr-center">
                    {isNS ? (
                        <span className="ds-fr-time">{kickoffTime}</span>
                    ) : (
                        <span className="ds-fr-score">
                            <span className={isFinished && scoreHome > scoreAway ? 'ds-fr-score__winner' : ''}>
                                {scoreHome ?? '–'}
                            </span>
                            <span className="ds-fr-score__sep">:</span>
                            <span className={isFinished && scoreAway > scoreHome ? 'ds-fr-score__winner' : ''}>
                                {scoreAway ?? '–'}
                            </span>
                        </span>
                    )}
                    {isLive && (
                        <span className="ds-fr-live-label">{status}</span>
                    )}
                </div>

                {/* Away xG */}
                <span className="ds-fr-xg ds-fr-xg--away">
                    {hasXg ? xgAway.toFixed(2) : ''}
                </span>

                {/* Away logo */}
                {awayTeam.logo
                    ? <img src={awayTeam.logo} alt="" className="ds-fr-logo" />
                    : <span className="ds-fr-logo ds-fr-logo--placeholder" />
                }

                {/* Away name */}
                <span className="ds-fr-name ds-fr-name--away">{awayTeam.name}</span>
            </div>
        </div>
    );
};

FixtureRow.propTypes = {
    homeTeam: PropTypes.shape({
        name: PropTypes.string.isRequired,
        logo: PropTypes.string,
    }).isRequired,
    awayTeam: PropTypes.shape({
        name: PropTypes.string.isRequired,
        logo: PropTypes.string,
    }).isRequired,
    scoreHome: PropTypes.number,
    scoreAway: PropTypes.number,
    xgHome:    PropTypes.number,
    xgAway:    PropTypes.number,
    status:    PropTypes.string,
    date:      PropTypes.string,
    active:    PropTypes.bool,
    onClick:   PropTypes.func,
    compact:   PropTypes.bool,
};

export default FixtureRow;
