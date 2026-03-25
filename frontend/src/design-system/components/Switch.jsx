import React from 'react';
import PropTypes from 'prop-types';
import './Switch.css';

const Switch = ({ checked, onChange, labelLeft, labelRight, size = 'sm' }) => {
    return (
        <div className={`ds-switch-container ds-switch--${size}`}>
            {labelLeft && (
                <span 
                    className={`ds-switch-label ${!checked ? 'is-active' : ''}`} 
                    onClick={() => onChange(false)}
                >
                    {labelLeft}
                </span>
            )}
            <button
                type="button"
                className={`ds-switch-track ${checked ? 'is-checked' : ''}`}
                onClick={() => onChange(!checked)}
                role="switch"
                aria-checked={checked}
                aria-label={labelRight || labelLeft || 'toggle'}
            >
                <span className="ds-switch-thumb" />
            </button>
            {labelRight && (
                <span 
                    className={`ds-switch-label ${checked ? 'is-active' : ''}`} 
                    onClick={() => onChange(true)}
                >
                    {labelRight}
                </span>
            )}
        </div>
    );
};

Switch.propTypes = {
    checked: PropTypes.bool.isRequired,
    onChange: PropTypes.func.isRequired,
    labelLeft: PropTypes.string,
    labelRight: PropTypes.string,
    size: PropTypes.oneOf(['sm', 'md', 'lg']),
};

export default Switch;
