import React from 'react';
import './Tabs.css';

/**
 * Tabs component for navigation.
 * @param {Array} items - Array of { id, label, icon, hidden, disabled }
 * @param {string} activeId - Currently active tab id
 * @param {function} onChange - Callback for tab change
 */
const Tabs = ({ items = [], activeId, onChange, className = '', variant = 'line' }) => {
    const visibleItems = items.filter(item => !item.hidden);

    return (
        <div className={`ds-tabs ds-tabs--${variant} ${className}`}>
            <div className="ds-tabs-list">
                {visibleItems.map(item => (
                    <button
                        key={item.id}
                        disabled={item.disabled}
                        className={`ds-tabs-trigger ${activeId === item.id ? 'active' : ''} ${item.disabled ? 'disabled' : ''}`}
                        onClick={() => !item.disabled && onChange && onChange(item.id)}
                    >
                        {item.icon && <span className="ds-tabs-icon">{item.icon}</span>}
                        {item.label}
                    </button>
                ))}
            </div>
        </div>
    );
};

export default Tabs;
