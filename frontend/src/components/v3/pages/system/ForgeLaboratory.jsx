import React, { useState, useEffect, useMemo } from 'react';
import {
    ResponsiveContainer,
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    AreaChart,
    Area
} from 'recharts';
import api from '../../../../services/api';
import './ForgeLaboratory.css';

const ForgeLaboratory = () => {
    const [leagues, setLeagues] = useState([]);
    const [selectedLeague, setSelectedLeague] = useState('');
    const [breedingStatus, setBreedingStatus] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [models, setModels] = useState([]);
    const [simulations, setSimulations] = useState([]);
    const [activeTab, setActiveTab] = useState('breeding');
    const [calibratingId, setCalibratingId] = useState(null);
    const [hoveredSeason, setHoveredSeason] = useState(null);

    // PERSISTENCE (US_216 Requirement)
    useEffect(() => {
        fetchLeagues();
        const saved = localStorage.getItem('forge_lab_league');
        if (saved) setSelectedLeague(saved);

        // Restore tab
        const savedTab = localStorage.getItem('forge_lab_tab');
        if (savedTab) setActiveTab(savedTab);
    }, []);

    useEffect(() => {
        if (selectedLeague) {
            localStorage.setItem('forge_lab_league', selectedLeague);
            refreshData();

            // Start polling if we detect an active cycle
            checkStatus();
        }
    }, [selectedLeague]);

    useEffect(() => {
        localStorage.setItem('forge_lab_tab', activeTab);
    }, [activeTab]);

    const refreshData = () => {
        fetchModels();
        fetchSimulations();
    };

    const fetchLeagues = async () => {
        try {
            const res = await api.getImportedLeagues();
            setLeagues(res);
        } catch (err) {
            setError("Failed to fetch leagues connectivity.");
        }
    };

    const fetchModels = async () => {
        if (!selectedLeague) return;
        try {
            const res = await api.getLeagueModels(selectedLeague);
            setModels(res.models || []);
        } catch (err) { }
    };

    const fetchSimulations = async () => {
        if (!selectedLeague) return;
        try {
            const res = await api.getLeagueSimulations(selectedLeague);
            // Filter only completed audits for the trend graph
            setSimulations(res || []);
        } catch (err) { }
    };

    const checkStatus = async () => {
        if (!selectedLeague) return;
        try {
            const currentStatus = await api.getBreedingStatus(selectedLeague);
            setBreedingStatus(currentStatus);
            const statusStr = String(currentStatus.status);
            if (statusStr === 'RUNNING_SIMULATIONS' || statusStr === 'BUILDING_MODELS') {
                setTimeout(checkStatus, 3000);
            } else if (statusStr === 'COMPLETED') {
                refreshData();
            }
        } catch (err) { }
    };

    const handleStartBreeding = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await api.startBreeding(selectedLeague);
            if (res.success) {
                checkStatus();
            } else {
                setError(res.message);
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleCalibrate = async (modelId, simId) => {
        if (!window.confirm("Initiate 3-Season Multi-Validation Gate (US_221)? This will permanently promote the model only if aggregate gain > 0.5%.")) return;

        setCalibratingId(simId);
        try {
            const res = await api.retrainModel({ modelId, simulationId: simId });
            const resStatus = String(res.status);
            if (resStatus === 'accepted') {
                alert(`✅ Promotion Successful!\n${res.message}\nNew Accuracy: ${(res.new_accuracy * 100).toFixed(2)}%`);
                refreshData();
            } else if (resStatus === 'rejected') {
                alert(`❌ Recalibration Rejected.\nReason: ${res.message}`);
            } else {
                alert("Error during calibration: " + res.message);
            }
        } catch (err) {
            alert("Protocol Error: " + err.message);
        } finally {
            setCalibratingId(null);
        }
    };

    // US_222: Intelligence Performance Trend Strategy
    const trendData = useMemo(() => {
        const seasons = [...new Set(simulations.map(s => s.season_year))].sort((a, b) => a - b);
        return seasons.map(year => {
            const row = { season: year };
            const yearSims = simulations.filter(s => s.season_year === year && s.status === 'COMPLETED');

            yearSims.forEach(sim => {
                if (sim.metrics) {
                    row[sim.horizon_type] = parseFloat((sim.metrics.accuracy * 100).toFixed(1));
                }
            });
            return row;
        }).filter(r => Object.keys(r).length > 1); // Only keep years with at least one sim
    }, [simulations]);

    // Matrix Logic (US_222)
    const recentAudits = useMemo(() => {
        const seen = new Set();
        return simulations.filter(s => {
            const key = `${s.season_year}_${s.horizon_type}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        }).slice(0, 10);
    }, [simulations]);

    const matrixData = useMemo(() => {
        const seasons = [...new Set(simulations.map(s => s.season_year))].sort((a, b) => b - a);
        const horizons = ['FULL_HISTORICAL', '5Y_ROLLING', '3Y_ROLLING'];

        return seasons.map(year => {
            const results = {};
            horizons.forEach(h => {
                const sim = simulations.find(s => s.season_year === year && s.horizon_type === h && s.status === 'COMPLETED');
                results[h] = sim;
            });
            return { year, results };
        });
    }, [simulations]);

    return (
        <div className="forge-lab-portal animate-fade-in">
            <header className="lab-header-main">
                <div className="header-content">
                    <div className="protocol-badge">🧪 FORGE LABORATORY PROTOCOL V10.4</div>
                    <h1>Intelligence Breeding & Audit Hub</h1>
                    <p>High-integrity workspace for deep multi-horizon calibration. (Architecture US_216)</p>
                </div>

                <div className="lab-nav-pills">
                    <button
                        className={activeTab === 'breeding' ? 'active' : ''}
                        onClick={() => setActiveTab('breeding')}
                    >
                        <span className="icon">🔥</span>
                        Breeding Hub
                    </button>
                    <button
                        className={activeTab === 'matrix' ? 'active' : ''}
                        onClick={() => setActiveTab('matrix')}
                    >
                        <span className="icon">📊</span>
                        Performance Matrix
                    </button>
                    <button
                        className={activeTab === 'trend' ? 'active' : ''}
                        onClick={() => setActiveTab('trend')}
                    >
                        <span className="icon">📈</span>
                        Trend Analysis
                    </button>
                </div>
            </header>

            <div className="lab-workspace-grid">
                <aside className="lab-control-panel">
                    <div className="glass-card scope-card">
                        <div className="card-header">
                            <span className="lbl">Target Scope</span>
                        </div>
                        <select
                            className="lab-select"
                            value={selectedLeague}
                            onChange={(e) => setSelectedLeague(e.target.value)}
                        >
                            <option value="">-- SELECT TARGET LEAGUE --</option>
                            {leagues.map(l => <option key={l.league_id} value={l.league_id}>{l.name}</option>)}
                        </select>

                        {selectedLeague && (
                            <div className="scope-stats">
                                <div className="s-stat">
                                    <span className="val">{models.length}</span>
                                    <span className="lbl">Active Models</span>
                                </div>
                                <div className="s-stat">
                                    <span className="val">{simulations.filter(s => s.status === 'COMPLETED').length}</span>
                                    <span className="lbl">Audit Records</span>
                                </div>
                            </div>
                        )}

                        <div className="action-stack">
                            <button
                                className="btn-primary-glow"
                                disabled={!selectedLeague || loading || (breedingStatus && breedingStatus.status !== 'IDLE' && breedingStatus.status !== 'COMPLETED' && breedingStatus.status !== 'FAILED')}
                                onClick={handleStartBreeding}
                            >
                                {breedingStatus?.status === 'BUILDING_MODELS' || breedingStatus?.status === 'RUNNING_SIMULATIONS' ? 'Cycle Active...' : '🔥 Start Breeding Cycle'}
                            </button>
                            <button className="btn-secondary" onClick={refreshData}>↺ Sync Protocol</button>
                        </div>
                        <p className="legal-notice">Triggering a breeding cycle initiates sequential model builds and a full historical backtest sweep (US_217).</p>
                    </div>

                    {breedingStatus && breedingStatus.status !== 'IDLE' && (
                        <div className={`breeding-monitor-card ${breedingStatus.status.toLowerCase()}`}>
                            <div className="monitor-header">
                                <span className="pulse-dot"></span>
                                <h3>Pipeline Monitor</h3>
                                <span className="status-label">{breedingStatus.status}</span>
                            </div>

                            {breedingStatus.totalSteps > 0 && (
                                <div className="pipeline-progress">
                                    <div className="p-header">
                                        <span>Progress</span>
                                        <span>{Math.round((breedingStatus.completedSteps / breedingStatus.totalSteps) * 100)}%</span>
                                    </div>
                                    <div className="p-bar">
                                        <div className="p-fill" style={{ width: `${(breedingStatus.completedSteps / breedingStatus.totalSteps) * 100}%` }}></div>
                                    </div>
                                    <div className="p-sub">{breedingStatus.completedSteps} / {breedingStatus.totalSteps} Milestones Reached</div>
                                </div>
                            )}

                            <div className="terminal-logs">
                                {breedingStatus.logs.slice(-5).map((log, i) => (
                                    <div key={i} className="t-line">{log}</div>
                                ))}
                            </div>
                        </div>
                    )}
                </aside>

                <main className="lab-content-area">
                    {activeTab === 'breeding' && (
                        <div className="breeding-view animate-fade-in-up">
                            <div className="glass-card big-display">
                                <div className="card-header">
                                    <h3>Calibrated Models (Seeds)</h3>
                                    <span className="header-action">Multi-Horizon Trident</span>
                                </div>
                                <div className="models-trident-grid">
                                    {['FULL_HISTORICAL', '5Y_ROLLING', '3Y_ROLLING'].map(h => {
                                        const m = models.find(x => x.horizon_type === h);
                                        return (
                                            <div key={h} className={`trident-card ${m ? 'online' : 'absent'}`}>
                                                <div className="t-icon">{h.startsWith('F') ? '♾️' : (h.startsWith('5') ? '🖐️' : '🥉')}</div>
                                                <div className="t-title">{h.replace('_', ' ')}</div>
                                                {m ? (
                                                    <div className="t-stats">
                                                        <div className="t-metric">
                                                            <span className="v">{(m.accuracy * 100).toFixed(1)}%</span>
                                                            <span className="l">Accuracy</span>
                                                        </div>
                                                        <div className="t-metric">
                                                            <span className="v">{m.brier_score.toFixed(3)}</span>
                                                            <span className="l">Brier Score</span>
                                                        </div>
                                                        <div className="t-footer">Ver: {m.version_tag?.split('_')[0] || '1.0'}</div>
                                                    </div>
                                                ) : (
                                                    <div className="t-empty">Model Not Bred</div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="audit-queue-summary">
                                <div className="glass-card">
                                    <h3>Recent Audit Activity</h3>
                                    <div className="mini-ledger">
                                        {recentAudits.map(s => (
                                            <div key={s.id} className="mini-ledger-item">
                                                <span className="year">{s.season_year}</span>
                                                <span className="h-type">{s.horizon_type}</span>
                                                <span className="acc">{s.metrics ? `${(s.metrics.accuracy * 100).toFixed(1)}%` : '---'}</span>
                                                <span className={`stat ${s.status.toLowerCase()}`}>{s.status}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'matrix' && (
                        <div className="matrix-view animate-fade-in-up">
                            <div className="glass-card high-density">
                                <div className="card-header">
                                    <h3>Performance Matrix (US_222)</h3>
                                    <p className="subtitle">High-density accuracy audit across all dimensions.</p>
                                </div>
                                <div className="matrix-table-wrapper">
                                    <table className="lab-matrix-table">
                                        <thead>
                                            <tr>
                                                <th className="sticky-col">Season</th>
                                                <th>Full Historical</th>
                                                <th>5Y Rolling</th>
                                                <th>3Y Rolling</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {matrixData.map(row => (
                                                <tr key={row.year} className={hoveredSeason === row.year ? 'active-row' : ''} onMouseEnter={() => setHoveredSeason(row.year)}>
                                                    <td className="sticky-col season-year">{row.year}</td>
                                                    {['FULL_HISTORICAL', '5Y_ROLLING', '3Y_ROLLING'].map(h => {
                                                        const sim = row.results[h];
                                                        const acc = sim?.metrics?.accuracy;
                                                        // Check if this is the highest for the season
                                                        const rowAccs = Object.values(row.results).map(s => s?.metrics?.accuracy || 0);
                                                        const isTop = acc && acc === Math.max(...rowAccs);

                                                        return (
                                                            <td key={h} className={`matrix-cell ${isTop ? 'peak' : ''}`}>
                                                                {sim ? (
                                                                    <div className="cell-content">
                                                                        <span className="acc">{(acc * 100).toFixed(1)}%</span>
                                                                        <div className="cell-actions">
                                                                            <button
                                                                                className="btn-tiny-calibrate"
                                                                                onClick={() => {
                                                                                    const m = models.find(x => x.horizon_type === h);
                                                                                    if (m) handleCalibrate(m.id, sim.id);
                                                                                    else alert("No active model for this horizon.");
                                                                                }}
                                                                                disabled={calibratingId !== null}
                                                                            >
                                                                                {calibratingId === sim.id ? '...' : '🎯'}
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                ) : <span className="cell-void">---</span>}
                                                            </td>
                                                        );
                                                    })}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'trend' && (
                        <div className="trend-view animate-fade-in-up">
                            <div className="glass-card chart-container">
                                <div className="card-header">
                                    <h3>Performance Delta Trend</h3>
                                    <p className="subtitle">Multi-horizon accuracy stability analysis (US_222).</p>
                                </div>
                                <div style={{ width: '100%', height: 400 }}>
                                    <ResponsiveContainer>
                                        <LineChart data={trendData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                            <XAxis
                                                dataKey="season"
                                                stroke="#64748b"
                                                tick={{ fill: '#64748b', fontSize: 12 }}
                                                axisLine={{ stroke: '#334155' }}
                                            />
                                            <YAxis
                                                domain={[0, 100]}
                                                stroke="#64748b"
                                                tick={{ fill: '#64748b', fontSize: 12 }}
                                                axisLine={{ stroke: '#334155' }}
                                                label={{ value: 'Accuracy %', angle: -90, position: 'insideLeft', fill: '#64748b' }}
                                            />
                                            <Tooltip
                                                contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '12px' }}
                                                itemStyle={{ fontSize: '13px', fontWeight: 'bold' }}
                                            />
                                            <Legend verticalAlign="top" height={36} iconType="circle" />
                                            <Line
                                                type="monotone"
                                                dataKey="FULL_HISTORICAL"
                                                name="Full Historical"
                                                stroke="#8b5cf6"
                                                strokeWidth={3}
                                                dot={{ r: 4, fill: '#8b5cf6', strokeWidth: 0 }}
                                                activeDot={{ r: 8, strokeWidth: 0 }}
                                            />
                                            <Line
                                                type="monotone"
                                                dataKey="5Y_ROLLING"
                                                name="5Y Rolling"
                                                stroke="#3b82f6"
                                                strokeWidth={2}
                                                strokeDasharray="5 5"
                                                dot={{ r: 4, fill: '#3b82f6', strokeWidth: 0 }}
                                            />
                                            <Line
                                                type="monotone"
                                                dataKey="3Y_ROLLING"
                                                name="3Y Rolling"
                                                stroke="#10b981"
                                                strokeWidth={2}
                                                dot={{ r: 4, fill: '#10b981', strokeWidth: 0 }}
                                            />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            <div className="trend-insights">
                                <div className="glass-card">
                                    <h3>Efficiency Insights</h3>
                                    <div className="insight-grid">
                                        <div className="insight-item">
                                            <span className="lbl">Stability Leader</span>
                                            <span className="val" style={{ color: '#8b5cf6' }}>Full Historical</span>
                                        </div>
                                        <div className="insight-item">
                                            <span className="lbl">Peak Potential</span>
                                            <span className="val" style={{ color: '#10b981' }}>3Y Rolling</span>
                                        </div>
                                        <div className="insight-item">
                                            <span className="lbl">Audit Coverage</span>
                                            <span className="val">{trendData.length} Seasons</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
};

export default ForgeLaboratory;
