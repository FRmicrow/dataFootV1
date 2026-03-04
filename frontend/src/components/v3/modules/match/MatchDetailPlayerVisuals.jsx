import React, { useState, useEffect } from 'react';
import api from '../../../../services/api';
import {
    Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer
} from 'recharts';
import './MatchDetailPlayerVisuals.css';

const MatchDetailPlayerVisuals = ({ fixtureId }) => {
    const [players, setPlayers] = useState([]);
    const [selectedPlayer, setSelectedPlayer] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (fixtureId) fetchPlayerStats();
    }, [fixtureId]);

    const fetchPlayerStats = async () => {
        try {
            setLoading(true);
            const res = await api.getFixturePlayerStats(fixtureId);
            setPlayers(res || []);
            if (res && res.length > 0) {
                setSelectedPlayer(res[0]);
            }
        } catch (e) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="p-vis-loading">Decoding Player Performance...</div>;
    if (error) return <div className="p-vis-error">Error: {error}</div>;
    if (players.length === 0) return <div className="p-vis-empty">No granular player data found for this fixture.</div>;

    const homePlayers = players.filter(p => p.side === 'home');
    const awayPlayers = players.filter(p => p.side === 'away');

    const getRadarData = (p) => {
        if (!p) return [];
        const passAccuracyPct = p.passes_total > 0 ? (p.passes_accuracy / p.passes_total) * 100 : 0;
        return [
            { subject: 'Rating', A: (parseFloat(p.rating) || 0) * 10, fullMark: 100 },
            { subject: 'Shots', A: Math.min((p.shots_total || 0) * 20, 100), fullMark: 100 },
            { subject: 'Passing', A: passAccuracyPct, fullMark: 100 },
            { subject: 'Defense', A: Math.min((p.tackles_interceptions || 0) * 15, 100), fullMark: 100 },
            { subject: 'Duels', A: p.duels_total > 0 ? (p.duels_won / p.duels_total) * 100 : 0, fullMark: 100 },
            { subject: 'Dribbles', A: Math.min((p.dribbles_success || 0) * 25, 100), fullMark: 100 },
        ];
    };

    const renderPlayerCard = (p) => {
        const key = p.player_id || p.fixture_player_stats_id || Math.random().toString();
        const isActive = (selectedPlayer?.player_id && selectedPlayer.player_id === p.player_id) ||
            (selectedPlayer?.fixture_player_stats_id && selectedPlayer.fixture_player_stats_id === p.fixture_player_stats_id);

        return (
            <div
                key={key}
                className={`player-mini-card ${isActive ? 'active' : ''}`}
                onClick={() => setSelectedPlayer({ ...p })}
            >
                <div className="p-card-header">
                    <span className="p-rating" style={{ background: getRatingColor(p.rating) }}>
                        {p.rating || 'N/A'}
                    </span>
                    <span className="p-name">{p.player_name}</span>
                </div>
                <div className="p-card-meta">
                    {p.minutes_played}' • {p.side?.toUpperCase()}
                </div>
            </div>
        );
    };

    const getRatingColor = (r) => {
        if (!r || r === 'N/A') return '#475569';
        const rating = parseFloat(r);
        if (rating >= 8) return '#10b981';
        if (rating >= 7) return '#14b8a6';
        if (rating >= 6.5) return '#f59e0b';
        return '#ef4444';
    };

    return (
        <div className="player-visualizer-container fade-in">
            <div className="p-vis-sidebar">
                <div className="team-group">
                    <h4>Home Team</h4>
                    <div className="player-grid">
                        {homePlayers.map(p => renderPlayerCard(p))}
                    </div>
                </div>
                <div className="team-group">
                    <h4>Away Team</h4>
                    <div className="player-grid">
                        {awayPlayers.map(p => renderPlayerCard(p))}
                    </div>
                </div>
            </div>

            <div className="p-vis-main">
                {selectedPlayer ? (
                    <div className="player-detail-pane">
                        <div className="pane-header">
                            <img src={selectedPlayer.player_photo} alt="" className="player-big-img" />
                            <div className="pane-title">
                                <h2>{selectedPlayer.player_name}</h2>
                                <p>{selectedPlayer.team_name} • {selectedPlayer.minutes_played} Minutes Played</p>
                            </div>
                            <div className="big-rating" style={{ color: getRatingColor(selectedPlayer.rating) }}>
                                {selectedPlayer.rating}
                            </div>
                        </div>

                        <div className="radar-section">
                            <ResponsiveContainer width="100%" height={300}>
                                <RadarChart cx="50%" cy="50%" outerRadius="80%" data={getRadarData(selectedPlayer)}>
                                    <PolarGrid stroke="#334155" />
                                    <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                                    <Radar
                                        name={selectedPlayer.player_name}
                                        dataKey="A"
                                        stroke="#0ea5e9"
                                        fill="#0ea5e9"
                                        fillOpacity={0.6}
                                    />
                                </RadarChart>
                            </ResponsiveContainer>
                        </div>

                        <div className="stat-grid-modern">
                            <div className="stat-item">
                                <label>Goals / Assists</label>
                                <span>{selectedPlayer.goals_total || 0} / {selectedPlayer.goals_assists || 0}</span>
                            </div>
                            <div className="stat-item">
                                <label>Shots (On Goal)</label>
                                <span>{selectedPlayer.shots_total || 0} ({selectedPlayer.shots_on || 0})</span>
                            </div>
                            <div className="stat-item">
                                <label>Key Passes</label>
                                <span>{selectedPlayer.passes_key || 0}</span>
                            </div>
                            <div className="stat-item">
                                <label>Pass Accuracy</label>
                                <span>{selectedPlayer.passes_total > 0 ? Math.round((selectedPlayer.passes_accuracy / selectedPlayer.passes_total) * 100) : 0}% ({selectedPlayer.passes_total || 0})</span>
                            </div>
                            <div className="stat-item">
                                <label>Tackles / Int</label>
                                <span>{selectedPlayer.tackles_total || 0} / {selectedPlayer.tackles_interceptions || 0}</span>
                            </div>
                            <div className="stat-item">
                                <label>Dribbles (Succ)</label>
                                <span>{selectedPlayer.dribbles_attempts || 0} ({selectedPlayer.dribbles_success || 0})</span>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="select-prompt">Select a player to view detailed tactical analysis</div>
                )}
            </div>
        </div>
    );
};

export default MatchDetailPlayerVisuals;
