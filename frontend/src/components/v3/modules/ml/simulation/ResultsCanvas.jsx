import React from 'react';
import PropTypes from 'prop-types';
import SimulationMetrics from './SimulationMetrics';
import ConfusionMatrix from './ConfusionMatrix';
import MatchdayTape from './MatchdayTape';
import SimulationError from './SimulationError';
import SimulationSkeleton from './SimulationSkeleton';
import InitialStateView from './InitialStateView';
import RetrainSection from './RetrainSection';
import AccuracyChart from './AccuracyChart';

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
            <SimulationError error={error} handleRunSimulation={handleRunSimulation} />

            {(() => {
                if (loading && !metrics && (!jobStatus || (jobStatus.status.toUpperCase() !== 'RUNNING'))) {
                    return <SimulationSkeleton />;
                }
                if (!metrics) {
                    return (
                        <InitialStateView
                            getStepMessage={getStepMessage}
                            previousSimAvailable={previousSimAvailable}
                            handleLoadPreviousResults={handleLoadPreviousResults}
                        />
                    );
                }
                return (
                    <div className="results-container animate-fade-in-up">
                        {metrics.overconfidence_warning && (
                            <div className="recalibration-banner">
                                ⚠️ Overconfidence Alert — Model showed high confidence on predictions that were incorrect.
                            </div>
                        )}

                        <SimulationMetrics metrics={metrics} />

                        {jobStatus && (jobStatus.status.toUpperCase() === 'COMPLETED') && (
                            <div style={{ fontSize: '0.7rem', color: '#64748b', marginBottom: '20px', textAlign: 'right' }}>
                                ✅ Protocol Verified — Last Ran: {new Date(jobStatus.last_heartbeat || jobStatus.created_at).toLocaleString()}
                            </div>
                        )}

                        <RetrainSection
                            simId={simId}
                            activeModelForHorizon={activeModelForHorizon}
                            selectedHorizon={selectedHorizon}
                            handleRetrain={handleRetrain}
                            isRetraining={isRetraining}
                            mlStatus={mlStatus}
                            retrainResult={retrainResult}
                        />

                        <div className="charts-grid">
                            <AccuracyChart combinedChartData={combinedChartData} />
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
                );
            })()}
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
