import React from 'react';
import PropTypes from 'prop-types';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import SimulationMetrics from './SimulationMetrics';
import ConfusionMatrix from './ConfusionMatrix';
import MatchdayTape from './MatchdayTape';

const InfoIcon = ({ text }) => (
    <span className="info-icon" data-tooltip={text}>?</span>
);

InfoIcon.propTypes = {
    text: PropTypes.string.isRequired
};

const ResultsCanvas = ({
    error,
    loading,
    metrics,
    jobStatus,
    previousSimAvailable,
    handleRunSimulation,
    handleLoadPreviousResults,
    getStepMessage,
    simId,
    activeModelForHorizon,
    selectedHorizon,
    handleRetrain,
    isRetraining,
    retrainResult,
    mlStatus,
    combinedChartData,
    showTape,
    handleToggleTape,
    tapeData,
    loadingTape
}) => {
    return (
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

                    <SimulationMetrics metrics={metrics} />

                    {/* Last Ran Indicator */}
                    {jobStatus && (jobStatus.status === 'COMPLETED' || jobStatus.status === 'completed') && (
                        <div style={{ fontSize: '0.7rem', color: '#64748b', marginBottom: '20px', textAlign: 'right' }}>
                            ✅ Protocol Verified — Last Ran: {new Date(jobStatus.last_heartbeat || jobStatus.created_at).toLocaleString()}
                        </div>
                    )}

                    {/* Retrain Section */}
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
                                    disabled={isRetraining || (mlStatus && mlStatus.status !== 'online')}
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
                            <ConfusionMatrix matrix={metrics.confusion_matrix} />
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
                            <MatchdayTape tapeData={tapeData} loadingTape={loadingTape} />
                        </div>
                    )}
                </div>
            ) : null}
        </main>
    );
};

ResultsCanvas.propTypes = {
    error: PropTypes.string,
    loading: PropTypes.bool.isRequired,
    metrics: PropTypes.object,
    jobStatus: PropTypes.object,
    previousSimAvailable: PropTypes.object,
    handleRunSimulation: PropTypes.func.isRequired,
    handleLoadPreviousResults: PropTypes.func.isRequired,
    getStepMessage: PropTypes.func.isRequired,
    simId: PropTypes.string,
    activeModelForHorizon: PropTypes.object,
    selectedHorizon: PropTypes.string.isRequired,
    handleRetrain: PropTypes.func.isRequired,
    isRetraining: PropTypes.bool.isRequired,
    retrainResult: PropTypes.object,
    mlStatus: PropTypes.object,
    combinedChartData: PropTypes.array.isRequired,
    showTape: PropTypes.bool.isRequired,
    handleToggleTape: PropTypes.func.isRequired,
    tapeData: PropTypes.array.isRequired,
    loadingTape: PropTypes.bool.isRequired
};

export default ResultsCanvas;
