import React from 'react';
import { Link } from 'react-router-dom';

const SquadList = ({
    teams,
    selectedTeamId,
    setSelectedTeamId,
    squadLoading,
    teamSquad
}) => {
    return (
        <div className="space-y-6 animate-slide-up">
            <div className="flex items-center gap-3 mb-6 px-2">
                <span className="text-3xl">👥</span>
                <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400">
                    Participating Squads Directory
                </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {teams.map(team => {
                    const isExpanded = selectedTeamId === team.team_id;

                    return (
                        <div
                            key={team.team_id}
                            className={`bg-white dark:bg-slate-800 rounded-xl border transition-all duration-300 overflow-hidden ${isExpanded
                                    ? 'col-span-1 md:col-span-2 lg:col-span-3 border-blue-500 ring-1 ring-blue-500 shadow-xl z-10'
                                    : 'border-slate-200 dark:border-slate-700 hover:shadow-lg hover:-translate-y-1'
                                }`}
                        >
                            {/* Accordion Header */}
                            <div
                                className="p-4 cursor-pointer flex justify-between items-center bg-slate-50 dark:bg-slate-800/50 hover:bg-white dark:hover:bg-slate-700 transition-colors"
                                onClick={() => setSelectedTeamId(isExpanded ? null : team.team_id)}
                            >
                                <div className="flex items-center gap-4">
                                    <div className="bg-white dark:bg-slate-900 p-2 rounded-full shadow-sm border border-slate-100 dark:border-slate-800">
                                        <img src={team.team_logo} alt={team.team_name} className="w-8 h-8 object-contain" />
                                    </div>
                                    <div className="flex flex-col">
                                        <h3 className="font-bold text-slate-800 dark:text-slate-100 text-lg">{team.team_name}</h3>
                                        <div className="flex items-center gap-2 text-xs text-slate-500">
                                            <span className="bg-slate-200 dark:bg-slate-700 px-2 py-0.5 rounded-full text-slate-700 dark:text-slate-300 font-medium">
                                                {team.rank}th Place
                                            </span>
                                            <span>•</span>
                                            <span>{team.points} Pts</span>
                                        </div>
                                    </div>
                                </div>
                                <div className={`w-8 h-8 flex items-center justify-center rounded-full bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 transition-transform duration-300 ${isExpanded ? 'rotate-180 bg-blue-100 text-blue-600' : ''}`}>
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </div>
                            </div>

                            {/* Expanded Content */}
                            {isExpanded && (
                                <div className="p-6 border-t border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-900/50 animate-fade-in-down">
                                    {squadLoading ? (
                                        <div className="flex flex-col items-center justify-center py-12 text-slate-400 gap-3">
                                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                                            <p className="font-medium animate-pulse">Initializing roster matrix...</p>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                                            {teamSquad.map(player => (
                                                <Link
                                                    to={`/player/${player.player_id}`}
                                                    key={player.player_id}
                                                    className="group flex flex-col items-center p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 transition-all text-center"
                                                >
                                                    <div className="relative mb-3">
                                                        <img src={player.photo_url} alt={player.name} className="w-16 h-16 rounded-full object-cover border-2 border-slate-100 dark:border-slate-700 shadow-sm group-hover:scale-110 transition-transform duration-300" />
                                                        <div className="absolute -bottom-1 -right-1 bg-slate-900 text-white text-[10px] font-bold px-1.5 py-0.5 rounded border border-white dark:border-slate-800">
                                                            {player.position?.substring(0, 3).toUpperCase()}
                                                        </div>
                                                    </div>
                                                    <div className="w-full">
                                                        <div className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                                            {player.name}
                                                        </div>
                                                        <div className="flex justify-center gap-2 mt-1 text-xs text-slate-500 font-mono">
                                                            <span>{player.appearances}GP</span>
                                                            {player.goals > 0 && <span className="text-emerald-600 font-bold">{player.goals}G</span>}
                                                        </div>
                                                    </div>
                                                </Link>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default SquadList;
