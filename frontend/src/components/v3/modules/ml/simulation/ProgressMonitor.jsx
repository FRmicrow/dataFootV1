import React from 'react';
import PropTypes from 'prop-types';

const ProgressMonitor = ({ jobStatus }) => {
    if (!jobStatus || (jobStatus.status !== 'running' && jobStatus.status !== 'RUNNING')) return null;

    return (
        <div className="sim-progress-monitor">
            <div className="progress-header">
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '0.65rem', color: '#64748b', textTransform: 'uppercase' }}>Current Stage</span>
                    <span style={{ fontWeight: 600, color: '#10b981' }}>{jobStatus.stage || 'PROCESSING...'}</span>
                </div>
                <span className="pct">{jobStatus.progress || 0}%</span>
            </div>
            <div className="progress-bar-wrap">
                <div className="progress-bar-fill" style={{ width: `${jobStatus.progress || 0}%` }}></div>
            </div>
            {jobStatus.last_heartbeat && (
                <div style={{ fontSize: '0.6rem', color: '#475569', marginTop: '4px', textAlign: 'right' }}>
                    💓 Last Active: {new Date(jobStatus.last_heartbeat).toLocaleTimeString()}
                </div>
            )}
        </div>
    );
};

ProgressMonitor.propTypes = {
    jobStatus: PropTypes.object
};

export default ProgressMonitor;
