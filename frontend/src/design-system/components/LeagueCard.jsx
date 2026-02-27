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
    interactive = true
}) => {
    return (
        <Card
            onClick={onClick}
            className="ds-league-card"
            extra={
                <Badge variant={isCup ? 'warning' : 'primary'} size="sm">
                    {isCup ? 'Cup' : 'League'}
                </Badge>
            }
            interactive={interactive}
        >
            <Stack direction="row" gap="var(--spacing-md)" align="center">
                <div className="ds-league-card-logo-wrap">
                    <img src={logo} alt={name} loading="lazy" />
                </div>
                <div className="ds-league-card-info">
                    <h4 className="ds-league-card-name" title={name}>{name}</h4>
                    <Stack direction="row" gap="var(--spacing-sm)" align="center">
                        {rank && <span className="ds-league-card-meta">Rank #{rank}</span>}
                        {seasonsCount !== undefined && (
                            <span className="ds-league-card-meta">• {seasonsCount} Seasons</span>
                        )}
                    </Stack>
                    {(countryName || countryFlag) && (
                        <div className="ds-league-card-country mt-2xs">
                            {countryFlag && <img src={countryFlag} alt="" className="ds-league-card-flag" />}
                            <span className="ds-league-card-country-name">{countryName}</span>
                        </div>
                    )}
                </div>
            </Stack>
        </Card>
    );
};

export default LeagueCard;
