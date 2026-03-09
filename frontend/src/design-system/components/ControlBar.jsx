import React from 'react';
import PropTypes from 'prop-types';
import './ControlBar.css';


/**
 * Global ControlBar component for context-specific actions and navigation.
 * Usually placed below the ProfileHeader.
 * 
 * @param {React.ReactNode} left - Content for the left side (usually Tabs)
 * @param {React.ReactNode} right - Content for the right side (usually Filters/Buttons)
 * @param {string} className - Optional additional class
 */
const ControlBar = ({ left, right, className = '' }) => {
    return (
        <div className={`ds-control-bar ${className}`}>
            <div className="ds-control-bar-content">
                <div className="ds-control-bar-left">
                    {left}
                </div>
                {right && (
                    <div className="ds-control-bar-right">
                        {right}
                    </div>
                )}
            </div>
        </div>
    );
};

ControlBar.propTypes = {
    left: PropTypes.node,
    right: PropTypes.node,
    className: PropTypes.string
};

export default ControlBar;

