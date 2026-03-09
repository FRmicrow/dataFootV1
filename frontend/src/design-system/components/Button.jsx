import React from 'react';
import PropTypes from 'prop-types';

import './Button.css';

const Button = ({ children, variant = 'primary', size = 'md', icon, loading = false, disabled = false, onClick, className = '', style = {}, type = 'button' }) => {
    return (
        <button
            type={type}
            className={`ds-button ds-button--${variant} ds-button--${size} ${loading ? 'ds-button--loading' : ''} ${className}`}
            disabled={disabled || loading}
            onClick={onClick}
            style={style}
        >
            {loading && <span className="ds-button-spinner"></span>}
            {icon && !loading && <span className="ds-button-icon">{icon}</span>}
            <span className="ds-button-text">{children}</span>
        </button>
    );
};

Button.propTypes = {
    children: PropTypes.node,
    variant: PropTypes.string,
    size: PropTypes.string,
    icon: PropTypes.node,
    loading: PropTypes.bool,
    disabled: PropTypes.bool,
    onClick: PropTypes.func,
    className: PropTypes.string,
    style: PropTypes.object,
    type: PropTypes.oneOf(['button', 'submit', 'reset'])
};


export default Button;
