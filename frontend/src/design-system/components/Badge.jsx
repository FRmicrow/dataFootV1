import React from 'react';
import './Badge.css';

const Badge = ({ children, variant = 'neutral', size = 'md', className = '' }) => {
    return (
        <span className={`ds-badge ds-badge--${variant} ds-badge--${size} ${className}`}>
            {children}
        </span>
    );
};

export default Badge;
