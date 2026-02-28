import React from 'react';
import { ProfileHeader } from '../index';

/**
 * Domain-specific header for Leagues.
 * Wraps ProfileHeader with league-specific defaults.
 */
const LeagueHeader = ({
    league,
    seasonsCount,
    activeSeason,
    actions
}) => {
    if (!league) return null;

    return (
        <ProfileHeader
            title={league.name}
            leagueId={league.id}
            subtitles={[
                league.country?.name || 'International',
                `Tier #${league.rank || 'N/A'}`,
                `${seasonsCount || 0} Synced Cycles`
            ]}
            image={league.logo}
            badges={[
                { label: league.type === 'league' ? 'League' : 'Cup', variant: league.type === 'league' ? 'primary' : 'warning' },
                { label: `Season ${activeSeason}`, variant: 'neutral', icon: '📅' }
            ]}
            actions={actions}
            genericData={[
                `Tier #${league.rank || 'N/A'}`,
                `${seasonsCount || 0} Synced Cycles`
            ]}
            stats={[
                { label: 'Intelligence Rating', value: 'Elite' },
                { label: 'Data Nodes', value: seasonsCount || '--' },
                { label: 'Refresh Rate', value: 'High' }
            ]}
        />
    );
};

export default LeagueHeader;
