import React from 'react';
import PropTypes from 'prop-types';
import SquadExplorer from './SquadExplorer';
import LeagueLeaders from './LeagueLeaders';
import { Grid, Stack } from '../../../../design-system';

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
            {/* Top Grid: Explorer & Leaders */}
            <Grid columns="3fr 1fr" gap="var(--spacing-lg)" style={{ flex: 1, height: '100%', minHeight: 0 }}>
                {/* Left: Squad Explorer */}
                <SquadExplorer
                    leagueId={leagueId}
                    season={season}
                    teams={standings}
                />

                {/* Right: League Leaders */}
                <LeagueLeaders
                    topScorers={topScorers}
                    topAssists={topAssists}
                    topRated={topRated}
                    layout="vertical"
                />
            </Grid>
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
