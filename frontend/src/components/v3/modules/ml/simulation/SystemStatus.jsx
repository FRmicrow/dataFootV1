import React from 'react';
import PropTypes from 'prop-types';

const SystemStatus = ({ mlStatus }) => {
    return (
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
    );
};

SystemStatus.propTypes = {
    mlStatus: PropTypes.object
};

export default SystemStatus;
