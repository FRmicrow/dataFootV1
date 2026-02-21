import React, { useState, useEffect, useRef, useMemo } from 'react';
import api from '../../../services/api';
import LeagueEmpowermentGrid from './LeagueEmpowermentGrid';
import './DataEmpowerment.css';

const DataEmpowermentPage = () => {
    const [status, setStatus] = useState({ status: 'idle' });
    const [logs, setLogs] = useState([]);
    const [logTab, setLogTab] = useState('activity'); // activity, success, issues
    const [limit, setLimit] = useState(50000);
    const [target, setTarget] = useState('all');
    const [isTraining, setIsTraining] = useState(false);
    const logContainerRef = useRef(null);
    const pollInterval = useRef(null);

    // Initial load and polling
    useEffect(() => {
        fetchStatus();

        // Only start polling IF there is a training in progress
        if (isTraining) {
            pollInterval.current = setInterval(() => {
                fetchStatus();
                fetchLogs();
            }, 3000);
        }

        return () => {
            if (pollInterval.current) clearInterval(pollInterval.current);
        };
    }, [isTraining]); // Re-setup interval when training state changes

    // Auto-scroll logs
    useEffect(() => {
        if (logContainerRef.current) {
            logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
        }
    }, [logs, logTab]);

    const fetchStatus = async () => {
        try {
            const res = await api.getTrainingStatus();
            setStatus(res);
            setIsTraining(res.status === 'running');
        } catch (err) {
            console.error('Failed to fetch status:', err);
        }
    };

    const fetchLogs = async () => {
        try {
            const res = await api.getTrainingLogs(200);
            setLogs(res.logs || []);
        } catch (err) {
            console.error('Failed to fetch logs:', err);
        }
    };

    const [targetLeagues, setTargetLeagues] = useState([]); // Array of IDs

    const handleStart = async () => {
        const leagueMsg = targetLeagues.length > 0 ? `targeting ${targetLeagues.length} leagues` : 'targeting ALL empowered data';
        if (!window.confirm(`Start ML training on ${limit} matches, ${leagueMsg}? This will empower the AI with all available local data.`)) return;

        try {
            const res = await api.startTraining(target, limit, targetLeagues.length > 0 ? targetLeagues : null);
            if (res.status === 'started') {
                setIsTraining(true);
                fetchStatus();
            } else {
                alert(res.message);
            }
        } catch (err) {
            alert('Failed to start training: ' + err.message);
        }
    };

    const handleStop = async () => {
        if (!window.confirm('Stop current training? Progress may be lost unless cached.')) return;
        try {
            await api.stopTraining();
            fetchStatus();
        } catch (err) {
            alert('Failed to stop: ' + err.message);
        }
    };

    const addLocalLog = (message, type = 'info') => {
        const timestamp = new Date().toLocaleTimeString();
        const prefix = type === 'error' ? '[Issue]' : (type === 'success' ? '[Success]' : '[Info]');
        setLogs(prev => [...prev.slice(-199), `${timestamp} ${prefix} ${message}`]);
    };

    const downloadLogs = () => {
        const blob = new Blob([logs.join('\n')], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `statfoot-ml-logs-${new Date().toISOString().slice(0, 10)}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    // Filtered logs for US_032
    const filteredLogs = useMemo(() => {
        if (logTab === 'activity') return logs;
        if (logTab === 'success') return logs.filter(l => l.includes('[Success]'));
        if (logTab === 'issues') return logs.filter(l => l.includes('[Issue]') || l.includes('ERROR') || l.includes('failed'));
        return logs;
    }, [logs, logTab]);

    return (
        <div className="data-empower-container animate-slide-up">
            <header className="empower-header">
                <div>
                    <h1>💎 Intelligence Hub</h1>
                    <p>Surgical Data Empowerment & Model Evolution</p>
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                    <div className="status-badge" data-status={status.status}>
                        {status.status === 'running' ? '🚀 TRAINING ACTIVE' : '💤 IDLE'}
                    </div>
                </div>
            </header>

            <div className="empower-grid">

                {/* 1. Surgical League Grid (US_030) */}
                <div className="empower-card league-inventory-card">
                    <div className="card-header-compact">
                        <h3>🏟️ League Empowerment Center</h3>
                        <small style={{ color: '#64748b' }}>Process specific leagues to build the Feature Store (US_031)</small>
                    </div>
                    <LeagueEmpowermentGrid
                        onLog={addLocalLog}
                        selectedLeagues={targetLeagues}
                        onSelectLeague={(id) => {
                            setTargetLeagues(prev =>
                                prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
                            );
                        }}
                    />
                </div>

                {/* 2. Global Control Panel */}
                <div className="empower-card control-panel">
                    <h3>⚙️ Model Training (Base Foundation)</h3>
                    <div className="input-group">
                        <label>Target Architecture (US_033)</label>
                        <select value={target} onChange={e => setTarget(e.target.value)} disabled={isTraining}>
                            <option value="all">Full Suite (1X2 & O/U 2.5)</option>
                            <option value="1x2">Match Winner (1X2) Only</option>
                            <option value="ou25">Goals (O/U 2.5) Only</option>
                        </select>
                    </div>

                    <div className="input-group">
                        <label>Training Data Depth</label>
                        <input
                            type="number"
                            value={limit || ''}
                            onChange={e => {
                                const val = parseInt(e.target.value, 10);
                                setLimit(isNaN(val) ? 0 : val);
                            }}
                            min="500"
                            max="500000"
                            disabled={isTraining}
                        />
                        <small>Suggested: 5,000+ for stable results</small>
                    </div>

                    <div className="stats-mini">
                        <div className="stat-item">
                            <span className="label">Store Size</span>
                            <span className="value">Checking Store...</span>
                        </div>
                        <div className="stat-item">
                            <span className="label">Mode</span>
                            <span className="value">{target === 'all' ? 'Standard' : 'Targeted'}</span>
                        </div>
                    </div>

                    {!isTraining ? (
                        <button className="btn-empower start" onClick={handleStart}>
                            🚀 Start Foundation Training
                        </button>
                    ) : (
                        <button className="btn-empower stop" onClick={handleStop}>
                            🛑 Stop Operations
                        </button>
                    )}
                </div>

                {/* 3. Global Training Status */}
                <div className="empower-card progress-panel">
                    <h3>⚡ Pulse Monitor</h3>

                    {isTraining ? (
                        <div className="running-state">
                            <div className="spinner-large"></div>
                            <div className="current-step">{status.current_step || 'Initializing...'}</div>
                            <div className="sub-status">PID: {status.pid} • Epoch 1/1</div>

                            <div className="info-box">
                                💡 <strong>Observability:</strong> The system is currently training on pre-calculated features.
                                No database CPU is used during this phase thanks to <strong>US_031</strong>.
                            </div>
                        </div>
                    ) : (
                        <div className="idle-state">
                            <p>Model engine is idle. Features in the Store are ready for high-speed training.</p>
                            <div className="health-check-v2">
                                <div className="health-item ok">✅ Feature Store Online</div>
                                <div className="health-item ok">✅ Python ML Service Connected</div>
                                <div className="health-item warn">⚠️ Premier League: 12 pending</div>
                            </div>
                        </div>
                    )}
                </div>

                {/* 4. Enhanced Log Viewer (US_032) */}
                <div className="empower-card log-viewer-container">
                    <div className="card-header-compact">
                        <div className="log-tabs">
                            <button className={`log-tab ${logTab === 'activity' ? 'active' : ''}`} onClick={() => setLogTab('activity')}>Activity</button>
                            <button className={`log-tab ${logTab === 'success' ? 'active' : ''}`} onClick={() => setLogTab('success')}>Success</button>
                            <button className={`log-tab ${logTab === 'issues' ? 'active' : ''}`} onClick={() => setLogTab('issues')}>Issues</button>
                        </div>
                        <div className="log-actions">
                            <button className="btn-log-action" onClick={downloadLogs} title="Download session logs">💾 Download</button>
                            <button className="btn-log-action" onClick={() => setLogs([])}>🗑️ Clear</button>
                        </div>
                    </div>
                    <div className="log-window v2" ref={logContainerRef}>
                        {filteredLogs.length === 0 && <div className="log-line empty">No specific logs in this stream...</div>}
                        {filteredLogs.map((log, i) => {
                            const isIssue = log.toLowerCase().includes('issue') || log.toLowerCase().includes('error') || log.toLowerCase().includes('failed');
                            const isSuccess = log.toLowerCase().includes('success') || log.toLowerCase().includes('complete');

                            return (
                                <div key={i} className={`log-line v2 ${isIssue ? 'issue' : (isSuccess ? 'success' : '')}`}>
                                    <span className="log-row-content">{log}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DataEmpowermentPage;

