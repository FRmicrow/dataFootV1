import React from 'react';
import './Progress.css';

const Progress = ({
    value = 0,
    max = 100,
    size = 'md',
    variant = 'primary',
    showLabel = false,
    label,
    className = ''
}) => {
    const percent = Math.min(Math.max(0, (value / max) * 100), 100);

    return (
        <div className={`ds-progress ds-progress--${size} ${className}`}>
            {(showLabel || label) && (
                <div className="ds-progress-header">
                    {label && <span className="ds-progress-label">{label}</span>}
                    {showLabel && <span className="ds-progress-value">{Math.round(percent)}%</span>}
                </div>
            )}
            <div className="ds-progress-track">
                <div
                    className={`ds-progress-fill ds-progress-fill--${variant}`}
                    style={{ width: `${percent}%` }}
                />
            </div>
        </div>
    );
};

export default Progress;
