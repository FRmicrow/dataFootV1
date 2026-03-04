import React, { useState } from 'react';
import './Accordion.css';

const Accordion = ({ title, headerRight, defaultExpanded = false, children, maxHeight = '400px' }) => {
    const [isExpanded, setIsExpanded] = useState(defaultExpanded);

    return (
        <div className={`ds-accordion ${isExpanded ? 'expanded' : ''}`}>
            <div className="ds-accordion-header" onClick={() => setIsExpanded(!isExpanded)}>
                <div className="ds-accordion-title">
                    <span className="ds-accordion-icon">{isExpanded ? '▼' : '▶'}</span>
                    <h3>{title}</h3>
                </div>
                {headerRight && (
                    <div className="ds-accordion-header-right" onClick={(e) => e.stopPropagation()}>
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

export default Accordion;
