import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import ImportLogPanel from '../modules/import/ImportLogPanel.jsx';
import './V3Layout.css';

const V3Layout = () => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const location = useLocation();

    const navItems = [
        { to: "/dashboard", label: "Dashboard" },
        { to: "/studio", label: "Content Studio" },
        { to: "/import", label: "Import Tool" },
        { to: "/leagues", label: "Leagues Data" },
        { to: "/machine-learning", label: "ML Hub" },
        { to: "/trophies", label: "Trophies" },
        { to: "/search", label: "Search" },
        { to: "/health", label: "DB Health" },
    ];

    // US-205: Ensure scroll to top on navigation
    useEffect(() => {
        globalThis.scrollTo(0, 0);
    }, [location.pathname]);

    return (
        <div className={`v3-layout ${isSidebarOpen ? 'sidebar-open' : ''}`}>
            {/* Mobile Header */}
            <header className="v3-mobile-header">
                <div className="v3-badge">StatFoot</div>
                <button className="v3-menu-toggle" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
                    {isSidebarOpen ? '✕' : '☰'}
                </button>
            </header>

            {/* Backdrop for mobile */}
            {isSidebarOpen && <button className="v3-sidebar-overlay" onClick={() => setIsSidebarOpen(false)} aria-label="Close sidebar" />}

            <aside className={`v3-sidebar ${isSidebarOpen ? 'open' : ''}`}>
                <div className="v3-sidebar-header">
                    <div className="v3-badge">StatFoot</div>
                </div>

                <nav className="v3-nav">
                    {navItems.map((item) => (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            className={({ isActive }) => `ds-button ds-button--md v3-nav-item ${isActive ? 'ds-button--secondary active' : 'ds-button--ghost'}`}
                            style={{ justifyContent: 'flex-start', width: '100%', marginBottom: '4px' }}
                            onClick={() => setIsSidebarOpen(false)}
                        >
                            <span className="ds-button-text">{item.label}</span>
                        </NavLink>
                    ))}
                </nav>
            </aside>

            <main className="v3-main-content">
                <ImportLogPanel />
                <Outlet />
            </main>
        </div>
    );
};

export default V3Layout;
