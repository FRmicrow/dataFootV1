import React, { useState } from 'react';
import SquadExplorer from './SquadExplorer';
import LeagueLeaders from './LeagueLeaders';
import SquadList from './SquadList';

const LeagueOverview = ({
    leagueId,
    season,
    standings,
    topScorers,
    topAssists,
    topRated,
    teamSquad,
    squadLoading,
    fetchSquad, // Function to fetch squad when team is selected
    selectedTeamId,
    setSelectedTeamId
}) => {
    // No internal state for selectedTeamId

    // The logic for fetching squad when a team is selected
    // should now be handled by the parent component that provides
    // selectedTeamId and setSelectedTeamId.
    // The previous handleTeamSelect wrapper is removed.

    return (
        <div className="space-y-8 animate-slide-up">

            {/* Top Grid: Explorer & Leaders */}
            <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 items-start">

                {/* Left: Squad Explorer (Takes 3/4 width) */}
                <div className="xl:col-span-3">
                    <SquadExplorer
                        leagueId={leagueId}
                        season={season}
                        teams={standings}
                    />
                </div>

                {/* Right: League Leaders (Takes 1/4 width) */}
                <div className="xl:col-span-1 h-full">
                    {/* For Leaders, we'll revert to vertical list to fit the narrow column */}
                    <div className="flex flex-col gap-6">
                        <LeagueLeaders
                            topScorers={topScorers}
                            topAssists={topAssists}
                            topRated={topRated}
                            layout="vertical"
                        />
                    </div>
                </div>
            </div>


        </div>
    );
};

export default LeagueOverview;
