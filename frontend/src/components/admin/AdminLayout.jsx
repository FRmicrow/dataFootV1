import React from 'react';
import { NavLink, Routes, Route, Navigate } from 'react-router-dom';
import TeamMapping from './TeamMapping';
import MissingInfo from './MissingInfo';
import ImportClubPlayers from './ImportClubPlayers';
import ImportPlayers from './ImportPlayers';
import ImportLeagueDeep from './ImportLeagueDeep';
import PlayerList from './PlayerList';
import PlayerDetail from './PlayerDetail';
import CompetitionManager from './CompetitionManager';
import FixClubCountries from './FixClubCountries';
import DataCleanup from './DataCleanup';
import './Admin.css';

const AdminLayout = () => {
    return (
        <div className="admin-layout">
            <aside className="admin-sidebar">
                <div className="admin-sidebar-header">
                    <h3>Admin Panel</h3>
                </div>
                <nav className="admin-nav">
                    {/* ... existing links ... */}
                    <NavLink to="/admin/team-mapping" className={({ isActive }) => `admin-nav-item ${isActive ? 'active' : ''}`}>
                        Team Mapping
                    </NavLink>
                    <NavLink to="/admin/missing-info" className={({ isActive }) => `admin-nav-item ${isActive ? 'active' : ''}`}>
                        Missing Team Info
                    </NavLink>
                    <NavLink to="/admin/import-players" className={({ isActive }) => `admin-nav-item ${isActive ? 'active' : ''}`}>
                        Import Players (League)
                    </NavLink>
                    <NavLink to="/admin/import-deep" className={({ isActive }) => `admin-nav-item ${isActive ? 'active' : ''}`}>
                        Import Players (Deep)
                    </NavLink>
                    <NavLink to="/admin/import-by-club" className={({ isActive }) => `admin-nav-item ${isActive ? 'active' : ''}`}>
                        Import Players (Club)
                    </NavLink>
                    <NavLink to="/admin/competitions" className={({ isActive }) => `admin-nav-item ${isActive ? 'active' : ''}`}>
                        Competition Manager
                    </NavLink>
                    <NavLink to="/admin/fix-club-countries" className={({ isActive }) => `admin-nav-item ${isActive ? 'active' : ''}`}>
                        Fix Club Countries
                    </NavLink>
                    <NavLink to="/admin/cleanup" className={({ isActive }) => `admin-nav-item ${isActive ? 'active' : ''}`}>
                        Data Cleanup
                    </NavLink>
                    <NavLink to="/admin/players" className={({ isActive }) => `admin-nav-item ${isActive ? 'active' : ''}`}>
                        Player List (V2)
                    </NavLink>
                </nav>
            </aside>
            <main className="admin-content">
                <Routes>
                    <Route path="/" element={<Navigate to="team-mapping" replace />} />
                    <Route path="team-mapping" element={<TeamMapping />} />
                    <Route path="missing-info" element={<MissingInfo />} />
                    <Route path="import-players" element={<ImportPlayers />} />
                    <Route path="import-deep" element={<ImportLeagueDeep />} />
                    <Route path="import-by-club" element={<ImportClubPlayers />} />
                    <Route path="competitions" element={<CompetitionManager />} />
                    <Route path="fix-club-countries" element={<FixClubCountries />} />
                    <Route path="cleanup" element={<DataCleanup />} />
                    <Route path="players" element={<PlayerList />} />
                    <Route path="players/:id" element={<PlayerDetail />} />
                </Routes>
            </main>
        </div>
    );
};

export default AdminLayout;
