import React, { useState, useEffect, useMemo } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import api from '../../../services/api';
import LeagueDiscovery from '../LeagueDiscovery';
import LeagueActivationStage from '../LeagueActivationStage';
import OddsImportStage from '../OddsImportStage';
import './SimulationDashboard.css';

const SimulationDashboard = () => {
    const [leagues, setLeagues] = useState([]);
    const [selectedLeague, setSelectedLeague] = useState('');
    const [selectedYear, setSelectedYear] = useState('');
    const [selectedMode, setSelectedMode] = useState('STATIC'); // 'STATIC' | 'WALK_FORWARD'
    const [years, setYears] = useState([]);

    // Forge Multi-Step Flow State
    const [showDiscovery, setShowDiscovery] = useState(false);
    const [activeActivationId, setActiveActivationId] = useState(null);
    const [activeOddsLeagueId, setActiveOddsLeagueId] = useState(null);

    // Polling and Job State
    const [jobStatus, setJobStatus] = useState(null);
    const [selectedHorizon, setSelectedHorizon] = useState('FULL_HISTORICAL');
    const [metrics, setMetrics] = useState(null);
    const [simId, setSimId] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [readiness, setReadiness] = useState(null);
    const [checkingReadiness, setCheckingReadiness] = useState(false);

    // Tape State
    const [tapeData, setTapeData] = useState([]);
    const [showTape, setShowTape] = useState(false);
    const [loadingTape, setLoadingTape] = useState(false);

    // ML Status
    const [mlStatus, setMlStatus] = useState({ is_training: false });
    const [isCalibrating, setIsCalibrating] = useState(false);

    useEffect(() => {
        fetchLeagues();

        const interval = setInterval(async () => {
            try {
                const res = await api.getMLStatus();
                if (res.success) setMlStatus(res.data);
            } catch (err) { }
        }, 5000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        if (selectedLeague) {
            const l = leagues.find(x => x.league_id === parseInt(selectedLeague));
            if (l) {
                setYears(l.years_imported || []);
                if (l.years_imported && l.years_imported.length > 0) setSelectedYear(l.years_imported[0]);
            }
        } else {
            setYears([]);
            setSelectedYear('');
        }
    }, [selectedLeague, leagues]);

    // Pre-Flight Readiness Check (US_201)
    useEffect(() => {
        if (selectedLeague && selectedYear) {
            checkReadiness();
        } else {
            setReadiness(null);
        }
    }, [selectedLeague, selectedYear]);

    const checkReadiness = async () => {
        setCheckingReadiness(true);
        try {
            const data = await api.getSimulationReadiness(selectedLeague, selectedYear);
            setReadiness(data);
        } catch (err) {
            console.error("Readiness check failed", err);
        } finally {
            setCheckingReadiness(false);
        }
    };

    // US_207: Stateless Adoption & Polling
    useEffect(() => {
        let interval;
        if (selectedLeague && selectedYear && !metrics) {
            checkActiveJob();
            interval = setInterval(checkActiveJob, 4000);
        }
        return () => clearInterval(interval);
    }, [selectedLeague, selectedYear, metrics]);

    const checkActiveJob = async () => {
        if (!selectedLeague || !selectedYear) return;
        try {
            const data = await api.getSimulationStatus(selectedLeague, selectedYear);
            if (!data) return;

            setJobStatus(data);

            if (data.status === 'running' || data.status === 'pending') {
                setLoading(true);
                setError(null);
            } else if (data.status === 'completed') {
                setLoading(false);
                if (data.metrics) setMetrics(data.metrics);
                setSimId(data.id || null);
            } else if (data.status === 'failed') {
                setLoading(false);
                if (loading) setError(data.error || 'Simulation Failed.');
            }
        } catch (err) {
            if (err.response?.status !== 404) {
                console.error("Job check failed", err);
            }
        }
    };

    const fetchLeagues = async () => {
        try {
            const data = await api.getImportedLeagues();
            setLeagues(data);
        } catch (err) {
            setError("Could not load leagues.");
        }
    };

    const handleBatchDiscoverySelect = async (stagedItems) => {
        setShowDiscovery(false);
        setLoading(true);
        try {
            for (const item of stagedItems) {
                await api.importLeague({
                    leagueId: item.league.id,
                    season: 2024,
                    forceApiId: true
                });
            }
            const freshLeagues = await api.getImportedLeagues();
            setLeagues(freshLeagues);
            if (stagedItems.length === 1) {
                const matching = freshLeagues.find(l => l.api_id === stagedItems[0].league.id);
                if (matching) setActiveActivationId(matching.league_id);
            }
            setLoading(false);
        } catch (err) {
            console.error("Batch activation failed", err);
            setError("Batch activation failed. Check logs.");
            setLoading(false);
        }
    };

    const handleOddsSelect = (discoveryItem) => {
        setShowDiscovery(false);
        const matching = leagues.find(l => l.api_id === discoveryItem.league.id);
        if (matching) {
            setActiveOddsLeagueId(matching.league_id);
        }
    };

    const importedApiIds = useMemo(() => {
        return leagues.map(l => l.api_id);
    }, [leagues]);

    useEffect(() => {
        if (simId && !showTape) {
            handleToggleTape();
        }
    }, [simId]);

    const handleRunSimulation = async () => {
        if (!selectedLeague || !selectedYear) return;
        setLoading(true);
        setError(null);
        setJobStatus(null);
        setMetrics(null);
        setSimId(null);
        setShowTape(false);
        setTapeData([]);

        try {
            const data = await api.startSimulation({
                leagueId: parseInt(selectedLeague),
                seasonYear: parseInt(selectedYear),
                mode: selectedMode,
                horizon: selectedHorizon
            });
            if (data.success) {
                // Polling starts automatically via useEffect on loading/metrics
                setLoading(true);
            } else {
                setError(data.message);
                setLoading(false);
            }
        } catch (err) {
            setError(err.message);
            setLoading(false);
        }
    };

    const handleCalibrate = async () => {
        setIsCalibrating(true);
        try {
            const data = await api.triggerMLRetrain();
            if (!data.success) setError(data.message);
        } catch (err) {
            setError(err.message);
        } finally {
            setIsCalibrating(false);
        }
    };

    // US_18x: Refined ROI Logic (100€ Capital, 10€ Flat Bet)
    const combinedChartData = useMemo(() => {
        if (!tapeData || tapeData.length === 0) return [];

        const roundsMap = {};

        tapeData.forEach((m, idx) => {
            // Setup Round Name map
            const rName = m.round_name?.replace('Regular Season - ', 'MD ') || 'Unknown';
            // Extract Round Num
            const roundMatch = m.round_name?.match(/\d+/);
            const roundNum = roundMatch ? parseInt(roundMatch[0]) : Math.floor(idx / 10) + 1;

            if (!roundsMap[roundNum]) {
                roundsMap[roundNum] = { round: roundNum, correct: 0, total: 0 };
            }

            // Accuracy evaluation
            roundsMap[roundNum].total++;
            if (m.predicted_outcome === m.actual_result) {
                roundsMap[roundNum].correct++;
            }
        });

        return Object.values(roundsMap)
            .sort((a, b) => a.round - b.round)
            .map(r => ({
                round: r.round,
                accuracy: parseFloat(((r.correct / r.total) * 100).toFixed(1))
            }));
    }, [tapeData]);

    // Keep bankrollData pointing to the new array for component compatibility if needed elsewhere
    const bankrollData = combinedChartData;
    const matchdayStats = combinedChartData;


    const handleToggleTape = async () => {
        if (showTape && simId === null) {
            setShowTape(false);
            return;
        }

        setShowTape(true);
        if (tapeData.length === 0 && (simId || metrics)) {
            const sid = simId || metrics?.id;
            if (!sid) return;
            setLoadingTape(true);
            try {
                const results = await api.getSimulationResults(sid);
                setTapeData(results);
            } catch (err) {
                console.error(err);
                setError("Failed to fetch Matchday Tape.");
            } finally {
                setLoadingTape(false);
            }
        }
    };

    const getGreenOpacity = (probStr) => {
        if (!probStr) return 'rgba(0, 0, 0, 0)';
        const val = parseFloat(probStr.replace('%', ''));
        if (isNaN(val)) return 'rgba(0, 0, 0, 0)';
        const opacity = Math.min((val / 100) * 0.9 + 0.1, 1);
        return `rgba(16, 185, 129, ${opacity.toFixed(2)})`;
    };

    const InfoIcon = ({ text }) => (
        <span className="info-icon" data-tooltip={text}>?</span>
    );

    return (
        <div className="simulation-dashboard animate-fade-in">
            <header className="sim-header">
                <button onClick={() => window.history.back()} className="back-link">
                    ← Back to Hub
                </button>
                <div className="header-main-wrap">
                    <div className="header-content">
                        <span className="badge">V8 Validation Framework</span>
                        <h1>Forge Control Center</h1>
                        <p>Execute sophisticated chronological backtesting schemas to isolate pure alpha and structural market edges.</p>
                    </div>
                    <div className="header-actions">
                        <button className="forge-discovery-btn" onClick={() => setShowDiscovery(true)}>
                            <span className="icon">🔭</span>
                            Discover New League
                        </button>
                    </div>
                </div>
            </header>

            {showDiscovery && (
                <LeagueDiscovery
                    onSelectBatch={handleBatchDiscoverySelect}
                    onCancel={() => setShowDiscovery(false)}
                    importedApiIds={importedApiIds}
                />
            )}

            {activeActivationId && (
                <LeagueActivationStage
                    leagueId={activeActivationId}
                    onComplete={() => {
                        setActiveActivationId(null);
                        fetchLeagues();
                    }}
                    onCancel={() => setActiveActivationId(null)}
                />
            )}

            {/* OddsImportStage is disabled per user request to forget odds data for now */}
            {/* activeOddsLeagueId && (
    <OddsImportStage
        leagueId={activeOddsLeagueId}
        onComplete={() => setActiveOddsLeagueId(null)}
        onCancel={() => setActiveOddsLeagueId(null)}
    />
) */}

            <div className="sim-grid">
                {/* ── Parameters Sidebar ── */}
                <aside className="sim-params-card">
                    <h3>Simulation Protocol</h3>

                    <div className="param-group">
                        <div className="label-with-action">
                            <label>League Target</label>
                            <button className="text-action-btn" onClick={fetchLeagues} disabled={loading}>↻ Refresh</button>
                        </div>
                        <select
                            value={selectedLeague}
                            onChange={(e) => setSelectedLeague(e.target.value)}
                            disabled={loading}
                        >
                            <option value="">-- Choose League --</option>
                            {leagues.map(l => {
                                const yearsList = l.years_imported || [];
                                const minYear = Math.min(...yearsList);
                                const maxYear = Math.max(...yearsList);
                                const range = yearsList.length > 0 ? `[${minYear}-${maxYear}]` : '(Incomplete)';
                                return (
                                    <option key={l.league_id} value={l.league_id}>
                                        {l.country_name} - {l.name} {range}
                                    </option>
                                );
                            })}
                        </select>
                    </div>

                    <div className="param-group">
                        <label>Season Scope</label>
                        <select
                            value={selectedYear}
                            onChange={(e) => setSelectedYear(e.target.value)}
                            disabled={!selectedLeague || loading || years.length === 0}
                        >
                            <option value="">-- Select Year --</option>
                            {years.map(y => (
                                <option key={y} value={y}>{y} / {y + 1}</option>
                            ))}
                        </select>
                    </div>

                    <div className="param-group">
                        <label>Execution Architecture</label>
                        <select
                            value={selectedMode}
                            onChange={(e) => setSelectedMode(e.target.value)}
                            disabled={loading}
                        >
                            <option value="STATIC">Static Matrix (Single Weight Pass)</option>
                            <option value="WALK_FORWARD">Walk-Forward (Recursive Fitting)</option>
                        </select>
                    </div>

                    <div className="param-group">
                        <label>Temporal Horizon</label>
                        <select
                            value={selectedHorizon}
                            onChange={(e) => setSelectedHorizon(e.target.value)}
                            disabled={loading}
                        >
                            <option value="FULL_HISTORICAL">Full Historical (Max Sample)</option>
                            <option value="5Y_ROLLING">5-Year Rolling Window</option>
                            <option value="3Y_ROLLING">3-Year Rolling Window</option>
                        </select>
                    </div>

                    <div className="trident-health">
                        <div className={`trident-badge ${readiness?.total_fixtures > 0 ? 'good' : 'bad'}`}>
                            <span className="icon">💿</span>
                            <span className="lbl">Core Data</span>
                        </div>
                        <div className={`trident-badge ${readiness?.status === 'READY' ? 'good' : readiness?.status === 'PARTIAL' ? 'warn' : 'bad'}`}>
                            <span className="icon">🧠</span>
                            <span className="lbl">Model Index</span>
                        </div>
                        <div className={`trident-badge ${metrics ? 'good' : 'idle'}`}>
                            <span className="icon">⚖️</span>
                            <span className="lbl">Quantum Ledger</span>
                        </div>
                    </div>

                    {readiness?.status === 'READY' ? (
                        <button
                            className="btn-run-sim"
                            onClick={handleRunSimulation}
                            disabled={loading || !selectedLeague || !selectedYear}
                        >
                            {loading ? 'Compiling Ledger...' : 'Initialize Forge Run'}
                        </button>
                    ) : readiness ? (
                        <div className="preflight-warning">
                            <div className="warning-content">
                                <b>⚠️ Pre-Flight Blocker</b>
                                <p>{readiness.message}</p>
                            </div>
                            <button className="btn-repair-intel" onClick={() => setActiveActivationId(selectedLeague)}>
                                Repair Intelligence Matrix
                            </button>
                        </div>
                    ) : (
                        <button className="btn-run-sim" disabled={true}>
                            Select Target Protocol
                        </button>
                    )}

                    {/* Progress Monitor */}
                    {jobStatus && jobStatus.status === 'running' && (
                        <div className="sim-progress-monitor">
                            <div className="progress-header">
                                <span>Core Processing</span>
                                <span className="pct">{jobStatus.progress}%</span>
                            </div>
                            <div className="progress-bar-wrap">
                                <div className="progress-bar-fill" style={{ width: `${jobStatus.progress}%` }}></div>
                            </div>
                            <div className="progress-logs">
                                {jobStatus.output && jobStatus.output.slice(-5).map((line, i) => (
                                    <div key={i} className="log-entry">{line}</div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Auto-Calibrate Tool */}
                    <div className="calibration-box">
                        <div className="calibration-header">
                            <h4>System Calibration</h4>
                            <span className={`status-pill ${mlStatus.status === 'online' ? 'online' : 'offline'}`}>
                                {mlStatus.status === 'online' ? 'ML Online' : 'ML Offline'}
                            </span>
                        </div>
                        <button
                            onClick={handleCalibrate}
                            disabled={isCalibrating || mlStatus.is_training || mlStatus.status !== 'online'}
                            className={`btn-calibrate ${mlStatus.is_training ? 'training' : ''}`}
                        >
                            {mlStatus.is_training ? '⏳ Training Active...' : '🛠️ Force Global Retrain'}
                        </button>
                        <p className="calibrate-desc">Optimizes the latent logic matrices across all leagues utilizing newly ingested fixture outcomes.</p>
                        {mlStatus.status !== 'online' && (
                            <div className="service-warning">⚠️ ML Service is unreachable. Simulation and training are disabled.</div>
                        )}
                    </div>
                </aside>

                {/* ── Results Canvas ── */}
                <main className="sim-canvas">
                    {error && (
                        <div className="error-card">
                            ⚠️ {error}
                        </div>
                    )}

                    {!loading && !metrics ? (
                        <div className="sim-initial-state">
                            <div className="sim-icon">💠</div>
                            <h3>Awaiting Protocol Activation</h3>
                            <p>Configure the simulation envelope and initialize the Forge to generate absolute theoretical performance metrics based on the current model weights.</p>
                        </div>
                    ) : metrics ? (
                        <div className="results-container animate-fade-in-up">
                            {metrics.recalibration_suggested && (
                                <div className="recalibration-banner">
                                    ⚠️ System Recalibration Suggested – Model exhibited high entropy or severe overconfidence in this strata.
                                </div>
                            )}

                            <div className="metrics-row">
                                <div className="metric-card">
                                    <span className="lbl">
                                        1X2 Accuracy
                                        <InfoIcon text="Percentage of matches where the model's highest probability outcome matched reality." />
                                    </span>
                                    <div className="val">{((metrics.accuracy || 0) * 100).toFixed(1)}%</div>
                                    <div className="sub-val">{metrics.count || 0} fixtures analyzed</div>
                                </div>

                                <div className="metric-card">
                                    <span className="lbl">
                                        Brier Score
                                        <InfoIcon text="Measures predictive accuracy. 0.0 is perfect, 0.66 is random guessing. Values below 0.35 represent an elite quant model." />
                                    </span>
                                    <div className="val">{(metrics.brier_score || 0).toFixed(4)}</div>
                                    <div className="sub-val">Calibration Error</div>
                                </div>

                                <div className="metric-card">
                                    <span className="lbl">
                                        Log-Loss
                                        <InfoIcon text="System Entropy. Penalizes 'surprises' where the model was confident but wrong. Lower values indicate better probabilistic calibration." />
                                    </span>
                                    <div className="val">{(metrics.log_loss || 0).toFixed(4)}</div>
                                    <div className="sub-val">Uncertainty Entropy</div>
                                </div>

                                <div className="metric-card highlight-accuracy">
                                    <span className="lbl">
                                        Calibration Health
                                        <InfoIcon text="Overall system reliability score based on predictive stability." />
                                    </span>
                                    <div className="val">
                                        {metrics.brier_score < 0.25 ? 'EXCELLENT' : (metrics.brier_score < 0.35 ? 'STABLE' : 'DRIFTING')}
                                    </div>
                                    <div className="sub-val">Structural Integrity</div>
                                </div>
                            </div>

                            <div className="charts-grid">
                                <div className="chart-card" style={{ gridColumn: 'span 2' }}>
                                    <div className="card-header-with-info">
                                        <h3>📈 Performance & Bankroll Trajectory</h3>
                                        <InfoIcon text="Bankroll progression (Green) starting with 100€. Matchday Accuracy % (Blue) overlays model success rate per round." />
                                    </div>
                                    <div className="bankroll-stats-mini">
                                        <span>Initial: <b>100€</b></span>
                                        <span>Stake: <b>10€ Flat</b></span>
                                    </div>
                                    <div className="chart-wrapper">
                                        <ResponsiveContainer width="100%" height={300}>
                                            <LineChart data={combinedChartData} margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                                                <XAxis
                                                    dataKey="round"
                                                    name="Matchday"
                                                    stroke="#94a3b8"
                                                    tick={{ fontSize: 10 }}
                                                    type="number"
                                                    domain={[1, 38]}
                                                />
                                                <YAxis
                                                    yAxisId="left"
                                                    stroke="#10b981"
                                                    tick={{ fontSize: 10 }}
                                                    domain={['dataMin - 10', 'dataMax + 10']}
                                                    tickFormatter={(val) => `${val}€`}
                                                />
                                                <YAxis
                                                    yAxisId="right"
                                                    orientation="right"
                                                    stroke="#3b82f6"
                                                    tick={{ fontSize: 10 }}
                                                    domain={[0, 100]}
                                                    tickFormatter={(val) => `${val}%`}
                                                />
                                                <Tooltip
                                                    contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px', fontSize: '11px' }}
                                                    labelFormatter={(value) => `Matchday ${value}`}
                                                />
                                                <Line
                                                    yAxisId="left"
                                                    name="Bankroll"
                                                    type="monotone"
                                                    dataKey="bankroll"
                                                    stroke="#10b981"
                                                    strokeWidth={3}
                                                    dot={false}
                                                    activeDot={{ r: 4 }}
                                                />
                                                <Line
                                                    yAxisId="right"
                                                    name="Accuracy"
                                                    type="monotone"
                                                    dataKey="accuracy"
                                                    stroke="#3b82f6"
                                                    strokeWidth={2}
                                                    strokeDasharray="5 5"
                                                    dot={{ r: 3, fill: '#3b82f6' }}
                                                    connectNulls={true}
                                                />
                                            </LineChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>

                                {metrics.confusion_matrix && (
                                    <div className="chart-card">
                                        <div className="card-header-with-info">
                                            <h3>🎯 Confusion Matrix</h3>
                                            <InfoIcon text="Visualizes exactly where the model succeeded or failed. Rows are ACTUAL results, Columns are PREDICTED results." />
                                        </div>
                                        <div className="confusion-matrix-wrapper">
                                            <div className="cm-title-top">MODEL PREDICTION</div>
                                            <div className="cm-grid-with-axis">
                                                <div className="cm-axis-y">ACTUAL</div>
                                                <div className="cm-grid">
                                                    <div className="cm-header"></div>
                                                    <div className="cm-header">PRED X</div>
                                                    <div className="cm-header">PRED 1</div>
                                                    <div className="cm-header">PRED 2</div>

                                                    <div className="cm-row-label">ACT X</div>
                                                    <div className="cm-cell">{metrics.confusion_matrix[0][0]}</div>
                                                    <div className="cm-cell">{metrics.confusion_matrix[0][1]}</div>
                                                    <div className="cm-cell">{metrics.confusion_matrix[0][2]}</div>

                                                    <div className="cm-row-label">ACT 1</div>
                                                    <div className="cm-cell">{metrics.confusion_matrix[1][0]}</div>
                                                    <div className="cm-cell">{metrics.confusion_matrix[1][1]}</div>
                                                    <div className="cm-cell">{metrics.confusion_matrix[1][2]}</div>

                                                    <div className="cm-row-label">ACT 2</div>
                                                    <div className="cm-cell">{metrics.confusion_matrix[2][0]}</div>
                                                    <div className="cm-cell">{metrics.confusion_matrix[2][1]}</div>
                                                    <div className="cm-cell">{metrics.confusion_matrix[2][2]}</div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="tape-actionbar">
                                <button className="btn-tape-toggle" onClick={handleToggleTape}>
                                    {showTape ? 'Hide Matchday Tape ✕' : 'View Matchday Tape 📼'}
                                </button>
                            </div>

                            {showTape && (
                                <div className="tape-container animate-fade-in">
                                    <h3>Historical Match Log (N={tapeData.length})</h3>
                                    {loadingTape ? (
                                        <div className="tape-loading">Deep Querying Forge Results... 🔄</div>
                                    ) : (
                                        <div className="tape-table-wrapper">
                                            <table className="tape-table">
                                                <thead>
                                                    <tr>
                                                        <th>Round</th>
                                                        <th>Match</th>
                                                        <th className="center">1</th>
                                                        <th className="center">X</th>
                                                        <th className="center">2</th>
                                                        <th>Edge Pick</th>
                                                        <th>Score</th>
                                                        <th>Pred</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {tapeData.map((m, idx) => {
                                                        const homeTeam = m.home_team_name || 'Home';
                                                        const awayTeam = m.away_team_name || 'Away';
                                                        const isCorrect = m.predicted_outcome === m.actual_result;

                                                        // Round separator logic
                                                        const prevRound = idx > 0 ? tapeData[idx - 1].round_name : null;
                                                        const isNewRound = idx === 0 || m.round_name !== prevRound;

                                                        return (
                                                            <React.Fragment key={idx}>
                                                                {isNewRound && (
                                                                    <tr className="round-separator">
                                                                        <td colSpan="8">{m.round_name || 'Next Phase'}</td>
                                                                    </tr>
                                                                )}
                                                                <tr>
                                                                    <td className="tape-round">{m.round_name?.replace('Regular Season - ', 'MD ') || '-'}</td>
                                                                    <td className="tape-match">{homeTeam} vs {awayTeam}</td>

                                                                    <td className="center tape-prob-cell" style={{ backgroundColor: getGreenOpacity(m.prob_home) }}>
                                                                        <div className="prob-val">{m.prob_home}</div>
                                                                    </td>
                                                                    <td className="center tape-prob-cell" style={{ backgroundColor: getGreenOpacity(m.prob_draw) }}>
                                                                        <div className="prob-val">{m.prob_draw}</div>
                                                                    </td>
                                                                    <td className="center tape-prob-cell" style={{ backgroundColor: getGreenOpacity(m.prob_away) }}>
                                                                        <div className="prob-val">{m.prob_away}</div>
                                                                    </td>

                                                                    <td className="tape-score-cell">{m.score || '-'}</td>
                                                                    <td className={`tape-prediction-cell ${isCorrect ? 'win' : 'loss'}`}>
                                                                        {isCorrect ? (
                                                                            <span className="prediction-tick">✓</span>
                                                                        ) : (
                                                                            <span className="prediction-cross">✕</span>
                                                                        )}
                                                                    </td>
                                                                </tr>
                                                            </React.Fragment>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ) : null}
                </main>
            </div>
        </div>
    );
};

export default SimulationDashboard;
