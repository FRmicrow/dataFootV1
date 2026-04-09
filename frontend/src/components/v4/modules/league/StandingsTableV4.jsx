import React, { useState, useMemo, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import './StandingsTableV4.css';

const ZONE_THRESHOLDS = {
    20: { cl: 4, el: 5, ecl: 6, rel: 18 },   // PL / Bundesliga / LaLiga / Serie A
    18: { cl: 4, el: 5, ecl: 6, rel: 16 },   // Ligue 1
    16: { cl: 3, el: 4, ecl: 5, rel: 14 },
};

const getZone = (rank, total) => {
    const t = ZONE_THRESHOLDS[total] || { cl: 4, el: 5, ecl: 6, rel: total - 2 };
    if (rank <= t.cl)  return 'cl';
    if (rank <= t.el)  return 'el';
    if (rank <= t.ecl) return 'ecl';
    if (rank >= t.rel) return 'rel';
    return '';
};

const ZONE_LABELS = { cl: 'CL', el: 'EL', ecl: 'ECL', rel: 'Relégation' };

const getRoundNum = (roundStr) => {
    const m = String(roundStr || '').match(/\d+/);
    return m ? parseInt(m[0], 10) : -1;
};

const StandingsTableV4 = ({ standings = [], fixtures = [], loading }) => {
    const [filterStart, setFilterStart] = useState('');
    const [filterEnd, setFilterEnd] = useState('');
    const [applied, setApplied] = useState({ start: null, end: null });

    const maxRound = useMemo(() => {
        let max = 0;
        fixtures.forEach(f => { const n = getRoundNum(f.round); if (n > max) max = n; });
        return max;
    }, [fixtures]);

    useEffect(() => {
        if (maxRound > 0 && applied.start === null) {
            setFilterStart('1');
            setFilterEnd(String(maxRound));
            setApplied({ start: 1, end: maxRound });
        }
    }, [maxRound]);

    const computed = useMemo(() => {
        if (!applied.start || !applied.end || !fixtures.length) return standings;

        const map = {};
        standings.forEach(t => {
            map[t.team_id] = {
                ...t,
                played: 0, win: 0, draw: 0, lose: 0,
                goals_for: 0, goals_against: 0, points: 0,
            };
        });

        fixtures
            .filter(f => {
                const r = getRoundNum(f.round);
                return r >= applied.start && r <= applied.end && f.goals_home != null && f.goals_away != null;
            })
            .forEach(f => {
                const h = map[f.home_team_id];
                const a = map[f.away_team_id];
                if (!h || !a) return;
                h.played++; a.played++;
                h.goals_for  += f.goals_home; h.goals_against += f.goals_away;
                a.goals_for  += f.goals_away; a.goals_against += f.goals_home;
                if (f.goals_home > f.goals_away)       { h.win++; h.points += 3; a.lose++; }
                else if (f.goals_home < f.goals_away)  { a.win++; a.points += 3; h.lose++; }
                else                                   { h.draw++; h.points++; a.draw++; a.points++; }
            });

        return Object.values(map)
            .sort((a, b) => {
                if (b.points !== a.points) return b.points - a.points;
                const da = a.goals_for - a.goals_against;
                const db = b.goals_for - b.goals_against;
                if (db !== da) return db - da;
                return b.goals_for - a.goals_for;
            })
            .map((t, i) => ({ ...t, rank: i + 1, goals_diff: t.goals_for - t.goals_against }));
    }, [standings, fixtures, applied]);

    const groupMap = useMemo(() => {
        const m = {};
        computed.forEach(t => {
            const g = t.group_name || 'Classement';
            if (!m[g]) m[g] = [];
            m[g].push(t);
        });
        return m;
    }, [computed]);

    const groups = Object.entries(groupMap);

    if (!standings.length) return (
        <div className="sov4-standings-empty">Aucune donnée de classement.</div>
    );

    return (
        <div className="sov4-standings">
            {/* Filter bar */}
            <div className="sov4-standings-bar">
                <span className="sov4-filter-label">Journées</span>
                <input
                    type="number" min="1" max={maxRound}
                    value={filterStart}
                    onChange={e => setFilterStart(e.target.value)}
                    className="sov4-filter-input"
                    placeholder="1"
                />
                <span className="sov4-filter-sep">—</span>
                <input
                    type="number" min="1" max={maxRound}
                    value={filterEnd}
                    onChange={e => setFilterEnd(e.target.value)}
                    className="sov4-filter-input"
                    placeholder={maxRound || '38'}
                />
                <button
                    className="sov4-filter-btn"
                    onClick={() => setApplied({ start: Number(filterStart) || null, end: Number(filterEnd) || null })}
                    type="button"
                >
                    Appliquer
                </button>
                {loading && <span className="sov4-filter-spinner" />}
            </div>

            {groups.map(([groupName, teams]) => {
                const total = teams.length;
                const hasZones = total >= 16;
                let lastZone = '';

                return (
                    <div key={groupName} className="sov4-standings-group">
                        {groups.length > 1 && (
                            <div className="sov4-group-title">{groupName}</div>
                        )}

                        <table className="sov4-table">
                            <thead>
                                <tr>
                                    <th className="col-rank">#</th>
                                    <th className="col-club">Club</th>
                                    <th className="col-num">J</th>
                                    <th className="col-num col-hide-sm">W</th>
                                    <th className="col-num col-hide-sm">D</th>
                                    <th className="col-num col-hide-sm">L</th>
                                    <th className="col-num col-hide-md">BM</th>
                                    <th className="col-num col-hide-md">BE</th>
                                    <th className="col-num">DB</th>
                                    <th className="col-pts">Pts</th>
                                </tr>
                            </thead>
                            <tbody>
                                {teams.map(t => {
                                    const zone = hasZones ? getZone(t.rank, total) : '';
                                    const zoneBorder = hasZones && zone !== lastZone && t.rank > 1;
                                    lastZone = zone;
                                    const gd = t.goals_diff ?? (t.goals_for - t.goals_against);

                                    return (
                                        <tr
                                            key={t.team_id}
                                            className={`sov4-row ${zone ? `sov4-zone--${zone}` : ''} ${zoneBorder ? 'sov4-zone-border' : ''}`}
                                        >
                                            <td className="col-rank">
                                                <span className={`sov4-rank sov4-rank--${zone || 'neutral'}`}>
                                                    {t.rank}
                                                </span>
                                            </td>
                                            <td className="col-club">
                                                <Link to={`/club/${t.team_id}`} className="sov4-club-link">
                                                    <img
                                                        src={t.team_logo}
                                                        alt=""
                                                        className="sov4-club-logo"
                                                        onError={e => { e.currentTarget.style.visibility = 'hidden'; }}
                                                    />
                                                    <span className="sov4-club-name">{t.team_name}</span>
                                                    {zone && (
                                                        <span className={`sov4-zone-badge sov4-zone-badge--${zone}`}>
                                                            {ZONE_LABELS[zone]}
                                                        </span>
                                                    )}
                                                </Link>
                                            </td>
                                            <td className="col-num">{t.played}</td>
                                            <td className="col-num col-hide-sm sov4-win">{t.win}</td>
                                            <td className="col-num col-hide-sm">{t.draw}</td>
                                            <td className="col-num col-hide-sm sov4-lose">{t.lose}</td>
                                            <td className="col-num col-hide-md sov4-muted">{t.goals_for}</td>
                                            <td className="col-num col-hide-md sov4-muted">{t.goals_against}</td>
                                            <td className="col-num">
                                                <span className={gd > 0 ? 'sov4-pos' : gd < 0 ? 'sov4-neg' : ''}>
                                                    {gd > 0 ? `+${gd}` : gd}
                                                </span>
                                            </td>
                                            <td className="col-pts">
                                                <strong className="sov4-pts">{t.points}</strong>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                );
            })}

            {/* Zone legend */}
            {computed.length >= 16 && (
                <div className="sov4-legend">
                    <span className="sov4-legend-item sov4-legend--cl">Champions League</span>
                    <span className="sov4-legend-item sov4-legend--el">Europa League</span>
                    <span className="sov4-legend-item sov4-legend--ecl">Conference League</span>
                    <span className="sov4-legend-item sov4-legend--rel">Relégation</span>
                </div>
            )}
        </div>
    );
};

StandingsTableV4.propTypes = {
    standings: PropTypes.array,
    fixtures:  PropTypes.array,
    loading:   PropTypes.bool,
};

export default StandingsTableV4;
