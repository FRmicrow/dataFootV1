import React from 'react';
import PropTypes from 'prop-types';

const ParamsSidebar = ({
    leagues,
    selectedLeague,
    onLeagueChange,
    onRefreshLeagues,
    onShowDiscovery,
    hasModels,
    leagueModels,
    isBuildingModels,
    buildStatus,
    onBuildModels,
    mlStatus,
    years,
    selectedYear,
    onYearChange,
    selectedMode,
    onModeChange,
    eligibleHorizons,
    selectedHorizon,
    onHorizonChange,
    readiness,
    loading,
    onRunSimulation,
    jobStatus,
    metrics
}) => {
    return (
        <aside className="sim-params-card">
            <h3>Simulation Protocol</h3>

            {/* STEP 1: League Selection */}
            <div className="param-group">
                <div className="label-with-action">
                    <label>① League Target</label>
                    <div className="action-row">
                        <button className="text-action-btn" onClick={onRefreshLeagues} disabled={loading}>↻</button>
                        <button className="text-action-btn" onClick={onShowDiscovery}>🔭 Discovery</button>
                    </div>
                </div>
                <select
                    value={selectedLeague}
                    onChange={(e) => onLeagueChange(e.target.value)}
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
                                onClick={onBuildModels}
                                disabled={isBuildingModels || !selectedLeague || (mlStatus && mlStatus.status !== 'online')}
                                style={{ width: '100%' }}
                            >
                                {isBuildingModels ? '⏳ Building Models...' : '🏗️ Build 3 Models'}
                            </button>
                        </>
                    ) : (
                        <button
                            className="text-action-btn"
                            onClick={onBuildModels}
                            disabled={isBuildingModels || (mlStatus && mlStatus.status !== 'online')}
                            style={{ fontSize: '0.7rem', color: '#64748b', cursor: 'pointer', marginTop: '4px' }}
                        >
                            {isBuildingModels ? '⏳ Rebuilding...' : '🔄 Rebuild All Models'}
                        </button>
                    )}
                </div>
            )}

            {/* STEP 3: Simulation Parameters */}
            {selectedLeague && hasModels && (
                <>
                    <div className="param-group">
                        <label>③ Season Scope</label>
                        <select
                            value={selectedYear}
                            onChange={(e) => onYearChange(e.target.value)}
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
                            onChange={(e) => onModeChange(e.target.value)}
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
                            onChange={(e) => onHorizonChange(e.target.value)}
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
                            onClick={onRunSimulation}
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
                    <span className={`status-pill ${mlStatus?.status === 'online' ? 'online' : 'offline'}`}>
                        {mlStatus?.status === 'online' ? 'Online' : 'Offline'}
                    </span>
                </div>
                {mlStatus?.status !== 'online' && (
                    <div className="service-warning">⚠️ ML Service is unreachable. Model building and simulation are disabled.</div>
                )}
            </div>
        </aside>
    );
};

ParamsSidebar.propTypes = {
    leagues: PropTypes.array.isRequired,
    selectedLeague: PropTypes.string.isRequired,
    onLeagueChange: PropTypes.func.isRequired,
    onRefreshLeagues: PropTypes.func.isRequired,
    onShowDiscovery: PropTypes.func.isRequired,
    hasModels: PropTypes.bool.isRequired,
    leagueModels: PropTypes.array.isRequired,
    isBuildingModels: PropTypes.bool.isRequired,
    buildStatus: PropTypes.object,
    onBuildModels: PropTypes.func.isRequired,
    mlStatus: PropTypes.object,
    years: PropTypes.array.isRequired,
    selectedYear: PropTypes.string.isRequired,
    onYearChange: PropTypes.func.isRequired,
    selectedMode: PropTypes.string.isRequired,
    onModeChange: PropTypes.func.isRequired,
    eligibleHorizons: PropTypes.array.isRequired,
    selectedHorizon: PropTypes.string.isRequired,
    onHorizonChange: PropTypes.func.isRequired,
    readiness: PropTypes.object,
    loading: PropTypes.bool.isRequired,
    onRunSimulation: PropTypes.func.isRequired,
    jobStatus: PropTypes.object,
    metrics: PropTypes.object
};

export default ParamsSidebar;
