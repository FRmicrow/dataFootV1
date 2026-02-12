import React from 'react';
import { NavLink, Outlet, Link } from 'react-router-dom';
import './V3Layout.css';

const V3Layout = () => {
    return (
        <div className="v3-layout">
            <aside className="v3-sidebar">
                <div className="v3-sidebar-header">
                    <div className="v3-badge">🧪 V3 POC</div>
                    <h3>Experimental</h3>
                </div>

                <nav className="v3-nav">
                    <NavLink to="/v3/dashboard" className={({ isActive }) => `v3-nav-item ${isActive ? 'active' : ''}`}>
                        <span className="icon">📊</span> Dashboard
                    </NavLink>
                    <NavLink to="/v3/studio" className={({ isActive }) => `v3-nav-item ${isActive ? 'active' : ''}`}>
                        <span className="icon">🎬</span> Content Studio
                    </NavLink>
                    <NavLink to="/v3/import" className={({ isActive }) => `v3-nav-item ${isActive ? 'active' : ''}`}>
                        <span className="icon">📥</span> Import Tool
                    </NavLink>
                    <NavLink to="/v3/leagues" className={({ isActive }) => `v3-nav-item ${isActive ? 'active' : ''}`}>
                        <span className="icon">🏆</span> Leagues Data
                    </NavLink>
                    <NavLink to="/v3/search" className={({ isActive }) => `v3-nav-item ${isActive ? 'active' : ''}`}>
                        <span className="icon">🔍</span> Search
                    </NavLink>
                    <NavLink to="/v3/health" className={({ isActive }) => `v3-nav-item ${isActive ? 'active' : ''}`}>
                        <span className="icon">🩺</span> DB Health
                    </NavLink>
                </nav>

                <div className="v3-sidebar-footer">
                    <Link to="/" className="v3-exit-link">
                        ← Exit to V2
                    </Link>
                </div>
            </aside>

            <main className="v3-main-content">
                <Outlet />
            </main>
        </div>
    );
};

export default V3Layout;
