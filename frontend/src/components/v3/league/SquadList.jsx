
import React, { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';

const SquadList = ({
    teams,
    selectedTeamId,
    setSelectedTeamId,
    squadLoading,
    teamSquad
}) => {
    const [selectedPlayer, setSelectedPlayer] = useState(null);

    // Ensure we have a selection if none
    useEffect(() => {
        if (!selectedTeamId && teams.length > 0) {
            setSelectedTeamId(teams[0].team_id);
        }
    }, [teams, selectedTeamId, setSelectedTeamId]);

    // Position counts
    const counts = useMemo(() => {
        const acc = { GK: 0, DF: 0, MF: 0, FW: 0, total: teamSquad.length };
        teamSquad.forEach(p => {
            const pos = p.position?.toLowerCase();
            if (pos?.includes('goalkeeper')) acc.GK++;
            else if (pos?.includes('defender')) acc.DF++;
            else if (pos?.includes('midfielder')) acc.MF++;
            else if (pos?.includes('attacker') || pos?.includes('forward')) acc.FW++;
        });
        return acc;
    }, [teamSquad]);

    // Categorize and sort players
    const categorizedSquad = useMemo(() => {
        const groups = {
            'Goalkeepers': [],
            'Defenders': [],
            'Midfielders': [],
            'Attackers': []
        };

        teamSquad.forEach(p => {
            const pos = p.position?.toLowerCase();
            if (pos?.includes('goalkeeper')) groups['Goalkeepers'].push(p);
            else if (pos?.includes('defender')) groups['Defenders'].push(p);
            else if (pos?.includes('midfielder')) groups['Midfielders'].push(p);
            else if (pos?.includes('attacker') || pos?.includes('forward')) groups['Attackers'].push(p);
        });

        // Sort each category by appearances DESC
        Object.keys(groups).forEach(key => {
            groups[key].sort((a, b) => (b.appearances || 0) - (a.appearances || 0));
        });

        return groups;
    }, [teamSquad]);

    // Use loose comparison or cast to handle possible type mismatch from params/API
    const activeTeam = teams.find(t => String(t.team_id) === String(selectedTeamId));

    return (
        <div className="flex flex-col lg:flex-row h-[calc(100vh-210px)] bg-white dark:bg-slate-900 rounded-[2.5rem] overflow-hidden border border-slate-200 dark:border-slate-800 shadow-2xl animate-slide-up relative">

            {/* LEFT PANEL: Team Selector */}
            <aside className="w-full lg:w-[350px] border-r border-slate-200 dark:border-slate-800 flex flex-col bg-slate-50 dark:bg-slate-900/40">
                <div className="p-8 border-b border-slate-200 dark:border-slate-800">
                    <h3 className="text-xl font-black text-slate-800 dark:text-white flex items-center gap-2">
                        <span>🛡️</span> Roster Hub
                    </h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Select a club to explore</p>
                </div>

                <div className="flex-1 overflow-y-auto p-3 space-y-1.5 scrollbar-hide">
                    {teams.map(team => {
                        const isSelected = String(team.team_id) === String(selectedTeamId);
                        return (
                            <button
                                key={team.team_id}
                                onClick={() => setSelectedTeamId(team.team_id)}
                                className={`
                                    w-full flex items-center gap-4 p-4 rounded-[1.5rem] transition-all duration-300 group
                                    ${isSelected
                                        ? 'bg-blue-600 text-white shadow-xl shadow-blue-500/30 translate-x-1'
                                        : 'hover:bg-slate-200/60 dark:hover:bg-slate-800/60 text-slate-600 dark:text-slate-400'}
                                `}
                            >
                                <div className={`p-1.5 rounded-xl bg-white shadow-sm border ${isSelected ? 'border-transparent' : 'border-slate-100 dark:border-slate-700'}`}>
                                    <img src={team.team_logo} alt="" className="w-8 h-8 object-contain" />
                                </div>
                                <div className="text-left flex-1 min-w-0">
                                    <p className={`font-black text-base truncate ${isSelected ? 'text-white' : 'text-slate-800 dark:text-slate-200'}`}>
                                        {team.team_name}
                                    </p>
                                    <div className="flex items-center gap-1.5 mt-0.5">
                                        <span className={`text-xs font-black uppercase ${isSelected ? 'text-blue-100' : 'text-slate-400'}`}>
                                            Rank #{team.rank}
                                        </span>
                                        <span className={isSelected ? 'text-blue-200/50' : 'text-slate-300'}>•</span>
                                        <span className={`text-xs font-bold ${isSelected ? 'text-blue-50' : 'text-slate-500'}`}>
                                            {team.points} Pts
                                        </span>
                                    </div>
                                </div>
                                {isSelected && (
                                    <div className="w-1.5 h-6 bg-white rounded-full"></div>
                                )}
                            </button>
                        );
                    })}
                </div>
            </aside>

            {/* RIGHT PANEL: Squad Details */}
            <main className="flex-1 flex flex-col min-w-0 bg-white dark:bg-slate-900">
                {!selectedTeamId ? (
                    <div className="flex-1 flex flex-col items-center justify-center p-12 text-slate-400">
                        <div className="w-24 h-24 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-4xl mb-6 animate-bounce">
                            🔎
                        </div>
                        <h3 className="text-xl font-black text-slate-800 dark:text-white mb-2">No Club Selected</h3>
                        <p className="text-sm font-medium">Choose a team from the left panel to analyze their roster.</p>
                    </div>
                ) : (
                    <>
                        {/* Detail Header */}
                        <div className="p-6 lg:p-8 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20 flex flex-col sm:flex-row items-center justify-between gap-6">
                            <div className="flex items-center gap-6">
                                <div className="w-20 h-20 bg-white dark:bg-slate-800 p-3 rounded-3xl shadow-xl border border-slate-100 dark:border-slate-700">
                                    <img src={activeTeam?.team_logo} alt="" className="w-full h-full object-contain" />
                                </div>
                                <div>
                                    <h2 className="text-3xl font-black text-slate-900 dark:text-white leading-tight">
                                        {activeTeam?.team_name}
                                    </h2>
                                    <div className="flex items-center gap-3 mt-2">
                                        <span className="flex items-center gap-1.5 bg-blue-500/10 text-blue-600 dark:text-blue-400 text-sm font-black px-4 py-1.5 rounded-full border border-blue-500/20 uppercase tracking-tighter">
                                            {counts.total} Registered Players
                                        </span>
                                        <div className="flex gap-2">
                                            <div className="px-3 py-1 bg-yellow-500/10 text-yellow-600 text-xs font-bold rounded-md border border-yellow-500/20">GK: {counts.GK}</div>
                                            <div className="px-3 py-1 bg-blue-500/10 text-blue-600 text-xs font-bold rounded-md border border-blue-500/20">DF: {counts.DF}</div>
                                            <div className="px-3 py-1 bg-green-500/10 text-green-600 text-xs font-bold rounded-md border border-green-500/20">MF: {counts.MF}</div>
                                            <div className="px-3 py-1 bg-red-500/10 text-red-600 text-xs font-bold rounded-md border border-red-500/20">FW: {counts.FW}</div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <Link to={`/club/${selectedTeamId}`} className="px-6 py-2.5 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs font-black rounded-2xl hover:scale-105 transition-transform">
                                VIEW CLUB PROFILE
                            </Link>
                        </div>

                        {/* Roster Scrollable */}
                        <div className="flex-1 overflow-y-auto p-6 lg:p-8 scrollbar-thin space-y-12">
                            {squadLoading ? (
                                <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-4">
                                    <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                                    <p className="font-black text-xs uppercase tracking-widest">Compiling Stats...</p>
                                </div>
                            ) : (
                                Object.entries(categorizedSquad).map(([category, players]) => (
                                    players.length > 0 && (
                                        <div key={category}>
                                            <h4 className="text-sm font-black text-slate-400 uppercase tracking-[0.2em] mb-4 border-l-4 border-blue-500 pl-4">
                                                {category}
                                            </h4>
                                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                                                {players.map((player) => (
                                                    <Link
                                                        key={player.player_id}
                                                        to={`/player/${player.player_id}`}
                                                        className="group flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-blue-500 dark:hover:border-blue-500/50 hover:shadow-xl hover:-translate-y-1 transition-all text-left"
                                                    >
                                                        <div className="relative shrink-0">
                                                            <img src={player.photo_url} alt="" className="w-14 h-14 rounded-full object-cover border-2 border-white dark:border-slate-700 shadow-sm" />
                                                            <div className={`absolute -bottom-1 -right-1 w-6 h-6 flex items-center justify-center rounded-lg text-[9px] font-black text-white border border-white dark:border-slate-900 
                                                                ${player.position?.includes('Goalkeeper') ? 'bg-yellow-500' : ''}
                                                                ${player.position?.includes('Defender') ? 'bg-blue-500' : ''}
                                                                ${player.position?.includes('Midfielder') ? 'bg-green-500' : ''}
                                                                ${player.position?.includes('Attacker') || player.position?.includes('Forward') ? 'bg-red-500' : ''}
                                                            `}>
                                                                {player.position?.substring(0, 1).toUpperCase()}
                                                            </div>
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="font-black text-base text-slate-800 dark:text-slate-100 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                                                {player.name}
                                                            </p>
                                                            <div className="flex items-center gap-3 mt-1.5">
                                                                <div className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1">
                                                                    <span className="text-slate-400">Apps:</span> {player.appearances}
                                                                </div>
                                                                {player.goals > 0 && (
                                                                    <div className="text-xs font-bold text-emerald-600 uppercase flex items-center gap-1">
                                                                        <span>⚽</span> {player.goals}
                                                                    </div>
                                                                )}
                                                                {player.rating && (
                                                                    <div className="text-xs font-black text-blue-500 bg-blue-500/10 px-2 py-1 rounded-md">
                                                                        ⭐ {player.rating}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </Link>
                                                ))}
                                            </div>
                                        </div>
                                    )
                                ))
                            )}
                        </div>
                    </>
                )}
            </main>

            {/* PLAYER PROFILE CARD MODAL (US_083) */}
            {selectedPlayer && (
                <div className="absolute inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-[40px] shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 animate-scale-in">
                        <div className="relative h-48 bg-gradient-to-br from-blue-600 to-indigo-900">
                            <button
                                onClick={() => setSelectedPlayer(null)}
                                className="absolute top-6 right-6 w-10 h-10 bg-black/20 hover:bg-black/40 text-white rounded-full flex items-center justify-center backdrop-blur-md transition-all"
                            >
                                ✕
                            </button>
                            <div className="absolute -bottom-12 left-8 flex items-end gap-6">
                                <div className="w-32 h-32 rounded-[2rem] overflow-hidden border-4 border-white dark:border-slate-900 shadow-2xl bg-slate-100">
                                    <img src={selectedPlayer.photo_url} alt="" className="w-full h-full object-cover" />
                                </div>
                                <div className="mb-4">
                                    <h2 className="text-3xl font-black text-white leading-none">{selectedPlayer.name}</h2>
                                    <p className="text-blue-200 text-xs font-bold uppercase tracking-widest mt-2">{selectedPlayer.position}</p>
                                </div>
                            </div>
                        </div>

                        <div className="pt-16 p-8">
                            <div className="grid grid-cols-3 gap-4 mb-8">
                                <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-3xl text-center">
                                    <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Age</p>
                                    <p className="text-xl font-black text-slate-800 dark:text-white">{selectedPlayer.age || 'N/A'}</p>
                                </div>
                                <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-3xl text-center">
                                    <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Height</p>
                                    <p className="text-xl font-black text-slate-800 dark:text-white">{selectedPlayer.height || '-'}</p>
                                </div>
                                <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-3xl text-center">
                                    <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Rating</p>
                                    <p className="text-xl font-black text-blue-600">⭐ {selectedPlayer.rating || '-'}</p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Live Season Statistics</h4>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl">
                                        <span className="text-xs font-bold text-slate-600 dark:text-slate-400">Total Apps</span>
                                        <span className="text-sm font-black text-slate-800 dark:text-white">{selectedPlayer.appearances}</span>
                                    </div>
                                    <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl">
                                        <span className="text-xs font-bold text-slate-600 dark:text-slate-400">Minutes</span>
                                        <span className="text-sm font-black text-slate-800 dark:text-white">{selectedPlayer.minutes}'</span>
                                    </div>
                                    <div className="flex items-center justify-between p-4 bg-emerald-500/5 rounded-2xl border border-emerald-500/10">
                                        <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">Goals</span>
                                        <span className="text-sm font-black text-emerald-600">{selectedPlayer.goals}</span>
                                    </div>
                                    <div className="flex items-center justify-between p-4 bg-blue-500/5 rounded-2xl border border-blue-500/10">
                                        <span className="text-xs font-bold text-blue-700 dark:text-blue-400">Assists</span>
                                        <span className="text-sm font-black text-blue-600">{selectedPlayer.assists}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-8 flex gap-3">
                                <Link
                                    to={`/player/${selectedPlayer.player_id}`}
                                    className="flex-1 py-4 bg-blue-600 hover:bg-blue-700 text-white text-center rounded-2xl text-xs font-black shadow-lg shadow-blue-500/20 transition-all"
                                >
                                    FULL ANALYTICS PROFILE
                                </Link>
                                <button
                                    onClick={() => setSelectedPlayer(null)}
                                    className="px-6 py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-2xl text-xs font-black"
                                >
                                    CLOSE
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SquadList;
