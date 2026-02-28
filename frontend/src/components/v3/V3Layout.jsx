import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import ImportLogPanel from './ImportLogPanel.jsx';
import './V3Layout.css';

const V3Layout = () => {
    return (
        <div className="v3-layout">
            <aside className="v3-sidebar">
                <div className="v3-sidebar-header">
                    <div className="v3-badge">StatFoot</div>
                </div>

                <nav className="v3-nav">
                    <NavLink to="/dashboard" className={({ isActive }) => `v3-nav-item ${isActive ? 'active' : ''}`}>
                        Dashboard
                    </NavLink>
                    <NavLink to="/studio" className={({ isActive }) => `v3-nav-item ${isActive ? 'active' : ''}`}>
                        Content Studio
                    </NavLink>
                    <NavLink to="/import" className={({ isActive }) => `v3-nav-item ${isActive ? 'active' : ''}`}>
                        Import Tool
                    </NavLink>
                    <NavLink to="/leagues" className={({ isActive }) => `v3-nav-item ${isActive ? 'active' : ''}`}>
                        Leagues Data
                    </NavLink>
                    <NavLink to="/betting-labs" className={({ isActive }) => `v3-nav-item ${isActive ? 'active' : ''}`}>
                        Betting Labs
                    </NavLink>
                    <NavLink to="/live-bet" className={({ isActive }) => `v3-nav-item ${isActive ? 'active' : ''}`}>
                        Live Bet
                    </NavLink>
                    <NavLink to="/trophies" className={({ isActive }) => `v3-nav-item ${isActive ? 'active' : ''}`}>
                        Trophies
                    </NavLink>
                    <NavLink to="/search" className={({ isActive }) => `v3-nav-item ${isActive ? 'active' : ''}`}>
                        Search
                    </NavLink>
                    <NavLink to="/health" className={({ isActive }) => `v3-nav-item ${isActive ? 'active' : ''}`}>
                        DB Health
                    </NavLink>
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
