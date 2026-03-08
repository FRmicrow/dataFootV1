import React from 'react';
import PropTypes from 'prop-types';

const InitialStateView = ({ getStepMessage, previousSimAvailable, handleLoadPreviousResults }) => {
    return (
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
    );
};

InitialStateView.propTypes = {
    getStepMessage: PropTypes.func.isRequired,
    previousSimAvailable: PropTypes.object,
    handleLoadPreviousResults: PropTypes.func.isRequired
};

export default InitialStateView;
