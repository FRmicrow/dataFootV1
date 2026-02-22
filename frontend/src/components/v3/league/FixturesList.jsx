
import React, { useState, useMemo } from 'react';
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

    // US_082: Group fixtures by tie (for knockout rounds)
    const groupedFixtures = useMemo(() => {
        const groups = [];
        const processedIds = new Set();

        filteredFixtures.forEach(f => {
            if (processedIds.has(f.fixture_id)) return;

            // Find companion leg (if it exists)
            const companion = filteredFixtures.find(other =>
                other.fixture_id !== f.fixture_id &&
                ((other.home_team_id === f.away_team_id && other.away_team_id === f.home_team_id)) &&
                !processedIds.has(other.fixture_id)
            );

            if (companion) {
                // Determine aggregate
                const isFinalLeg = new Date(f.date) > new Date(companion.date);
                const firstLeg = isFinalLeg ? companion : f;
                const secondLeg = isFinalLeg ? f : companion;

                const score1 = (firstLeg.goals_home || 0) + (secondLeg.goals_away || 0);
                const score2 = (firstLeg.goals_away || 0) + (secondLeg.goals_home || 0);

                let winnerName = null;
                if (secondLeg.status_short === 'FT' || secondLeg.status_short === 'AET' || secondLeg.status_short === 'PEN') {
                    if (score1 > score2) winnerName = firstLeg.home_team_name;
                    else if (score2 > score1) winnerName = firstLeg.away_team_name;
                }

                groups.push({
                    type: 'TIE',
                    fixtures: [firstLeg, secondLeg],
                    aggregate: `${score1} - ${score2}`,
                    winner: winnerName
                });

                processedIds.add(firstLeg.fixture_id);
                processedIds.add(secondLeg.fixture_id);
            } else {
                groups.push({
                    type: 'SINGLE',
                    fixtures: [f]
                });
                processedIds.add(f.fixture_id);
            }
        });

        // Sort groups by date of the first fixture in each group
        return groups.sort((a, b) => new Date(a.fixtures[0].date) - new Date(b.fixtures[0].date));
    }, [filteredFixtures]);

    const FixtureRow = ({ f, isTiePart = false, isLastLeg = false, aggregate = null, winner = null }) => (
        <div
            className={`
                bg-white dark:bg-slate-800 transition-all duration-300 overflow-hidden
                ${isTiePart ? '' : 'rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm'}
                ${expandedFixtureId === f.fixture_id ? 'ring-2 ring-blue-500 z-10' : 'hover:bg-slate-50 dark:hover:bg-slate-700/30'}
                ${isTiePart && !isLastLeg ? 'border-b border-slate-100 dark:border-slate-700/50' : ''}
            `}
        >
            <div
                className="p-4 cursor-pointer grid grid-cols-12 gap-1 items-center relative"
                onClick={() => handleFixtureToggle(f.fixture_id)}
            >
                {/* Home Team (Cols 1-5) */}
                <div className="col-span-5 flex items-center justify-end gap-3 text-right">
                    <span className="text-sm font-bold text-slate-700 dark:text-slate-100 truncate">{f.home_team_name}</span>
                    <img src={f.home_team_logo} alt="" className="w-8 h-8 object-contain shrink-0" />
                </div>

                {/* Score & Status (Col 6-7 - Exactly centered) */}
                <div className="col-span-2 flex flex-col items-center justify-center min-w-[100px] gap-1 z-10">
                    {f.status_short === 'NS' ? (
                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">
                            {new Date(f.date).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 px-3 py-1 bg-slate-100 dark:bg-slate-900 rounded-xl font-mono text-lg font-black text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 shadow-sm">
                            <span>{f.goals_home ?? '-'}</span>
                            <span className="text-slate-400 text-sm">:</span>
                            <span>{f.goals_away ?? '-'}</span>
                        </div>
                    )}
                    <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${f.status_short === 'FT' ? 'bg-slate-100 text-slate-500' :
                        f.status_short === 'LIVE' ? 'bg-red-500/10 text-red-500 animate-pulse' :
                            'bg-blue-500/10 text-blue-500'
                        }`}>
                        {f.status_short}
                    </span>
                </div>

                {/* Away Team + Meta (Cols 8-12) */}
                <div className="col-span-5 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 overflow-hidden">
                        <img src={f.away_team_logo} alt="" className="w-8 h-8 object-contain shrink-0" />
                        <span className="text-sm font-bold text-slate-700 dark:text-slate-100 truncate">{f.away_team_name}</span>
                    </div>

                    {/* Date & Stadium Info (Positioned on the far right of the row) */}
                    <div className="hidden lg:flex flex-col items-end gap-1 min-w-[140px] border-l border-slate-100 dark:border-slate-800 pl-4 ml-2">
                        <div className="flex items-center gap-2 text-[9px] font-black text-slate-400 uppercase whitespace-nowrap">
                            <span>📅</span>
                            <span>{new Date(f.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                        </div>
                        <div className="flex items-center gap-2 text-[9px] font-bold text-slate-500 truncate max-w-[120px]">
                            <span>🏟️</span>
                            <span className="truncate">{f.venue_name || 'TBA'}</span>
                        </div>
                    </div>
                </div>

                {/* Aggregate Indicator (US_082) */}
                {isLastLeg && aggregate && (
                    <div className="absolute -right-2 top-1/2 -translate-y-1/2 translate-x-full hidden xl:flex flex-col items-start gap-1 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900/50 rounded-2xl min-w-[120px]">
                        <p className="text-[9px] font-black text-blue-400 uppercase tracking-widest leading-none">Aggregate</p>
                        <p className="text-xs font-black text-blue-600 dark:text-blue-300">{aggregate}</p>
                        {winner && (
                            <p className="text-[10px] font-bold text-slate-800 dark:text-slate-200">
                                🏆 <strong>{winner}</strong>
                            </p>
                        )}
                    </div>
                )}
            </div>

            {expandedFixtureId === f.fixture_id && (
                <div className="border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 w-full">
                    <InlineFixtureDetails
                        fixtureId={f.fixture_id}
                        homeTeamId={f.home_team_id}
                        awayTeamId={f.away_team_id}
                    />
                </div>
            )}
        </div>
    );

    // Detect Current Round (calculated same as in parent for consistency)
    const currentRound = useMemo(() => {
        const all = fixturesData.fixtures || [];
        const firstUnplayed = all.find(f => f.status_short === 'NS' || f.status_short === 'TBD');
        return firstUnplayed ? firstUnplayed.round : (all[all.length - 1]?.round || '');
    }, [fixturesData]);

    return (
        <div className="w-full space-y-8 animate-slide-up">
            {/* Round Navigator */}
            <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] shadow-sm border border-slate-200 dark:border-slate-700 p-6">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-[0.2em]">Match Schedule</h3>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                            <span className="text-[10px] font-black text-slate-400 uppercase">Current Day</span>
                        </div>
                        <span className="text-[10px] font-bold text-slate-400">{filteredFixtures.length} Matches</span>
                    </div>
                </div>
                <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide">
                    {(fixturesData.rounds || []).map(round => {
                        const isCurrent = round === currentRound;
                        const isSelected = round === selectedRound;

                        return (
                            <button
                                key={round}
                                className={`flex-shrink-0 px-5 py-2.5 rounded-2xl text-xs font-black transition-all border-2
                                    ${isSelected
                                        ? 'bg-blue-600 text-white border-blue-600 shadow-xl shadow-blue-500/20'
                                        : isCurrent
                                            ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 hover:bg-emerald-500/20'
                                            : 'bg-slate-50 text-slate-500 border-transparent hover:bg-slate-100 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-800'
                                    }`}
                                onClick={() => setSelectedRound(round)}
                            >
                                {round.replace('Regular Season - ', 'MATCHDAY ')}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Match Groups */}
            <div className="space-y-6">
                {groupedFixtures.length === 0 ? (
                    <div className="text-center py-24 bg-white dark:bg-slate-800 rounded-[3rem] border border-slate-200 dark:border-slate-800 border-dashed">
                        <span className="text-5xl block mb-4 opacity-20">🏟️</span>
                        <p className="text-slate-400 font-bold uppercase tracking-widest text-sm">No matches scheduled</p>
                    </div>
                ) : (
                    groupedFixtures.map((group, idx) => (
                        <div key={idx} className={group.type === 'TIE' ? 'bg-slate-50 dark:bg-slate-900/40 rounded-[2.5rem] p-2 border border-slate-200 dark:border-slate-800' : ''}>
                            {group.type === 'TIE' && (
                                <div className="px-6 py-2 flex justify-between items-center">
                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Double-leg Tie</span>
                                    <div className="xl:hidden bg-blue-500/10 text-blue-500 px-2 py-0.5 rounded-full text-[9px] font-black">
                                        AGG: {group.aggregate}
                                    </div>
                                </div>
                            )}
                            <div className={group.type === 'TIE' ? 'space-y-0 overflow-hidden rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm' : ''}>
                                {group.fixtures.map((f, fIdx) => (
                                    <FixtureRow
                                        key={f.fixture_id}
                                        f={f}
                                        isTiePart={group.type === 'TIE'}
                                        isLastLeg={group.type === 'TIE' && fIdx === 1}
                                        aggregate={group.aggregate}
                                        winner={group.winner}
                                    />
                                ))}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default FixturesList;
