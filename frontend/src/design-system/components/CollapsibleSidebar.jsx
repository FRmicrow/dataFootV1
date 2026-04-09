import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import './CollapsibleSidebar.css';

const Brand = () => (
    <NavLink to="/dashboard" className="sf-sidebar__brand-link">
        <span className="sf-sidebar__brand-text">
            Ninety<span className="sf-sidebar__brand-accent">XI</span>
        </span>
    </NavLink>
);

const CollapsibleSidebar = ({ navItems = [] }) => {
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [isMobileOpen, setIsMobileOpen] = useState(false);
    const [debugMode, setDebugMode] = useState(() =>
        localStorage.getItem('statfoot-debug-ui') === 'true'
    );
    const location = useLocation();

    useEffect(() => {
        setIsMobileOpen(false);
    }, [location.pathname]);

    useEffect(() => {
        document.body.classList.toggle('ds-debug-active', debugMode);
        localStorage.setItem('statfoot-debug-ui', debugMode);
    }, [debugMode]);

    // US-330: Allow global layout to react to sidebar state
    useEffect(() => {
        document.body.classList.toggle('sidebar-collapsed', isCollapsed);
    }, [isCollapsed]);

    const sidebarClass = [
        'sf-sidebar',
        isCollapsed ? 'sf-sidebar--collapsed' : '',
        isMobileOpen ? 'sf-sidebar--mobile-open' : '',
    ].filter(Boolean).join(' ');

    return (
        <>
            {/* Mobile sticky header */}
            <header className="sf-mobile-header">
                <Brand />
                <button
                    className="sf-sidebar__burger"
                    onClick={() => setIsMobileOpen(true)}
                    aria-label="Ouvrir le menu"
                >
                    ☰
                </button>
            </header>

            {/* Mobile backdrop */}
            {isMobileOpen && (
                <button
                    className="sf-sidebar-overlay"
                    onClick={() => setIsMobileOpen(false)}
                    aria-label="Fermer le menu"
                />
            )}

            {/* Sidebar */}
            <aside className={sidebarClass}>
                <div className="sf-sidebar__header">
                    <div className="sf-sidebar__brand">
                        <Brand />
                    </div>
                    {/* Desktop collapse toggle */}
                    <button
                        className="sf-sidebar__burger sf-sidebar__burger--desktop"
                        onClick={() => setIsCollapsed(c => !c)}
                        aria-label={isCollapsed ? 'Développer le menu' : 'Réduire le menu'}
                    >
                        {isCollapsed ? '»' : '☰'}
                    </button>
                    {/* Mobile close */}
                    <button
                        className="sf-sidebar__burger sf-sidebar__burger--mobile-close"
                        onClick={() => setIsMobileOpen(false)}
                        aria-label="Fermer le menu"
                    >
                        ✕
                    </button>
                </div>

                <nav className="sf-sidebar__nav">
                    {navItems.map((item) => (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            className={({ isActive }) =>
                                `sf-sidebar__item ${isActive ? 'sf-sidebar__item--active' : ''}`
                            }
                            title={isCollapsed ? item.label : undefined}
                        >
                            {item.icon && (
                                <span className="sf-sidebar__icon" aria-hidden="true">
                                    {item.icon}
                                </span>
                            )}
                            <span className="sf-sidebar__label">{item.label}</span>
                        </NavLink>
                    ))}
                </nav>

                {/* Footer: debug toggle */}
                <div className="sf-sidebar__footer">
                    <button
                        className={`sf-sidebar__item sf-sidebar__debug-btn ${debugMode ? 'sf-sidebar__item--active' : ''}`}
                        onClick={() => setDebugMode(d => !d)}
                        title="Toggle Design System Debug Mode"
                    >
                        <span className="sf-sidebar__icon" aria-hidden="true">🛠️</span>
                        <span className="sf-sidebar__label">Debug</span>
                    </button>
                </div>
            </aside>
        </>
    );
};

export default CollapsibleSidebar;
