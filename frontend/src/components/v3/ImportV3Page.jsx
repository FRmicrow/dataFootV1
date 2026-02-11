import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import './ImportV3Page.css';

const ImportV3Page = () => {
    // --- State ---
    const [countries, setCountries] = useState([]);
    const [selectedCountry, setSelectedCountry] = useState('');

    const [leagues, setLeagues] = useState([]);
    const [selectedLeague, setSelectedLeague] = useState('');
    const [availableSeasons, setAvailableSeasons] = useState([]);

    // Season Range State
    const [fromYear, setFromYear] = useState('');
    const [toYear, setToYear] = useState('');
    const [skipExisting, setSkipExisting] = useState(true);
    const [leagueSyncStatus, setLeagueSyncStatus] = useState([]); // Array of {year, players, fixtures, standings}

    // Queue State
    const [importQueue, setImportQueue] = useState([]);

    const [isImporting, setIsImporting] = useState(false);
    const [logs, setLogs] = useState([]);
    const [autoScroll, setAutoScroll] = useState(true);
    const [discoveredLeagues, setDiscoveredLeagues] = useState([]);
    const [expandedDiscovery, setExpandedDiscovery] = useState({});
    const [discoverySeasons, setDiscoverySeasons] = useState({});
    const [discoverySelected, setDiscoverySelected] = useState({});
    const [discoveryLoading, setDiscoveryLoading] = useState({});

    const logsEndRef = useRef(null);

    // --- Effects ---

    useEffect(() => {
        fetchCountries();
        fetchDiscoveredLeagues();
    }, []);

    useEffect(() => {
        if (selectedCountry) {
            fetchLeagues(selectedCountry);
            setSelectedLeague('');
        } else {
            setLeagues([]);
        }
    }, [selectedCountry]);

    useEffect(() => {
        if (autoScroll) {
            logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }
    }, [logs, autoScroll]);

    // Update available seasons when league changes
    useEffect(() => {
        if (selectedLeague && leagues.length > 0) {
            const leagueObj = leagues.find(l => l.league.id === parseInt(selectedLeague));
            if (leagueObj && leagueObj.seasons) {
                const years = leagueObj.seasons.map(s => s.year).sort((a, b) => b - a);
                setAvailableSeasons(years);
                // Smart Defaulting: oldest to newest
                if (years.length > 0) {
                    setFromYear(years[years.length - 1]);
                    setToYear(years[0]);
                }
                fetchSyncStatus(selectedLeague);
            }
        } else {
            setAvailableSeasons([]);
            setFromYear('');
            setToYear('');
            setLeagueSyncStatus([]);
        }
    }, [selectedLeague, leagues]);

    // --- API Calls ---

    const fetchCountries = async () => {
        try {
            const res = await axios.get('/api/v3/countries');
            setCountries(res.data);
        } catch (error) {
            console.error("Failed to fetch countries", error);
        }
    };

    const fetchLeagues = async (countryName) => {
        try {
            const res = await axios.get(`/api/v3/leagues?country=${encodeURIComponent(countryName)}`);
            setLeagues(res.data);
        } catch (error) {
            console.error("Failed to fetch leagues", error);
        }
    };

    const fetchSyncStatus = async (leagueId) => {
        try {
            const res = await axios.get(`/api/v3/league/${leagueId}/sync-status`);
            setLeagueSyncStatus(res.data);
        } catch (error) {
            console.error("Failed to fetch sync status", error);
        }
    };

    const fetchDiscoveredLeagues = async () => {
        try {
            const res = await axios.get('/api/v3/leagues/discovered');
            setDiscoveredLeagues(res.data);
        } catch (error) {
            console.error("Failed to fetch discovered leagues", error);
        }
    };

    const handleToggleExpand = async (apiId) => {
        const isExpanded = expandedDiscovery[apiId];
        if (isExpanded) {
            setExpandedDiscovery(prev => ({ ...prev, [apiId]: false }));
            return;
        }

        setExpandedDiscovery(prev => ({ ...prev, [apiId]: true }));

        // Fetch if not cached
        if (!discoverySeasons[apiId]) {
            setDiscoveryLoading(prev => ({ ...prev, [apiId]: true }));
            try {
                const res = await axios.get(`/api/v3/league/${apiId}/available-seasons`);
                setDiscoverySeasons(prev => ({ ...prev, [apiId]: res.data.seasons }));
                // Pre-select all missing
                const missing = res.data.seasons.filter(s => s.status !== 'FULL').map(s => s.year);
                setDiscoverySelected(prev => ({ ...prev, [apiId]: new Set(missing) }));
            } catch (error) {
                console.error("Failed to fetch available seasons", error);
            }
            setDiscoveryLoading(prev => ({ ...prev, [apiId]: false }));
        }
    };

    const handleToggleSeasonSelect = (apiId, year) => {
        setDiscoverySelected(prev => {
            const current = new Set(prev[apiId] || []);
            if (current.has(year)) {
                current.delete(year);
            } else {
                current.add(year);
            }
            return { ...prev, [apiId]: current };
        });
    };

    const handleImportSelected = (apiId, leagueName, countryName) => {
        const selected = discoverySelected[apiId];
        if (!selected || selected.size === 0) return;

        const queueItem = {
            id: Date.now(),
            country: countryName,
            leagueId: apiId,
            leagueName: leagueName,
            seasons: Array.from(selected).sort((a, b) => a - b).map(y => ({ year: y, isFull: false, isPartial: false }))
        };
        setImportQueue(prev => [...prev, queueItem]);
    };

    const handleImportAllMissing = (apiId, leagueName, countryName) => {
        const seasons = discoverySeasons[apiId];
        if (!seasons) return;

        const missing = seasons.filter(s => s.status !== 'FULL').map(s => s.year);
        if (missing.length === 0) return;

        const queueItem = {
            id: Date.now(),
            country: countryName,
            leagueId: apiId,
            leagueName: leagueName,
            seasons: missing.sort((a, b) => a - b).map(y => ({ year: y, isFull: false, isPartial: false }))
        };
        setImportQueue(prev => [...prev, queueItem]);
    };

    // --- Handlers ---

    const handleAddToQueue = () => {
        if (!selectedLeague || !selectedCountry) {
            alert("Please select a country and a league.");
            return;
        }

        const leagueObj = leagues.find(l => l.league.id === parseInt(selectedLeague));
        if (!leagueObj) return;

        const start = parseInt(fromYear);
        const end = parseInt(toYear);

        if (start > end) {
            alert("Start year cannot be after end year.");
            return;
        }

        const selectedSeasons = [];
        for (let y = start; y <= end; y++) {
            if (skipExisting) {
                const status = leagueSyncStatus.find(s => s.year === y);
                const isFullyImported = status && status.players && status.fixtures && status.standings;
                if (!isFullyImported) {
                    selectedSeasons.push(y);
                }
            } else {
                selectedSeasons.push(y);
            }
        }

        if (selectedSeasons.length === 0) {
            alert("No new seasons to add (all already imported or skipped).");
            return;
        }

        // Find league name for display
        const leagueName = leagueObj ? leagueObj.league.name : 'Unknown League';

        const queueSeasons = selectedSeasons.map(y => {
            const status = leagueSyncStatus.find(s => s.year === y);
            return {
                year: y,
                isFull: !!(status && status.players && status.fixtures && status.standings),
                isPartial: !!(status && (status.players || status.fixtures || status.standings) && !(status.players && status.fixtures && status.standings))
            };
        });

        const queueItem = {
            id: Date.now(),
            country: selectedCountry,
            leagueId: parseInt(selectedLeague),
            leagueName: leagueName,
            seasons: queueSeasons
        };

        setImportQueue(prev => [...prev, queueItem]);
    };

    const handleRemoveFromQueue = (id) => {
        setImportQueue(prev => prev.filter(item => item.id !== id));
    };

    const handleBatchImport = async () => {
        if (importQueue.length === 0) return;


        setIsImporting(true);
        setLogs([{ type: 'info', message: `🚀 Starting Batch V3 Import with ${importQueue.length} items...` }]);

        const selection = importQueue.map(item => ({
            leagueId: item.leagueId,
            seasons: item.seasons.map(s => s.year)
        }));

        try {
            const response = await fetch('/api/v3/import/batch', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ selection })
            });

            const reader = response.body.getReader();
            const decoder = new TextDecoder();

            while (true) {
                const { value, done } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value);
                const lines = chunk.split('\n');

                lines.forEach(line => {
                    if (line.startsWith('data: ')) {
                        try {
                            const data = JSON.parse(line.slice(6));
                            setLogs(prev => [...prev, data]);

                            if (data.type === 'complete' || (data.type === 'error' && data.message && data.message.includes("Critical"))) {
                                if (data.type === 'complete') {
                                    setLogs(prev => [...prev, {
                                        type: 'success',
                                        message: `✅ Import Finished. View Dashboard: /v3/league/${data.leagueId}/season/${data.season}`,
                                        link: `/v3/league/${data.leagueId}/season/${data.season}`
                                    }]);
                                    setIsImporting(false);
                                    setImportQueue([]); // Clear queue on success
                                }
                                if (data.type === 'error') {
                                    setIsImporting(false);
                                }
                            }
                        } catch (e) {
                            console.error("SSE Parse Error", e);
                        }
                    }
                });
            }

        } catch (error) {
            console.error("Import failed", error);
            setLogs(prev => [...prev, { type: 'error', message: `Fatal Error: ${error.message}` }]);
            setIsImporting(false);
        }
    };

    // --- Helpers ---

    const seasonOptions = availableSeasons;

    // --- Render ---


    return (
        <div className="v3-import-page">
            <header className="v3-header">
                <h1>🧪 V3 Schema POC Import</h1>
                <p>Multi-Criteria Mass Import System</p>
            </header>

            <div className="v3-content">
                {/* Control Panel */}
                <div className="v3-panel control-panel">
                    <h2>Configuration</h2>

                    <div className="form-group">
                        <label>Select Country</label>
                        <select
                            value={selectedCountry}
                            onChange={(e) => setSelectedCountry(e.target.value)}
                            disabled={isImporting}
                        >
                            <option value="">-- Choose Country --</option>
                            {countries.map(c => (
                                <option key={c.name} value={c.name}>
                                    {c.name} {c.code ? `(${c.code})` : ''}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="form-group">
                        <label>Select League</label>
                        <select
                            value={selectedLeague}
                            onChange={(e) => setSelectedLeague(e.target.value)}
                            disabled={!selectedCountry || isImporting}
                        >
                            <option value="">-- Choose League --</option>
                            {leagues.map(l => (
                                <option key={l.league.id} value={l.league.id}>
                                    {l.league.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="form-row">
                        <div className="form-group half">
                            <label>From Season</label>
                            <select
                                value={fromYear}
                                onChange={(e) => setFromYear(e.target.value)}
                                disabled={isImporting || !selectedLeague}
                            >
                                <option value="">Select</option>
                                {seasonOptions.map(year => (
                                    <option key={year} value={year}>{year}</option>
                                ))}
                            </select>
                        </div>
                        <div className="form-group half">
                            <label>To Season</label>
                            <select
                                value={toYear}
                                onChange={(e) => setToYear(e.target.value)}
                                disabled={isImporting || !selectedLeague}
                            >
                                <option value="">Select</option>
                                {seasonOptions.map(year => (
                                    <option key={year} value={year}>{year}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="skip-toggle-container">
                        <label className="checkbox-label">
                            <input
                                type="checkbox"
                                checked={skipExisting}
                                onChange={(e) => setSkipExisting(e.target.checked)}
                            />
                            Skip years already fully imported
                        </label>
                    </div>

                    {selectedLeague && leagueSyncStatus.length > 0 && fromYear && toYear && (() => {
                        const start = parseInt(fromYear);
                        const end = parseInt(toYear);
                        const alreadyInDb = leagueSyncStatus.filter(s =>
                            s.year >= Math.min(start, end) &&
                            s.year <= Math.max(start, end) &&
                            s.players && s.fixtures && s.standings
                        ).length;

                        return alreadyInDb > 0 ? (
                            <div className="sync-summary-note">
                                ℹ️ Note: {alreadyInDb} season(s) in this range are already in the DB.
                            </div>
                        ) : null;
                    })()}

                    {availableSeasons.length > 0 && (
                        <div className="availability-hint">
                            📊 Available: {availableSeasons.length} seasons ({availableSeasons[availableSeasons.length - 1]} - {availableSeasons[0]})
                        </div>
                    )}

                    <button
                        className="btn-add-queue"
                        onClick={handleAddToQueue}
                        disabled={isImporting || !selectedLeague}
                    >
                        + Add to Batch
                    </button>

                    <div className="queue-list-container">
                        <h3>Staging Queue ({importQueue.length})</h3>
                        {importQueue.length === 0 ? (
                            <p className="empty-queue">No items in queue.</p>
                        ) : (
                            <ul className="queue-list">
                                {importQueue.map(item => (
                                    <li key={item.id} className="queue-item">
                                        <div className="queue-info">
                                            <span className="queue-league">{item.leagueName}</span>
                                            <span className="queue-country">{item.country}</span>
                                            <div className="queue-seasons-pills">
                                                {item.seasons.map(s => {
                                                    let className = "season-pill";
                                                    if (s.isFull) className += " pill-full";
                                                    else if (s.isPartial) className += " pill-partial";

                                                    return (
                                                        <span key={s.year} className={className}>
                                                            {s.year} {s.isFull ? '✅' : s.isPartial ? '⚠️' : ''}
                                                        </span>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                        <button
                                            className="btn-remove"
                                            onClick={() => handleRemoveFromQueue(item.id)}
                                            disabled={isImporting}
                                        >
                                            ✕
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>

                    <button
                        className="btn-import-v3"
                        onClick={handleBatchImport}
                        disabled={isImporting || importQueue.length === 0}
                    >
                        {isImporting ? 'Processing Batch...' : 'Start Batch Import'}
                    </button>
                </div>

                {/* Discovery Panel (IMPROVEMENT-25) */}
                <div className="v3-panel discovery-panel">
                    <div className="discovery-header-main">
                        <h2>🕵️ Discovery Archive</h2>
                        <p className="panel-desc">Leagues found via Deep Sync. Expand to see all available seasons.</p>
                    </div>

                    {discoveredLeagues.length === 0 ? (
                        <div className="empty-state">No discovered leagues pending review.</div>
                    ) : (
                        <div className="discovery-list">
                            {discoveredLeagues.map(countryGroup => (
                                <div key={countryGroup.name} className="discovery-group">
                                    <div className="discovery-country-header">
                                        {countryGroup.flag && <img src={countryGroup.flag} alt="" className="mini-flag" />}
                                        {countryGroup.name}
                                    </div>
                                    {countryGroup.leagues.map(l => (
                                        <div key={l.league_id} className="discovery-card">
                                            <div className="discovery-item">
                                                <img src={l.logo_url} alt="" className="league-logo-mini" />
                                                <div className="discovery-info">
                                                    <div className="discovery-name">{l.name}</div>
                                                    <div className="discovery-seasons">
                                                        {l.seasons.map(y => (
                                                            <span key={y} className="discovery-tag">🟡 {y}</span>
                                                        ))}
                                                    </div>
                                                </div>
                                                <button
                                                    className="btn-expand-seasons"
                                                    onClick={() => handleToggleExpand(l.api_id)}
                                                    disabled={discoveryLoading[l.api_id]}
                                                >
                                                    {discoveryLoading[l.api_id] ? '⏳' : expandedDiscovery[l.api_id] ? '▲ Hide' : '▼ All Seasons'}
                                                </button>
                                            </div>

                                            {expandedDiscovery[l.api_id] && discoverySeasons[l.api_id] && (
                                                <div className="expanded-seasons">
                                                    <div className="expanded-seasons-grid">
                                                        {discoverySeasons[l.api_id].map(s => {
                                                            const isSelected = discoverySelected[l.api_id]?.has(s.year);
                                                            const badge = s.status === 'FULL' ? '✅' : (s.status === 'PARTIAL_DISCOVERY' || s.status === 'PARTIAL') ? '🟡' : '⬜';
                                                            const isFull = s.status === 'FULL';

                                                            return (
                                                                <label
                                                                    key={s.year}
                                                                    className={`season-select-item ${isFull ? 'status-full' : isSelected ? 'status-selected' : ''}`}
                                                                >
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={isSelected || false}
                                                                        disabled={isFull}
                                                                        onChange={() => handleToggleSeasonSelect(l.api_id, s.year)}
                                                                    />
                                                                    <span className="season-badge">{badge}</span>
                                                                    <span className="season-year">{s.year}</span>
                                                                    {s.is_current && <span className="current-badge">LIVE</span>}
                                                                </label>
                                                            );
                                                        })}
                                                    </div>
                                                    <div className="expanded-actions">
                                                        <button
                                                            className="btn-import-selected"
                                                            onClick={() => handleImportSelected(l.api_id, l.name, countryGroup.name)}
                                                            disabled={!discoverySelected[l.api_id] || discoverySelected[l.api_id].size === 0}
                                                        >
                                                            📥 Import Selected ({discoverySelected[l.api_id]?.size || 0})
                                                        </button>
                                                        <button
                                                            className="btn-import-all-missing"
                                                            onClick={() => handleImportAllMissing(l.api_id, l.name, countryGroup.name)}
                                                        >
                                                            🚀 All Missing
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Log Console */}
                <div className="v3-panel log-panel">
                    <div className="log-header">
                        <h2>Live Logs</h2>
                        <label className="auto-scroll-toggle">
                            <input
                                type="checkbox"
                                checked={autoScroll}
                                onChange={(e) => setAutoScroll(e.target.checked)}
                            />
                            Auto-scroll
                        </label>
                    </div>
                    <div className="terminal-window">
                        {logs.map((log, index) => (
                            <div key={index} className={`log-line log-${log.type}`}>
                                <span className="log-timestamp">[{new Date().toLocaleTimeString()}]</span>
                                <span className="log-message">
                                    {log.message}
                                    {log.link && <a href={log.link} className="log-link" target="_blank" rel="noreferrer">Open Dashboard ↗</a>}
                                </span>
                            </div>
                        ))}
                        {logs.length === 0 && <div className="log-placeholder">Ready to start...</div>}
                        <div ref={logsEndRef} />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ImportV3Page;
