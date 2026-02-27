import React from 'react';
import SquadExplorer from './SquadExplorer';
import LeagueLeaders from './LeagueLeaders';
import { Grid, Stack } from '../../../design-system';

const LeagueOverview = ({
    leagueId,
    season,
    standings,
    topScorers,
    topAssists,
    topRated
}) => {
    return (
        <Stack gap="var(--spacing-lg)" className="animate-fade-in">
            {/* Top Grid: Explorer & Leaders */}
            <Grid columns="3fr 1fr" gap="var(--spacing-lg)">
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

export default LeagueOverview;
