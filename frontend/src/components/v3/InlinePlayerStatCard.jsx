
import React from 'react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';
import './InlinePlayerStatCard.css';

const InlinePlayerStatCard = ({ player }) => {
    if (!player) {
        return (
            <div className="inline-player-empty">
                <div className="empty-icon">👤</div>
                <p>Select a player to view match intelligence</p>
            </div>
        );
    }

    const getRadarData = (p) => {
        const passAccuracyPct = p.passes_total > 0 ? Math.round((p.passes_accuracy / p.passes_total) * 100) : 0;
        const duelsPct = p.duels_total > 0 ? Math.round((p.duels_won / p.duels_total) * 100) : 0;

        return [
            { subject: 'Rating', value: (parseFloat(p.rating) || 0) * 10, display: p.rating, fullMark: 100 },
            { subject: 'Shots', value: Math.min((p.shots_total || 0) * 20, 100), display: p.shots_total || 0, fullMark: 100 },
            { subject: 'Passing', value: passAccuracyPct, display: `${passAccuracyPct}%`, fullMark: 100 },
            { subject: 'Defense', value: Math.min((p.tackles_interceptions || 0) * 15, 100), display: p.tackles_interceptions || 0, fullMark: 100 },
            { subject: 'Duels', value: duelsPct, display: `${duelsPct}%`, fullMark: 100 },
            { subject: 'Dribbles', value: Math.min((p.dribbles_success || 0) * 25, 100), display: p.dribbles_success || 0, fullMark: 100 },
        ];
    };

    const radarData = getRadarData(player);

    const getRatingColor = (r) => {
        if (!r || r === 'N/A') return '#475569';
        const rating = parseFloat(r);
        if (rating >= 8) return '#10b981';
        if (rating >= 7) return '#14b8a6';
        if (rating >= 6.5) return '#f59e0b';
        return '#ef4444';
    };

    return (
        <div className="inline-player-stat-card fade-in">
            <div className="p-card-header">
                <img src={player.player_photo} alt="" className="p-header-img" />
                <div className="p-header-info">
                    <h4>{player.player_name}</h4>
                    <span className="p-meta">{player.team_name} • {player.minutes_played}' Played</span>
                </div>
                <div className="p-header-rating-box" style={{ background: getRatingColor(player.rating) }}>
                    {player.rating}
                </div>
            </div>

            <div className="p-card-main">
                <div className="p-card-radar-box">
                    <ResponsiveContainer width="100%" height={250}>
                        <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                            <PolarGrid stroke="#334155" />
                            <PolarAngleAxis dataKey="subject" tick={{ fill: '#f1f5f9', fontSize: 11, fontWeight: 700 }} />
                            <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 9 }} axisLine={false} />
                            <Radar
                                name={player.player_name}
                                dataKey="value"
                                stroke="#3b82f6"
                                fill="#3b82f6"
                                fillOpacity={0.5}
                            />
                        </RadarChart>
                    </ResponsiveContainer>
                </div>

                <div className="p-radar-details">
                    {radarData.map(d => (
                        <div key={d.subject} className="radar-detail-row">
                            <span className="rd-subject">{d.subject}</span>
                            <div className="rd-track">
                                <div className="rd-bar" style={{ width: `${d.value}%`, background: d.subject === 'Rating' ? getRatingColor(player.rating) : '#3b82f6' }}></div>
                            </div>
                            <span className="rd-value">{d.display}</span>
                        </div>
                    ))}
                </div>
            </div>

            <div className="p-card-grid-modern">
                <div className="p-stat-box">
                    <label>Goals / Assists</label>
                    <div className="p-stat-val">
                        <span>{player.goals_total || 0}</span>
                        <span className="sep">/</span>
                        <span>{player.goals_assists || 0}</span>
                    </div>
                </div>
                <div className="p-stat-box">
                    <label>Accuracy</label>
                    <div className="p-stat-val">
                        <span>{player.passes_total > 0 ? Math.round((player.passes_accuracy / player.passes_total) * 100) : 0}%</span>
                        <span className="sub">({player.passes_total || 0})</span>
                    </div>
                </div>
                <div className="p-stat-box">
                    <label>Key Passes</label>
                    <div className="p-stat-val">{player.passes_key || 0}</div>
                </div>
                <div className="p-stat-box">
                    <label>Work Rate</label>
                    <div className="p-stat-val">{player.duels_total || 0} duels</div>
                </div>
            </div>
        </div>
    );
};

export default InlinePlayerStatCard;
