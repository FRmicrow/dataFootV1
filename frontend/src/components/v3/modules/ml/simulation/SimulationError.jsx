import React from 'react';
import PropTypes from 'prop-types';

const SimulationError = ({ error, handleRunSimulation }) => {
    if (!error) return null;

    return (
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
    );
};

SimulationError.propTypes = {
    error: PropTypes.string,
    handleRunSimulation: PropTypes.func.isRequired
};

export default SimulationError;
