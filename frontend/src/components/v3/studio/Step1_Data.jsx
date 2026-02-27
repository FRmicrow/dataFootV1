import React, { useState, useEffect } from 'react';
import { useStudio } from './StudioContext';
import './Step1_Data.css';

const Step1_Data = () => {
    const {
        filters, setFilters,
        isLoading, setIsLoading, setError,
        goToStep, setChartData, setVisual
    } = useStudio();

    const [statsMeta, setStatsMeta] = useState([]);
    const [leaguesMeta, setLeaguesMeta] = useState([]);
    const [nationalities, setNationalities] = useState([]);
    const [isLoadingMeta, setIsLoadingMeta] = useState(true);

    // 'specific' | 'league' | 'country' | 'club' (renamed from 'club') | 'standings'
    const [mode, setMode] = useState('specific');

    // Selection State (Multi-selection for everything)
    const [selectedPlayers, setSelectedPlayers] = useState([]);
    const [selectedLeagues, setSelectedLeagues] = useState([]);
    const [selectedCountries, setSelectedCountries] = useState([]);
    const [selectedTeams, setSelectedTeams] = useState([]);

    const [playerSearchQuery, setPlayerSearchQuery] = useState('');
    const [playerSearchResults, setPlayerSearchResults] = useState([]);

    const [teamSearchQuery, setTeamSearchQuery] = useState('');
    const [teamSearchResults, setTeamSearchResults] = useState([]);

    const [leagueSearchQuery, setLeagueSearchQuery] = useState('');
    const [countrySearchQuery, setCountrySearchQuery] = useState('');

    // Fetch initial metadata
    useEffect(() => {
        const fetchMeta = async () => {
            try {
                const [statsRes, leaguesRes, natsRes] = await Promise.all([
                    fetch('/api/studio/meta/stats'),
                    fetch('/api/studio/meta/leagues'),
                    fetch('/api/studio/meta/nationalities')
                ]);

                const stats = await statsRes.json();
                const leagues = await leaguesRes.json();
                const nats = await natsRes.json();

                setStatsMeta(stats);
                setLeaguesMeta(leagues);
                setNationalities(nats);
                setIsLoadingMeta(false);
            } catch (err) {
                console.error("Failed to load metadata", err);
                setError("Could not load form options. Is backend running?");
                setIsLoadingMeta(false);
            }
        };
        fetchMeta();
    }, [setError]);

    // Player Search Effect
    useEffect(() => {
        if (playerSearchQuery.length < 3) {
            setPlayerSearchResults([]);
            return;
        }

        const timer = setTimeout(async () => {
            try {
                const res = await fetch(`/api/studio/meta/players?search=${playerSearchQuery}`);
                const data = await res.json();
                setPlayerSearchResults(data);
            } catch (err) {
                console.error("Search failed", err);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [playerSearchQuery]);

    // Team Search Effect
    useEffect(() => {
        if (teamSearchQuery.length < 2) {
            setTeamSearchResults([]);
            return;
        }

        const timer = setTimeout(async () => {
            try {
                const res = await fetch(`/api/studio/meta/teams?search=${teamSearchQuery}`);
                const data = await res.json();
                setTeamSearchResults(data);
            } catch (err) {
                console.error("Team Search failed", err);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [teamSearchQuery]);


    // Handlers
    const handleStatChange = (e) => setFilters(prev => ({ ...prev, stat: e.target.value }));

    const handleYearChange = (e, idx) => {
        const val = parseInt(e.target.value);
        setFilters(prev => {
            const nextYears = [...prev.years];
            nextYears[idx] = val;
            return { ...prev, years: nextYears };
        });
    };

    const addPlayer = (player) => {
        if (!selectedPlayers.find(p => p.player_id === player.player_id)) {
            setSelectedPlayers([...selectedPlayers, player]);
        }
        setPlayerSearchQuery('');
        setPlayerSearchResults([]);
    };

    const addLeague = (league) => {
        // Enforce single-select for League Insights as per UX recommendation
        setSelectedLeagues([league]);
        setLeagueSearchQuery('');
    };

    const addCountry = (country) => {
        // Enforce single-select for Nationality Comparisons as per UX recommendation
        setSelectedCountries([country]);
        setCountrySearchQuery('');
    };

    const addTeam = (team) => {
        // Enforce single-select for Club Metrics as per UX recommendation
        setSelectedTeams([team]);
        setTeamSearchQuery('');
        setTeamSearchResults([]);
    };

    const removePlayer = (pid) => setSelectedPlayers(selectedPlayers.filter(p => p.player_id !== pid));
    const removeLeague = (id) => setSelectedLeagues(selectedLeagues.filter(l => l.id !== id));
    const removeCountry = (c) => setSelectedCountries(selectedCountries.filter(x => x !== c));
    const removeTeam = (id) => setSelectedTeams(selectedTeams.filter(t => t.id !== id));

    const finalizeStep1 = (data, meta, mode) => {
        setChartData(data);
        if (meta.contextLabel) {
            setFilters(prev => ({ ...prev, contextLabel: meta.contextLabel, contextType: mode }));
        }
        setIsLoading(false);
        goToStep(2);
    };

    const handleNext = async () => {
        setIsLoading(true);
        setError(null);

        try {
            // Calculate final metadata for this run
            let contextLabel = '';
            if (mode === 'specific') {
                if (selectedPlayers.length === 0) throw new Error("Please select at least one player.");
                contextLabel = selectedPlayers.length === 1 ? selectedPlayers[0].name : `${selectedPlayers.length} Selected Players`;
            } else if (mode === 'league' || mode === 'standings') {
                if (selectedLeagues.length === 0) throw new Error("Please select a league.");
                contextLabel = selectedLeagues.length === 1 ? selectedLeagues[0].name : `${selectedLeagues.length} Leagues`;
            } else if (mode === 'country') {
                if (selectedCountries.length === 0) throw new Error("Please select a nationality.");
                contextLabel = selectedCountries.length === 1 ? selectedCountries[0] : `${selectedCountries.length} Countries`;
            } else if (mode === 'club') {
                if (selectedTeams.length === 0) throw new Error("Please select a club.");
                contextLabel = selectedTeams.length === 1 ? selectedTeams[0].name : `${selectedTeams.length} Clubs`;
            }

            // Standing Race Special Flow
            if (mode === 'standings') {
                const season = filters.years[1];
                const leagueId = selectedLeagues[0].id;

                const res = await fetch('/api/studio/query/league-rankings', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ league_id: parseInt(leagueId), season })
                });

                if (!res.ok) {
                    const errJson = await res.json();
                    throw new Error(errJson.error || 'Failed to fetch ranking data');
                }

                const data = await res.json();
                setVisual(prev => ({ ...prev, type: 'league_race' }));
                finalizeStep1(data, { contextLabel }, mode);
                return;
            }

            // Standard Flow
            let payloadFilters = {
                years: filters.years,
                leagues: selectedLeagues.map(l => l.id),
                countries: selectedCountries,
                teams: selectedTeams.map(t => t.id)
            };
            let payloadSelection = { mode: 'top_n', value: 100, players: [] };

            if (mode === 'specific') {
                payloadSelection.mode = 'manual';
                payloadSelection.players = selectedPlayers.map(p => p.player_id);
            }

            const payload = {
                stat: filters.stat,
                filters: payloadFilters,
                selection: payloadSelection,
                options: { cumulative: filters.cumulative }
            };

            const res = await fetch('/api/studio/query', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!res.ok) {
                const errJson = await res.json();
                throw new Error(errJson.error || 'Failed to fetch chart data');
            }

            const data = await res.json();
            const totalRecords = data.timeline.reduce((acc, frame) => acc + frame.records.length, 0);
            if (totalRecords === 0) throw new Error("No data found for this selection.");

            // Finalize with synchronization
            finalizeStep1(data, { contextLabel }, mode);

        } catch (err) {
            console.error("Studio Query Error:", err);
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

            {/* 1. Mode Selector */}
            <div className="mode-selector">
                <button className={`mode-btn ${mode === 'specific' ? 'active' : ''}`} onClick={() => setMode('specific')}>👤 Player Performance</button>
                <button className={`mode-btn ${mode === 'league' ? 'active' : ''}`} onClick={() => setMode('league')}>🏆 League Insights</button>
                <button className={`mode-btn ${mode === 'country' ? 'active' : ''}`} onClick={() => setMode('country')}>🌍 Nationality Comparisons</button>
                <button className={`mode-btn ${mode === 'club' ? 'active' : ''}`} onClick={() => setMode('club')}>🛡️ Club Metrics</button>
                <button className={`mode-btn ${mode === 'standings' ? 'active' : ''}`} onClick={() => setMode('standings')}>📈 League Standings</button>
            </div>

            {/* 2. Source Input Area */}
            <div className="form-group-v2">
                <label className="form-label-v2">
                    {mode === 'specific' ? 'Selected Players' : mode === 'league' ? 'Selected League' : mode === 'country' ? 'Selected Nationality' : mode === 'club' ? 'Selected Club' : 'Selected League'}
                </label>

                <div style={{ position: 'relative' }}>
                    {/* Search / Input Field */}
                    {mode === 'specific' && (
                        <input
                            type="text"
                            placeholder="Search for players (e.g. 'Haaland')..."
                            value={playerSearchQuery}
                            onChange={(e) => setPlayerSearchQuery(e.target.value)}
                            className="input-v2"
                        />
                    )}

                    {mode === 'league' || mode === 'standings' ? (
                        <input
                            type="text"
                            placeholder="Search for a league..."
                            value={leagueSearchQuery}
                            onChange={(e) => setLeagueSearchQuery(e.target.value)}
                            className="input-v2"
                        />
                    ) : null}

                    {mode === 'country' && (
                        <input
                            type="text"
                            placeholder="Search for a nationality..."
                            value={countrySearchQuery}
                            onChange={(e) => setCountrySearchQuery(e.target.value)}
                            className="input-v2"
                        />
                    )}

                    {mode === 'club' && (
                        <input
                            type="text"
                            placeholder="Search for a club..."
                            value={teamSearchQuery}
                            onChange={(e) => setTeamSearchQuery(e.target.value)}
                            className="input-v2"
                        />
                    )}

                    {/* Results Dropdowns */}
                    {mode === 'specific' && playerSearchResults.length > 0 && (
                        <div className="search-results-v2">
                            {playerSearchResults.map(p => (
                                <div key={p.player_id} className="result-item-v2" onClick={() => addPlayer(p)}>
                                    <img src={p.photo_url} alt="" />
                                    <div className="result-info-v2">
                                        <span className="result-name-v2">{p.name}</span>
                                        <span className="result-meta-v2">{p.team_name}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {(mode === 'league' || mode === 'standings') && leagueSearchQuery.length > 0 && (
                        <div className="search-results-v2">
                            {leaguesMeta.flatMap(group =>
                                group.leagues
                                    .filter(l => l.name.toLowerCase().includes(leagueSearchQuery.toLowerCase()))
                                    .filter(l => mode === 'standings' ? l.type === 'League' : true)
                                    .map(l => ({ ...l, country: group.country }))
                            ).slice(0, 15).map(l => (
                                <div key={l.id} className="result-item-v2" onClick={() => addLeague(l)}>
                                    <img src={l.logo} alt="" />
                                    <div className="result-info-v2">
                                        <span className="result-name-v2">{l.name}</span>
                                        <span className="result-meta-v2">{l.country}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {mode === 'country' && countrySearchQuery.length > 0 && (
                        <div className="search-results-v2">
                            {nationalities
                                .filter(n => n.toLowerCase().includes(countrySearchQuery.toLowerCase()))
                                .slice(0, 15)
                                .map(n => (
                                    <div key={n} className="result-item-v2" onClick={() => addCountry(n)}>
                                        <div className="result-info-v2">
                                            <span className="result-name-v2">{n}</span>
                                        </div>
                                    </div>
                                ))
                            }
                        </div>
                    )}

                    {mode === 'club' && teamSearchResults.length > 0 && (
                        <div className="search-results-v2">
                            {teamSearchResults.map(t => (
                                <div key={t.team_id} className="result-item-v2" onClick={() => addTeam({ id: t.team_id, name: t.name, logo: t.logo_url })}>
                                    <img src={t.logo_url} alt="" />
                                    <div className="result-info-v2">
                                        <span className="result-name-v2">{t.name}</span>
                                        <span className="result-meta-v2">{t.country_name}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Selected Tags / Chips */}
                    <div className="selected-tags-v2">
                        {mode === 'specific' && selectedPlayers.map(p => (
                            <div key={p.player_id} className="tag-chip-v2">
                                <img src={p.photo_url} alt="" /> {p.name}
                                <span className="tag-remove-v2" onClick={() => removePlayer(p.player_id)}>×</span>
                            </div>
                        ))}
                        {(mode === 'league' || mode === 'standings') && selectedLeagues.map(l => (
                            <div key={l.id} className="tag-chip-v2">
                                <img src={l.logo} alt="" /> {l.name}
                                <span className="tag-remove-v2" onClick={() => removeLeague(l.id)}>×</span>
                            </div>
                        ))}
                        {mode === 'country' && selectedCountries.map(c => (
                            <div key={c} className="tag-chip-v2">
                                {c}
                                <span className="tag-remove-v2" onClick={() => removeCountry(c)}>×</span>
                            </div>
                        ))}
                        {mode === 'club' && selectedTeams.map(t => (
                            <div key={t.id} className="tag-chip-v2">
                                <img src={t.logo} alt="" /> {t.name}
                                <span className="tag-remove-v2" onClick={() => removeTeam(t.id)}>×</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* 3. Stat Selection (Hidden for Standings) */}
            {mode !== 'standings' && (
                <div className="form-group-v2">
                    <label className="form-label-v2">Performance Metric</label>
                    <select value={filters.stat} onChange={handleStatChange} className="input-v2">
                        <option value="">Select Surveillance Metric...</option>
                        {statsMeta.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                    </select>
                </div>
            )}

            {/* 4. Temporal Range */}
            <div className="form-group-v2">
                <label className="form-label-v2">
                    {mode === 'standings' ? 'Season Filter' : `Date Range (${filters.years[0]} - ${filters.years[1]})`}
                </label>
                <div className="range-grid-v2">
                    {mode === 'standings' ? (
                        <select
                            value={filters.years[1]}
                            onChange={(e) => handleYearChange(e, 1)}
                            className="input-v2"
                            style={{ gridColumn: 'span 3' }}
                        >
                            {Array.from({ length: 25 }, (_, i) => new Date().getFullYear() - i + 1).map(year => (
                                <option key={year} value={year}>{year}/{year + 1}</option>
                            ))}
                        </select>
                    ) : (
                        <>
                            <input type="number" value={filters.years[0]} min="2000" max={filters.years[1]} onChange={(e) => handleYearChange(e, 0)} className="input-v2" />
                            <span className="range-separator-v2">TO</span>
                            <input type="number" value={filters.years[1]} min={filters.years[0]} max={new Date().getFullYear()} onChange={(e) => handleYearChange(e, 1)} className="input-v2" />
                        </>
                    )}
                </div>
            </div>

            {/* Actions */}
            <div className="step-actions" style={{ marginTop: '3rem' }}>
                <button
                    className="btn-primary-v2"
                    disabled={(mode !== 'standings' && !filters.stat) || (mode === 'specific' && selectedPlayers.length === 0) || isLoading}
                    onClick={handleNext}
                >
                    {isLoading ? 'Compiling Registry...' : 'Initialize Visualization Sequence →'}
                </button>
            </div>
        </div>
    );
};

export default Step1_Data;
