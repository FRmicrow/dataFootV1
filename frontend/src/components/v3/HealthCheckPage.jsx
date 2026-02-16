import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import './HealthCheckPage.css';
import IntegrityTimeline from './IntegrityTimeline';
import RevertManager from './RevertManager';

const HealthCheckPage = () => {
    // --- State ---
    const [scanState, setScanState] = useState('IDLE'); // IDLE, SCANNING, COMPLETED
    const [activeMilestone, setActiveMilestone] = useState(null);
    const [milestones, setMilestones] = useState([
        { id: 1, title: 'League Naming Check', status: 'PENDING', count: 0, details: null },
        { id: 2, title: 'Duplicate Stats Discovery', status: 'PENDING', count: 0, details: null },
        { id: 3, title: 'Orphan/Broken Link Audit', status: 'PENDING', count: 0, details: null },
        { id: 4, title: 'Country/Nationality Matching', status: 'PENDING', count: 0, details: null }
    ]);
    const [logs, setLogs] = useState([]);
    const [fixing, setFixing] = useState(false);
    const [namingCollisions, setNamingCollisions] = useState([]);

    // Auto-scroll logs
    const logsEndRef = useRef(null);
    useEffect(() => {
        logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [logs]);

    const addLog = (msg) => {
        setLogs(prev => [...prev.slice(-99), `[${new Date().toLocaleTimeString()}] ${msg}`]);
    };

    // --- Actions ---

    const startDeepScan = async () => {
        setScanState('SCANNING');
        addLog("🚀 Starting Deep Integrity Scan...");

        let updatedMilestones = milestones.map(m => ({ ...m, status: 'PENDING', count: 0 }));
        setMilestones(updatedMilestones);

        for (let i = 0; i < updatedMilestones.length; i++) {
            const m = updatedMilestones[i];
            setActiveMilestone(m.id);
            addLog(`🔍 Running Milestone ${m.id}: ${m.title}...`);

            try {
                const res = await axios.post('/api/v3/admin/health/check-deep', { milestone: m.id });
                const result = res.data;

                updatedMilestones[i] = {
                    ...m,
                    status: result.status,
                    count: result.count,
                    details: result.details
                };

                if (m.id === 1 && result.status === 'ISSUES') {
                    setNamingCollisions(result.details);
                }

                setMilestones([...updatedMilestones]);
                addLog(`✅ Milestone ${m.id} complete. Found ${result.count} issues.`);
            } catch (e) {
                addLog(`❌ Milestone ${m.id} failed: ${e.message}`);
                updatedMilestones[i].status = 'ERROR';
                setMilestones([...updatedMilestones]);
            }

            // Subtle delay for UI feel
            await new Promise(r => setTimeout(r, 600));
        }

        setScanState('COMPLETED');
        setActiveMilestone(null);
        addLog("🏁 Deep Integrity Scan Finished.");
    };

    const handleFixAll = async () => {
        const issuesToFix = milestones
            .filter(m => m.status === 'ISSUES')
            .map(m => {
                if (m.id === 1) return 'LEAGUE_COLLISION';
                if (m.id === 2) return 'DUPLICATE_STATS';
                if (m.id === 3) return 'RELATIONAL_ORPHANS';
                return null;
            }).filter(Boolean);

        if (issuesToFix.length === 0) {
            addLog("ℹ️ No fixable issues currently detected.");
            return;
        }

        if (!window.confirm(`This will apply fixes for: ${issuesToFix.join(', ')}. Continue?`)) return;

        setFixing(true);
        addLog("🛠️ Starting Fix-All sequence...");

        try {
            for (const issueId of issuesToFix) {
                addLog(`⚙️ Fixing ${issueId}...`);
                await axios.post('/api/v3/admin/health/fix', { issueId });
                addLog(`✅ Successfully resolved ${issueId}.`);
            }
            addLog("⭐ All possible fixes applied.");
            // Re-scan to confirm
            startDeepScan();
        } catch (e) {
            addLog(`❌ Fix-All sequence interrupted: ${e.message}`);
        } finally {
            setFixing(false);
        }
    };

    const applyIndividualFix = async (issueId) => {
        setFixing(true);
        addLog(`🛠️ Fixing ${issueId}...`);
        try {
            await axios.post('/api/v3/admin/health/fix', { issueId });
            addLog(`✅ ${issueId} resolved.`);
            startDeepScan();
        } catch (e) {
            addLog(`❌ Failed to fix ${issueId}: ${e.message}`);
        } finally {
            setFixing(false);
        }
    };

    // --- Render ---

    return (
        <div className="health-page v2">
            <header className="health-header">
                <div className="title-area">
                    <h1><span>🛡️</span> System Health V2</h1>
                    <p>Milestone-based integrity auditing and data recovery.</p>
                </div>
                <div className="header-actions">
                    <button
                        className={`btn btn-scan ${scanState === 'SCANNING' ? 'loading' : ''}`}
                        onClick={startDeepScan}
                        disabled={scanState === 'SCANNING'}
                    >
                        {scanState === 'SCANNING' ? '🔄 Scanning...' : '🔍 Deep Scan'}
                    </button>
                    <button
                        className="btn btn-fix-all"
                        onClick={handleFixAll}
                        disabled={scanState !== 'COMPLETED' || fixing}
                    >
                        🛠️ Fix All Issues
                    </button>
                </div>
            </header>

            <div className="dashboard-grid">
                {/* Left: Scan Progress & Results */}
                <div className="main-scan-panel">
                    <section className="health-card">
                        <div className="health-card-header">Scan Progress</div>
                        <IntegrityTimeline milestones={milestones} activeMilestone={activeMilestone} />
                    </section>

                    <section className="health-card naming-tool-card">
                        <div className="health-card-header">
                            League Naming Tool
                            {namingCollisions.length > 0 && <span className="badge-warn">{namingCollisions.length} Collisions</span>}
                        </div>
                        <div className="naming-tool-body">
                            {namingCollisions.length === 0 ? (
                                <p className="empty-msg">No naming collisions detected.</p>
                            ) : (
                                <div className="collision-list">
                                    {namingCollisions.map((c, i) => (
                                        <div key={i} className="collision-row">
                                            <div className="naming-preview">
                                                <span className="old-name">{c.old}</span>
                                                <span className="arrow">→</span>
                                                <span className="new-name">{c.suggested}</span>
                                            </div>
                                        </div>
                                    ))}
                                    <button
                                        className="btn btn-apply-naming"
                                        onClick={() => applyIndividualFix('LEAGUE_COLLISION')}
                                        disabled={fixing}
                                    >
                                        ✅ Apply Renaming
                                    </button>
                                </div>
                            )}
                        </div>
                    </section>

                    <section className="health-card logs-card">
                        <div className="health-card-header">Activity Logs</div>
                        <div className="logs-view">
                            {logs.map((log, i) => (
                                <div key={i} className="log-line">{log}</div>
                            ))}
                            <div ref={logsEndRef} />
                        </div>
                    </section>
                </div>

                {/* Right: History & Quick Stats */}
                <aside className="side-panel">
                    <section className="health-card stats-card">
                        <div className="health-card-header">Database Health</div>
                        <div className="quick-stats">
                            <div className="stat-pill">
                                <label>Issues</label>
                                <span className={`value ${milestones.some(m => m.status === 'ISSUES') ? 'danger' : 'success'}`}>
                                    {milestones.reduce((acc, m) => acc + m.count, 0)}
                                </span>
                            </div>
                            <div className="stat-pill">
                                <label>Environment</label>
                                <span className="value">Production V3</span>
                            </div>
                        </div>
                    </section>

                    <section className="health-card history-card">
                        <RevertManager />
                    </section>
                </aside>
            </div>
        </div>
    );
};

export default HealthCheckPage;
