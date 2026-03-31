import React from 'react';
import PropTypes from 'prop-types';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer } from 'recharts';
import './InlinePlayerStatCardV4.css';

const InlinePlayerStatCardV4 = ({ player }) => {
    if (!player) return (
        <div className="ds-inline-player-empty">
            Select a player to view detailed intelligence
        </div>
    );

    const getRadarData = (p) => {
        const passAccuracyPct = p.passes_total > 0 ? (p.passes_accuracy / p.passes_total) * 100 : 0;
        const duelsAccuracyPct = p.duels_total > 0 ? (p.duels_won / p.duels_total) * 100 : 0;

        return [
            { subject: 'Rating', A: (parseFloat(p.rating) || 0) * 10 },
            { subject: 'Shots', A: Math.min((p.shots_total || 0) * 20, 100) },
            { subject: 'Passing', A: passAccuracyPct },
            { subject: 'Defense', A: Math.min((p.tackles_interceptions || 0) * 15, 100) },
            { subject: 'Duels', A: duelsAccuracyPct },
            { subject: 'Dribbles', A: Math.min((p.dribbles_success || 0) * 25, 100) },
        ];
    };

    const ratingColor = (r) => {
        const val = parseFloat(r);
        if (val >= 8) return '#10b981';
        if (val >= 7) return '#14b8a6';
        if (val >= 6.5) return '#f59e0b';
        return '#ef4444';
    };

    return (
        <div className="ds-inline-player-card animate-fade-in">
            <div className="ds-player-header">
                <img src={player.player_photo} alt="" className="ds-player-img" />
                <div className="ds-player-info">
                    <h5>{player.player_name}</h5>
                    <p>{player.team_name} • {player.minutes_played}'</p>
                </div>
                <div className="ds-player-rating" style={{ color: ratingColor(player.rating) }}>
                    {player.rating}
                </div>
            </div>

            <div className="ds-player-radar">
                <ResponsiveContainer width="100%" height={200}>
                    <RadarChart cx="50%" cy="50%" outerRadius="80%" data={getRadarData(player)}>
                        <PolarGrid stroke="#334155" />
                        <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                        <Radar
                            name={player.player_name}
                            dataKey="A"
                            stroke="#0ea5e9"
                            fill="#0ea5e9"
                            fillOpacity={0.6}
                        />
                    </RadarChart>
                </ResponsiveContainer>
            </div>

            <div className="ds-player-stats-mini">
                <div className="item">
                    <span>G / A</span>
                    <span>{player.goals_total || 0} / {player.goals_assists || 0}</span>
                </div>
                <div className="item">
                    <span>Shots</span>
                    <span>{player.shots_total || 0} ({player.shots_on || 0})</span>
                </div>
                <div className="item">
                    <span>Accuracy</span>
                    <span>{player.passes_total > 0 ? Math.round((player.passes_accuracy / player.passes_total) * 100) : 0}%</span>
                </div>
            </div>
        </div>
    );
};

InlinePlayerStatCardV4.propTypes = {
    player: PropTypes.object
};

export default InlinePlayerStatCardV4;
