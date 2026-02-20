import React from 'react';
import { Link } from 'react-router-dom';

const LeagueLeaders = ({ topScorers, topAssists, topRated }) => {

    const LeaderCard = ({ player, rank, label, value }) => (
        <Link
            to={`/player/${player.player_id}`}
            className="flex items-center gap-3 p-3 mb-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-md transition-all group"
        >
            <div className={`
                flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm bg-slate-100 text-slate-500
                ${rank === 1 ? 'bg-amber-100 text-amber-700 ring-2 ring-amber-100' : ''}
                ${rank === 2 ? 'bg-slate-200 text-slate-600' : ''}
                ${rank === 3 ? 'bg-orange-100 text-orange-700' : ''}
            `}>
                #{rank}
            </div>

            <div className="relative shrink-0">
                <img src={player.photo_url} alt={player.player_name} className="w-10 h-10 rounded-full object-cover border border-slate-200 dark:border-slate-600 group-hover:scale-110 transition-transform" />
            </div>

            <div className="flex-1 min-w-0">
                <div className="font-semibold text-slate-800 dark:text-slate-100 truncate text-sm">{player.player_name}</div>
                <div className="text-xs text-slate-500 truncate">{player.team_name}</div>
            </div>

            <div className="text-right">
                <div className="text-lg font-bold text-blue-600 dark:text-blue-400 leading-none">{value}</div>
                <div className="text-[10px] uppercase text-slate-400 font-bold tracking-wider">{label}</div>
            </div>
        </Link>
    );

    return (
        <div className="space-y-6">
            {/* Golden Boot */}
            <div className="animate-slide-up" style={{ animationDelay: '0.1s' }}>
                <div className="flex items-center gap-2 mb-3">
                    <span className="text-xl">🥇</span>
                    <h3 className="font-bold text-slate-800 dark:text-slate-100">Golden Boot</h3>
                </div>
                <div className="space-y-2">
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
            <div className="animate-slide-up" style={{ animationDelay: '0.2s' }}>
                <div className="flex items-center gap-2 mb-3">
                    <span className="text-xl">🅰️</span>
                    <h3 className="font-bold text-slate-800 dark:text-slate-100">Top Playmakers</h3>
                </div>
                <div className="space-y-2">
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
            <div className="animate-slide-up" style={{ animationDelay: '0.3s' }}>
                <div className="flex items-center gap-2 mb-3">
                    <span className="text-xl">✨</span>
                    <h3 className="font-bold text-slate-800 dark:text-slate-100">MVP Candidates</h3>
                </div>
                <div className="space-y-2">
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
