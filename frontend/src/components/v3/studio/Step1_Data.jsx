import React, { useState, useEffect } from 'react';
import { useStudio } from './StudioContext';
import './Step1_Data.css';

const Step1_Data = () => {
    const {
        filters, setFilters,
        isLoading, setIsLoading, setError,
        goToStep, setChartData
    } = useStudio();

    const [statsMeta, setStatsMeta] = useState([]);
    const [leaguesMeta, setLeaguesMeta] = useState([]); // Grouped { country, leagues: [] }
    const [nationalities, setNationalities] = useState([]); // List of distinct nationalities
    const [isLoadingMeta, setIsLoadingMeta] = useState(true);

    // Filter Mode State
    // 'specific' | 'league' | 'country'
    const [mode, setMode] = useState('specific');

    // Selection State
    const [selectedPlayers, setSelectedPlayers] = useState([]); // Manual mode
    const [selectedLeague, setSelectedLeague] = useState('');   // League mode
    const [selectedCountry, setSelectedCountry] = useState(''); // Country mode
    const [playerSearchQuery, setPlayerSearchQuery] = useState('');
    const [playerSearchResults, setPlayerSearchResults] = useState([]);

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
    }, []);

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
            // Construct Payload based on Mode
            let payloadFilters = {
                years: filters.years,
                leagues: [],
                countries: []
            };
            // Default Top N to 100 to support large vertical charts
            let payloadSelection = { mode: 'top_n', value: 100, players: [] };

            let contextLabel = '';

            if (mode === 'specific') {
                if (selectedPlayers.length === 0) throw new Error("Please select at least one player.");
                payloadSelection.mode = 'manual';
                payloadSelection.players = selectedPlayers.map(p => p.player_id);
                // No context label for specific players
            } else if (mode === 'league') {
                if (!selectedLeague) throw new Error("Please select a league.");
                payloadFilters.leagues = [parseInt(selectedLeague)];
                payloadSelection.mode = 'top_n';

                // Find League Name
                let found = false;
                for (const group of leaguesMeta) {
                    const l = group.leagues.find(x => x.id === parseInt(selectedLeague));
                    if (l) {
                        contextLabel = l.name;
                        found = true;
                        break;
                    }
                }
            } else if (mode === 'country') {
                if (!selectedCountry) throw new Error("Please select a nationality.");
                payloadFilters.countries = [selectedCountry];
                payloadSelection.mode = 'top_n';
                contextLabel = selectedCountry;
            }

            // Update filters with context label for Step 3 Title
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

            // Validate data
            const totalRecords = data.timeline.reduce((acc, frame) => acc + frame.records.length, 0);
            if (totalRecords === 0) {
                throw new Error("No data found. Try expanding the year range or selecting widespread players.");
            }

            setChartData(data);

            // Persist selections to context for back/forth navigation
            // (Ideally we would update Filters thoroughly here)

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
                <button
                    className={`mode-btn ${mode === 'specific' ? 'active' : ''}`}
                    onClick={() => setMode('specific')}
                >
                    👤 Specific Players
                </button>
                <button
                    className={`mode-btn ${mode === 'league' ? 'active' : ''}`}
                    onClick={() => setMode('league')}
                >
                    🏆 League All-Stars
                </button>
                <button
                    className={`mode-btn ${mode === 'country' ? 'active' : ''}`}
                    onClick={() => setMode('country')}
                >
                    🌍 National Talent
                </button>
            </div>

            {/* 2. Source Input (Dynamic) */}
            <div className="source-input-area">

                {mode === 'specific' && (
                    <div className="player-search">
                        <input
                            type="text"
                            placeholder="Type player name (e.g. Messi)..."
                            value={playerSearchQuery}
                            onChange={(e) => setPlayerSearchQuery(e.target.value)}
                            className="search-input"
                        />
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
                                    <img src={p.photo_url} alt="" />
                                    {p.name}
                                    <span className="remove" onClick={() => removePlayer(p.player_id)}>×</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {mode === 'league' && (
                    <div className="league-select">
                        <select
                            value={selectedLeague}
                            onChange={(e) => setSelectedLeague(e.target.value)}
                            className="full-width"
                        >
                            <option value="">-- Select League --</option>
                            {leaguesMeta.map(group => (
                                <optgroup key={group.country} label={group.country}>
                                    {group.leagues.map(l => (
                                        <option key={l.id} value={l.id}>{l.name}</option>
                                    ))}
                                </optgroup>
                            ))}
                        </select>
                    </div>
                )}

                {mode === 'country' && (
                    <div className="country-select">
                        <select
                            value={selectedCountry}
                            onChange={(e) => setSelectedCountry(e.target.value)}
                            className="full-width"
                        >
                            <option value="">-- Select Nationality --</option>
                            {/* Use fetched Nationalities instead of League Countries */}
                            {nationalities.map(nat => (
                                <option key={nat} value={nat}>
                                    {nat}
                                </option>
                            ))}
                        </select>
                    </div>
                )}

            </div>

            {/* 3. Stat Selection */}
            <div className="form-group">
                <label>Statistic</label>
                <select value={filters.stat} onChange={handleStatChange} className="full-width">
                    <option value="">-- Select Stat --</option>
                    {statsMeta.map(s => (
                        <option key={s.key} value={s.key}>{s.label}</option>
                    ))}
                </select>
            </div>

            {/* 4. Year Range */}
            <div className="form-group">
                <label>Season Range ({filters.years[0]} - {filters.years[1]})</label>
                <div className="range-inputs">
                    <input
                        type="number"
                        value={filters.years[0]}
                        min="2000"
                        max={filters.years[1]}
                        onChange={(e) => handleYearChange(e, 0)}
                    />
                    <span>to</span>
                    <input
                        type="number"
                        value={filters.years[1]}
                        min={filters.years[0]}
                        max={new Date().getFullYear()}
                        onChange={(e) => handleYearChange(e, 1)}
                    />
                </div>
            </div>

            {/* 5. Options */}
            <div className="form-group">
                <label className="checkbox-item option-toggle">
                    <input
                        type="checkbox"
                        checked={filters.cumulative}
                        onChange={(e) => setFilters(prev => ({ ...prev, cumulative: e.target.checked }))}
                    />
                    <span className="chk-label">Cumulative Sum (Total Career)</span>
                </label>
            </div>

            {/* Actions */}
            <div className="step-actions">
                <button
                    className="btn-next"
                    disabled={!filters.stat || isLoading}
                    onClick={handleNext}
                >
                    {isLoading ? 'Processing...' : 'Next: Design Chart →'}
                </button>
            </div>
        </div>
    );
};

export default Step1_Data;
