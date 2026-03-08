import React from 'react';
import PropTypes from 'prop-types';

const SimulationParams = ({
    selectedYear, onYearChange, years,
    selectedMode, onModeChange,
    selectedHorizon, onHorizonChange, eligibleHorizons,
    readiness, loading, onRunSimulation, metrics, hasModels, disabled
}) => {
    if (disabled) return null;

    return (
        <>
            <div className="param-group">
                <label>③ Season Scope</label>
                <select
                    value={selectedYear}
                    onChange={(e) => onYearChange(e.target.value)}
                    disabled={loading || years.length === 0}
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
                    disabled={loading || !selectedYear}
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
    );
};

SimulationParams.propTypes = {
    selectedYear: PropTypes.string.isRequired,
    onYearChange: PropTypes.func.isRequired,
    years: PropTypes.array.isRequired,
    selectedMode: PropTypes.string.isRequired,
    onModeChange: PropTypes.func.isRequired,
    selectedHorizon: PropTypes.string.isRequired,
    onHorizonChange: PropTypes.func.isRequired,
    eligibleHorizons: PropTypes.array.isRequired,
    readiness: PropTypes.object,
    loading: PropTypes.bool.isRequired,
    onRunSimulation: PropTypes.func.isRequired,
    metrics: PropTypes.object,
    hasModels: PropTypes.bool.isRequired,
    disabled: PropTypes.bool
};

export default SimulationParams;
