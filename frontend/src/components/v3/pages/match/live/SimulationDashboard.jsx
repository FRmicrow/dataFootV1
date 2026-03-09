import React, { useState, useEffect, useMemo } from 'react';
import api from '../../../../../services/api';
import LeagueDiscovery from '../../../modules/league/LeagueDiscovery';
import LeagueActivationStage from '../../../modules/league/LeagueActivationStage';
import SimHeader from '../../../modules/ml/simulation/SimHeader';
import ParamsSidebar from '../../../modules/ml/simulation/ParamsSidebar';
import ResultsCanvas from '../../../modules/ml/simulation/ResultsCanvas';
import BuildOverlay from '../../../modules/ml/simulation/BuildOverlay';
import './SimulationDashboard.css';

const SimulationDashboard = () => {
    const [leagues, setLeagues] = useState([]);
    const [selectedLeague, setSelectedLeague] = useState('');
    const [selectedYear, setSelectedYear] = useState('');
    const [selectedMode, setSelectedMode] = useState('STATIC');
    const [years, setYears] = useState([]);

    // Persistence & State Initialization
    useEffect(() => {
        const savedLeague = localStorage.getItem('forge_selected_league');
        const savedYear = localStorage.getItem('forge_selected_year');

        if (savedLeague) setSelectedLeague(savedLeague);
        if (savedYear) setSelectedYear(savedYear);

        const checkInitialBuildStatus = async () => {
            try {
                const status = await api.getForgeBuildStatus();
                if (status.is_building) {
                    setIsBuildingModels(true);
                    setBuildStatus(status.progress || {});
                    pollBuildStatus();
                }
            } catch (err) {
                console.warn("Initial build status check failed");
            }
        };
        checkInitialBuildStatus();
    }, []);

    const [showDiscovery, setShowDiscovery] = useState(false);
    const [activeActivationId, setActiveActivationId] = useState(null);
    const [isBuildingModels, setIsBuildingModels] = useState(false);
    const [buildStatus, setBuildStatus] = useState(null);
    const [forgeModels, setForgeModels] = useState([]);
    const [jobStatus, setJobStatus] = useState(null);
    const [selectedHorizon, setSelectedHorizon] = useState('FULL_HISTORICAL');
    const [eligibleHorizons, setEligibleHorizons] = useState(['FULL_HISTORICAL']);
    const [metrics, setMetrics] = useState(null);
    const [simId, setSimId] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [readiness, setReadiness] = useState(null);
    const [previousSimAvailable, setPreviousSimAvailable] = useState(null);
    const [isRetraining, setIsRetraining] = useState(false);
    const [retrainResult, setRetrainResult] = useState(null);
    const [tapeData, setTapeData] = useState([]);
    const [showTape, setShowTape] = useState(false);
    const [loadingTape, setLoadingTape] = useState(false);
    const [mlStatus, setMlStatus] = useState({ status: 'offline' });

    useEffect(() => {
        fetchLeagues();
        fetchForgeModels();

        const interval = setInterval(async () => {
            try {
                const res = await api.getMLStatus();
                if (res) setMlStatus(res);
            } catch (err) { }
        }, 5000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        if (!leagues || leagues.length === 0) return;

        if (selectedLeague && !leagues.find(x => x.league_id === Number.parseInt(selectedLeague))) {
            setSelectedLeague('');
            setSelectedYear('');
            localStorage.removeItem('forge_selected_league');
            localStorage.removeItem('forge_selected_year');
            return;
        }

        if (selectedLeague) {
            const l = leagues.find(x => x.league_id === Number.parseInt(selectedLeague));
            if (l) {
                setYears(l.years_imported || []);
                const savedYear = localStorage.getItem('forge_selected_year');
                const isYearValid = l.years_imported && l.years_imported.includes(Number.parseInt(selectedYear || savedYear));

                if (!isYearValid && l.years_imported && l.years_imported.length > 0) {
                    setSelectedYear(String(l.years_imported[0]));
                }
            }
            localStorage.setItem('forge_selected_league', selectedLeague);

            setMetrics(null);
            setSimId(null);
            setJobStatus(null);
            setTapeData([]);
            setShowTape(false);
            setRetrainResult(null);
            setError(null);
            setPreviousSimAvailable(null);

            fetchLeagueModels();
        } else {
            setYears([]);
            setSelectedYear('');
            localStorage.removeItem('forge_selected_league');
            localStorage.removeItem('forge_selected_year');
        }
    }, [selectedLeague, leagues]);

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
        try {
            const data = await api.getSimulationReadiness(selectedLeague, selectedYear);
            setReadiness(data);
        } catch (err) {
            console.error("Readiness check failed", err);
        }
    };

    const checkHorizonEligibility = async () => {
        try {
            const data = await api.getEligibleHorizons(selectedLeague, selectedYear);
            if (data.eligible) {
                setEligibleHorizons(data.eligible);
                if (!data.eligible.includes(selectedHorizon)) {
                    setSelectedHorizon(data.eligible[0] || 'FULL_HISTORICAL');
                }
            }
        } catch (err) {
            setEligibleHorizons(['FULL_HISTORICAL']);
        }
    };

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

            const jobStatusStr = String(data.status);
            if (jobStatusStr === 'NONE') {
                setJobStatus(null);
                setPreviousSimAvailable(null);
                return;
            }

            setJobStatus(data);
            const statusLower = jobStatusStr.toLowerCase();
            if (statusLower === 'running' || statusLower === 'pending') {
                setLoading(true);
                setError(null);
            } else if (statusLower === 'completed') {
                setLoading(false);
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

    const handleLoadPreviousResults = () => {
        if (previousSimAvailable?.metrics) {
            setMetrics(previousSimAvailable.metrics);
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
                setForgeModels(prev => {
                    const otherModels = prev.filter(m => m.league_id !== Number.parseInt(selectedLeague));
                    return [...otherModels, ...data.models.map(m => ({ ...m, league_id: Number.parseInt(selectedLeague) }))];
                });
            }
        } catch (err) {
            console.warn("Could not load league models.");
        }
    };

    const pollBuildStatus = () => {
        const interval = setInterval(async () => {
            try {
                const status = await api.getForgeBuildStatus();
                setBuildStatus(status.progress || {});
                if (!status.is_building) {
                    clearInterval(interval);
                    setIsBuildingModels(false);
                    fetchForgeModels();
                    fetchLeagueModels();
                    if (status.error && !status.error.includes("cancelled")) {
                        setError(`Model Build Failed: ${status.error}`);
                    }
                }
            } catch (e) {
                console.error("Polling error", e);
            }
        }, 2000);
    };

    const handleBuildModels = async () => {
        if (!selectedLeague) return;
        setIsBuildingModels(true);
        setBuildStatus({ FULL_HISTORICAL: 'pending', '5Y_ROLLING': 'pending', '3Y_ROLLING': 'pending' });
        setError(null);
        try {
            const result = await api.buildForgeModels({ leagueId: Number.parseInt(selectedLeague) });
            if (result.success) pollBuildStatus();
            else {
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
            if (res.success) console.log("✅ Cancellation requested");
        } catch (err) {
            console.error("Failed to cancel build", err);
        }
    };

    const leagueModels = useMemo(() => {
        if (!selectedLeague) return [];
        return forgeModels.filter(m => m.league_id === Number.parseInt(selectedLeague) && m.is_active);
    }, [selectedLeague, forgeModels]);

    const activeModelForHorizon = useMemo(() => {
        return leagueModels.find(m => m.horizon_type === selectedHorizon);
    }, [leagueModels, selectedHorizon]);

    const handleRunSimulation = async () => {
        if (!selectedLeague || !selectedYear) return;
        setLoading(true);
        setError(null);
        setJobStatus(null);
        setMetrics(null);
        setSimId(null);
        setTapeData([]);
        setShowTape(false);
        setRetrainResult(null);
        setPreviousSimAvailable(null);

        try {
            const data = await api.startSimulation({
                leagueId: Number.parseInt(selectedLeague),
                seasonYear: Number.parseInt(selectedYear),
                mode: selectedMode,
                horizon: selectedHorizon
            });
            if (!data.success) {
                setError(data.message);
                setLoading(false);
            }
        } catch (err) {
            setError(err.message);
            setLoading(false);
        }
    };

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
                const pollInterval = setInterval(async () => {
                    try {
                        const status = await api.getRetrainStatus();
                        if (!status.is_retraining) {
                            clearInterval(pollInterval);
                            setIsRetraining(false);
                            setRetrainResult(status.result);
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

    const combinedChartData = useMemo(() => {
        if (!tapeData || tapeData.length === 0) return [];
        const roundsMap = {};
        tapeData.forEach((m, idx) => {
            const roundMatch = m.round_name?.match(/\d+/);
            const roundNum = roundMatch ? Number.parseInt(roundMatch[0]) : Math.floor(idx / 10) + 1;
            if (!roundsMap[roundNum]) roundsMap[roundNum] = { round: roundNum, correct: 0, total: 0 };
            roundsMap[roundNum].total++;
            if (m.is_correct === 1) roundsMap[roundNum].correct++;
        });

        return Object.values(roundsMap)
            .sort((a, b) => a.round - b.round)
            .map(r => ({
                round: r.round,
                accuracy: Number.parseFloat(((r.correct / r.total) * 100).toFixed(1))
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
                setError("Failed to fetch Matchday Tape.");
            } finally {
                setLoadingTape(false);
            }
        }
    };

    const getStepMessage = () => {
        if (!selectedLeague) return 'Step 1: Select a league from the dropdown or use "Discover New Leagues".';
        if (leagueModels.length === 0) return 'Step 2: Build the 3 ML models for your selected league.';
        if (!selectedYear) return 'Step 3: Select a season and run the simulation.';
        return 'Step 3: Select a season, choose a horizon, and run the simulation.';
    };

    return (
        <div className="simulation-dashboard animate-fade-in">
            <SimHeader />

            {showDiscovery && (
                <LeagueDiscovery
                    onSelectBatch={(staged) => {
                        setShowDiscovery(false);
                        if (staged.length >= 1) setSelectedLeague(String(staged[0].league.id));
                    }}
                    onCancel={() => setShowDiscovery(false)}
                    importedApiIds={[]}
                />
            )}

            {activeActivationId && (
                <LeagueActivationStage
                    leagueId={activeActivationId}
                    onComplete={() => { setActiveActivationId(null); fetchLeagues(); }}
                    onCancel={() => setActiveActivationId(null)}
                />
            )}

            <div className="sim-grid">
                <ParamsSidebar
                    leagues={leagues}
                    selectedLeague={selectedLeague}
                    onLeagueChange={setSelectedLeague}
                    onRefreshLeagues={fetchLeagues}
                    onShowDiscovery={() => setShowDiscovery(true)}
                    hasModels={leagueModels.length > 0}
                    leagueModels={leagueModels}
                    isBuildingModels={isBuildingModels}
                    buildStatus={buildStatus}
                    onBuildModels={handleBuildModels}
                    mlStatus={mlStatus}
                    years={years}
                    selectedYear={selectedYear}
                    onYearChange={setSelectedYear}
                    selectedMode={selectedMode}
                    onModeChange={setSelectedMode}
                    eligibleHorizons={eligibleHorizons}
                    selectedHorizon={selectedHorizon}
                    onHorizonChange={setSelectedHorizon}
                    readiness={readiness}
                    loading={loading}
                    onRunSimulation={handleRunSimulation}
                    jobStatus={jobStatus}
                    metrics={metrics}
                />

                <ResultsCanvas
                    error={error}
                    loading={loading}
                    metrics={metrics}
                    jobStatus={jobStatus}
                    previousSimAvailable={previousSimAvailable}
                    handleRunSimulation={handleRunSimulation}
                    handleLoadPreviousResults={handleLoadPreviousResults}
                    getStepMessage={getStepMessage}
                    simId={simId}
                    activeModelForHorizon={activeModelForHorizon}
                    selectedHorizon={selectedHorizon}
                    handleRetrain={handleRetrain}
                    isRetraining={isRetraining}
                    retrainResult={retrainResult}
                    mlStatus={mlStatus}
                    combinedChartData={combinedChartData}
                    showTape={showTape}
                    handleToggleTape={handleToggleTape}
                    tapeData={tapeData}
                    loadingTape={loadingTape}
                />
            </div>

            <BuildOverlay
                isBuildingModels={isBuildingModels}
                leagues={leagues}
                selectedLeague={selectedLeague}
                buildStatus={buildStatus}
                handleCancelBuild={handleCancelBuild}
            />
        </div>
    );
};

export default SimulationDashboard;
