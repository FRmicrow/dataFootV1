import React, { useState } from 'react';
import InlineFixtureDetails from '../InlineFixtureDetails';

const FixturesList = ({
    fixturesData,
    selectedRound,
    setSelectedRound
}) => {
    const [expandedFixtureId, setExpandedFixtureId] = useState(null);

    const filteredFixtures = (fixturesData.fixtures || []).filter(f => f.round === selectedRound);

    const handleFixtureToggle = (fixtureId) => {
        setExpandedFixtureId(expandedFixtureId === fixtureId ? null : fixtureId);
    };

    return (
        <div className="space-y-6 animate-slide-up">
            {/* Round Navigator */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-4">
                <label className="block text-xs font-bold text-slate-400 mb-2 uppercase tracking-wide">Match Day</label>
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-600">
                    {(fixturesData.rounds || []).map(round => (
                        <button
                            key={round}
                            className={`flex-shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-all ${selectedRound === round
                                    ? 'bg-blue-600 text-white shadow-md'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600'
                                }`}
                            onClick={() => setSelectedRound(round)}
                        >
                            {round.replace('Regular Season - ', 'Day ')}
                        </button>
                    ))}
                </div>
            </div>

            {/* Match List */}
            <div className="space-y-4">
                {filteredFixtures.length === 0 ? (
                    <div className="text-center py-12 text-slate-500 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                        No fixtures found for this round.
                    </div>
                ) : (
                    filteredFixtures.map(f => (
                        <div
                            key={f.fixture_id}
                            className={`bg-white dark:bg-slate-800 rounded-xl border transition-all duration-300 overflow-hidden ${expandedFixtureId === f.fixture_id
                                    ? 'border-blue-500 shadow-lg ring-1 ring-blue-500/20'
                                    : 'border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md hover:border-blue-300 dark:hover:border-blue-700'
                                }`}
                        >
                            {/* Match Header / Summary Row */}
                            <div
                                className="p-4 cursor-pointer grid grid-cols-[80px_1fr_80px_1fr_auto] md:grid-cols-[100px_1fr_100px_1fr_150px] items-center gap-4 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors"
                                onClick={() => handleFixtureToggle(f.fixture_id)}
                            >
                                {/* Time */}
                                <div className="text-center text-slate-500 text-xs md:text-sm">
                                    <div className="font-semibold text-slate-700 dark:text-slate-300">
                                        {new Date(f.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                    </div>
                                    <div className="text-slate-400">
                                        {new Date(f.date).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                </div>

                                {/* Home Team */}
                                <div className="flex items-center justify-end gap-3 text-right">
                                    <span className="font-semibold text-slate-800 dark:text-slate-100 hidden md:block">{f.home_team_name}</span>
                                    <span className="font-semibold text-slate-800 dark:text-slate-100 md:hidden">{f.home_team_name.substring(0, 3).toUpperCase()}</span>
                                    <img src={f.home_team_logo} alt={f.home_team_name} className="w-8 h-8 md:w-10 md:h-10 object-contain" />
                                </div>

                                {/* Score */}
                                <div className="flex justify-center">
                                    {f.status_short === 'FT' || f.status_short === 'AET' || f.status_short === 'PEN' ? (
                                        <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-900 px-3 py-1 rounded-lg font-mono font-bold text-lg md:text-xl text-slate-800 dark:text-white">
                                            <span>{f.goals_home}</span>
                                            <span className="text-slate-400 text-sm">-</span>
                                            <span>{f.goals_away}</span>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center">
                                            <span className="px-2 py-0.5 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 text-xs font-bold rounded uppercase">
                                                {f.status_short}
                                            </span>
                                            {f.elapsed && (
                                                <span className="text-xs text-emerald-600 font-mono mt-1 animate-pulse">
                                                    {f.elapsed}'
                                                </span>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Away Team */}
                                <div className="flex items-center justify-start gap-3 text-left">
                                    <img src={f.away_team_logo} alt={f.away_team_name} className="w-8 h-8 md:w-10 md:h-10 object-contain" />
                                    <span className="font-semibold text-slate-800 dark:text-slate-100 hidden md:block">{f.away_team_name}</span>
                                    <span className="font-semibold text-slate-800 dark:text-slate-100 md:hidden">{f.away_team_name.substring(0, 3).toUpperCase()}</span>
                                </div>

                                {/* Venue */}
                                <div className="hidden md:flex flex-col text-xs text-slate-500 text-right">
                                    <span className="font-medium text-slate-600 dark:text-slate-400 truncate max-w-[140px]">{f.venue_name}</span>
                                    <span className="truncate max-w-[140px]">{f.venue_city}</span>
                                </div>
                            </div>

                            {/* Expanded Content */}
                            {expandedFixtureId === f.fixture_id && (
                                <div className="border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-4">
                                    <InlineFixtureDetails
                                        fixtureId={f.fixture_id}
                                        homeTeamId={f.home_team_id}
                                        awayTeamId={f.away_team_id}
                                    />
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default FixturesList;
