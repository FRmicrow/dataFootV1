import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { useStudio } from './StudioContext';
import { Tabs } from '../../../../design-system';
import './Step1_Data.css';

// ─── CUSTOM HOOKS ────────────────────────────────────────────────────────────

const useStudioMeta = (setError) => {
    const [statsMeta, setStatsMeta] = useState([]);
    const [leaguesMeta, setLeaguesMeta] = useState([]);
    const [nationalities, setNationalities] = useState([]);
    const [isLoadingMeta, setIsLoadingMeta] = useState(true);

    useEffect(() => {
        const fetchMeta = async () => {
            try {
                const [statsRes, leaguesRes, natsRes] = await Promise.all([
                    fetch('/api/studio/meta/stats'),
                    fetch('/api/studio/meta/leagues'),
                    fetch('/api/studio/meta/nationalities')
                ]);

                if (!statsRes.ok || !leaguesRes.ok || !natsRes.ok) throw new Error("Metadata fetch failed");

                setStatsMeta(await statsRes.json());
                setLeaguesMeta(await leaguesRes.json());
                setNationalities(await natsRes.json());
            } catch (err) {
                console.error(err);
                setError("Could not load metadata components.");
            } finally {
                setIsLoadingMeta(false);
            }
        };
        fetchMeta();
    }, [setError]);

    return { statsMeta, leaguesMeta, nationalities, isLoadingMeta };
};

const useStudioSearch = (mode, queries) => {
    const [results, setResults] = useState({ players: [], teams: [] });

    useEffect(() => {
        if (mode === 'specific' && queries.player.length >= 3) {
            const timer = setTimeout(() => {
                fetch(`/api/studio/meta/players?search=${queries.player}`)
                    .then(r => r.json())
                    .then(d => setResults(prev => ({ ...prev, players: d })))
                    .catch(console.error);
            }, 300);
            return () => clearTimeout(timer);
        }
    }, [mode, queries.player]);

    useEffect(() => {
        if (mode === 'club' && queries.team.length >= 2) {
            const timer = setTimeout(() => {
                fetch(`/api/studio/meta/teams?search=${queries.team}`)
                    .then(r => r.json())
                    .then(d => setResults(prev => ({ ...prev, teams: d })))
                    .catch(console.error);
            }, 300);
            return () => clearTimeout(timer);
        }
    }, [mode, queries.team]);

    return results;
};

// ─── SUB-COMPONENTS ──────────────────────────────────────────────────────────

const SelectionTags = ({ mode, selected, onRemove }) => (
    <div className="selected-tags-v2">
        {mode === 'specific' && selected.players.map(p => (
            <div key={p.player_id} className="tag-chip-v2">
                <img src={p.photo_url} alt="" /> {p.name}
                <span
                    className="tag-remove-v2"
                    onClick={() => onRemove('player', p.player_id)}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onRemove('player', p.player_id); }}
                    role="button"
                    tabIndex={0}
                    aria-label={`Remove ${p.name}`}
                >×</span>
            </div>
        ))}
        {(mode === 'league' || mode === 'standings') && selected.leagues.map(l => (
            <div key={l.id} className="tag-chip-v2">
                <img src={l.logo} alt="" /> {l.name}
                <span
                    className="tag-remove-v2"
                    onClick={() => onRemove('league', l.id)}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onRemove('league', l.id); }}
                    role="button"
                    tabIndex={0}
                    aria-label={`Remove ${l.name}`}
                >×</span>
            </div>
        ))}
        {mode === 'country' && selected.countries.map(c => (
            <div key={c} className="tag-chip-v2">
                {c}
                <span
                    className="tag-remove-v2"
                    onClick={() => onRemove('country', c)}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onRemove('country', c); }}
                    role="button"
                    tabIndex={0}
                    aria-label={`Remove ${c}`}
                >×</span>
            </div>
        ))}
        {mode === 'club' && selected.teams.map(t => (
            <div key={t.id} className="tag-chip-v2">
                <img src={t.logo} alt="" /> {t.name}
                <span
                    className="tag-remove-v2"
                    onClick={() => onRemove('team', t.id)}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onRemove('team', t.id); }}
                    role="button"
                    tabIndex={0}
                    aria-label={`Remove ${t.name}`}
                >×</span>
            </div>
        ))}
    </div>
);

SelectionTags.propTypes = {
    mode: PropTypes.string.isRequired,
    selected: PropTypes.shape({
        players: PropTypes.array,
        leagues: PropTypes.array,
        countries: PropTypes.array,
        teams: PropTypes.array
    }).isRequired,
    onRemove: PropTypes.func.isRequired
};

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────

const Step1_Data = () => {
    const {
        filters, setFilters,
        isLoading, setIsLoading, setError,
        goToStep, setChartData, setVisual
    } = useStudio();

    const { statsMeta, leaguesMeta, nationalities, isLoadingMeta } = useStudioMeta(setError);

    const [mode, setMode] = useState('specific');
    const [selected, setSelected] = useState({ players: [], leagues: [], countries: [], teams: [] });
    const [queries, setQueries] = useState({ player: '', team: '', league: '', country: '' });

    const searchResults = useStudioSearch(mode, queries);

    const handleNext = async () => {
        setIsLoading(true);
        setError(null);
        try {
            let contextLabel = mode === 'specific'
                ? (selected.players.length === 1 ? selected.players[0].name : `${selected.players.length} Players`)
                : (selected.leagues.length === 1 ? selected.leagues[0].name : 'Leagues');

            if (mode === 'standings') {
                const res = await fetch('/api/studio/query/league-rankings', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ league_id: selected.leagues[0].id, season: filters.years[1] })
                });
                const data = await res.json();
                setVisual(prev => ({ ...prev, type: 'league_race' }));
                setChartData(data);
                setFilters(prev => ({ ...prev, contextLabel, contextType: mode }));
                setIsLoading(false);
                goToStep(2);
                return;
            }

            const res = await fetch('/api/studio/query', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    stat: filters.stat,
                    filters: {
                        years: filters.years,
                        leagues: selected.leagues.map(l => l.id),
                        countries: selected.countries,
                        teams: selected.teams.map(t => t.id)
                    },
                    selection: {
                        mode: mode === 'specific' ? 'manual' : 'top_n',
                        value: 100,
                        players: selected.players.map(p => p.player_id)
                    },
                    options: { cumulative: filters.cumulative }
                })
            });
            const data = await res.json();
            setChartData(data);
            setFilters(prev => ({ ...prev, contextLabel, contextType: mode }));
            setIsLoading(false);
            goToStep(2);
        } catch (err) {
            setError(err.message);
            setIsLoading(false);
        }
    };

    if (isLoadingMeta) return (
        <div className="flex items-center justify-center p-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
        </div>
    );

    return (
        <div className="step-container animate-fade-in">
            <h2 className="step-title-v2">Selection & Scope</h2>

            <Tabs
                items={[
                    { id: 'specific', label: 'Player Performance', icon: '👤' },
                    { id: 'league', label: 'League Insights', icon: '🏆' },
                    { id: 'country', label: 'Nationality Comparisons', icon: '🌍' },
                    { id: 'club', label: 'Club Metrics', icon: '🛡️' },
                    { id: 'standings', label: 'League Standings', icon: '📈' }
                ]}
                activeId={mode}
                onChange={setMode}
                variant="pills"
                className="mb-lg"
            />

            <div className="form-group-v2">
                <label className="form-label-v2">{mode === 'specific' ? 'Selected Players' : 'Selected Scope'}</label>
                <div style={{ position: 'relative' }}>
                    {mode === 'specific' && (
                        <input type="text" placeholder="Search players..." value={queries.player}
                            onChange={e => setQueries({ ...queries, player: e.target.value })} className="input-v2" />
                    )}
                    {(mode === 'league' || mode === 'standings') && (
                        <input type="text" placeholder="Search leagues..." value={queries.league}
                            onChange={e => setQueries({ ...queries, league: e.target.value })} className="input-v2" />
                    )}
                    {mode === 'country' && (
                        <input type="text" placeholder="Search nationalities..." value={queries.country}
                            onChange={e => setQueries({ ...queries, country: e.target.value })} className="input-v2" />
                    )}
                    {mode === 'club' && (
                        <input type="text" placeholder="Search clubs..." value={queries.team}
                            onChange={e => setQueries({ ...queries, team: e.target.value })} className="input-v2" />
                    )}

                    {/* Search Results */}
                    {mode === 'specific' && searchResults.players.length > 0 && (
                        <div className="search-results-v2">
                            {searchResults.players.map(p => (
                                <div
                                    key={p.player_id}
                                    className="result-item-v2"
                                    onClick={() => {
                                        setSelected({ ...selected, players: [...selected.players, p] });
                                        setQueries({ ...queries, player: '' });
                                    }}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' || e.key === ' ') {
                                            setSelected({ ...selected, players: [...selected.players, p] });
                                            setQueries({ ...queries, player: '' });
                                        }
                                    }}
                                    role="button"
                                    tabIndex={0}
                                >
                                    <img src={p.photo_url} alt="" />
                                    <div className="result-info-v2">
                                        <span className="result-name-v2">{p.name}</span>
                                        <span className="result-meta-v2">{p.team_name}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {(mode === 'league' || mode === 'standings') && queries.league.length > 0 && (
                        <div className="search-results-v2">
                            {leaguesMeta.flatMap(g =>
                                g.leagues.filter(l => l.name.toLowerCase().includes(queries.league.toLowerCase()))
                                    .map(l => ({ ...l, country: g.country }))
                            ).slice(0, 10).map(l => (
                                <div
                                    key={l.id}
                                    className="result-item-v2"
                                    onClick={() => {
                                        setSelected({ ...selected, leagues: [l] });
                                        setQueries({ ...queries, league: '' });
                                    }}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' || e.key === ' ') {
                                            setSelected({ ...selected, leagues: [l] });
                                            setQueries({ ...queries, league: '' });
                                        }
                                    }}
                                    role="button"
                                    tabIndex={0}
                                >
                                    <img src={l.logo} alt="" />
                                    <div className="result-info-v2">
                                        <span className="result-name-v2">{l.name}</span>
                                        <span className="result-meta-v2">{l.country}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {mode === 'country' && queries.country.length > 0 && (
                        <div className="search-results-v2">
                            {nationalities.filter(n => n.toLowerCase().includes(queries.country.toLowerCase()))
                                .slice(0, 10).map(n => (
                                    <div
                                        key={n}
                                        className="result-item-v2"
                                        onClick={() => {
                                            setSelected({ ...selected, countries: [n] });
                                            setQueries({ ...queries, country: '' });
                                        }}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' || e.key === ' ') {
                                                setSelected({ ...selected, countries: [n] });
                                                setQueries({ ...queries, country: '' });
                                            }
                                        }}
                                        role="button"
                                        tabIndex={0}
                                    >
                                        <div className="result-info-v2">
                                            <span className="result-name-v2">{n}</span>
                                        </div>
                                    </div>
                                ))}
                        </div>
                    )}

                    {mode === 'club' && searchResults.teams.length > 0 && (
                        <div className="search-results-v2">
                            {searchResults.teams.map(t => (
                                <div
                                    key={t.team_id}
                                    className="result-item-v2"
                                    onClick={() => {
                                        setSelected({ ...selected, teams: [{ id: t.team_id, name: t.name, logo: t.logo_url }] });
                                        setQueries({ ...queries, team: '' });
                                    }}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' || e.key === ' ') {
                                            setSelected({ ...selected, teams: [{ id: t.team_id, name: t.name, logo: t.logo_url }] });
                                            setQueries({ ...queries, team: '' });
                                        }
                                    }}
                                    role="button"
                                    tabIndex={0}
                                >
                                    <img src={t.logo_url} alt="" />
                                    <div className="result-info-v2">
                                        <span className="result-name-v2">{t.name}</span>
                                        <span className="result-meta-v2">{t.country_name}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    <SelectionTags
                        mode={mode}
                        selected={selected}
                        onRemove={(type, id) => setSelected({
                            ...selected,
                            [type + 's']: selected[type + 's'].filter(x => (x.id || x.player_id || x) !== id)
                        })}
                    />
                </div>
            </div>

            {mode !== 'standings' && (
                <div className="form-group-v2">
                    <label className="form-label-v2">Performance Metric</label>
                    <select value={filters.stat} onChange={e => setFilters({ ...filters, stat: e.target.value })} className="input-v2">
                        <option value="">Select Surveillance Metric...</option>
                        {statsMeta.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                    </select>
                </div>
            )}

            <div className="form-group-v2">
                <label className="form-label-v2">Time Range Filter</label>
                <div className="range-grid-v2">
                    {mode === 'standings' ? (
                        <select value={filters.years[1]}
                            onChange={e => setFilters({ ...filters, years: [filters.years[0], Number.parseInt(e.target.value)] })}
                            className="input-v2" style={{ gridColumn: 'span 3' }}>
                            {Array.from({ length: 15 }, (_, i) => 2024 - i).map(y => (
                                <option key={y} value={y}>{y}/{y + 1}</option>
                            ))}
                        </select>
                    ) : (
                        <>
                            <input type="number" value={filters.years[0]}
                                onChange={e => setFilters({ ...filters, years: [Number.parseInt(e.target.value), filters.years[1]] })}
                                className="input-v2" />
                            <span>TO</span>
                            <input type="number" value={filters.years[1]}
                                onChange={e => setFilters({ ...filters, years: [filters.years[0], Number.parseInt(e.target.value)] })}
                                className="input-v2" />
                        </>
                    )}
                </div>
            </div>

            <div className="step-actions" style={{ marginTop: '2rem' }}>
                <button className="btn-primary-v2" disabled={isLoading} onClick={handleNext}>
                    {isLoading ? 'Loading...' : 'Initialize Visualization sequence →'}
                </button>
            </div>
        </div>
    );
};

export default Step1_Data;
