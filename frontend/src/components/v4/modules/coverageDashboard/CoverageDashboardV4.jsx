import React, { useState, useEffect, useMemo } from 'react';
import api from '../../../../services/api';
import { Skeleton } from '../../../../design-system';
import './CoverageDashboardV4.css';

const PCT_COLORS = (pct) => {
    if (pct >= 95) return 'var(--color-success, #22c55e)';
    if (pct >= 50) return 'var(--color-warning, #f59e0b)';
    return 'var(--color-danger, #ef4444)';
};

const Bar = ({ value, total }) => {
    const pct = total > 0 ? Math.round((value / total) * 100) : 0;
    return (
        <div className="cov-bar-wrap" title={`${value} / ${total} (${pct}%)`}>
            <div
                className="cov-bar-fill"
                style={{ width: `${pct}%`, background: PCT_COLORS(pct) }}
            />
            <span className="cov-bar-label">{pct}%</span>
        </div>
    );
};

const SeasonRow = ({ s }) => (
    <tr className="cov-season-row">
        <td className="cov-td cov-td-season">{s.season_label}</td>
        <td className="cov-td cov-td-num">{s.total_matches}</td>
        <td className="cov-td cov-td-bar"><Bar value={s.with_score}   total={s.total_matches} /></td>
        <td className="cov-td cov-td-bar"><Bar value={s.with_events}  total={s.total_matches} /></td>
        <td className="cov-td cov-td-bar"><Bar value={s.with_lineups} total={s.total_matches} /></td>
        <td className="cov-td cov-td-bar"><Bar value={s.with_stats}   total={s.total_matches} /></td>
        <td className="cov-td cov-td-bar"><Bar value={s.with_xg}      total={s.total_matches} /></td>
    </tr>
);

const CompetitionBlock = ({ comp }) => {
    const [expanded, setExpanded] = useState(false);

    const globalPct = useMemo(() => {
        const total = comp.seasons.reduce((s, r) => s + r.total_matches, 0);
        const events = comp.seasons.reduce((s, r) => s + r.with_events, 0);
        return total > 0 ? Math.round((events / total) * 100) : 0;
    }, [comp]);

    const totalMatches = comp.seasons.reduce((s, r) => s + r.total_matches, 0);

    return (
        <div className="cov-comp-block">
            <button
                className="cov-comp-header"
                onClick={() => setExpanded(e => !e)}
                aria-expanded={expanded}
            >
                <div className="cov-comp-left">
                    <span className="cov-expand-icon">{expanded ? '▼' : '▶'}</span>
                    <div>
                        <span className="cov-comp-name">{comp.competition_name}</span>
                        <span className="cov-comp-meta">
                            {comp.country_name} · {comp.competition_type} · {comp.seasons.length} saisons · {totalMatches} matchs
                        </span>
                    </div>
                </div>
                <div
                    className="cov-global-badge"
                    style={{ background: PCT_COLORS(globalPct) }}
                    title="% events couverts (toutes saisons)"
                >
                    {globalPct}%
                </div>
            </button>

            {expanded && (
                <div className="cov-season-table-wrap">
                    <table className="cov-table">
                        <thead>
                            <tr>
                                <th className="cov-th cov-th-season">Saison</th>
                                <th className="cov-th cov-th-num">Matchs</th>
                                <th className="cov-th">Score</th>
                                <th className="cov-th">Events</th>
                                <th className="cov-th">Lineups</th>
                                <th className="cov-th">Stats</th>
                                <th className="cov-th">xG</th>
                            </tr>
                        </thead>
                        <tbody>
                            {comp.seasons.map(s => (
                                <SeasonRow key={s.season_label} s={s} />
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

const CoverageDashboardV4 = ({ onClose }) => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [search, setSearch] = useState('');

    useEffect(() => {
        api.getCoverageV4()
            .then(d => setData(d))
            .catch(e => setError(e.message || 'Erreur de chargement'))
            .finally(() => setLoading(false));
    }, []);

    const filtered = useMemo(() => {
        if (!data) return [];
        const q = search.toLowerCase();
        if (!q) return data;
        return data.filter(c =>
            c.competition_name.toLowerCase().includes(q) ||
            c.country_name.toLowerCase().includes(q)
        );
    }, [data, search]);

    // Close on Escape
    useEffect(() => {
        const onKey = (e) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [onClose]);

    return (
        <div className="cov-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
            <div className="cov-modal" role="dialog" aria-modal="true" aria-label="Couverture des données">
                {/* Header */}
                <div className="cov-modal-header">
                    <div>
                        <h2 className="cov-modal-title">Couverture des données</h2>
                        {data && (
                            <p className="cov-modal-subtitle">
                                {data.length} compétitions · Vert ≥95% · Orange ≥50% · Rouge &lt;50%
                            </p>
                        )}
                    </div>
                    <button className="cov-close-btn" onClick={onClose} aria-label="Fermer">✕</button>
                </div>

                {/* Search */}
                <div className="cov-search-wrap">
                    <input
                        className="cov-search"
                        type="text"
                        placeholder="Filtrer par compétition ou pays…"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        autoFocus
                    />
                </div>

                {/* Body */}
                <div className="cov-modal-body">
                    {loading && (
                        <div className="cov-skeletons">
                            {[1,2,3,4,5].map(i => (
                                <Skeleton key={i} height="52px" style={{ marginBottom: '8px', borderRadius: 'var(--radius-md)' }} />
                            ))}
                        </div>
                    )}
                    {error && <p className="cov-error">{error}</p>}
                    {!loading && !error && filtered.length === 0 && (
                        <p className="cov-empty">Aucune compétition trouvée.</p>
                    )}
                    {!loading && !error && filtered.map(comp => (
                        <CompetitionBlock key={comp.competition_id} comp={comp} />
                    ))}
                </div>
            </div>
        </div>
    );
};

export default CoverageDashboardV4;
