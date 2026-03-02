import React from 'react';
import './Badge.css';

const Badge = ({ children, variant = 'neutral', size = 'md', className = '', style = {} }) => {
    return (
        <span className={`ds-badge ds-badge--${variant} ds-badge--${size} ${className}`} style={style}>
            {children}
        </span>
    );
};

export default Badge;
