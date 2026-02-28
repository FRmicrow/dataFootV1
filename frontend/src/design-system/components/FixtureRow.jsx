import React from 'react';
import { Stack, Grid, Badge } from '../index';
import './FixtureRow.css';

/**
 * Reusable FixtureRow for match lists and schedules.
 */
const FixtureRow = ({
    homeTeam,
    awayTeam,
    scoreHome,
    scoreAway,
    status,
    date,
    active = false,
    onClick,
    aggregate,
    winner
}) => {
    const isFinished = status === 'FT';
    const isLive = ['1H', '2H', 'HT', 'LIVE', 'P'].includes(status);

    const getStatusVariant = (s) => {
        if (s === 'FT') return 'neutral';
        if (isLive) return 'danger';
        return 'primary';
    };

    return (
        <div
            className={`ds-fixture-row ${active ? 'is-active' : ''}`}
            onClick={onClick}
        >
            <Grid columns="1fr 120px 1fr" gap="var(--spacing-md)" align="center">
                {/* Home Team */}
                <Stack direction="row" gap="var(--spacing-sm)" align="center" justify="flex-end" className="ds-fixture-team home">
                    <span className="ds-fixture-team-name">{homeTeam.name}</span>
                    <img src={homeTeam.logo} alt="" className="ds-fixture-logo" />
                </Stack>

                {/* Match Center */}
                <Stack align="center" gap="4px" className="ds-fixture-center">
                    <div className="ds-fixture-score-wrap">
                        {status === 'NS' || status === 'TBD' ? (
                            <span className="ds-fixture-time">
                                {new Date(date).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                            </span>
                        ) : (
                            <div className="ds-fixture-score">
                                <span className={isFinished && scoreHome > scoreAway ? 'is-winner' : ''}>{scoreHome ?? '-'}</span>
                                <span className="sep">:</span>
                                <span className={isFinished && scoreAway > scoreHome ? 'is-winner' : ''}>{scoreAway ?? '-'}</span>
                            </div>
                        )}
                    </div>
                    <Badge variant={getStatusVariant(status)} size="xs">
                        {status}
                    </Badge>
                </Stack>

                {/* Away Team */}
                <Stack direction="row" gap="var(--spacing-sm)" align="center" className="ds-fixture-team away">
                    <img src={awayTeam.logo} alt="" className="ds-fixture-logo" />
                    <span className="ds-fixture-team-name">{awayTeam.name}</span>
                </Stack>
            </Grid>

            {aggregate && (
                <div className="ds-fixture-extra">
                    <span className="agg">AGG: {aggregate}</span>
                    {winner && <span className="winner">🏆 {winner}</span>}
                </div>
            )}
        </div>
    );
};

export default FixtureRow;
