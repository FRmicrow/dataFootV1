import React from 'react';
import PropTypes from 'prop-types';

import ProfileHeader from './ProfileHeader';

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
                { label: `Season ${activeSeason}`, variant: 'neutral' }
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

LeagueHeader.propTypes = {
    league: PropTypes.shape({
        id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
        name: PropTypes.string.isRequired,
        logo: PropTypes.string,
        country: PropTypes.shape({
            name: PropTypes.string
        }),
        rank: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
        type: PropTypes.string
    }).isRequired,
    seasonsCount: PropTypes.number,
    activeSeason: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    actions: PropTypes.node
};


export default LeagueHeader;
