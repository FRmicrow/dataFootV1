import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import api from '../../../../services/api';
import { Skeleton } from '../../../../design-system';
import './InlinePlayerStatCardV4.css';

const StatBar = ({ label, value, max, color }) => {
    const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
    return (
        <div className="ds-intel-stat-row">
            <span className="label">{label}</span>
            <div className="track">
                <div className="bar" style={{ width: `${pct}%`, background: color || 'var(--color-primary-500)' }} />
            </div>
            <span className="val">{typeof value === 'number' && !Number.isInteger(value) ? value.toFixed(2) : value}</span>
        </div>
    );
};
StatBar.propTypes = { label: PropTypes.string, value: PropTypes.number, max: PropTypes.number, color: PropTypes.string };

const CardBadge = ({ count, color, label }) => (
    <div className="ds-intel-min-stat">
        <span style={{ color }}>{count ?? 0}</span>
        <label>{label}</label>
    </div>
);
CardBadge.propTypes = { count: PropTypes.number, color: PropTypes.string, label: PropTypes.string };

const InlinePlayerStatCardV4 = ({ player, league, season }) => {
    const [data, setData]     = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError]   = useState(null);

    useEffect(() => {
        if (!player?.id || !league || !season) { setData(null); return; }
        setLoading(true);
        setError(null);
        api.getPlayerSeasonStatsV4(league, season, player.id)
            .then(res => setData(res))
            .catch(() => setError('Stats unavailable'))
            .finally(() => setLoading(false));
    }, [player?.id, league, season]);

    if (!player) return (
        <div className="ds-player-intel-empty">
            <span className="empty-icon">🧠</span>
            <p>Select a player to view season stats</p>
        </div>
    );

    if (loading) return (
        <div style={{ padding: 'var(--spacing-md)', display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
            <Skeleton width="100%" height="48px" />
            <Skeleton width="100%" height="120px" />
            <Skeleton width="100%" height="80px" />
        </div>
    );

    if (error || !data) return (
        <div className="ds-player-intel-empty">
            <span className="empty-icon">📭</span>
            <p>{error || 'No season data found'}</p>
        </div>
    );

    const xg        = Number(data.xg        ?? 0);
    const npxg      = Number(data.npxg      ?? 0);
    const xa        = Number(data.xa        ?? 0);
    const xg90      = Number(data.xg_90     ?? 0);
    const npxg90    = Number(data.npxg_90   ?? 0);
    const xa90      = Number(data.xa_90     ?? 0);
    const xgChain90 = Number(data.xg_chain_90  ?? 0);
    const xgBuild90 = Number(data.xg_buildup_90 ?? 0);
    const goals     = Number(data.goals     ?? 0);
    const assists   = Number(data.assists   ?? 0);
    const apps      = Number(data.apps      ?? 0);
    const mins      = Number(data.minutes   ?? 0);
    const yellow    = Number(data.yellow_cards ?? 0);
    const red       = Number(data.red_cards   ?? 0);

    return (
        <div className="ds-player-intel-card animate-fade-in">
            {/* Header */}
            <div className="ds-intel-header">
                <div className="ds-intel-photo">
                    <img
                        src={data.photo_url}
                        alt=""
                        onError={e => { e.currentTarget.style.visibility = 'hidden'; }}
                    />
                </div>
                <div className="ds-intel-info">
                    <h4>{data.name || player.name}</h4>
                    <p className="ds-intel-meta">{data.club_name} · {apps} apps · {mins}&apos;</p>
                </div>
            </div>

            <div className="ds-intel-main">
                {/* Goals & Assists */}
                <div className="ds-intel-stats">
                    <StatBar label="Goals"   value={goals}   max={Math.max(goals, 20)}   color="var(--color-success-500)" />
                    <StatBar label="Assists" value={assists} max={Math.max(assists, 15)}  color="var(--color-primary-400)" />
                    <StatBar label="xG"      value={xg}      max={Math.max(xg, 15)}       color="var(--color-primary-500)" />
                    <StatBar label="NPxG"    value={npxg}    max={Math.max(npxg, 15)}     color="var(--color-primary-600)" />
                    <StatBar label="xA"      value={xa}      max={Math.max(xa, 10)}       color="var(--color-warning-400, #f59e0b)" />
                </div>

                {/* Per-90 rates */}
                <div className="ds-intel-stats">
                    <StatBar label="xG/90"       value={xg90}      max={1}   color="var(--color-primary-400)" />
                    <StatBar label="NPxG/90"     value={npxg90}    max={1}   color="var(--color-primary-500)" />
                    <StatBar label="xA/90"       value={xa90}      max={0.7} color="var(--color-warning-400, #f59e0b)" />
                    <StatBar label="xGChain/90"  value={xgChain90} max={1.5} color="var(--color-success-500)" />
                    <StatBar label="xGBuild/90"  value={xgBuild90} max={1}   color="var(--color-success-600)" />
                </div>
            </div>

            {/* Footer: cards */}
            <div className="ds-intel-footer" style={{ display: 'flex', gap: 'var(--spacing-lg)', justifyContent: 'center' }}>
                <CardBadge count={yellow} color="var(--color-warning-400, #f59e0b)" label="Yellow" />
                <CardBadge count={red}    color="var(--color-danger-500)"           label="Red" />
                <CardBadge count={goals + assists} color="var(--color-primary-300)" label="G+A" />
            </div>
        </div>
    );
};

InlinePlayerStatCardV4.propTypes = {
    player: PropTypes.shape({
        id:   PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
        name: PropTypes.string,
    }),
    league: PropTypes.string,
    season: PropTypes.string,
};

export default InlinePlayerStatCardV4;
