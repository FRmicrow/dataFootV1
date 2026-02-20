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
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* Left: Squad Explorer (Takes 2/3 width on large screens) */}
                <div className="lg:col-span-2">
                    <SquadExplorer
                        leagueId={leagueId}
                        season={season}
                        teams={standings}
                    />
                </div>

                {/* Right: League Leaders (Takes 1/3 width) */}
                <div className="lg:col-span-1">
                    <LeagueLeaders
                        topScorers={topScorers}
                        topAssists={topAssists}
                        topRated={topRated}
                    />
                </div>
            </div>

            {/* Bottom: Squad Directory */}
            <div className="pt-8 border-t border-slate-200 dark:border-slate-700">
                <SquadList
                    teams={standings}
                    selectedTeamId={selectedTeamId}
                    setSelectedTeamId={setSelectedTeamId}
                    squadLoading={squadLoading}
                    teamSquad={teamSquad}
                />
            </div>

        </div>
    );
};

export default LeagueOverview;
