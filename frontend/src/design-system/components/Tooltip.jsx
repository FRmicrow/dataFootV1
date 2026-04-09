import React from 'react';
import PropTypes from 'prop-types';
import './Tooltip.css';

const Tooltip = ({ content, children, className = '' }) => {
    return (
        <span className={`ds-tooltip ${className}`}>
            <span className="ds-tooltip__trigger" tabIndex={0}>
                {children}
            </span>
            <span className="ds-tooltip__content" role="tooltip">
                {content}
            </span>
        </span>
    );
};

Tooltip.propTypes = {
    content: PropTypes.node.isRequired,
    children: PropTypes.node.isRequired,
    className: PropTypes.string,
};

export default Tooltip;
