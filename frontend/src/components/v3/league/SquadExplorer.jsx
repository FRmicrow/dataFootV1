
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../../services/api';

const SquadExplorer = ({ leagueId, season, teams }) => {
    const [teamId, setTeamId] = useState('');
    const [position, setPosition] = useState('ALL');
    const [players, setPlayers] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const fetchExplorerData = async () => {
            setLoading(true);
            try {
                // api.getSeasonPlayers(id, year, params)
                const res = await api.getSeasonPlayers(leagueId, season, {
                    teamId: teamId,
                    position: position
                });
                setPlayers(res);
            } catch (err) {
                console.error("Failed to fetch explorer players:", err);
            } finally {
                setLoading(false);
            }
        };

        if (leagueId && season) {
            fetchExplorerData();
        }
    }, [leagueId, season, teamId, position]);

    return (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 animate-slide-up">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div>
                    <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                        <span>🔍</span> Squad Explorer
                    </h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                        Filter and analyze player performance across the league
                    </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                    <select
                        value={teamId}
                        onChange={(e) => setTeamId(e.target.value)}
                        className="px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                        <option value="">All Teams</option>
                        {teams.map(t => (
                            <option key={t.team_id} value={t.team_id}>{t.team_name}</option>
                        ))}
                    </select>

                    <select
                        value={position}
                        onChange={(e) => setPosition(e.target.value)}
                        className="px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                        <option value="ALL">All Positions</option>
                        <option value="Goalkeeper">Goalkeepers</option>
                        <option value="Defender">Defenders</option>
                        <option value="Midfielder">Midfielders</option>
                        <option value="Attacker">Attackers</option>
                    </select>
                </div>
            </div>

            <div className="overflow-x-auto">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-12 text-slate-400 gap-3">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                        <p className="font-medium animate-pulse">Querying V3 Dataset...</p>
                    </div>
                ) : (
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-slate-500 uppercase bg-slate-50 dark:bg-slate-700/50 dark:text-slate-400">
                            <tr>
                                <th className="px-4 py-3">Player</th>
                                <th className="px-4 py-3">Team</th>
                                <th className="px-4 py-3 text-center">Pos</th>
                                <th className="px-4 py-3 text-center">Apps</th>
                                <th className="px-4 py-3 text-center">Mins</th>
                                <th className="px-4 py-3 text-center text-emerald-600 font-bold">G</th>
                                <th className="px-4 py-3 text-center text-blue-600 font-bold">A</th>
                                <th className="px-4 py-3 text-center text-amber-500">Y</th>
                                <th className="px-4 py-3 text-center text-rose-500">R</th>
                                <th className="px-4 py-3 text-center">Rating</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                            {players.slice(0, 15).map((player) => (
                                <tr key={player.player_id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                                    <td className="px-4 py-3 font-medium">
                                        <Link to={`/player/${player.player_id}`} className="flex items-center gap-3 text-slate-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400">
                                            <img src={player.photo_url} alt="" className="w-8 h-8 rounded-full object-cover border border-slate-200 dark:border-slate-600" />
                                            <span>{player.name}</span>
                                        </Link>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                                            <img src={player.team_logo} alt="" className="w-5 h-5 object-contain" onError={(e) => e.target.style.display = 'none'} />
                                            <span className="truncate max-w-[120px]">{player.team_name}</span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wide
                                            ${player.position === 'Goalkeeper' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' : ''}
                                            ${player.position === 'Defender' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' : ''}
                                            ${player.position === 'Midfielder' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : ''}
                                            ${player.position === 'Attacker' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' : ''}
                                        `}>
                                            {player.position?.substring(0, 3)}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-center text-slate-600 dark:text-slate-400">{player.appearances}</td>
                                    <td className="px-4 py-3 text-center text-slate-500 text-xs">{player.minutes}'</td>
                                    <td className="px-4 py-3 text-center font-bold text-emerald-600">{player.goals}</td>
                                    <td className="px-4 py-3 text-center font-bold text-blue-600">{player.assists}</td>
                                    <td className="px-4 py-3 text-center text-slate-500">{player.yellow}</td>
                                    <td className="px-4 py-3 text-center text-slate-500">{player.red}</td>
                                    <td className="px-4 py-3 text-center">
                                        <span className={`inline-block px-2 py-1 rounded font-bold text-xs ${parseFloat(player.rating) >= 7.5 ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' :
                                                parseFloat(player.rating) >= 7.0 ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                                                    'bg-slate-100 text-slate-600 dark:bg-slate-700/50 dark:text-slate-400'
                                            }`}>
                                            {player.rating || '-'}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                            {players.length === 0 && (
                                <tr>
                                    <td colSpan="10" className="px-4 py-8 text-center text-slate-500">
                                        No players found matching current filters.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                )}
                {players.length >= 15 && (
                    <div className="px-6 py-3 border-t border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30 text-xs text-center text-slate-500">
                        Showing top 15 results. Refine filters for more specific search.
                    </div>
                )}
            </div>
        </div>
    );
};

export default SquadExplorer;
