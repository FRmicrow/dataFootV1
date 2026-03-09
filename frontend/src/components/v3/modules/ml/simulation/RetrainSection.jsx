import React from 'react';
import PropTypes from 'prop-types';

const getRetrainTheme = (status) => {
    switch (status) {
        case 'accepted':
            return {
                bg: 'rgba(16, 185, 129, 0.1)',
                border: '#10b981',
                text: '#10b981',
                label: '✅ Model Updated'
            };
        case 'rejected':
            return {
                bg: 'rgba(245, 158, 11, 0.1)',
                border: '#f59e0b',
                text: '#f59e0b',
                label: '⚠️ Retrain Rejected'
            };
        default:
            return {
                bg: 'rgba(239, 68, 68, 0.1)',
                border: '#ef4444',
                text: '#ef4444',
                label: '❌ Error'
            };
    }
};

const RetrainFeedback = ({ result }) => {
    if (!result) return null;
    const theme = getRetrainTheme(result.status);

    return (
        <div style={{
            marginTop: '10px',
            padding: '10px 14px',
            borderRadius: '8px',
            background: theme.bg,
            border: `1px solid ${theme.border}33`,
            fontSize: '0.75rem'
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: theme.text, fontWeight: 600 }}>
                    {theme.label}
                </span>
                {result.old_accuracy !== undefined && (
                    <span style={{ color: '#e2e8f0' }}>
                        {(result.old_accuracy * 100).toFixed(1)}% →{' '}
                        <strong>{(result.new_accuracy * 100).toFixed(1)}%</strong>
                        {' '}
                        <span style={{ color: result.improvement > 0 ? '#10b981' : '#ef4444' }}>
                            ({result.improvement > 0 ? '+' : ''}{(result.improvement * 100).toFixed(1)}%)
                        </span>
                    </span>
                )}
            </div>
            <p style={{ margin: '4px 0 0', color: '#94a3b8' }}>{result.message}</p>
        </div>
    );
};

RetrainFeedback.propTypes = {
    result: PropTypes.shape({
        status: PropTypes.string,
        old_accuracy: PropTypes.number,
        new_accuracy: PropTypes.number,
        improvement: PropTypes.number,
        message: PropTypes.string
    })
};

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

            <RetrainFeedback result={retrainResult} />
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
