import React, { useState, useEffect, useMemo } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import api from '../../../../../services/api';
import LeagueDiscovery from '../../../modules/league/LeagueDiscovery';
import LeagueActivationStage from '../../../modules/league/LeagueActivationStage';
import './SimulationDashboard.css';

const SimulationDashboard = () => {
    const [leagues, setLeagues] = useState([]);
    const [selectedLeague, setSelectedLeague] = useState('');
    const [selectedYear, setSelectedYear] = useState('');
    const [selectedMode, setSelectedMode] = useState('STATIC');
    const [years, setYears] = useState([]);

    // Persistence & State Initialization (US_210)
    useEffect(() => {
        const savedLeague = localStorage.getItem('forge_selected_league');
        const savedYear = localStorage.getItem('forge_selected_year');

        // Restore league first - validation happens in leagues useEffect
        if (savedLeague) setSelectedLeague(savedLeague);

        // Restore year - validation happens in selectedLeague useEffect
        if (savedYear) setSelectedYear(savedYear);

        // Check if a model build was in progress before refresh
        const checkInitialBuildStatus = async () => {
            try {
                const status = await api.getForgeBuildStatus();
                if (status.is_building) {
                    console.log("🏗️ Resuming model build monitor...");
                    setIsBuildingModels(true);
                    setBuildStatus(status.progress || {});
                    // Start the polling loop
                    pollBuildStatus();
                }
            } catch (err) {
                console.warn("Initial build status check failed");
            }
        };
        checkInitialBuildStatus();
    }, []);

    // Forge Multi-Step Flow State
    const [showDiscovery, setShowDiscovery] = useState(false);
    const [activeActivationId, setActiveActivationId] = useState(null);

    // Model Building State
    const [isBuildingModels, setIsBuildingModels] = useState(false);
    const [buildStatus, setBuildStatus] = useState(null);
    const [forgeModels, setForgeModels] = useState([]);

    // Polling and Job State
    const [jobStatus, setJobStatus] = useState(null);
    const [selectedHorizon, setSelectedHorizon] = useState('FULL_HISTORICAL');
    const [eligibleHorizons, setEligibleHorizons] = useState(['FULL_HISTORICAL']);
    const [metrics, setMetrics] = useState(null);
    const [simId, setSimId] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [readiness, setReadiness] = useState(null);
    const [checkingReadiness, setCheckingReadiness] = useState(false);
    const [userTriggeredSim, setUserTriggeredSim] = useState(false); // Track if user started a sim this session
    const [previousSimAvailable, setPreviousSimAvailable] = useState(null); // Old completed sim from DB

    // Retrain State
    const [isRetraining, setIsRetraining] = useState(false);
    const [retrainResult, setRetrainResult] = useState(null);

    // Tape State
    const [tapeData, setTapeData] = useState([]);
    const [showTape, setShowTape] = useState(false);
    const [loadingTape, setLoadingTape] = useState(false);

    // ML Status
    const [mlStatus, setMlStatus] = useState({ is_training: false });

    useEffect(() => {
        fetchLeagues();
        fetchForgeModels(); // Load ALL models from DB on mount

        const interval = setInterval(async () => {
            try {
                const res = await api.getMLStatus();
                if (res.success) setMlStatus(res.data);
            } catch (err) { }
        }, 5000);
        return () => clearInterval(interval);
    }, []);

    // When league changes: reset ALL sim state + load league-specific models
    useEffect(() => {
        if (!leagues || leagues.length === 0) return;

        // Validation: If selectedLeague in storage doesn't exist anymore, clear it
        if (selectedLeague && !leagues.find(x => x.league_id === parseInt(selectedLeague))) {
            console.warn(`⚠️ Persisted league ${selectedLeague} no longer available.`);
            setSelectedLeague('');
            setSelectedYear('');
            localStorage.removeItem('forge_selected_league');
            localStorage.removeItem('forge_selected_year');
            return;
        }

        if (selectedLeague) {
            const l = leagues.find(x => x.league_id === parseInt(selectedLeague));
            if (l) {
                setYears(l.years_imported || []);

                // US_210: Only auto-select first year if current selectedYear is NOT in the new league
                const savedYear = localStorage.getItem('forge_selected_year');
                const isYearValid = l.years_imported && l.years_imported.includes(parseInt(selectedYear || savedYear));

                if (!isYearValid && l.years_imported && l.years_imported.length > 0) {
                    setSelectedYear(String(l.years_imported[0]));
                }
            }
            // Persistence Update (US_210)
            localStorage.setItem('forge_selected_league', selectedLeague);

            // Clear stale simulation data
            setMetrics(null);
            setSimId(null);
            setJobStatus(null);
            setTapeData([]);
            setShowTape(false);
            setRetrainResult(null);
            setError(null);
            setUserTriggeredSim(false);
            setPreviousSimAvailable(null);

            // Fetch models specific to this league
            fetchLeagueModels();
        } else {
            setYears([]);
            setSelectedYear('');
            localStorage.removeItem('forge_selected_league');
            localStorage.removeItem('forge_selected_year');
        }
    }, [selectedLeague, leagues]);

    // Check horizon eligibility when year changes
    useEffect(() => {
        if (selectedLeague && selectedYear) {
            checkReadiness();
            checkHorizonEligibility();
        } else {
            setReadiness(null);
            setEligibleHorizons(['FULL_HISTORICAL']);
            setSelectedHorizon('FULL_HISTORICAL');
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

    const checkHorizonEligibility = async () => {
        try {
            const data = await api.getEligibleHorizons(selectedLeague, selectedYear);
            if (data.eligible) {
                setEligibleHorizons(data.eligible);
                // Auto-select the best horizon if current one is not eligible
                if (!data.eligible.includes(selectedHorizon)) {
                    setSelectedHorizon(data.eligible[0] || 'FULL_HISTORICAL');
                }
            }
        } catch (err) {
            console.warn("Horizon eligibility check failed, defaulting to FULL_HISTORICAL");
            setEligibleHorizons(['FULL_HISTORICAL']);
        }
    };

    // Stateless Polling — only poll for active jobs, not completed historical ones
    useEffect(() => {
        let interval;
        if (selectedLeague && selectedYear && selectedHorizon && !metrics) {
            checkActiveJob();
            interval = setInterval(checkActiveJob, 4000);
        }
        return () => clearInterval(interval);
    }, [selectedLeague, selectedYear, selectedHorizon, metrics]);

    const checkActiveJob = async () => {
        if (!selectedLeague || !selectedYear || !selectedHorizon) return;
        try {
            const data = await api.getSimulationStatus(selectedLeague, selectedYear, selectedHorizon);
            if (!data) return;

            // No simulation exists yet for this scope — silently skip
            const jobStatusStr = String(data.status);
            if (jobStatusStr === 'NONE') {
                setJobStatus(null);
                setPreviousSimAvailable(null);
                return;
            }

            setJobStatus(data);

            const statusLower = jobStatusStr.toLowerCase();
            if (statusLower === 'running' || statusLower === 'pending') {
                // Active sim — always show progress
                setLoading(true);
                setError(null);
                setUserTriggeredSim(true); // User or system started it
            } else if (statusLower === 'completed') {
                setLoading(false);
                // US_212: Automated Retrieval - Auto-fill if completed
                if (data.metrics) {
                    setMetrics(data.metrics);
                    setSimId(data.id || null);
                }
            } else if (statusLower === 'failed') {
                setLoading(false);
                setError(data.error_log || data.error || 'Simulation Failed.');
            }
        } catch (err) {
            if (err.response?.status !== 404) {
                console.warn("Job check failed (non-critical):", err.message);
            }
        }
    };

    // Load previous results on demand
    const handleLoadPreviousResults = () => {
        if (previousSimAvailable) {
            if (previousSimAvailable.metrics) setMetrics(previousSimAvailable.metrics);
            setSimId(previousSimAvailable.id || null);
            setPreviousSimAvailable(null);
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

    const fetchForgeModels = async () => {
        try {
            const data = await api.getForgeModels();
            if (data.models) {
                console.log(`📦 Loaded ${data.models.length} models from registry`);
                setForgeModels(data.models);
            }
        } catch (err) {
            console.warn("Could not load forge models.");
        }
    };

    const fetchLeagueModels = async () => {
        if (!selectedLeague) return;
        try {
            const data = await api.getLeagueModels(selectedLeague);
            if (data.models && data.models.length > 0) {
                console.log(`🧠 Found ${data.models.length} active models for league ${selectedLeague}`);
                // Merge league-specific models into the global list
                setForgeModels(prev => {
                    const otherModels = prev.filter(m => m.league_id !== parseInt(selectedLeague));
                    return [...otherModels, ...data.models.map(m => ({ ...m, league_id: parseInt(selectedLeague) }))];
                });
            } else {
                console.log(`⚠️ No active models for league ${selectedLeague}`);
            }
        } catch (err) {
            console.warn("Could not load league models.");
        }
    };

    const handleBatchDiscoverySelect = async (stagedItems) => {
        setShowDiscovery(false);
        if (stagedItems.length >= 1) {
            const item = stagedItems[0];
            setSelectedLeague(String(item.league.id));
        }
    };

    const pollBuildStatus = () => {
        const interval = setInterval(async () => {
            try {
                const status = await api.getForgeBuildStatus();

                // Update multi-horizon progress
                setBuildStatus(status.progress || {});

                if (!status.is_building) {
                    clearInterval(interval);
                    setIsBuildingModels(false);

                    // Refresh models
                    await fetchForgeModels();
                    await fetchLeagueModels();

                    if (status.error) {
                        if (status.error.includes("cancelled")) {
                            console.log("🚫 Build was cancelled.");
                        } else {
                            setError(`Model Build Failed: ${status.error}`);
                        }
                    }
                }
            } catch (e) {
                console.error("Polling error", e);
            }
        }, 2000);
    };

    // Build Models for selected league
    const handleBuildModels = async () => {
        if (!selectedLeague) return;
        setIsBuildingModels(true);
        setBuildStatus({ FULL_HISTORICAL: 'pending', '5Y_ROLLING': 'pending', '3Y_ROLLING': 'pending' });
        setError(null);
        try {
            const result = await api.buildForgeModels({ leagueId: parseInt(selectedLeague) });
            if (result.success) {
                pollBuildStatus();
            } else {
                setError(result.message);
                setIsBuildingModels(false);
            }
        } catch (err) {
            setError(err.message);
            setIsBuildingModels(false);
        }
    };

    const handleCancelBuild = async () => {
        try {
            const res = await api.cancelForgeBuild();
            if (res.success) {
                console.log("✅ Cancellation requested");
            }
        } catch (err) {
            console.error("Failed to cancel build", err);
        }
    };

    const leagueModels = useMemo(() => {
        if (!selectedLeague) return [];
        return forgeModels.filter(m => m.league_id === parseInt(selectedLeague) && m.is_active);
    }, [selectedLeague, forgeModels]);

    const hasModels = leagueModels.length > 0;

    // Get the model ID for the currently selected horizon
    const activeModelForHorizon = useMemo(() => {
        return leagueModels.find(m => m.horizon_type === selectedHorizon);
    }, [leagueModels, selectedHorizon]);

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
        setRetrainResult(null);
        setUserTriggeredSim(true);
        setPreviousSimAvailable(null);

        try {
            const data = await api.startSimulation({
                leagueId: parseInt(selectedLeague),
                seasonYear: parseInt(selectedYear),
                mode: selectedMode,
                horizon: selectedHorizon
            });
            if (data.success) {
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

    // Retrain from simulation results
    const handleRetrain = async () => {
        if (!activeModelForHorizon || !simId) return;
        setIsRetraining(true);
        setRetrainResult(null);
        setError(null);

        try {
            const result = await api.retrainModel({
                modelId: activeModelForHorizon.id,
                simulationId: simId
            });

            if (result.success) {
                // Poll for retrain status
                const pollInterval = setInterval(async () => {
                    try {
                        const status = await api.getRetrainStatus();
                        if (!status.is_retraining) {
                            clearInterval(pollInterval);
                            setIsRetraining(false);
                            setRetrainResult(status.result);
                            // Refresh models
                            fetchForgeModels();
                            fetchLeagueModels();
                        }
                    } catch (e) { }
                }, 3000);
            } else {
                setError(result.message);
                setIsRetraining(false);
            }
        } catch (err) {
            setError(err.message);
            setIsRetraining(false);
        }
    };

    // Accuracy per round data
    const combinedChartData = useMemo(() => {
        if (!tapeData || tapeData.length === 0) return [];

        const roundsMap = {};

        tapeData.forEach((m, idx) => {
            const rName = m.round_name?.replace('Regular Season - ', 'MD ') || 'Unknown';
            const roundMatch = m.round_name?.match(/\d+/);
            const roundNum = roundMatch ? parseInt(roundMatch[0]) : Math.floor(idx / 10) + 1;

            if (!roundsMap[roundNum]) {
                roundsMap[roundNum] = { round: roundNum, correct: 0, total: 0 };
            }

            roundsMap[roundNum].total++;
            if (m.is_correct === 1) {
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

    const selectedLeagueObj = leagues.find(x => x.league_id === parseInt(selectedLeague));

    // Determine what the user needs to do
    const getStepMessage = () => {
        if (!selectedLeague) return 'Step 1: Select a league from the dropdown or use "Discover New Leagues".';
        if (!hasModels) return 'Step 2: Build the 3 ML models for your selected league.';
        if (!selectedYear) return 'Step 3: Select a season and run the simulation.';
        return 'Step 3: Select a season, choose a horizon, and run the simulation.';
    };

    return (
        <div className="simulation-dashboard animate-fade-in">
            <header className="sim-header">
                <button onClick={() => window.history.back()} className="back-link">
                    ← Back to Hub
                </button>
                <div className="header-main-wrap">
                    <div className="header-content">
                        <span className="badge">V10 Forge Optimization</span>
                        <h1>Alpha Analytics — Forge Control Center</h1>
                        <p>Build league-scoped ML models and run chronological backtesting to validate prediction accuracy.</p>
                    </div>
                </div>
            </header>

            {showDiscovery && (
                <LeagueDiscovery
                    onSelectBatch={handleBatchDiscoverySelect}
                    onCancel={() => setShowDiscovery(false)}
                    importedApiIds={[]}
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

            <div className="sim-grid">
                {/* ── Parameters Sidebar ── */}
                <aside className="sim-params-card">
                    <h3>Simulation Protocol</h3>

                    {/* STEP 1: League Selection */}
                    <div className="param-group">
                        <div className="label-with-action">
                            <label>① League Target</label>
                            <div className="action-row">
                                <button className="text-action-btn" onClick={fetchLeagues} disabled={loading}>↻</button>
                                <button className="text-action-btn" onClick={() => setShowDiscovery(true)}>🔭 Discovery</button>
                            </div>
                        </div>
                        <select
                            value={selectedLeague}
                            onChange={(e) => {
                                if (e.target.value === 'DISCOVER') {
                                    setShowDiscovery(true);
                                    return;
                                }
                                setSelectedLeague(e.target.value);
                                setMetrics(null);
                                setSimId(null);
                                setRetrainResult(null);
                                setTapeData([]);
                                setShowTape(false);
                            }}
                            disabled={loading}
                        >
                            <option value="">-- Choose League --</option>
                            <option value="DISCOVER" style={{ fontWeight: 'bold', color: '#10b981' }}>🔭 Discover & Sync New Leagues</option>
                            <optgroup label="Imported Leagues">
                                {leagues.map(l => {
                                    const yearsList = l.years_imported || [];
                                    const minYear = Math.min(...yearsList);
                                    const maxYear = Math.max(...yearsList);
                                    const range = yearsList.length > 0 ? `[${minYear}-${maxYear}]` : '(No Data)';
                                    return (
                                        <option key={l.league_id} value={l.league_id}>
                                            {l.country_name} - {l.name} {range}
                                        </option>
                                    );
                                })}
                            </optgroup>
                        </select>
                    </div>

                    {/* STEP 2: Models — Build or Show Existing */}
                    {selectedLeague && (
                        <div className="param-group" style={{
                            background: hasModels ? 'rgba(16, 185, 129, 0.05)' : 'rgba(59, 130, 246, 0.05)',
                            padding: '14px', borderRadius: '12px',
                            border: `1px solid ${hasModels ? '#134e3a' : '#1e3a5f'}`
                        }}>
                            <div className="label-with-action">
                                <label>② Models {hasModels ? '✅' : '⚠️'}</label>
                                {hasModels && (
                                    <span style={{ fontSize: '0.65rem', color: '#10b981', background: '#0d3d2e', padding: '2px 8px', borderRadius: '6px' }}>
                                        {leagueModels.length}/3 Active
                                    </span>
                                )}
                            </div>

                            {/* Existing Models Display */}
                            {leagueModels.length > 0 && (
                                <div style={{ marginBottom: '10px' }}>
                                    {leagueModels.map(m => (
                                        <div key={m.id} style={{
                                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                            background: '#0f172a', borderRadius: '8px', padding: '6px 10px', marginBottom: '4px',
                                            fontSize: '0.72rem'
                                        }}>
                                            <span style={{ color: '#10b981', fontWeight: 600 }}>{m.horizon_type?.replace('_', ' ')}</span>
                                            <span style={{ color: '#e2e8f0' }}>{m.accuracy ? (m.accuracy * 100).toFixed(1) + '%' : '-'}</span>
                                            <span style={{ color: '#64748b' }}>{m.training_dataset_size || '-'} matches</span>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Build Status Progress */}
                            {isBuildingModels && buildStatus && (
                                <div style={{ marginBottom: '10px' }}>
                                    {Object.entries(buildStatus).map(([horizon, status]) => (
                                        <div key={horizon} style={{
                                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                            fontSize: '0.72rem', padding: '4px 0'
                                        }}>
                                            <span style={{ color: '#94a3b8' }}>{horizon}</span>
                                            <span style={{
                                                color: status === 'completed' ? '#10b981' : status === 'failed' ? '#ef4444' : '#f59e0b'
                                            }}>
                                                {status === 'completed' ? '✅' : status === 'failed' ? '❌' : status === 'training' ? '⏳ Training...' : '⏸️ Pending'}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {!hasModels ? (
                                <>
                                    <p style={{ color: '#94a3b8', fontSize: '0.75rem', margin: '4px 0 10px' }}>
                                        No models exist yet. Build 3 models: Full Historical, 5-Year, 3-Year horizons.
                                    </p>
                                    <button
                                        className="btn-calibrate"
                                        onClick={handleBuildModels}
                                        disabled={isBuildingModels || !selectedLeague || mlStatus.status !== 'online'}
                                        style={{ width: '100%' }}
                                    >
                                        {isBuildingModels ? '⏳ Building Models...' : '🏗️ Build 3 Models'}
                                    </button>
                                </>
                            ) : (
                                <button
                                    className="text-action-btn"
                                    onClick={handleBuildModels}
                                    disabled={isBuildingModels || mlStatus.status !== 'online'}
                                    style={{ fontSize: '0.7rem', color: '#64748b', cursor: 'pointer', marginTop: '4px' }}
                                >
                                    {isBuildingModels ? '⏳ Rebuilding...' : '🔄 Rebuild All Models'}
                                </button>
                            )}
                        </div>
                    )}

                    {/* STEP 3: Simulation Parameters — Only if models exist */}
                    {selectedLeague && hasModels && (
                        <>
                            <div className="param-group">
                                <label>③ Season Scope</label>
                                <select
                                    value={selectedYear}
                                    onChange={(e) => {
                                        setSelectedYear(e.target.value);
                                        localStorage.setItem('forge_selected_year', e.target.value);
                                        setMetrics(null);
                                        setSimId(null);
                                        setTapeData([]);
                                        setShowTape(false);
                                        setRetrainResult(null);
                                    }}
                                    disabled={!selectedLeague || loading || years.length === 0}
                                >
                                    <option value="">-- Select Year --</option>
                                    {years.map(y => {
                                        const yearLabel = `${y} / ${y + 1}`;
                                        return <option key={y} value={y}>{yearLabel}</option>;
                                    })}
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
                                <div className="label-with-action">
                                    <label>Model Horizon</label>
                                    {eligibleHorizons.length < 3 && selectedYear && (
                                        <span style={{ fontSize: '0.6rem', color: '#f59e0b', background: 'rgba(245,158,11,0.1)', padding: '2px 6px', borderRadius: '4px' }}>
                                            ⚠️ {3 - eligibleHorizons.length} restricted
                                        </span>
                                    )}
                                </div>
                                <select
                                    value={selectedHorizon}
                                    onChange={(e) => setSelectedHorizon(e.target.value)}
                                    disabled={loading}
                                >
                                    <option value="FULL_HISTORICAL">Full Historical (Max Sample)</option>
                                    <option
                                        value="5Y_ROLLING"
                                        disabled={!eligibleHorizons.includes('5Y_ROLLING')}
                                    >
                                        5-Year Rolling Window {!eligibleHorizons.includes('5Y_ROLLING') ? '(N/A for this season)' : ''}
                                    </option>
                                    <option
                                        value="3Y_ROLLING"
                                        disabled={!eligibleHorizons.includes('3Y_ROLLING')}
                                    >
                                        3-Year Rolling Window {!eligibleHorizons.includes('3Y_ROLLING') ? '(N/A for this season)' : ''}
                                    </option>
                                </select>
                            </div>

                            <div className="trident-health">
                                <div className={`trident-badge ${readiness?.total_fixtures > 0 ? 'good' : 'bad'}`}>
                                    <span className="icon">💿</span>
                                    <span className="lbl">Core Data</span>
                                </div>
                                <div className={`trident-badge ${hasModels ? 'good' : 'bad'}`}>
                                    <span className="icon">🧠</span>
                                    <span className="lbl">Models</span>
                                </div>
                                <div className={`trident-badge ${metrics ? 'good' : 'idle'}`}>
                                    <span className="icon">📊</span>
                                    <span className="lbl">Results</span>
                                </div>
                            </div>

                            {readiness?.status === 'READY' ? (
                                <button
                                    className="btn-run-sim"
                                    onClick={handleRunSimulation}
                                    disabled={loading || !selectedLeague || !selectedYear}
                                >
                                    {loading ? 'Running Simulation...' : '🚀 Run Simulation'}
                                </button>
                            ) : readiness ? (
                                <div className="preflight-warning">
                                    <div className="warning-content">
                                        <b>⚠️ Pre-Flight Check</b>
                                        <p>{readiness.message}</p>
                                    </div>
                                </div>
                            ) : (
                                <button className="btn-run-sim" disabled={true}>
                                    Select Season
                                </button>
                            )}
                        </>
                    )}

                    {/* Progress Monitor */}
                    {jobStatus && (jobStatus.status === 'running' || jobStatus.status === 'RUNNING') && (
                        <div className="sim-progress-monitor">
                            <div className="progress-header">
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                    <span style={{ fontSize: '0.65rem', color: '#64748b', textTransform: 'uppercase' }}>Current Stage</span>
                                    <span style={{ fontWeight: 600, color: '#10b981' }}>{jobStatus.stage || 'PROCESSING...'}</span>
                                </div>
                                <span className="pct">{jobStatus.progress || 0}%</span>
                            </div>
                            <div className="progress-bar-wrap">
                                <div className="progress-bar-fill" style={{ width: `${jobStatus.progress || 0}%` }}></div>
                            </div>
                            {jobStatus.last_heartbeat && (
                                <div style={{ fontSize: '0.6rem', color: '#475569', marginTop: '4px', textAlign: 'right' }}>
                                    💓 Last Active: {new Date(jobStatus.last_heartbeat).toLocaleTimeString()}
                                </div>
                            )}
                        </div>
                    )}

                    {/* System Status */}
                    <div className="calibration-box">
                        <div className="calibration-header">
                            <h4>ML Engine</h4>
                            <span className={`status-pill ${mlStatus.status === 'online' ? 'online' : 'offline'}`}>
                                {mlStatus.status === 'online' ? 'Online' : 'Offline'}
                            </span>
                        </div>
                        {mlStatus.status !== 'online' && (
                            <div className="service-warning">⚠️ ML Service is unreachable. Model building and simulation are disabled.</div>
                        )}
                    </div>
                </aside>

                {/* ── Results Canvas ── */}
                <main className="sim-canvas">
                    {error && (
                        <div className="error-card" style={{
                            background: 'rgba(239, 68, 68, 0.1)',
                            border: '1px solid rgba(239, 68, 68, 0.2)',
                            borderRadius: '12px',
                            padding: '20px',
                            marginBottom: '20px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                        }}>
                            <div>
                                <h4 style={{ color: '#f87171', margin: '0 0 5px 0' }}>⚠️ Simulation Error</h4>
                                <p style={{ color: '#fca5a5', margin: 0, fontSize: '0.85rem' }}>{error}</p>
                            </div>
                            <button
                                className="btn-calibrate"
                                onClick={handleRunSimulation}
                                style={{
                                    width: 'auto',
                                    padding: '8px 16px',
                                    backgroundColor: 'rgba(239, 68, 68, 0.2)',
                                    borderColor: 'rgba(239, 68, 68, 0.3)',
                                    color: '#f87171'
                                }}
                            >
                                🔄 Retry Simulation
                            </button>
                        </div>
                    )}

                    {loading && !metrics && (!jobStatus || (jobStatus.status !== 'RUNNING' && jobStatus.status !== 'running')) ? (
                        <div className="results-container" style={{ opacity: 0.6 }}>
                            <div className="metrics-row">
                                {[1, 2, 3, 4].map(i => (
                                    <div key={i} className="metric-card skeleton metric-skeleton"></div>
                                ))}
                            </div>
                            <div className="charts-grid">
                                <div className="chart-card skeleton chart-skeleton" style={{ gridColumn: 'span 2' }}></div>
                                <div className="chart-card skeleton chart-skeleton" style={{ height: '240px' }}></div>
                                <div className="chart-card skeleton chart-skeleton" style={{ height: '240px' }}></div>
                            </div>
                        </div>
                    ) : !metrics ? (
                        <div className="sim-initial-state animate-fade-in">
                            <div className="sim-icon">💠</div>
                            <h3>Awaiting Protocol Activation</h3>
                            <p>{getStepMessage()}</p>
                            {previousSimAvailable && previousSimAvailable.metrics && (
                                <div style={{ marginTop: '24px' }}>
                                    <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: '12px' }}>
                                        A previous simulation was found for this scope.
                                    </p>
                                    <button
                                        className="btn-tape-toggle"
                                        onClick={handleLoadPreviousResults}
                                        style={{ fontSize: '0.85rem', padding: '10px 20px' }}
                                    >
                                        📊 View Previous Results ({((previousSimAvailable.metrics.accuracy || 0) * 100).toFixed(1)}% accuracy)
                                    </button>
                                </div>
                            )}
                        </div>
                    ) : metrics ? (
                        <div className="results-container animate-fade-in-up">
                            {metrics.overconfidence_warning && (
                                <div className="recalibration-banner">
                                    ⚠️ Overconfidence Alert — Model showed high confidence on predictions that were incorrect.
                                </div>
                            )}

                            <div className="metrics-row">
                                <div className="metric-card highlight-accuracy">
                                    <span className="lbl">
                                        🎯 Accuracy Rate
                                        <InfoIcon text="Percentage of matches where the model correctly predicted the 1X2 outcome." />
                                    </span>
                                    <div className="val">{((metrics.accuracy || 0) * 100).toFixed(1)}%</div>
                                    <div className="sub-val">{metrics.count || 0} matches analyzed</div>
                                </div>

                                <div className="metric-card">
                                    <span className="lbl">
                                        Brier Score
                                        <InfoIcon text="Measures calibration quality. 0.0 = perfect, 0.66 = random. Below 0.35 is elite." />
                                    </span>
                                    <div className="val">{(metrics.brier_score || 0).toFixed(4)}</div>
                                    <div className="sub-val">Calibration</div>
                                </div>

                                <div className="metric-card">
                                    <span className="lbl">
                                        Log-Loss
                                        <InfoIcon text="Penalizes confident wrong predictions. Lower = better probability calibration." />
                                    </span>
                                    <div className="val">{(metrics.log_loss || 0).toFixed(4)}</div>
                                    <div className="sub-val">Entropy</div>
                                </div>

                                <div className="metric-card">
                                    <span className="lbl">
                                        Avg Confidence
                                        <InfoIcon text="Average confidence the model had in its top prediction." />
                                    </span>
                                    <div className="val">{((metrics.avg_confidence || 0) * 100).toFixed(1)}%</div>
                                    <div className="sub-val">
                                        {metrics.accuracy > 0.5 ? 'RELIABLE' : metrics.accuracy > 0.4 ? 'MODERATE' : 'NEEDS WORK'}
                                    </div>
                                </div>
                            </div>

                            {/* Last Ran Indicator (US_212) */}
                            {jobStatus && jobStatus.status === 'COMPLETED' && (
                                <div style={{ fontSize: '0.7rem', color: '#64748b', marginBottom: '20px', textAlign: 'right' }}>
                                    ✅ Protocol Verified — Last Ran: {new Date(jobStatus.last_heartbeat || jobStatus.created_at).toLocaleString()}
                                </div>
                            )}

                            {/* Retrain Section — Shows after simulation completes */}
                            {simId && activeModelForHorizon && (
                                <div style={{
                                    background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.08), rgba(139, 92, 246, 0.08))',
                                    border: '1px solid rgba(99, 102, 241, 0.25)',
                                    borderRadius: '12px',
                                    padding: '16px 20px',
                                    marginBottom: '16px'
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                        <div>
                                            <h4 style={{ margin: 0, color: '#e2e8f0', fontSize: '0.9rem' }}>
                                                🔬 Adaptive Model Refinement
                                            </h4>
                                            <p style={{ margin: '4px 0 0', color: '#94a3b8', fontSize: '0.72rem' }}>
                                                Re-train the <strong>{selectedHorizon.replace('_', ' ')}</strong> model using
                                                simulation error signals. Misclassified matches get 3× sample weight to correct systematic errors.
                                            </p>
                                        </div>
                                        <button
                                            className="btn-calibrate"
                                            onClick={handleRetrain}
                                            disabled={isRetraining || mlStatus.status !== 'online'}
                                            style={{ minWidth: '160px' }}
                                        >
                                            {isRetraining ? '⏳ Re-training...' : '🔄 Re-train Model'}
                                        </button>
                                    </div>

                                    {/* Retrain Result */}
                                    {retrainResult && (
                                        <div style={{
                                            marginTop: '10px',
                                            padding: '10px 14px',
                                            borderRadius: '8px',
                                            background: retrainResult.status === 'accepted' ? 'rgba(16, 185, 129, 0.1)' :
                                                retrainResult.status === 'rejected' ? 'rgba(245, 158, 11, 0.1)' :
                                                    'rgba(239, 68, 68, 0.1)',
                                            border: `1px solid ${retrainResult.status === 'accepted' ? '#10b981' :
                                                retrainResult.status === 'rejected' ? '#f59e0b' : '#ef4444'}33`,
                                            fontSize: '0.75rem'
                                        }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <span style={{
                                                    color: retrainResult.status === 'accepted' ? '#10b981' :
                                                        retrainResult.status === 'rejected' ? '#f59e0b' : '#ef4444',
                                                    fontWeight: 600
                                                }}>
                                                    {retrainResult.status === 'accepted' ? '✅ Model Updated' :
                                                        retrainResult.status === 'rejected' ? '⚠️ Retrain Rejected' : '❌ Error'}
                                                </span>
                                                {retrainResult.old_accuracy !== undefined && (
                                                    <span style={{ color: '#e2e8f0' }}>
                                                        {(retrainResult.old_accuracy * 100).toFixed(1)}% →{' '}
                                                        <strong>{(retrainResult.new_accuracy * 100).toFixed(1)}%</strong>
                                                        {' '}
                                                        <span style={{
                                                            color: retrainResult.improvement > 0 ? '#10b981' : '#ef4444'
                                                        }}>
                                                            ({retrainResult.improvement > 0 ? '+' : ''}{(retrainResult.improvement * 100).toFixed(1)}%)
                                                        </span>
                                                    </span>
                                                )}
                                            </div>
                                            <p style={{ margin: '4px 0 0', color: '#94a3b8' }}>{retrainResult.message}</p>
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="charts-grid">
                                <div className="chart-card" style={{ gridColumn: 'span 2' }}>
                                    <div className="card-header-with-info">
                                        <h3>📈 Accuracy by Matchday</h3>
                                        <InfoIcon text="Prediction accuracy (%) per matchday round. Higher is better." />
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
                                                    domain={['dataMin', 'dataMax']}
                                                />
                                                <YAxis
                                                    stroke="#10b981"
                                                    tick={{ fontSize: 10 }}
                                                    domain={[0, 100]}
                                                    tickFormatter={(val) => `${val}%`}
                                                />
                                                <Tooltip
                                                    contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px', fontSize: '11px' }}
                                                    labelFormatter={(value) => `Matchday ${value}`}
                                                    formatter={(value) => [`${value}%`, 'Accuracy']}
                                                />
                                                <Line
                                                    name="Accuracy"
                                                    type="monotone"
                                                    dataKey="accuracy"
                                                    stroke="#10b981"
                                                    strokeWidth={3}
                                                    dot={{ r: 3, fill: '#10b981' }}
                                                    connectNulls={true}
                                                />
                                                {/* 33% baseline (random guessing) */}
                                                <Line
                                                    name="Random Baseline"
                                                    type="monotone"
                                                    dataKey={() => 33.3}
                                                    stroke="#ef4444"
                                                    strokeWidth={1}
                                                    strokeDasharray="8 4"
                                                    dot={false}
                                                />
                                            </LineChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>

                                {metrics.confusion_matrix && (
                                    <div className="chart-card">
                                        <div className="card-header-with-info">
                                            <h3>🎯 Confusion Matrix</h3>
                                            <InfoIcon text="Rows = Actual results, Columns = Predicted results." />
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
                                        <div className="tape-loading">Loading Results... 🔄</div>
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
                                                        <th>Score</th>
                                                        <th>Result</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {tapeData.map((m, idx) => {
                                                        const homeTeam = m.home_team_name || 'Home';
                                                        const awayTeam = m.away_team_name || 'Away';
                                                        const isCorrect = m.is_correct === 1;

                                                        const prevRound = idx > 0 ? tapeData[idx - 1].round_name : null;
                                                        const isNewRound = idx === 0 || m.round_name !== prevRound;

                                                        return (
                                                            <React.Fragment key={idx}>
                                                                {isNewRound && (
                                                                    <tr className="round-separator">
                                                                        <td colSpan="7">{m.round_name || 'Next Phase'}</td>
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
            </div >
            {/* ── Model Build Overlay ── */}
            {
                isBuildingModels && (
                    <div className="build-overlay">
                        <div className="build-overlay-card">
                            <span className="icon">🏗️</span>
                            <h2>Forging ML intelligence</h2>
                            <p>Constructing multi-horizon predictive models for {
                                leagues.find(l => String(l.league_id) === selectedLeague)?.name || 'Selected League'
                            }</p>

                            <div className="build-horizons-progress">
                                {['FULL_HISTORICAL', '5Y_ROLLING', '3Y_ROLLING'].map(horizon => (
                                    <div key={horizon} className="horizon-progress-item">
                                        <span className="name">{horizon.replace('_', ' ')}</span>
                                        <span className={`status status-${(buildStatus[horizon] || 'pending').toLowerCase()}`}>
                                            {buildStatus[horizon] || 'pending'}
                                        </span>
                                    </div>
                                ))}
                            </div>

                            <button className="build-cancel-btn" onClick={handleCancelBuild}>
                                ⚙️ Abort Construction
                            </button>
                        </div>
                    </div>
                )
            }
        </div >
    );
};

export default SimulationDashboard;
