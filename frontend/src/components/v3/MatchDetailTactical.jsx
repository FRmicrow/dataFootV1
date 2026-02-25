import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import './MatchDetailTactical.css';

const MatchDetailTactical = ({ fixtureId }) => {
    const [stats, setStats] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (fixtureId) fetchStats();
    }, [fixtureId]);

    const fetchStats = async () => {
        try {
            setLoading(true);
            const res = await api.getFixtureTacticalStats(fixtureId);
            setStats(res || []);
        } catch (e) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="tactical-loading">Loading Performance Data...</div>;
    if (error) return <div className="tactical-error">Error: {error}</div>;
    if (stats.length === 0) return <div className="tactical-empty">No tactical data available for this match.</div>;

    // We usually have 2 teams, and possibly different periods (FT, 1H, 2H)
    // For now, let's filter for FT or just take the first occurrence of each team
    const homeStats = stats.find(s => s.side === 'home');
    const awayStats = stats.find(s => s.side === 'away');

    if (!homeStats || !awayStats) return <div className="tactical-empty">Incomplete statistical data.</div>;

    // List of stats to display
    const statRows = [
        { label: 'Ball Possession', key: 'ball_possession', type: 'percent' },
        { label: 'Total Shots', key: 'shots_total', type: 'number' },
        { label: 'Shots on Goal', key: 'shots_on_goal', type: 'number' },
        { label: 'Corner Kicks', key: 'corner_kicks', type: 'number' },
        { label: 'Offsides', key: 'offsides', type: 'number' },
        { label: 'Fouls', key: 'fouls', type: 'number' },
        { label: 'Yellow Cards', key: 'yellow_cards', type: 'number' },
        { label: 'Total Passes', key: 'passes_total', type: 'number' },
        { label: 'Pass Accuracy', key: 'pass_accuracy_pct', type: 'percent' },
    ];

    const renderStatBar = (row) => {
        const homeVal = homeStats[row.key] || 0;
        const awayVal = awayStats[row.key] || 0;

        let homePercent, awayPercent;
        if (row.type === 'percent') {
            homePercent = parseFloat(homeVal);
            awayPercent = parseFloat(awayVal);
        } else {
            const total = homeVal + awayVal;
            if (total === 0) {
                homePercent = 50;
                awayPercent = 50;
            } else {
                homePercent = (homeVal / total) * 100;
                awayPercent = (awayVal / total) * 100;
            }
        }

        return (
            <div key={row.key} className="stat-row">
                <div className="stat-values">
                    <span className="home-val">{row.type === 'percent' ? `${homeVal}%` : homeVal}</span>
                    <span className="stat-label">{row.label}</span>
                    <span className="away-val">{row.type === 'percent' ? `${awayVal}%` : awayVal}</span>
                </div>
                <div className="stat-bar-container">
                    <div className="stat-bar-bg">
                        <div
                            className="stat-bar-fill home"
                            style={{ width: `${homePercent}%` }}
                        ></div>
                        <div
                            className="stat-bar-fill away"
                            style={{ width: `${awayPercent}%`, left: `${homePercent}%` }}
                        ></div>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="tactical-container fade-in">
            <div className="team-headers">
                <div className="team-header-item home">
                    <img src={homeStats.team_logo} alt="" />
                    <span>{homeStats.team_name}</span>
                </div>
                <div className="vs-label">VS</div>
                <div className="team-header-item away">
                    <img src={awayStats.team_logo} alt="" />
                    <span>{awayStats.team_name}</span>
                </div>
            </div>

            <div className="stats-list">
                {statRows.map(row => renderStatBar(row))}
            </div>
        </div>
    );
};

export default MatchDetailTactical;
