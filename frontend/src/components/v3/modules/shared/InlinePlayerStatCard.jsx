import React from 'react';
import PropTypes from 'prop-types';

import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';
import { Card, Grid } from '../../../../design-system';
import './InlinePlayerStatCard.css';

const InlinePlayerStatCard = ({ player }) => {
    if (!player) {
        return (
            <div className="ds-player-intel-empty">
                <span className="empty-icon">👤</span>
                <p>Select a tactical operative to view behavioral intelligence</p>
            </div>
        );
    }

    const getRadarData = (p) => {
        const passAccuracyPct = p.passes_total > 0 ? Math.round((p.passes_accuracy / p.passes_total) * 100) : 0;
        const duelsPct = p.duels_total > 0 ? Math.round((p.duels_won / p.duels_total) * 100) : 0;

        return [
            { subject: 'Rating', value: (Number.parseFloat(p.rating) || 0) * 10, display: p.rating, fullMark: 100 },
            { subject: 'Shots', value: Math.min((p.shots_total || 0) * 20, 100), display: p.shots_total || 0, fullMark: 100 },
            { subject: 'Passing', value: passAccuracyPct, display: `${passAccuracyPct}%`, fullMark: 100 },
            { subject: 'Defense', value: Math.min((p.tackles_interceptions || 0) * 15, 100), display: p.tackles_interceptions || 0, fullMark: 100 },
            { subject: 'Duels', value: duelsPct, display: `${duelsPct}%`, fullMark: 100 },
            { subject: 'Dribbles', value: Math.min((p.dribbles_success || 0) * 25, 100), display: p.dribbles_success || 0, fullMark: 100 },
        ];
    };

    const radarData = getRadarData(player);

    const getRatingColor = (r) => {
        if (!r || r === 'N/A') return 'var(--color-text-dim)';
        const rating = Number.parseFloat(r);
        if (rating >= 8) return 'var(--color-success-500)';
        if (rating >= 7) return 'var(--color-primary-500)';
        if (rating >= 6.5) return 'var(--color-accent-500)';
        return 'var(--color-danger-500)';
    };

    return (
        <Card className="ds-player-intel-card animate-fade-in">
            <header className="ds-intel-header">
                <div className="ds-intel-photo">
                    <img src={player.player_photo} alt="" />
                </div>
                <div className="ds-intel-info">
                    <h4>{player.player_name}</h4>
                    <span className="ds-intel-meta">{player.team_name} • {player.minutes_played}' Action</span>
                </div>
                <div
                    className="ds-intel-rating"
                    style={{ background: getRatingColor(player.rating) }}
                >
                    {player.rating}
                </div>
            </header>

            <main className="ds-intel-main">
                <div className="ds-intel-radar">
                    <ResponsiveContainer width="100%" height={220}>
                        <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                            <PolarGrid stroke="var(--color-border)" />
                            <PolarAngleAxis dataKey="subject" tick={{ fill: 'var(--color-text-muted)', fontSize: 10, fontWeight: 700 }} />
                            <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                            <Radar
                                name={player.player_name}
                                dataKey="value"
                                stroke="var(--color-primary-500)"
                                fill="var(--color-primary-500)"
                                fillOpacity={0.3}
                            />
                        </RadarChart>
                    </ResponsiveContainer>
                </div>

                <div className="ds-intel-stats">
                    {radarData.map(d => (
                        <div key={d.subject} className="ds-intel-stat-row">
                            <span className="label">{d.subject}</span>
                            <div className="track">
                                <div
                                    className="bar"
                                    style={{
                                        width: `${d.value}%`,
                                        background: d.subject === 'Rating' ? getRatingColor(player.rating) : 'var(--color-primary-500)'
                                    }}
                                />
                            </div>
                            <span className="val">{d.display}</span>
                        </div>
                    ))}
                </div>
            </main>

            <footer className="ds-intel-footer">
                <Grid columns="repeat(4, 1fr)" gap="var(--spacing-xs)">
                    <div className="ds-intel-min-stat">
                        <label>G/A</label>
                        <span>{player.goals_total || 0}/{player.goals_assists || 0}</span>
                    </div>
                    <div className="ds-intel-min-stat">
                        <label>Passes</label>
                        <span>{player.passes_total || 0}</span>
                    </div>
                    <div className="ds-intel-min-stat">
                        <label>Key P</label>
                        <span>{player.passes_key || 0}</span>
                    </div>
                    <div className="ds-intel-min-stat">
                        <label>Duels</label>
                        <span>{player.duels_total || 0}</span>
                    </div>
                </Grid>
            </footer>
        </Card>
    );
};

InlinePlayerStatCard.propTypes = {
    player: PropTypes.shape({
        player_photo: PropTypes.string,
        player_name: PropTypes.string,
        team_name: PropTypes.string,
        minutes_played: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
        rating: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
        goals_total: PropTypes.number,
        goals_assists: PropTypes.number,
        passes_total: PropTypes.number,
        passes_key: PropTypes.number,
        duels_total: PropTypes.number,
        shots_total: PropTypes.number,
        tackles_interceptions: PropTypes.number,
        duels_won: PropTypes.number,
        dribbles_success: PropTypes.number
    })
};

export default InlinePlayerStatCard;

