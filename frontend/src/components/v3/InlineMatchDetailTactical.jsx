
import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import './InlineMatchDetailTactical.css';

const InlineMatchDetailTactical = ({ fixtureId }) => {
    const [stats, setStats] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeHalf, setActiveHalf] = useState('FT');

    useEffect(() => {
        fetchStats();
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

    if (loading) return <div className="inline-tac-loading">Loading tactical intelligence...</div>;
    if (error) return <div className="inline-tac-error">{error}</div>;
    if (stats.length === 0) return <div className="inline-tac-empty">No tactical data available for this match.</div>;

    const currentStats = stats.filter(s => s.half === activeHalf);
    const homeStats = currentStats.find(s => s.side === 'home');
    const awayStats = currentStats.find(s => s.side === 'away');

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

    const getVal = (stat, key, type) => {
        if (!stat) return type === 'percent' ? '0%' : 0;
        const val = stat[key];
        if (type === 'percent') {
            if (typeof val === 'string' && val.includes('%')) return val;
            return `${val}%`;
        }
        return val;
    };

    const getRawVal = (stat, key) => {
        if (!stat) return 0;
        const val = stat[key];
        if (typeof val === 'string' && val.includes('%')) return parseInt(val);
        return val;
    };

    const renderStatBar = (row) => {
        const homeVal = getVal(homeStats, row.key, row.type);
        const awayVal = getVal(awayStats, row.key, row.type);

        const homeRaw = getRawVal(homeStats, row.key);
        const awayRaw = getRawVal(awayStats, row.key);
        const total = homeRaw + awayRaw;

        let homePct = 50;
        let awayPct = 50;

        if (total > 0) {
            homePct = (homeRaw / total) * 100;
            awayPct = (awayRaw / total) * 100;
        }

        return (
            <div key={row.key} className="inline-tac-row">
                <div className="tac-row-labels">
                    <span className="tac-val home">{homeVal}</span>
                    <span className="tac-label">{row.label}</span>
                    <span className="tac-val away">{awayVal}</span>
                </div>
                <div className="tac-bar-container">
                    <div className="tac-bar home" style={{ width: `${homePct}%` }}></div>
                    <div className="tac-bar away" style={{ width: `${awayPct}%` }}></div>
                </div>
            </div>
        );
    };

    return (
        <div className="inline-match-detail-tactical">
            <div className="half-selector">
                {['1H', '2H', 'FT'].map(h => (
                    <button
                        key={h}
                        className={`half-btn ${activeHalf === h ? 'active' : ''}`}
                        onClick={() => setActiveHalf(h)}
                    >
                        {h}
                    </button>
                ))}
            </div>

            <div className="inline-tac-stats-list">
                {statRows.map(row => renderStatBar(row))}
            </div>
        </div>
    );
};

export default InlineMatchDetailTactical;
