import React from 'react';
import { Link } from 'react-router-dom';

const LeagueLeaders = ({ topScorers, topAssists, topRated, layout = 'grid' }) => {

    const LeaderCard = ({ player, rank, label, value }) => (
        <Link
            to={`/player/${player.player_id}`}
            className="flex items-center gap-2 p-1.5 mb-1.5 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-700 transition-all group"
        >
            <div className={`
                flex items-center justify-center w-5 h-5 shrink-0 rounded-lg font-black text-[8px] bg-slate-200 text-slate-500
                ${rank === 1 ? 'bg-amber-500 text-white shadow-sm' : ''}
                ${rank === 2 ? 'bg-slate-300 text-slate-700' : ''}
                ${rank === 3 ? 'bg-orange-400 text-white' : ''}
            `}>
                {rank}
            </div>

            <div className="relative shrink-0">
                <img src={player.photo_url} alt="" className="w-7 h-7 rounded-lg object-cover border border-white dark:border-slate-700 shadow-sm" />
            </div>

            <div className="flex-1 min-w-0">
                <div className="font-black text-slate-800 dark:text-slate-100 truncate text-[10px] uppercase leading-none">{player.player_name}</div>
                <div className="text-[8px] text-slate-400 truncate leading-none mt-1 font-bold">{player.team_name}</div>
            </div>

            <div className="text-right shrink-0 px-2">
                <div className="text-xs font-black text-blue-600 dark:text-blue-400 leading-none">{value}</div>
                <div className="text-[7px] uppercase text-slate-400 font-bold tracking-tighter mt-0.5">{label}</div>
            </div>
        </Link>
    );

    const containerClass = layout === 'grid'
        ? "grid grid-cols-1 md:grid-cols-3 gap-6"
        : "flex flex-col gap-6";

    return (
        <div className={containerClass}>
            {/* Golden Boot */}
            <div className={`animate-slide-up bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 shadow-sm ${layout === 'grid' ? '' : 'flex-1'}`} style={{ animationDelay: '0.1s' }}>
                <div className="flex items-center gap-2 mb-3">
                    <span className="text-xl">🥇</span>
                    <h3 className="font-bold text-xs uppercase tracking-widest text-slate-500">Golden Boot</h3>
                </div>
                <div className="space-y-1">
                    {topScorers.slice(0, 3).map((player, idx) => (
                        <LeaderCard
                            key={player.player_id}
                            player={player}
                            rank={idx + 1}
                            label="Goals"
                            value={player.goals_total}
                        />
                    ))}
                </div>
            </div>

            {/* Top Playmakers */}
            <div className={`animate-slide-up bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 shadow-sm ${layout === 'grid' ? '' : 'flex-1'}`} style={{ animationDelay: '0.2s' }}>
                <div className="flex items-center gap-2 mb-3">
                    <span className="text-xl">🅰️</span>
                    <h3 className="font-bold text-xs uppercase tracking-widest text-slate-500">Top Playmakers</h3>
                </div>
                <div className="space-y-1">
                    {topAssists.slice(0, 3).map((player, idx) => (
                        <LeaderCard
                            key={player.player_id}
                            player={player}
                            rank={idx + 1}
                            label="Assists"
                            value={player.goals_assists}
                        />
                    ))}
                </div>
            </div>

            {/* MVP Candidates */}
            <div className={`animate-slide-up bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 shadow-sm ${layout === 'grid' ? '' : 'flex-1'}`} style={{ animationDelay: '0.3s' }}>
                <div className="flex items-center gap-2 mb-3">
                    <span className="text-xl">✨</span>
                    <h3 className="font-bold text-xs uppercase tracking-widest text-slate-500">MVP Candidates</h3>
                </div>
                <div className="space-y-1">
                    {(topRated || []).slice(0, 3).map((player, idx) => (
                        <LeaderCard
                            key={player.player_id}
                            player={player}
                            rank={idx + 1}
                            label="Rating"
                            value={player.games_rating}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
};

export default LeagueLeaders;
