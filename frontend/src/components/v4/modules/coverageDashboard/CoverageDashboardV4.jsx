import React, { useState, useEffect, useMemo } from 'react';
import api from '../../../../services/api';
import { Skeleton } from '../../../../design-system';
import './CoverageDashboardV4.css';

/* ─── helpers ─────────────────────────────────────────────────────────── */

const pctOf = (n, total) => (total > 0 ? Math.round((n / total) * 100) : 0);

const chipClass = (pct) => {
    if (pct === 0)  return 'chip--none';
    if (pct >= 95)  return 'chip--full';
    if (pct >= 50)  return 'chip--partial';
    return 'chip--low';
};

const summarize = (comp) => {
    const labels = comp.seasons.map(s => s.season_label).sort();
    const t = comp.seasons.reduce(
        (acc, s) => ({
            matches: acc.matches + s.total_matches,
            score:   acc.score   + s.with_score,
            events:  acc.events  + s.with_events,
            lineups: acc.lineups + s.with_lineups,
            stats:   acc.stats   + s.with_stats,
            xg:      acc.xg      + s.with_xg,
        }),
        { matches: 0, score: 0, events: 0, lineups: 0, stats: 0, xg: 0 }
    );
    return {
        ...comp,
        start:      labels[0],
        end:        labels[labels.length - 1],
        nb_seasons: labels.length,
        totals:     t,
        pct_score:   pctOf(t.score,   t.matches),
        pct_events:  pctOf(t.events,  t.matches),
        pct_lineups: pctOf(t.lineups, t.matches),
        pct_stats:   pctOf(t.stats,   t.matches),
        pct_xg:      pctOf(t.xg,      t.matches),
    };
};

/* ─── Chip ─────────────────────────────────────────────────────────────── */
const Chip = ({ pct }) => (
    <span className={`chip ${chipClass(pct)}`}>{pct}%</span>
);

/* ─── SeasonGrid (detail) ──────────────────────────────────────────────── */
const SeasonGrid = ({ seasons }) => {
    const sorted = [...seasons].sort((a, b) => a.season_label.localeCompare(b.season_label));
    return (
        <div className="season-grid">
            {sorted.map(s => {
                const pe = pctOf(s.with_events, s.total_matches);
                const tip = [
                    s.season_label,
                    `${s.total_matches} matchs`,
                    `Score ${pctOf(s.with_score, s.total_matches)}%`,
                    `Events ${pe}%`,
                    `Lineups ${pctOf(s.with_lineups, s.total_matches)}%`,
                    `Stats ${pctOf(s.with_stats, s.total_matches)}%`,
                    `xG ${pctOf(s.with_xg, s.total_matches)}%`,
                ].join(' · ');
                return (
                    <div key={s.season_label} className={`season-cell ${chipClass(pe)}`} title={tip}>
                        {s.season_label.slice(2, 4)}/{s.season_label.slice(7, 9)}
                    </div>
                );
            })}
        </div>
    );
};

/* ─── Row ──────────────────────────────────────────────────────────────── */
const Row = ({ comp, expanded, onToggle }) => (
    <>
        <tr className={`cov-row${expanded ? ' cov-row--open' : ''}`} onClick={onToggle}>
            <td className="cov-td td-name">
                <span className="comp-name">{comp.competition_name}</span>
                <span className="comp-meta">{comp.country_name}</span>
            </td>
            <td className="cov-td td-period">
                {comp.start?.slice(0, 4)}
                <span className="period-arrow">→</span>
                {comp.end?.slice(5)}
            </td>
            <td className="cov-td td-seasons">{comp.nb_seasons}</td>
            <td className="cov-td td-num">{comp.totals.matches.toLocaleString()}</td>
            <td className="cov-td td-chip"><Chip pct={comp.pct_score} /></td>
            <td className="cov-td td-chip"><Chip pct={comp.pct_events} /></td>
            <td className="cov-td td-chip"><Chip pct={comp.pct_lineups} /></td>
            <td className="cov-td td-chip"><Chip pct={comp.pct_stats} /></td>
            <td className="cov-td td-chip"><Chip pct={comp.pct_xg} /></td>
            <td className="cov-td td-caret">{expanded ? '▲' : '▼'}</td>
        </tr>
        {expanded && (
            <tr className="cov-detail-row">
                <td colSpan={10} className="cov-detail-cell">
                    <SeasonGrid seasons={comp.seasons} />
                </td>
            </tr>
        )}
    </>
);

/* ─── Main ─────────────────────────────────────────────────────────────── */
const CoverageDashboardV4 = ({ onClose }) => {
    const [data,     setData]     = useState(null);
    const [loading,  setLoading]  = useState(true);
    const [error,    setError]    = useState(null);
    const [search,   setSearch]   = useState('');
    const [expanded, setExpanded] = useState(new Set());

    useEffect(() => {
        api.getCoverageV4()
            .then(d => setData(d.map(summarize)))
            .catch(e => setError(e.message || 'Erreur'))
            .finally(() => setLoading(false));
    }, []);

    useEffect(() => {
        const fn = (e) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('keydown', fn);
        return () => document.removeEventListener('keydown', fn);
    }, [onClose]);

    const filtered = useMemo(() => {
        if (!data) return [];
        const q = search.toLowerCase();
        if (!q) return data;
        return data.filter(c =>
            c.competition_name.toLowerCase().includes(q) ||
            c.country_name.toLowerCase().includes(q)
        );
    }, [data, search]);

    const toggle = (id) => setExpanded(prev => {
        const next = new Set(prev);
        next.has(id) ? next.delete(id) : next.add(id);
        return next;
    });

    return (
        <div className="cov-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
            <div className="cov-modal" role="dialog" aria-modal="true">

                {/* Header */}
                <div className="cov-header">
                    <div>
                        <h2 className="cov-title">Couverture des données</h2>
                        {data && (
                            <p className="cov-subtitle">
                                {data.length} compétitions · {data.reduce((s, c) => s + c.totals.matches, 0).toLocaleString()} matchs indexés
                            </p>
                        )}
                    </div>
                    <div className="cov-header-right">
                        <div className="cov-legend">
                            <span className="chip chip--full">≥95%</span>
                            <span className="chip chip--partial">≥50%</span>
                            <span className="chip chip--low">&lt;50%</span>
                            <span className="chip chip--none">0%</span>
                        </div>
                        <button className="cov-close" onClick={onClose}>✕</button>
                    </div>
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
                    {search && <button className="cov-search-clear" onClick={() => setSearch('')}>✕</button>}
                </div>

                {/* Body */}
                <div className="cov-body">
                    {loading && (
                        <div style={{ padding: '16px 24px' }}>
                            {[...Array(10)].map((_, i) => (
                                <Skeleton key={i} height="42px" style={{ marginBottom: '2px', borderRadius: '4px' }} />
                            ))}
                        </div>
                    )}
                    {error && <p className="cov-error">{error}</p>}
                    {!loading && !error && (
                        <table className="cov-table">
                            <thead>
                                <tr className="cov-thead-row">
                                    <th className="cov-th th-name">Compétition</th>
                                    <th className="cov-th th-period">Période</th>
                                    <th className="cov-th th-center">Saisons</th>
                                    <th className="cov-th th-right">Matchs</th>
                                    <th className="cov-th th-center">Score</th>
                                    <th className="cov-th th-center">Events</th>
                                    <th className="cov-th th-center">Lineups</th>
                                    <th className="cov-th th-center">Stats</th>
                                    <th className="cov-th th-center">xG</th>
                                    <th className="cov-th" />
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.length === 0 && (
                                    <tr><td colSpan={10} className="cov-empty">Aucune compétition trouvée.</td></tr>
                                )}
                                {filtered.map(comp => (
                                    <Row
                                        key={comp.competition_id}
                                        comp={comp}
                                        expanded={expanded.has(comp.competition_id)}
                                        onToggle={() => toggle(comp.competition_id)}
                                    />
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CoverageDashboardV4;
