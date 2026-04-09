import React, { useState, useEffect, useMemo } from 'react';
import PropTypes from 'prop-types';
import api from '../../../../services/api';
import { Skeleton, Badge, Tooltip } from '../../../../design-system';
import { MatchStatBar } from '../../../../design-system';
import './XgAnalysisV4.css';

// ─── Delta badge ────────────────────────────────────────────────────
const DeltaBadge = ({ actual, expected }) => {
    if (actual == null || expected == null) return <span className="xga-dash">—</span>;
    const diff = (parseFloat(actual) - parseFloat(expected)).toFixed(1);
    const isPos = diff > 0;
    const isNeg = diff < 0;
    return (
        <span className={`xga-delta ${isPos ? 'xga-delta--over' : isNeg ? 'xga-delta--under' : ''}`}>
            {isPos ? '+' : ''}{diff}
        </span>
    );
};

DeltaBadge.propTypes = {
    actual: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    expected: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
};

// ─── Club logo ──────────────────────────────────────────────────────
const ClubLogo = ({ src, name }) => (
    <img
        src={src || '/placeholder-badge.svg'}
        alt={name}
        className="xga-club-logo"
        onError={(e) => { e.currentTarget.style.display = 'none'; }}
    />
);

ClubLogo.propTypes = {
    src: PropTypes.string,
    name: PropTypes.string,
};

// ─── Sort modes ─────────────────────────────────────────────────────
const SORT_MODES = [
    { id: 'actual', label: 'Actual' },
    { id: 'xpts',   label: 'xPts' },
    { id: 'xg',     label: 'xG' },
    { id: 'ppda',   label: 'PPDA' },
];

// ─── Main component ─────────────────────────────────────────────────
/**
 * XgAnalysisV4 — Team xG metrics table for a league season.
 * Shows "merited standings" (sort by xPts), xG vs actual goals, PPDA pressing intensity.
 * Reusable: pass league + season as props, or it fetches itself.
 */
const XgAnalysisV4 = ({ league, season, data: externalData = null }) => {
    const [rows, setRows] = useState(externalData || []);
    const [loading, setLoading] = useState(!externalData);
    const [error, setError] = useState(null);
    const [sortBy, setSortBy] = useState('actual');

    useEffect(() => {
        if (externalData) return;
        let cancelled = false;
        const load = async () => {
            setLoading(true);
            setError(null);
            try {
                const res = await api.getTeamSeasonXgV4(league, season);
                if (!cancelled) setRows(res || []);
            } catch (e) {
                if (!cancelled) setError(e.message);
            } finally {
                if (!cancelled) setLoading(false);
            }
        };
        load();
        return () => { cancelled = true; };
    }, [league, season, externalData]);

    const sorted = useMemo(() => {
        if (!rows.length) return [];
        const copy = [...rows];
        switch (sortBy) {
            case 'xpts':  return copy.sort((a, b) => (b.xpts ?? 0) - (a.xpts ?? 0));
            case 'xg':    return copy.sort((a, b) => (b.xg ?? 0) - (a.xg ?? 0));
            case 'ppda':  return copy.sort((a, b) => (a.ppda ?? 99) - (b.ppda ?? 99)); // lower = better
            default:      return copy.sort((a, b) => (b.points ?? 0) - (a.points ?? 0));
        }
    }, [rows, sortBy]);

    const maxXg = useMemo(() => Math.max(...rows.map(r => parseFloat(r.xg) || 0), 1), [rows]);
    const maxXga = useMemo(() => Math.max(...rows.map(r => parseFloat(r.xga) || 0), 1), [rows]);

    if (loading) return (
        <div className="xga-loading">
            {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} height="40px" className="mb-xs" />
            ))}
        </div>
    );

    if (error) return (
        <div className="xga-empty">Failed to load xG data — {error}</div>
    );

    if (!rows.length) return (
        <div className="xga-empty">No xG data available for this season.</div>
    );

    return (
        <div className="xga-wrapper animate-fade-in">
            {/* Sort controls */}
            <div className="xga-controls">
                <span className="xga-controls-label">Sort by</span>
                {SORT_MODES.map(m => (
                    <button
                        key={m.id}
                        className={`xga-sort-btn ${sortBy === m.id ? 'active' : ''}`}
                        onClick={() => setSortBy(m.id)}
                        type="button"
                    >
                        {m.label}
                    </button>
                ))}
            </div>

            {/* Table header */}
            <div className="xga-table">
                <div className="xga-thead">
                    <span className="xga-col-rank">#</span>
                    <span className="xga-col-club">Club</span>
                    <span className="xga-col-num" title="Actual Points">Pts</span>
                    <span className="xga-col-num" title="Expected Points">xPts</span>
                    <span className="xga-col-delta" title="Pts vs xPts">Δ</span>
                    <span className="xga-col-bar" title="xG For">xG</span>
                    <span className="xga-col-bar" title="xG Against">xGA</span>
                    <span className="xga-col-num" title="Non-Penalty xG Difference">NPxGD</span>
                    <Tooltip content="Passes Allowed Per Defensive Action — lower is more pressing" placement="top">
                        <span className="xga-col-num xga-col-ppda">PPDA</span>
                    </Tooltip>
                </div>

                <div className="xga-tbody">
                    {sorted.map((row, idx) => (
                        <div key={row.club_id || idx} className="xga-row">
                            <span className="xga-col-rank xga-rank">{idx + 1}</span>

                            <div className="xga-col-club xga-club">
                                <ClubLogo src={row.club_logo} name={row.club_name} />
                                <span className="xga-club-name">{row.club_name}</span>
                                {row.position != null && sortBy !== 'actual' && (
                                    <Badge variant="neutral" size="xs">{row.position}</Badge>
                                )}
                            </div>

                            <span className="xga-col-num xga-pts">{row.points ?? '—'}</span>

                            <span className="xga-col-num xga-xpts">
                                {row.xpts != null ? Number(row.xpts).toFixed(1) : '—'}
                            </span>

                            <span className="xga-col-delta">
                                <DeltaBadge actual={row.points} expected={row.xpts} />
                            </span>

                            {/* xG bar */}
                            <div className="xga-col-bar">
                                <div className="xga-bar-wrap">
                                    <div
                                        className="xga-bar xga-bar--xg"
                                        style={{ width: `${(parseFloat(row.xg) / maxXg) * 100}%` }}
                                    />
                                </div>
                                <span className="xga-bar-val">{row.xg != null ? Number(row.xg).toFixed(1) : '—'}</span>
                            </div>

                            {/* xGA bar */}
                            <div className="xga-col-bar">
                                <div className="xga-bar-wrap">
                                    <div
                                        className="xga-bar xga-bar--xga"
                                        style={{ width: `${(parseFloat(row.xga) / maxXga) * 100}%` }}
                                    />
                                </div>
                                <span className="xga-bar-val">{row.xga != null ? Number(row.xga).toFixed(1) : '—'}</span>
                            </div>

                            <span className="xga-col-num">
                                {row.npxgd != null
                                    ? <span className={Number(row.npxgd) >= 0 ? 'xga-pos' : 'xga-neg'}>
                                        {Number(row.npxgd) >= 0 ? '+' : ''}{Number(row.npxgd).toFixed(1)}
                                      </span>
                                    : '—'}
                            </span>

                            <span className="xga-col-num xga-col-ppda">
                                {row.ppda != null ? Number(row.ppda).toFixed(2) : '—'}
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Legend */}
            <div className="xga-legend">
                <span className="xga-legend-item xga-legend--xg">xG For</span>
                <span className="xga-legend-item xga-legend--xga">xG Against</span>
                <span className="xga-legend-item xga-legend--over">Overperforming xPts</span>
                <span className="xga-legend-item xga-legend--under">Underperforming xPts</span>
            </div>
        </div>
    );
};

XgAnalysisV4.propTypes = {
    league: PropTypes.string.isRequired,
    season: PropTypes.string.isRequired,
    data:   PropTypes.array,
};

export default XgAnalysisV4;
