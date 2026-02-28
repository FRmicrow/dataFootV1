import React from 'react';
import { Card, Badge, Stack } from '../index';
import './LeagueCard.css';

/**
 * Reusable LeagueCard component for lists and featured grids.
 */
const LeagueCard = ({
    id,
    name,
    logo,
    rank,
    seasonsCount,
    isCup = false,
    onClick,
    countryName,
    countryFlag,
    tier,
    interactive = true,
    featured = false
}) => {
    return (
        <Card
            onClick={onClick}
            className={`ds-league-card ${featured ? 'ds-league-card--featured' : ''}`}
            extra={
                <Badge variant={isCup ? 'warning' : featured ? 'primary' : 'neutral'} size="xs">
                    {isCup ? 'Cup' : featured ? 'Elite' : 'League'}
                </Badge>
            }
            interactive={interactive}
        >
            <Stack direction="row" gap="var(--spacing-md)" align="center">
                <div className="ds-league-card-logo-wrap" data-featured={featured}>
                    <img src={logo} alt={name} loading="lazy" />
                </div>
                <div className="ds-league-card-info">
                    <Stack direction="row" gap="4px" align="center">
                        {countryFlag && <img src={countryFlag} alt="" className="ds-league-card-flag" />}
                        <h4 className="ds-league-card-name" title={name}>{name}</h4>
                    </Stack>
                    <Stack direction="row" gap="var(--spacing-sm)" align="center" style={{ marginTop: '2px' }}>
                        {rank && <span className="ds-league-card-meta">Tier #{rank}</span>}
                        {seasonsCount !== undefined && (
                            <span className="ds-league-card-meta">• {seasonsCount} Seasons</span>
                        )}
                        {countryName && !countryFlag && (
                            <span className="ds-league-card-meta">• {countryName}</span>
                        )}
                    </Stack>
                </div>
                {featured && (
                    <div className="ds-league-card-star" title="Featured Intelligence Module">⭐</div>
                )}
            </Stack>
        </Card>
    );
};

export default LeagueCard;
