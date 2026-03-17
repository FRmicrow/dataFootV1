import React from 'react';
import PropTypes from 'prop-types';
import SquadExplorer from './SquadExplorer';
import LeagueLeaders from './LeagueLeaders';
import { Stack, Accordion } from '../../../../design-system';

const LeaderTitle = () => (
    <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
        <span>🏅</span>
        <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-text-main)' }}>
            Joueurs en vue
        </span>
        <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-dim)' }}>
            Buteurs · Passeurs · MVP
        </span>
    </span>
);

const LeagueOverview = ({
    leagueId,
    season,
    standings,
    topScorers,
    topAssists,
    topRated
}) => {
    return (
        <Stack gap="var(--spacing-lg)" className="animate-fade-in scrollbar-custom" style={{ overflowY: 'auto', flex: 1, height: '100%', minHeight: 0 }}>
            <Accordion title={<LeaderTitle />} defaultExpanded maxHeight="none">
                <LeagueLeaders
                    topScorers={topScorers}
                    topAssists={topAssists}
                    topRated={topRated}
                />
            </Accordion>

            <SquadExplorer
                leagueId={leagueId}
                season={season}
                teams={standings}
            />
        </Stack>
    );
};

LeagueOverview.propTypes = {
    leagueId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    season: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    standings: PropTypes.array.isRequired,
    topScorers: PropTypes.array,
    topAssists: PropTypes.array,
    topRated: PropTypes.array
};

export default LeagueOverview;
