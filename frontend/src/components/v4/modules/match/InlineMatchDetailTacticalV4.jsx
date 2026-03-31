import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import api from '../../../../services/api';
import './InlineMatchDetailTacticalV4.css';

const InlineMatchDetailTacticalV4 = ({ fixtureId }) => {
    const [stats, setStats] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchStats();
    }, [fixtureId]);

    const fetchStats = async () => {
        try {
            setLoading(true);
            const res = await api.getFixtureTacticalStatsV4(fixtureId);
            setStats(res || []);
        } catch (e) {
            console.error("Failed to load V4 tactical stats", e);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="ds-inline-tactical-loading">Gathering metrics...</div>;
    if (stats.length === 0) return <div className="ds-inline-tactical-empty">Tactical data unavailable for this V4 fixture.</div>;

    const homeStats = stats.find(s => s.side === 'home') || stats[0];
    const awayStats = stats.find(s => s.side === 'away') || stats[1];

    const rows = [
        { label: 'Ball Possession', key: 'ball_possession', type: 'pct' },
        { label: 'Total Shots', key: 'shots_total' },
        { label: 'Shots on Goal', key: 'shots_on_goal' },
        { label: 'Corner Kicks', key: 'corner_kicks' },
        { label: 'Offsides', key: 'offsides' },
        { label: 'Fouls', key: 'fouls' },
        { label: 'Yellow Cards', key: 'yellow_cards' },
        { label: 'Total Passes', key: 'passes_total' },
        { label: 'Pass Accuracy', key: 'pass_accuracy_pct', type: 'pct' }
    ];

    return (
        <div className="ds-inline-tactical-wrapper animate-fade-in">
            {rows.map(row => {
                const hVal = homeStats[row.key] || 0;
                const aVal = awayStats[row.key] || 0;
                const hNum = parseFloat(hVal);
                const aNum = parseFloat(aVal);
                const total = hNum + aNum;
                const hPct = total === 0 ? 50 : (hNum / total) * 100;

                return (
                    <div key={row.key} className="ds-inline-stat-row">
                        <div className="ds-inline-stat-header">
                            <span className="val">{row.type === 'pct' ? `${hVal}%` : hVal}</span>
                            <span className="lbl">{row.label}</span>
                            <span className="val">{row.type === 'pct' ? `${aVal}%` : aVal}</span>
                        </div>
                        <div className="ds-inline-stat-bar">
                            <div className="fill home" style={{ width: `${hPct}%` }} />
                            <div className="fill away" style={{ width: `${100 - hPct}%` }} />
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

InlineMatchDetailTacticalV4.propTypes = {
    fixtureId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired
};

export default InlineMatchDetailTacticalV4;
