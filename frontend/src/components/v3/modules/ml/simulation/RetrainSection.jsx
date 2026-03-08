import React from 'react';
import PropTypes from 'prop-types';

const RetrainSection = ({ simId, activeModelForHorizon, selectedHorizon, handleRetrain, isRetraining, mlStatus, retrainResult }) => {
    if (!simId || !activeModelForHorizon) return null;

    return (
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
    );
};

RetrainSection.propTypes = {
    simId: PropTypes.string,
    activeModelForHorizon: PropTypes.object,
    selectedHorizon: PropTypes.string.isRequired,
    handleRetrain: PropTypes.func.isRequired,
    isRetraining: PropTypes.bool.isRequired,
    mlStatus: PropTypes.object,
    retrainResult: PropTypes.object
};

export default RetrainSection;
