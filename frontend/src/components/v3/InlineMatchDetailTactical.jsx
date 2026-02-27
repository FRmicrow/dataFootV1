import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import api from '../../services/api';
import { Stack, Button } from '../../design-system';
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

    if (loading) return (
        <div className="ds-tac-loading">
            <div className="ds-button-spinner mb-sm" style={{ margin: '0 auto' }}></div>
            Extracting tactical metrics...
        </div>
    );
    if (error) return <div className="ds-tac-error">{error}</div>;
    if (stats.length === 0) return <div className="ds-tac-empty">No tactical intelligence recorded.</div>;

    const currentStats = stats.filter(s => s.half === activeHalf);
    const homeStats = currentStats.find(s => s.side === 'home');
    const awayStats = currentStats.find(s => s.side === 'away');

    const statRows = [
        { label: 'Possession', key: 'ball_possession', type: 'percent' },
        { label: 'Total Shots', key: 'shots_total', type: 'number' },
        { label: 'Shots on Goal', key: 'shots_on_goal', type: 'number' },
        { label: 'Corner Kicks', key: 'corner_kicks', type: 'number' },
        { label: 'Offsides', key: 'offsides', type: 'number' },
        { label: 'Fouls', key: 'fouls', type: 'number' },
        { label: 'Yellow Cards', key: 'yellow_cards', type: 'number' },
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
        return val ?? 0;
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
            <div key={row.key} className="ds-tac-row">
                <div className="ds-tac-labels">
                    <span className="val home">{homeVal}</span>
                    <span className="label">{row.label}</span>
                    <span className="val away">{awayVal}</span>
                </div>
                <div className="ds-tac-bar-track">
                    <div className="bar home" style={{ width: `${homePct}%` }}></div>
                    <div className="bar away" style={{ width: `${awayPct}%` }}></div>
                </div>
            </div>
        );
    };

    return (
        <div className="ds-inline-tactical animate-fade-in">
            <Stack direction="row" justify="center" gap="var(--spacing-xs)" className="mb-md">
                {['1H', '2H', 'FT'].map(h => (
                    <Button
                        key={h}
                        size="xs"
                        variant={activeHalf === h ? 'primary' : 'secondary'}
                        onClick={() => setActiveHalf(h)}
                        style={{ minWidth: '48px' }}
                    >
                        {h}
                    </Button>
                ))}
            </Stack>

            <div className="ds-tac-list">
                {statRows.map(row => renderStatBar(row))}
            </div>
        </div>
    );
};

InlineMatchDetailTactical.propTypes = {
    fixtureId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
};

export default InlineMatchDetailTactical;
