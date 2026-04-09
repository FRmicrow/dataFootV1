import React from 'react';
import PropTypes from 'prop-types';

/**
 * OddsImportStage (Stub)
 * Currently disabled per user request to forget odds data.
 * Kept as stub to prevent import errors — this component is commented out in SimulationDashboard.
 */
const OddsImportStage = ({ leagueId, onComplete, onCancel }) => {
    return (
        <div style={{ padding: '20px', background: '#1e293b', borderRadius: '12px', color: '#94a3b8', textAlign: 'center' }}>
            <p>Odds Import is currently disabled.</p>
            <button onClick={onCancel} style={{ marginTop: '10px', padding: '6px 16px', borderRadius: '8px', border: '1px solid #475569', background: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                Close
            </button>
        </div>
    );
};

OddsImportStage.propTypes = {
    leagueId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    onComplete: PropTypes.func.isRequired,
    onCancel: PropTypes.func.isRequired
};

export default OddsImportStage;
