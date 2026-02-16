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
    const [leaguesMeta, setLeaguesMeta] = useState([]); // Grouped { country, leagues: [] }
    const [nationalities, setNationalities] = useState([]); // List of distinct nationalities
    const [isLoadingMeta, setIsLoadingMeta] = useState(true);

    // 'specific' | 'league' | 'country' | 'standings'
    const [mode, setMode] = useState('specific');

    // Selection State
    const [selectedPlayers, setSelectedPlayers] = useState([]); // Manual mode
    const [selectedLeague, setSelectedLeague] = useState('');   // League & Standings mode
    const [selectedCountry, setSelectedCountry] = useState(''); // Country mode
    const [playerSearchQuery, setPlayerSearchQuery] = useState('');
    const [playerSearchResults, setPlayerSearchResults] = useState([]);

    // Club State
    const [selectedTeam, setSelectedTeam] = useState(null);
    const [teamSearchQuery, setTeamSearchQuery] = useState('');
    const [teamSearchResults, setTeamSearchResults] = useState([]);

    // Fetch initial metadata
    useEffect(() => {
        const fetchMeta = async () => {
            try {
                const [statsRes, leaguesRes, natsRes] = await Promise.all([
                    fetch('/api/v3/studio/meta/stats'),
                    fetch('/api/v3/studio/meta/leagues'),
                    fetch('/api/v3/studio/meta/nationalities')
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
                const res = await fetch(`/api/v3/studio/meta/players?search=${playerSearchQuery}`);
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
                const res = await fetch(`/api/v3/studio/meta/teams?search=${teamSearchQuery}`);
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

    const removePlayer = (pid) => {
        setSelectedPlayers(selectedPlayers.filter(p => p.player_id !== pid));
    };

    const handleNext = async () => {
        setIsLoading(true);
        setError(null);

        try {
            // Standing Race Special Flow
            if (mode === 'standings') {
                if (!selectedLeague) throw new Error("Please select a league.");
                const season = filters.years[1];

                const res = await fetch('/api/v3/studio/query/league-rankings', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ league_id: parseInt(selectedLeague), season })
                });

                if (!res.ok) {
                    const errJson = await res.json();
                    throw new Error(errJson.error || 'Failed to fetch ranking data');
                }

                const data = await res.json();
                setChartData(data);
                setVisual(prev => ({ ...prev, type: 'league_race' }));
                setIsLoading(false);
                goToStep(2);
                return;
            }

            // Standard Flow
            let payloadFilters = {
                years: filters.years,
                leagues: [],
                countries: [],
                teams: []
            };
            let payloadSelection = { mode: 'top_n', value: 100, players: [] };
            let contextLabel = '';

            if (mode === 'specific') {
                if (selectedPlayers.length === 0) throw new Error("Please select at least one player.");
                payloadSelection.mode = 'manual';
                payloadSelection.players = selectedPlayers.map(p => p.player_id);
            } else if (mode === 'league') {
                if (!selectedLeague) throw new Error("Please select a league.");
                payloadFilters.leagues = [parseInt(selectedLeague)];

                for (const group of leaguesMeta) {
                    const l = group.leagues.find(x => x.id === parseInt(selectedLeague));
                    if (l) { contextLabel = l.name; break; }
                }
            } else if (mode === 'country') {
                if (!selectedCountry) throw new Error("Please select a nationality.");
                payloadFilters.countries = [selectedCountry];
                contextLabel = selectedCountry;
            } else if (mode === 'club') {
                if (!selectedTeam) throw new Error("Please select a club.");
                payloadFilters.teams = [parseInt(selectedTeam.id)];
                contextLabel = selectedTeam.name;
            }

            setFilters(prev => ({ ...prev, contextLabel, contextType: mode }));

            const payload = {
                stat: filters.stat,
                filters: payloadFilters,
                selection: payloadSelection,
                options: { cumulative: filters.cumulative }
            };

            const res = await fetch('/api/v3/studio/query', {
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

            setChartData(data);
            goToStep(2);

        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoadingMeta) return <div className="loading-spinner">Loading options...</div>;

    return (
        <div className="step-container fade-in">
            <h2>Select Data Source</h2>

            {/* 1. Mode Selector */}
            <div className="mode-selector">
                <button className={`mode-btn ${mode === 'specific' ? 'active' : ''}`} onClick={() => setMode('specific')}>👤 Players</button>
                <button className={`mode-btn ${mode === 'league' ? 'active' : ''}`} onClick={() => setMode('league')}>🏆 League Top</button>
                <button className={`mode-btn ${mode === 'country' ? 'active' : ''}`} onClick={() => setMode('country')}>🌍 Country</button>
                <button className={`mode-btn ${mode === 'club' ? 'active' : ''}`} onClick={() => setMode('club')}>🛡️ Club</button>
                <button className={`mode-btn ${mode === 'standings' ? 'active' : ''}`} onClick={() => setMode('standings')}>📈 Standing Race</button>
            </div>

            {/* 2. Source Input (Dynamic) */}
            <div className="source-input-area">

                {mode === 'specific' && (
                    <div className="player-search">
                        <input type="text" placeholder="Search player..." value={playerSearchQuery} onChange={(e) => setPlayerSearchQuery(e.target.value)} className="search-input" />
                        {playerSearchResults.length > 0 && (
                            <ul className="search-results">
                                {playerSearchResults.map(p => (
                                    <li key={p.player_id} onClick={() => addPlayer(p)}>
                                        <img src={p.photo_url} alt="" className="avatar-mini" />
                                        <span>{p.name}</span>
                                        <small>{p.team_name}</small>
                                    </li>
                                ))}
                            </ul>
                        )}
                        <div className="selected-chips">
                            {selectedPlayers.map(p => (
                                <div key={p.player_id} className="chip">
                                    <img src={p.photo_url} alt="" /> {p.name}
                                    <span className="remove" onClick={() => removePlayer(p.player_id)}>×</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {(mode === 'league' || mode === 'standings') && (
                    <div className="league-select">
                        <select value={selectedLeague} onChange={(e) => setSelectedLeague(e.target.value)} className="full-width">
                            <option value="">-- Select League --</option>
                            {leaguesMeta.map(group => {
                                // Filter for League type only if in standings mode
                                const filteredLeagues = mode === 'standings'
                                    ? group.leagues.filter(l => l.type === 'League')
                                    : group.leagues;

                                if (filteredLeagues.length === 0) return null;

                                return (
                                    <optgroup key={group.country} label={group.country}>
                                        {filteredLeagues.map(l => (
                                            <option key={l.id} value={l.id}>{l.name}</option>
                                        ))}
                                    </optgroup>
                                );
                            })}
                        </select>
                    </div>
                )}

                {mode === 'country' && (
                    <div className="country-select">
                        <select value={selectedCountry} onChange={(e) => setSelectedCountry(e.target.value)} className="full-width">
                            <option value="">-- Select Nationality --</option>
                            {nationalities.map(nat => <option key={nat} value={nat}>{nat}</option>)}
                        </select>
                    </div>
                )}

                {mode === 'club' && (
                    <div className="team-search">
                        {!selectedTeam ? (
                            <div className="search-container">
                                <input type="text" placeholder="Search club..." value={teamSearchQuery} onChange={(e) => setTeamSearchQuery(e.target.value)} className="search-input full-width" />
                                {teamSearchResults.length > 0 && (
                                    <ul className="search-results dropdown">
                                        {teamSearchResults.map(t => (
                                            <li key={t.team_id} onClick={() => { setSelectedTeam({ id: t.team_id, name: t.name, logo: t.logo_url }); setTeamSearchQuery(''); setTeamSearchResults([]); }}>
                                                <img src={t.logo_url} alt="" className="avatar-mini" /> <span>{t.name}</span>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        ) : (
                            <div className="selected-item-card">
                                <img src={selectedTeam.logo} alt="" className="avatar-small" /> <span className="label">{selectedTeam.name}</span>
                                <button className="btn-small btn-danger" onClick={() => setSelectedTeam(null)}>Change</button>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* 3. Stat Selection (Hidden for Standings) */}
            {mode !== 'standings' && (
                <div className="form-group">
                    <label>Statistic</label>
                    <select value={filters.stat} onChange={handleStatChange} className="full-width">
                        <option value="">-- Select Stat --</option>
                        {statsMeta.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                    </select>
                </div>
            )}

            {/* 4. Year Range / Single Year */}
            <div className="form-group">
                <label>{mode === 'standings' ? 'Season' : `Season Range (${filters.years[0]} - ${filters.years[1]})`}</label>
                <div className="range-inputs">
                    {mode === 'standings' ? (
                        <select
                            value={filters.years[1]}
                            onChange={(e) => handleYearChange(e, 1)}
                            className="full-width"
                        >
                            {Array.from({ length: 25 }, (_, i) => new Date().getFullYear() - i).map(year => (
                                <option key={year} value={year}>{year - 1}/{year}</option>
                            ))}
                        </select>
                    ) : (
                        <>
                            <input type="number" value={filters.years[0]} min="2000" max={filters.years[1]} onChange={(e) => handleYearChange(e, 0)} />
                            <span>to</span>
                            <input type="number" value={filters.years[1]} min={filters.years[0]} max={new Date().getFullYear()} onChange={(e) => handleYearChange(e, 1)} />
                        </>
                    )}
                </div>
            </div>

            {/* 5. Options (Hidden for Standings) */}
            {mode !== 'standings' && (
                <div className="form-group">
                    <label className="checkbox-item option-toggle">
                        <input type="checkbox" checked={filters.cumulative} onChange={(e) => setFilters(prev => ({ ...prev, cumulative: e.target.checked }))} />
                        <span className="chk-label">Cumulative Sum (Total Career)</span>
                    </label>
                </div>
            )}

            {/* Actions */}
            <div className="step-actions">
                <button className="btn-next" disabled={(mode !== 'standings' && !filters.stat) || isLoading} onClick={handleNext}>
                    {isLoading ? 'Processing...' : 'Next: Design Chart →'}
                </button>
            </div>
        </div>
    );
};

export default Step1_Data;
