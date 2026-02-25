
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../../services/api';

const SquadExplorer = ({ leagueId, season, teams }) => {
    const [teamId, setTeamId] = useState('');
    const [position, setPosition] = useState('ALL');
    const [players, setPlayers] = useState([]);
    const [loading, setLoading] = useState(false);

    // US_081 Sorting State
    const [sortConfig, setSortConfig] = useState({ key: 'goals', direction: 'DESC' });

    useEffect(() => {
        const fetchExplorerData = async () => {
            setLoading(true);
            try {
                // Fetch with explicit sorting
                const res = await api.getSeasonPlayers(leagueId, season, {
                    teamId: teamId,
                    position: position,
                    sortBy: sortConfig.key,
                    order: sortConfig.direction
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
    }, [leagueId, season, teamId, position, sortConfig]);

    const handleSort = (key) => {
        setSortConfig(prev => ({
            key,
            direction: prev.key === key && prev.direction === 'DESC' ? 'ASC' : 'DESC'
        }));
    };

    const SortableHeader = ({ label, sortKey, align = 'left', width }) => (
        <th
            className={`px-2 py-3 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors group ${align === 'center' ? 'text-center' : ''}`}
            style={width ? { width } : {}}
            onClick={() => handleSort(sortKey)}
        >
            <div className={`flex items-center gap-1 ${align === 'center' ? 'justify-center' : ''}`}>
                <span className="truncate">{label}</span>
                <span className={`text-[8px] transition-opacity ${sortConfig.key === sortKey ? 'opacity-100 text-blue-500' : 'opacity-0 group-hover:opacity-40'}`}>
                    {sortConfig.direction === 'DESC' ? '▼' : '▲'}
                </span>
            </div>
        </th>
    );

    return (
        <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 animate-slide-up h-[calc(100vh-210px)] flex flex-col">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 shrink-0">
                <div>
                    <h3 className="text-xl font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
                        <span>🔍</span> Squad Explorer
                    </h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                        Filter and analyze player performance
                    </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                    <select
                        value={teamId}
                        onChange={(e) => setTeamId(e.target.value)}
                        className="px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                        <option value="">All Teams</option>
                        {teams.map(t => (
                            <option key={t.team_id} value={t.team_id}>{t.team_name}</option>
                        ))}
                    </select>

                    <select
                        value={position}
                        onChange={(e) => setPosition(e.target.value)}
                        className="px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                        <option value="ALL">All Positions</option>
                        <option value="Goalkeeper">Goalkeepers</option>
                        <option value="Defender">Defenders</option>
                        <option value="Midfielder">Midfielders</option>
                        <option value="Attacker">Attackers</option>
                    </select>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto border border-slate-100 dark:border-slate-700 rounded-2xl scrollbar-thin overflow-x-hidden">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-24 text-slate-400 gap-3">
                        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                        <p className="text-[10px] font-black uppercase tracking-widest">Querying Dataset...</p>
                    </div>
                ) : (
                    <table className="w-full text-sm text-left border-collapse table-fixed">
                        <thead className="text-xs text-slate-500 uppercase bg-slate-50/80 dark:bg-slate-900/80 sticky top-0 z-10 border-b border-slate-200 dark:border-slate-800 font-black">
                            <tr>
                                <SortableHeader label="Player" sortKey="name" width="160px" />
                                <SortableHeader label="Team" sortKey="team" width="120px" />
                                <SortableHeader label="Pos" sortKey="pos" align="center" width="50px" />
                                <SortableHeader label="App" sortKey="apps" align="center" width="50px" />
                                <SortableHeader label="90s" sortKey="mins" align="center" width="50px" />
                                <SortableHeader label="G" sortKey="goals" align="center" width="40px" />
                                <SortableHeader label="A" sortKey="assists" align="center" width="40px" />
                                <SortableHeader label="Y" sortKey="yellow" align="center" width="40px" />
                                <SortableHeader label="Rat" sortKey="rating" align="center" width="60px" />
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {players.map((player) => (
                                <tr key={`${player.player_id}-${player.team_id}`} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors group">
                                    <td className="px-3 py-3">
                                        <Link to={`/player/${player.player_id}`} className="flex items-center gap-2 group/p">
                                            <div className="w-8 h-8 rounded-full overflow-hidden border border-slate-100 dark:border-slate-800 shrink-0">
                                                <img src={player.photo_url} alt="" className="w-full h-full object-cover" />
                                            </div>
                                            <span className="font-bold text-sm text-slate-800 dark:text-slate-200 group-hover/p:text-blue-600 dark:group-hover/p:text-blue-400 leading-tight">
                                                {player.name}
                                            </span>
                                        </Link>
                                    </td>
                                    <td className="px-3 py-3">
                                        <Link to={`/club/${player.team_id}`} className="flex items-center gap-2 group/t">
                                            <img src={player.team_logo} alt="" className="w-4 h-4 object-contain shrink-0" />
                                            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 group-hover/t:text-slate-900 dark:group-hover/t:text-slate-100 truncate">
                                                {player.team_name}
                                            </span>
                                        </Link>
                                    </td>
                                    <td className="px-1 py-3 text-center">
                                        <span className="text-xs font-black text-slate-400">{player.position?.substring(0, 1)}</span>
                                    </td>
                                    <td className="px-1 py-3 text-center text-sm font-bold text-slate-600 dark:text-slate-300">{player.appearances}</td>
                                    <td className="px-1 py-3 text-center text-xs font-medium text-slate-400">{Math.round(player.minutes / 90) || 0}</td>
                                    <td className={`px-1 py-3 text-center text-sm font-black ${player.goals > 0 ? 'text-emerald-500' : 'text-slate-300'}`}>{player.goals}</td>
                                    <td className={`px-1 py-3 text-center text-sm font-black ${player.assists > 0 ? 'text-blue-500' : 'text-slate-300'}`}>{player.assists}</td>
                                    <td className={`px-1 py-3 text-center text-sm font-black ${player.yellow > 0 ? 'text-amber-500' : 'text-slate-300'}`}>{player.yellow}</td>
                                    <td className="px-1 py-3 text-center">
                                        <span className="text-xs font-black text-blue-600 dark:text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded">
                                            {player.rating || '-'}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {!loading && players.length > 0 && (
                <div className="shrink-0 mt-4 flex items-center justify-between text-[10px] font-black uppercase text-slate-400 tracking-wider">
                    <span>{players.length} Players Identified</span>
                    <span className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                        Live Analysis Mode
                    </span>
                </div>
            )}
        </div>
    );
};

export default SquadExplorer;
