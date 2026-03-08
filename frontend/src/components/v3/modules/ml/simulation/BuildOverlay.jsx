import React from 'react';
import PropTypes from 'prop-types';

const BuildOverlay = ({ isBuildingModels, leagues, selectedLeague, buildStatus, handleCancelBuild }) => {
    if (!isBuildingModels) return null;

    const leagueName = leagues.find(l => String(l.league_id) === selectedLeague)?.name || 'Selected League';

    return (
        <div className="build-overlay">
            <div className="build-overlay-card">
                <span className="icon">🏗️</span>
                <h2>Forging ML intelligence</h2>
                <p>Constructing multi-horizon predictive models for {leagueName}</p>

                <div className="build-horizons-progress">
                    {['FULL_HISTORICAL', '5Y_ROLLING', '3Y_ROLLING'].map(horizon => (
                        <div key={horizon} className="horizon-progress-item">
                            <span className="name">{horizon.replace('_', ' ')}</span>
                            <span className={`status status-${(buildStatus?.[horizon] || 'pending').toLowerCase()}`}>
                                {buildStatus?.[horizon] || 'pending'}
                            </span>
                        </div>
                    ))}
                </div>

                <button className="build-cancel-btn" onClick={handleCancelBuild}>
                    ⚙️ Abort Construction
                </button>
            </div>
        </div>
    );
};

BuildOverlay.propTypes = {
    isBuildingModels: PropTypes.bool.isRequired,
    leagues: PropTypes.array.isRequired,
    selectedLeague: PropTypes.string.isRequired,
    buildStatus: PropTypes.object,
    handleCancelBuild: PropTypes.func.isRequired
};

export default BuildOverlay;
