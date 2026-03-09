import React, { useState } from 'react';
import PropTypes from 'prop-types';

import './Accordion.css';

const Accordion = ({ title, headerRight, defaultExpanded = false, children, maxHeight = '400px' }) => {
    const [isExpanded, setIsExpanded] = useState(defaultExpanded);

    return (
        <div className={`ds-accordion ${isExpanded ? 'expanded' : ''}`}>
            <div className="ds-accordion-header">
                <button
                    className="ds-accordion-toggle"
                    onClick={() => setIsExpanded(!isExpanded)}
                    aria-expanded={isExpanded}
                    type="button"
                >
                    <span className="ds-accordion-icon">{isExpanded ? '▼' : '▶'}</span>
                    {typeof title === 'string' ? (
                        <h3 className="ds-accordion-title-text">{title}</h3>
                    ) : (
                        <div className="ds-accordion-title-custom">{title}</div>
                    )}
                </button>
                {headerRight && (
                    <div className="ds-accordion-header-right">
                        {headerRight}
                    </div>
                )}
            </div>
            {isExpanded && (
                <div className="ds-accordion-content" style={{ maxHeight, overflowY: 'auto' }}>
                    {children}
                </div>
            )}
        </div>
    );
};

Accordion.propTypes = {
    title: PropTypes.node.isRequired,
    headerRight: PropTypes.node,
    defaultExpanded: PropTypes.bool,
    children: PropTypes.node,
    maxHeight: PropTypes.string
};


export default Accordion;
