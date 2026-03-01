import React, { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import ImportLogPanel from './ImportLogPanel.jsx';
import './V3Layout.css';

const V3Layout = () => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    const navItems = [
        { to: "/dashboard", label: "Dashboard" },
        { to: "/studio", label: "Content Studio" },
        { to: "/import", label: "Import Tool" },
        { to: "/leagues", label: "Leagues Data" },
        { to: "/betting-labs", label: "Betting Labs" },
        { to: "/live-bet", label: "Live Bet" },
        { to: "/trophies", label: "Trophies" },
        { to: "/search", label: "Search" },
        { to: "/health", label: "DB Health" },
    ];

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
            {isSidebarOpen && <div className="v3-sidebar-overlay" onClick={() => setIsSidebarOpen(false)} />}

            <aside className={`v3-sidebar ${isSidebarOpen ? 'open' : ''}`}>
                <div className="v3-sidebar-header">
                    <div className="v3-badge">StatFoot</div>
                </div>

                <nav className="v3-nav">
                    {navItems.map((item) => (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            className={({ isActive }) => `v3-nav-item ${isActive ? 'active' : ''}`}
                            onClick={() => setIsSidebarOpen(false)}
                        >
                            {item.label}
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
