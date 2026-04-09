import React from 'react';
import PropTypes from 'prop-types';

import './Badge.css';

const Badge = ({ children, variant = 'neutral', size = 'md', className = '', style = {} }) => {
    return (
        <span className={`ds-badge ds-badge--${variant} ds-badge--${size} ${className}`} style={style}>
            {children}
        </span>
    );
};

Badge.propTypes = {
    children: PropTypes.node,
    variant: PropTypes.string,
    size: PropTypes.string,
    className: PropTypes.string,
    style: PropTypes.object
};


export default Badge;
