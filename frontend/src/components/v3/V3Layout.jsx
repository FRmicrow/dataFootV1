import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import './V3Layout.css';

const V3Layout = () => {
    return (
        <div className="v3-layout">
            <aside className="v3-sidebar">
                <div className="v3-sidebar-header">
                    <div className="v3-badge">⚽ StatFoot</div>
                </div>

                <nav className="v3-nav">
                    <NavLink to="/dashboard" className={({ isActive }) => `v3-nav-item ${isActive ? 'active' : ''}`}>
                        <span className="icon">📊</span> Dashboard
                    </NavLink>
                    <NavLink to="/studio" className={({ isActive }) => `v3-nav-item ${isActive ? 'active' : ''}`}>
                        <span className="icon">🎬</span> Content Studio
                    </NavLink>
                    <NavLink to="/import" className={({ isActive }) => `v3-nav-item ${isActive ? 'active' : ''}`}>
                        <span className="icon">📥</span> Import Tool
                    </NavLink>
                    <NavLink to="/leagues" className={({ isActive }) => `v3-nav-item ${isActive ? 'active' : ''}`}>
                        <span className="icon">🏆</span> Leagues Data
                    </NavLink>
                    <NavLink to="/betting-labs" className={({ isActive }) => `v3-nav-item ${isActive ? 'active' : ''}`}>
                        <span className="icon">🧠</span> Betting Labs
                    </NavLink>
                    <NavLink to="/trophies" className={({ isActive }) => `v3-nav-item ${isActive ? 'active' : ''}`}>
                        <span className="icon">🎖️</span> Trophies (Import)
                    </NavLink>
                    <NavLink to="/search" className={({ isActive }) => `v3-nav-item ${isActive ? 'active' : ''}`}>
                        <span className="icon">🔍</span> Search
                    </NavLink>
                    <NavLink to="/health" className={({ isActive }) => `v3-nav-item ${isActive ? 'active' : ''}`}>
                        <span className="icon">🩺</span> DB Health
                    </NavLink>
                </nav>
            </aside>

            <main className="v3-main-content">
                <Outlet />
            </main>
        </div>
    );
};

export default V3Layout;
