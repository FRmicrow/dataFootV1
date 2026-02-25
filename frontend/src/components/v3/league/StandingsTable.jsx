import React, { useState } from 'react';
import { Link } from 'react-router-dom';

const StandingsTable = ({
    standings,
    rangeStart,
    setRangeStart,
    rangeEnd,
    setRangeEnd,
    handleRangeUpdate,
    isDynamicMode,
    loading
}) => {
    // Group standings by group_name
    const groupMap = standings.reduce((acc, curr) => {
        const group = curr.group_name || 'Standings';
        if (!acc[group]) acc[group] = [];
        acc[group].push(curr);
        return acc;
    }, {});

    const groups = Object.entries(groupMap);

    if (standings.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-gray-500 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
                <span className="text-4xl mb-4">📊</span>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">No Standing Data</h3>
                <p>Ingest real standings from API-Football to see the official table.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-slide-up">
            {groups.map(([groupName, teams], idx) => (
                <div key={groupName} className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
                        <h3 className="text-lg font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight">{groupName}</h3>

                        {/* Dynamic Controls (Only on first group for now) */}
                        {idx === 0 && (
                            <div className="flex items-center gap-3 text-sm">
                                <div className="flex items-center gap-2">
                                    <span className="text-slate-500">From</span>
                                    <input
                                        type="number"
                                        min="1"
                                        max="50"
                                        value={rangeStart}
                                        onChange={e => setRangeStart(e.target.value)}
                                        className="w-16 px-2 py-1 border rounded text-center dark:bg-slate-700 dark:border-slate-600"
                                    />
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-slate-500">To</span>
                                    <input
                                        type="number"
                                        min="1"
                                        max="50"
                                        value={rangeEnd}
                                        onChange={e => setRangeEnd(e.target.value)}
                                        className="w-16 px-2 py-1 border rounded text-center dark:bg-slate-700 dark:border-slate-600"
                                    />
                                </div>
                                <button
                                    onClick={handleRangeUpdate}
                                    disabled={loading}
                                    className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors disabled:opacity-50"
                                >
                                    {loading ? '...' : 'Apply'}
                                </button>
                                {isDynamicMode && (
                                    <button
                                        onClick={() => window.location.reload()}
                                        className="px-3 py-1 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors"
                                    >
                                        Reset
                                    </button>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-base text-left">
                            <thead className="text-sm text-slate-500 uppercase bg-slate-50 dark:bg-slate-700/50 dark:text-slate-400 font-black">
                                <tr>
                                    <th className="px-6 py-4 w-16 text-center">#</th>
                                    <th className="px-6 py-4">TEAM IDENTITY</th>
                                    <th className="px-4 py-4 text-center">P</th>
                                    <th className="px-4 py-4 text-center font-black text-emerald-600">W</th>
                                    <th className="px-4 py-4 text-center text-amber-600">D</th>
                                    <th className="px-4 py-4 text-center text-rose-600">L</th>
                                    <th className="px-4 py-4 text-center">+/-</th>
                                    <th className="px-6 py-4 text-center font-black text-slate-900 dark:text-white uppercase tracking-wider">Points</th>
                                    <th className="px-4 py-4 text-center hidden md:table-cell">FORM</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                {teams.map((t) => (
                                    <tr key={t.team_id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                                        <td className="px-6 py-4 text-center font-black text-slate-500">
                                            <span className={`inline-flex items-center justify-center w-8 h-8 rounded-xl text-sm ${t.rank <= 4 ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : t.rank >= 18 ? 'bg-red-600 text-white shadow-lg shadow-red-500/20' : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200'}`}>
                                                {t.rank}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <Link to={`/club/${t.team_id}`} className="flex items-center gap-4 hover:text-blue-600 dark:hover:text-blue-400 font-bold text-slate-900 dark:text-slate-100 transition-all group">
                                                <img src={t.team_logo} alt={t.team_name} className="w-8 h-8 object-contain drop-shadow-md group-hover:scale-110 transition-transform" onError={(e) => e.target.style.display = 'none'} />
                                                <span className="truncate">{t.team_name}</span>
                                            </Link>
                                        </td>
                                        <td className="px-4 py-4 text-center text-slate-600 dark:text-slate-400 font-bold">{t.played}</td>
                                        <td className="px-4 py-4 text-center font-black text-slate-900 dark:text-slate-100">{t.win}</td>
                                        <td className="px-4 py-4 text-center text-slate-500 font-medium">{t.draw}</td>
                                        <td className="px-4 py-4 text-center text-slate-500 font-medium">{t.lose}</td>
                                        <td className={`px-4 py-4 text-center font-black ${t.goals_diff > 0 ? 'text-emerald-600' : t.goals_diff < 0 ? 'text-rose-600' : 'text-slate-500'}`}>
                                            {t.goals_diff > 0 ? `+${t.goals_diff}` : t.goals_diff}
                                        </td>
                                        <td className="px-6 py-4 text-center font-black text-lg text-blue-600 dark:text-blue-400 bg-blue-500/5 dark:bg-blue-500/10">
                                            {t.points}
                                        </td>
                                        <td className="px-4 py-3 text-center hidden md:table-cell">
                                            <div className="flex items-center justify-center gap-1">
                                                {t.form?.split('').map((char, i) => (
                                                    <span
                                                        key={i}
                                                        className={`w-2 h-2 rounded-full ${char === 'W' ? 'bg-emerald-500' :
                                                            char === 'D' ? 'bg-amber-400' :
                                                                char === 'L' ? 'bg-rose-500' : 'bg-slate-300'
                                                            }`}
                                                        title={char}
                                                    />
                                                ))}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default StandingsTable;
