import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import './ImportTrophiesPage.css';

const ImportTrophiesPage = () => {
    const [viewMode, setViewMode] = useState('LEAGUE'); // 'LEAGUE' or 'NATIONALITY'

    const [leagues, setLeagues] = useState([]);
    const [nationalities, setNationalities] = useState([]);

    const [selectedLeague, setSelectedLeague] = useState('');
    const [selectedNationality, setSelectedNationality] = useState('');

    const [candidates, setCandidates] = useState([]);
    // const [skipExisting, setSkipExisting] = useState(true); // Removed checkbox, enforced true behavior

    const [isImporting, setIsImporting] = useState(false);
    const [currentIdx, setCurrentIdx] = useState(0);
    const [processedCount, setProcessedCount] = useState(0); // Actual API calls made

    const [logs, setLogs] = useState([]);
    const [stats, setStats] = useState({ total: 0, fetched: 0, updated: 0 });

    const isRunning = useRef(false);
    const logsEndRef = useRef(null);

    useEffect(() => {
        logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [logs]);

    // Load available leagues and nationalities on mount
    useEffect(() => {
        fetchLeagues();
        fetchNationalities();
    }, []);

    const fetchLeagues = async () => {
        try {
            const res = await axios.get('/api/leagues/imported');
            setLeagues(res.data);
        } catch (e) {
            addLog(`Error loading leagues: ${e.message}`);
        }
    };

    const fetchNationalities = async () => {
        try {
            const res = await axios.get('/api/players/nationalities');
            setNationalities(res.data);
        } catch (e) {
            addLog(`Error loading nationalities: ${e.message}`);
        }
    };

    const handleLeagueChange = async (e) => {
        const leagueId = e.target.value;
        setSelectedLeague(leagueId);
        setCandidates([]);
        setStats({ total: 0, fetched: 0, updated: 0 });
        setProcessedCount(0);

        if (!leagueId) return;

        try {
            addLog(`Fetching trophy-check candidates for League ID ${leagueId}...`);
            const res = await axios.get(`/api/import/trophies/candidates?leagueId=${leagueId}`);
            // League endpoint returns ONLY missing players. So all candidates need import.
            // We verify structure: { player_id, name, ... }
            // We map to uniform structure
            const mapped = res.data.map(p => ({ ...p, has_trophies: 0 }));
            setCandidates(mapped);
            setStats({ total: mapped.length, fetched: 0, updated: 0 });
            addLog(`Found ${mapped.length} players needing trophy check.`);
        } catch (e) {
            addLog(`Error fetching candidates: ${e.message}`);
        }
    };

    const handleNationalityChange = async (e) => {
        const country = e.target.value;
        setSelectedNationality(country);
        setCandidates([]);
        setStats({ total: 0, fetched: 0, updated: 0 });
        setProcessedCount(0);

        if (!country) return;

        try {
            addLog(`Fetching all players from ${country}...`);
            const res = await axios.get(`/api/players/by-nationality?country=${encodeURIComponent(country)}`);
            setCandidates(res.data);
            setStats({ total: res.data.length, fetched: 0, updated: 0 });
            const existingCount = res.data.filter(c => c.has_trophies).length;
            addLog(`Found ${res.data.length} players (${existingCount} already have trophies).`);
        } catch (e) {
            addLog(`Error fetching players: ${e.message}`);
        }
    };

    const startImport = async () => {
        // Determine items to process based on Skip flag
        let queue = candidates;
        if (viewMode === 'NATIONALITY') {
            queue = candidates.filter(c => !c.has_trophies);
        }

        if (queue.length === 0) {
            addLog("No candidates to process (Check filters).");
            return;
        }

        setIsImporting(true);
        isRunning.current = true;
        setCurrentIdx(0);
        setProcessedCount(0);
        addLog(`▶️ Starting Batch Import for ${queue.length} players...`);
        addLog(`ℹ️ Rate Limit Enforced: Max 440 req/min (~7/sec). Backend will throttle if needed.`);

        for (let i = 0; i < queue.length; i++) {
            if (!isRunning.current) {
                addLog("⏹️ Import Stopped by user.");
                break;
            }

            const player = queue[i];
            setCurrentIdx(i + 1);

            try {
                // Call Import API
                const res = await axios.post('/api/import/trophies', { playerId: player.player_id });
                if (res.data.success) {
                    setProcessedCount(prev => prev + 1);
                    if (res.data.count > 0) {
                        addLog(`🏆 ${player.name}: Found ${res.data.count} trophies.`);
                        setStats(prev => ({ ...prev, updated: prev.updated + res.data.count }));

                        // Update local state to reflect 'has_trophies' for UI feedback?
                        // Maybe not necessary for massive list.
                    }
                }
            } catch (e) {
                addLog(`❌ Error for ${player.name}: ${e.message}`);
            }

            setStats(prev => ({ ...prev, fetched: i + 1 }));

            // Client-side pacing slightly to avoid flooding browser network queue
            // Backend handles the heavy rate limiting logic (Sleeps if >440/min).
            // We sleep 50ms just to be nice to UI thread.
            await new Promise(r => setTimeout(r, 50));
        }

        setIsImporting(false);
        isRunning.current = false;
        addLog("✅ Batch Import Completed.");
    };

    const stopImport = () => {
        isRunning.current = false;
        setIsImporting(false);
    };

    const addLog = (msg) => {
        setLogs(prev => [...prev.slice(-99), `[${new Date().toLocaleTimeString()}] ${msg}`]);
    };

    // Calculate effective progress
    // If skipping existing, total is queue length?
    // Let's us total candidates for visual ref, but processed for progress bar?
    // Simple: Use queue length from startImport?
    // State logic for progress bar:
    // stats.fetched is count processed.
    // stats.total is total candidates found.
    // If skipping, 'fetched' might not reach 'total'. 
    // Wait, in startImport I set queue.
    // I should probably track "Total items in Queue".
    // I'll calculate `queueLength` derived from state.
    const queueLength = (viewMode === 'NATIONALITY')
        ? candidates.filter(c => !c.has_trophies).length
        : candidates.length;

    const progressPercent = queueLength > 0 ? (currentIdx / queueLength) * 100 : 0;

    return (
        <div className="trophy-page">
            <header className="trophy-header">
                <h1>🏆 Trophy Manager</h1>
                <p>Smartly import player achievements. Use Nationality Batch for best duplicate handling.</p>
            </header>

            <div className="import-controls">

                {/* Mode Switcher */}
                <div className="mode-toggle">
                    <button
                        className={`mode-btn ${viewMode === 'LEAGUE' ? 'active' : ''}`}
                        onClick={() => !isImporting && setViewMode('LEAGUE')}
                        disabled={isImporting}
                    >
                        By League
                    </button>
                    <button
                        className={`mode-btn ${viewMode === 'NATIONALITY' ? 'active' : ''}`}
                        onClick={() => !isImporting && setViewMode('NATIONALITY')}
                        disabled={isImporting}
                    >
                        By Nationality (Recommended)
                    </button>
                </div>

                <div className="control-group">
                    <label>
                        {viewMode === 'LEAGUE' ? 'Select League Source' : 'Select Nationality'}
                    </label>
                    {viewMode === 'LEAGUE' ? (
                        <select
                            className="select-input"
                            value={selectedLeague}
                            onChange={handleLeagueChange}
                            disabled={isImporting}
                        >
                            <option value="">-- Choose a League --</option>
                            {leagues.map(l => (
                                <option key={l.league_id} value={l.league_id}>
                                    {l.name} ({l.country})
                                </option>
                            ))}
                        </select>
                    ) : (
                        <select
                            className="select-input"
                            value={selectedNationality}
                            onChange={handleNationalityChange}
                            disabled={isImporting}
                        >
                            <option value="">-- Choose Nationality --</option>
                            {nationalities.map(n => (
                                <option key={n.nationality} value={n.nationality}>
                                    {n.nationality} ({n.count} players)
                                </option>
                            ))}
                        </select>
                    )}
                </div>

                {/* Enforced Filtering for Nationality Mode - No Checkbox needed as per requirement */
                    viewMode === 'NATIONALITY' && (
                        <div className="control-group" style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.9rem', color: '#27ae60', fontWeight: '500' }}>
                                ✅ Smart Filter Active: Skipping players already in DB.
                            </span>
                        </div>
                    )}

                {/* Candidates List with Visual Indicators */}
                {candidates.length > 0 && !isImporting && (
                    <div className="candidates-preview" style={{ marginBottom: '20px', maxHeight: '300px', overflowY: 'auto', border: '1px solid #ddd', padding: '10px', borderRadius: '8px', background: '#f9f9f9' }}>
                        <h4 style={{ margin: '0 0 10px 0', fontSize: '0.9rem', color: '#666' }}>
                            Player Status Preview ({candidates.length})
                        </h4>
                        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '8px' }}>
                            {candidates.slice(0, 100).map(p => (
                                <li key={p.player_id} style={{ display: 'flex', alignItems: 'center', background: '#fff', padding: '5px', borderRadius: '4px', border: '1px solid #eee', fontSize: '0.85rem' }}>
                                    <span style={{ marginRight: '8px', fontSize: '1.2rem' }}>
                                        {p.has_trophies ? '✅' : '❌'}
                                    </span>
                                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {p.name}
                                    </span>
                                </li>
                            ))}
                        </ul>
                        {candidates.length > 100 && (
                            <div style={{ textAlign: 'center', padding: '5px', color: '#888', fontSize: '0.8rem' }}>
                                ... and {candidates.length - 100} more
                            </div>
                        )}
                    </div>
                )}

                <div className="stat-box">
                    <span className="stat-number">{queueLength}</span>
                    <span className="stat-label">Queue Size</span>
                </div>

                <div className="stat-box">
                    <span className="stat-number">{stats.updated}</span>
                    <span className="stat-label">Trophies Added</span>
                </div>

                {isImporting ? (
                    <button className="import-btn" onClick={stopImport} style={{ background: '#e74c3c' }}>
                        ⏹️ Stop Import
                    </button>
                ) : (
                    <button
                        className="import-btn"
                        onClick={startImport}
                        disabled={queueLength === 0}
                    >
                        ▶️ Start Batch
                    </button>
                )}
            </div>

            <div className="progress-container">
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <strong>Progress</strong>
                    <span>{currentIdx} / {queueLength}</span>
                </div>
                <div className="progress-bar">
                    <div className="progress-fill" style={{ width: `${progressPercent}%` }}></div>
                </div>
                {/* Visualizing Rate Limit */}
                <div className="progress-info">
                    {isImporting && (
                        <span>
                            Estimated Time Remaining: {Math.max(0, Math.ceil((queueLength - currentIdx) * 0.136))}s
                        </span>
                    )}
                    <span>Speed: ~440 req/min enforced by backend.</span>
                </div>
            </div>

            <div className="logs-window">
                {logs.map((log, i) => (
                    <div key={i} className="log-entry">{log}</div>
                ))}
                <div ref={logsEndRef} />
            </div>
        </div>
    );
};

export default ImportTrophiesPage;
