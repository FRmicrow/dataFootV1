import React from 'react';
import './Button.css';

const Button = ({ children, variant = 'primary', size = 'md', icon, loading = false, disabled = false, onClick, className = '', type = 'button' }) => {
    return (
        <button
            type={type}
            className={`ds-button ds-button--${variant} ds-button--${size} ${loading ? 'ds-button--loading' : ''} ${className}`}
            disabled={disabled || loading}
            onClick={onClick}
        >
            {loading && <span className="ds-button-spinner"></span>}
            {icon && !loading && <span className="ds-button-icon">{icon}</span>}
            <span className="ds-button-text">{children}</span>
        </button>
    );
};

export default Button;
