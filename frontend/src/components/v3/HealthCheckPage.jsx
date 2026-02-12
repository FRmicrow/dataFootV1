import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import './HealthCheckPage.css';

const HealthCheckPage = () => {
    // --- State ---
    const [leagues, setLeagues] = useState([]);
    const [scanState, setScanState] = useState('IDLE'); // IDLE, RUNNING, PAUSED, COMPLETED
    const [scanIndex, setScanIndex] = useState(0);
    const [logs, setLogs] = useState([]);
    const [issuesFound, setIssuesFound] = useState([]);
    const [fixing, setFixing] = useState(false);

    // Auto-scroll logs
    const logsEndRef = useRef(null);
    useEffect(() => {
        logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [logs]);

    // Initial Load
    useEffect(() => {
        fetchLeagues();
    }, []);

    const fetchLeagues = async () => {
        try {
            const res = await axios.get('/api/v3/admin/health/leagues');
            const data = res.data.map(l => ({ ...l, status: 'PENDING' }));
            setLeagues(data);
            addLog(`📋 Loaded ${data.length} leagues.`);
        } catch (e) {
            addLog(`❌ Failed to load leagues: ${e.message}`);
        }
    };

    // --- Actions ---

    const handleToggleScan = () => {
        if (scanState === 'RUNNING') {
            setScanState('PAUSED');
            addLog("⏸️ Scan Paused.");
        } else {
            // Start or Resume
            if (scanState === 'IDLE' || scanState === 'COMPLETED') {
                const pendingCount = leagues.filter(l => l.status === 'PENDING').length;

                if (pendingCount === 0) {
                    if (window.confirm("All leagues checked. Reset statuses to re-scan?")) {
                        handleReset();
                        setTimeout(() => {
                            setScanState('RUNNING');
                            addLog("🔄 Starting Full Scan...");
                        }, 100);
                    }
                    return;
                }

                // Resume from first pending
                const firstPending = leagues.findIndex(l => l.status === 'PENDING');
                if (firstPending !== -1) setScanIndex(firstPending);
                else setScanIndex(0);

                setScanState('RUNNING');
                addLog("▶️ Scan Started/Resumed.");

            } else {
                setScanState('RUNNING');
                addLog("▶️ Scan Resumed.");
            }
        }
    };

    const handleReset = () => {
        if (scanState === 'RUNNING') return;
        setLeagues(prev => prev.map(l => ({ ...l, status: 'PENDING' })));
        setScanIndex(0);
        setIssuesFound([]);
        setScanState('IDLE');
        addLog("🔄 State Reset.");
    };

    const handleGlobalFix = async () => {
        if (!window.confirm("This will fix ALL duplicate stats in the database. Continue?")) return;

        setFixing(true);
        addLog("🛠️ Starting Global Clean...");
        try {
            const res = await axios.post('/api/v3/admin/health/fix', { issueId: 'DUPLICATE_STATS' });
            addLog(`✅ Clean Complete: ${res.data.message}`);
            alert(res.data.message);
            handleReset();
        } catch (e) {
            addLog(`❌ Fix Failed: ${e.message}`);
            alert("Error: " + e.message);
        } finally {
            setFixing(false);
        }
    };

    // --- Scanner Logic ---

    useEffect(() => {
        if (scanState !== 'RUNNING') return;

        // Completion Check
        if (scanIndex >= leagues.length) {
            setScanState('COMPLETED');
            addLog("🏁 Full Scan Completed.");
            return;
        }

        const current = leagues[scanIndex];

        // Guard: Only process PENDING
        if (current.status !== 'PENDING') {
            if (['CLEAN', 'ISSUES', 'ERROR'].includes(current.status)) {
                setTimeout(() => setScanIndex(prev => prev + 1), 0);
            }
            return;
        }

        const runCheck = async () => {
            updateLeagueStatus(scanIndex, 'CHECKING');

            try {
                const res = await axios.post('/api/v3/admin/health/check-league', { leagueName: current.name });
                const result = res.data;

                if (result.status === 'CLEAN') {
                    updateLeagueStatus(scanIndex, 'CLEAN');
                } else {
                    updateLeagueStatus(scanIndex, 'ISSUES', result);
                    setIssuesFound(prev => [...prev, { league: current.name, ...result }]);
                    addLog(`⚠️ Issues in ${current.name}: ${result.count} duplicates detected.`);
                }
            } catch (e) {
                updateLeagueStatus(scanIndex, 'ERROR');
                addLog(`❌ Error checking ${current.name}: ${e.message}`);
            }

            if (scanState === 'RUNNING') {
                setTimeout(() => setScanIndex(prev => prev + 1), 20);
            }
        };

        runCheck();

    }, [scanIndex, scanState, leagues]);

    // Helper
    const updateLeagueStatus = (index, status, data = null) => {
        setLeagues(prev => {
            const next = [...prev];
            if (next[index]) {
                next[index] = { ...next[index], status, issueData: data };
            }
            return next;
        });
    };

    const addLog = (msg) => {
        setLogs(prev => [...prev.slice(-99), `[${new Date().toLocaleTimeString()}] ${msg}`]);
    };

    // --- Render ---
    const progressPercent = leagues.length > 0 ? (scanIndex / leagues.length) * 100 : 0;
    const cleanCount = leagues.filter(l => l.status === 'CLEAN').length;
    const issuesCount = issuesFound.length;

    return (
        <div className="health-page">
            <header className="health-header">
                <h1>
                    <span>🩺</span> DB Health Check
                </h1>
                <p>Granular league-by-league analysis and repair system.</p>
            </header>

            <div className="control-panel">
                <div className="stats-row">
                    <div className="stat-item">
                        <span>📊</span>
                        <span>Total:</span>
                        <span className="stat-value">{leagues.length}</span>
                    </div>
                    <div className="stat-item">
                        <span>✅</span>
                        <span>Clean:</span>
                        <span className="stat-value clean">{cleanCount}</span>
                    </div>
                    <div className="stat-item">
                        <span>⚠️</span>
                        <span>Issues:</span>
                        <span className="stat-value issues">{issuesCount}</span>
                    </div>
                    <div className="stat-item">
                        <span>⏱️</span>
                        <span>Status:</span>
                        <span className="stat-value">{scanState}</span>
                    </div>
                </div>

                <div className="progress-section">
                    <div className="progress-track">
                        <div className="progress-fill" style={{ width: `${progressPercent}%` }}></div>
                        <div className="progress-label">
                            <span className={progressPercent > 50 ? 'progress-text-white' : ''}>
                                {Math.round(progressPercent)}% ({scanIndex}/{leagues.length})
                            </span>
                        </div>
                    </div>
                </div>

                <div className="actions-row">
                    <button
                        className={`btn ${scanState === 'RUNNING' ? 'btn-warning' : 'btn-primary'}`}
                        onClick={handleToggleScan}
                    >
                        {scanState === 'RUNNING' ? '⏸️ Pause Scan' : (scanState === 'IDLE' ? '▶️ Start Scan' : '▶️ Resume Scan')}
                    </button>

                    <button
                        className="btn btn-secondary"
                        onClick={handleReset}
                        disabled={scanState === 'RUNNING'}
                    >
                        🔄 Reset
                    </button>

                    {issuesFound.length > 0 && (
                        <button
                            className="btn btn-danger"
                            onClick={handleGlobalFix}
                            disabled={fixing}
                        >
                            {fixing ? '🛠️ Fixing...' : `🛠️ Fix All (${issuesFound.length})`}
                        </button>
                    )}
                </div>
            </div>

            <div className="panels-grid">

                {/* Logs */}
                <div className="panel-card">
                    <div className="panel-header">
                        <h3>🖥️ Live Logs</h3>
                    </div>
                    <div className="panel-body logs-container">
                        {logs.map((log, i) => (
                            <div key={i} className="log-entry">
                                <span className="log-time">{log.split(']')[0] + ']'}</span>
                                {log.split(']').slice(1).join(']')}
                            </div>
                        ))}
                        <div ref={logsEndRef} />
                    </div>
                </div>

                {/* Issues */}
                <div className="panel-card">
                    <div className="panel-header">
                        <h3>⚠️ Issues Detected</h3>
                    </div>
                    <div className="panel-body">
                        {issuesFound.length === 0 ? (
                            <div className="empty-state">
                                No issues found yet.
                            </div>
                        ) : (
                            <ul className="issues-list">
                                {issuesFound.map((issue, idx) => (
                                    <li key={idx} className="issue-item">
                                        <div className="issue-header">
                                            <span>{issue.league}</span>
                                            <span className="issue-count">{issue.count} Duplicates</span>
                                        </div>
                                        <div className="issue-details">
                                            Sample: {issue.sample?.[0]?.player_name} ({issue.sample?.[0]?.season_year})
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default HealthCheckPage;
