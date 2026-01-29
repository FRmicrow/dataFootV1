import React, { useState } from 'react';
import { Routes, Route, NavLink, Navigate } from 'react-router-dom';
import TeamMapping from './TeamMapping';
import MissingInfo from './MissingInfo';
import './Admin.css';

const AdminLayout = () => {
    return (
        <div className="admin-layout">
            <aside className="admin-sidebar">
                <div className="admin-sidebar-header">
                    <h3>Admin Panel</h3>
                </div>
                <nav className="admin-nav">
                    <NavLink to="/admin/team-mapping" className={({ isActive }) => `admin-nav-item ${isActive ? 'active' : ''}`}>
                        Team Mapping
                    </NavLink>
                    <NavLink to="/admin/missing-info" className={({ isActive }) => `admin-nav-item ${isActive ? 'active' : ''}`}>
                        Missing Team Info
                    </NavLink>
                    {/* Add more admin links here */}
                </nav>
            </aside>
            <main className="admin-content">
                <Routes>
                    <Route path="/" element={<Navigate to="team-mapping" replace />} />
                    <Route path="team-mapping" element={<TeamMapping />} />
                    <Route path="missing-info" element={<MissingInfo />} />
                </Routes>
            </main>
        </div>
    );
};

export default AdminLayout;
