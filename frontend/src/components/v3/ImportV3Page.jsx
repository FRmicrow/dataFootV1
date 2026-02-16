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

    const logsEndRef = useRef(null);

    // --- Effects ---

    useEffect(() => {
        fetchCountries();
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
            // Fetch comprehensive availability status
            fetchSyncStatus(selectedLeague);
        } else {
            setAvailableSeasons([]);
            setFromYear('');
            setToYear('');
            setLeagueSyncStatus([]);
        }
    }, [selectedLeague]);

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
            const res = await axios.get(`/api/v3/league/${leagueId}/available-seasons`);
            // Creates a map for easy lookup or just stores the array
            // The endpoint returns { league: {}, seasons: [{ year, status, ... }] }
            const seasons = res.data.seasons || [];
            setLeagueSyncStatus(seasons);

            // Also update availableSeasons (years list) from this source of truth
            const years = seasons.map(s => s.year).sort((a, b) => b - a);
            setAvailableSeasons(years);

            // Smart Defaulting
            if (years.length > 0) {
                setFromYear(years[years.length - 1]);
                setToYear(years[0]);
            }
        } catch (error) {
            console.error("Failed to fetch sync status", error);
        }
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
                const statusObj = leagueSyncStatus.find(s => s.year === y);
                // statusObj has { status: 'FULL' | 'PARTIAL' | 'NOT_IMPORTED' }
                const isFullyImported = statusObj && statusObj.status === 'FULL';

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
            const statusObj = leagueSyncStatus.find(s => s.year === y);
            const status = statusObj ? statusObj.status : 'NOT_IMPORTED';
            return {
                year: y,
                isFull: status === 'FULL',
                isPartial: status === 'PARTIAL' || status === 'PARTIAL_DISCOVERY'
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
                                    // Refresh status
                                    if (selectedLeague) fetchSyncStatus(selectedLeague);
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

                    {/* Season Availability Grid (US-41) */}
                    {selectedLeague && leagueSyncStatus.length > 0 && (
                        <div className="season-grid-container" style={{ marginTop: '10px', marginBottom: '10px' }}>
                            <label style={{ fontSize: '0.9rem', color: '#a0a0a0', marginBottom: '5px', display: 'block' }}>Availability Matrix:</label>
                            <div className="expanded-seasons-grid">
                                {leagueSyncStatus.map(s => {
                                    const isFull = s.status === 'FULL';
                                    const isPartial = s.status === 'PARTIAL' || s.status === 'PARTIAL_DISCOVERY';
                                    const badge = isFull ? '✅' : isPartial ? '⚠️' : '❌';
                                    const statusClass = isFull ? 'status-full' : isPartial ? 'status-selected' : ''; // Reuse classes for minimal css changes

                                    // Determine if currently selected by range
                                    const inRange = fromYear && toYear && s.year >= Math.min(fromYear, toYear) && s.year <= Math.max(fromYear, toYear);

                                    return (
                                        <div
                                            key={s.year}
                                            className={`season-select-item ${statusClass}`}
                                            style={inRange ? { border: '1px solid #00d4ff', background: 'rgba(0, 212, 255, 0.1)' } : {}}
                                            title={isFull ? "Fully Imported" : isPartial ? "Partially Imported" : "Not Imported"}
                                            onClick={() => {
                                                // Quick set range logic? Or just informational?
                                                // For now just informational + range highlight.
                                                // Maybe clicking sets 'From' if empty, then 'To'?
                                                // Let's keep it simple: Status Indicator Only as per US.
                                            }}
                                        >
                                            <span className="season-badge">{badge}</span>
                                            <span className="season-year">{s.year}</span>
                                            {s.is_current && <span className="current-badge">LIVE</span>}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {selectedLeague && leagueSyncStatus.length > 0 && fromYear && toYear && (() => {
                        const start = parseInt(fromYear);
                        const end = parseInt(toYear);
                        const alreadyInDb = leagueSyncStatus.filter(s =>
                            s.year >= Math.min(start, end) &&
                            s.year <= Math.max(start, end) &&
                            s.status === 'FULL'
                        ).length;

                        return alreadyInDb > 0 ? (
                            <div className="sync-summary-note">
                                ℹ️ Note: {alreadyInDb} season(s) in this range are already fully in the DB.
                            </div>
                        ) : null;
                    })()}

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
