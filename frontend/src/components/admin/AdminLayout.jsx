import React from 'react';
import { NavLink, Routes, Route, Navigate } from 'react-router-dom';
import TeamMapping from './TeamMapping';
import MissingInfo from './MissingInfo';
import ImportClubPlayers from './ImportClubPlayers';
import ImportPlayers from './ImportPlayers';
import ImportLeagueDeep from './ImportLeagueDeep';
import CompetitionManager from './CompetitionManager';
import FixClubCountries from './FixClubCountries';
import FixCompetitionCountries from './FixCompetitionCountries';
import DataCleanup from './DataCleanup';
import PlayerStatsCleanup from './PlayerStatsCleanup';
import RepairPlayerData from './RepairPlayerData';
import ImportCompetitions from './ImportCompetitions';
import ImportClubs from './ImportClubs';
import ImportPlayersV2 from './ImportPlayersV2';
import './Admin.css';

const AdminLayout = () => {
    return (
        <div className="admin-layout">
            <aside className="admin-sidebar">
                <div className="admin-sidebar-header">
                    <h3>Admin Panel</h3>
                </div>
                <nav className="admin-nav">
                    <div className="admin-nav-section">
                        <div className="admin-nav-section-title">Global Changes</div>
                        <NavLink to="/admin/team-mapping" className={({ isActive }) => `admin-nav-item ${isActive ? 'active' : ''}`}>
                            Team Mapping
                        </NavLink>
                        <NavLink to="/admin/missing-info" className={({ isActive }) => `admin-nav-item ${isActive ? 'active' : ''}`}>
                            Missing Team Info
                        </NavLink>
                        <NavLink to="/admin/competitions" className={({ isActive }) => `admin-nav-item ${isActive ? 'active' : ''}`}>
                            Competition Manager
                        </NavLink>
                        <NavLink to="/admin/fix-club-countries" className={({ isActive }) => `admin-nav-item ${isActive ? 'active' : ''}`}>
                            Fix Club Countries
                        </NavLink>
                        <NavLink to="/admin/fix-competition-countries" className={({ isActive }) => `admin-nav-item ${isActive ? 'active' : ''}`}>
                            Fix Comp. Countries
                        </NavLink>
                        <NavLink to="/admin/cleanup-player-stats" className={({ isActive }) => `admin-nav-item ${isActive ? 'active' : ''}`}>
                            Cleanup Player Stats
                        </NavLink>
                        <NavLink to="/admin/repair-player-data" className={({ isActive }) => `admin-nav-item ${isActive ? 'active' : ''}`}>
                            Repair Player Data
                        </NavLink>
                    </div>

                    <div className="admin-nav-section">
                        <div className="admin-nav-section-title">Import</div>
                        <NavLink to="/admin/import-competitions" className={({ isActive }) => `admin-nav-item ${isActive ? 'active' : ''}`}>
                            Import Competitions (Range)
                        </NavLink>
                        <NavLink to="/admin/import-clubs" className={({ isActive }) => `admin-nav-item ${isActive ? 'active' : ''}`}>
                            Import Clubs (Range)
                        </NavLink>
                        <NavLink to="/admin/import-players-v2" className={({ isActive }) => `admin-nav-item ${isActive ? 'active' : ''}`}>
                            Import Players (V2 Optimized)
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
                    </div>
                </nav>
            </aside>
            <main className="admin-content">
                <Routes>
                    <Route path="/" element={<Navigate to="team-mapping" replace />} />
                    <Route path="team-mapping" element={<TeamMapping />} />
                    <Route path="missing-info" element={<MissingInfo />} />
                    <Route path="import-competitions" element={<ImportCompetitions />} />
                    <Route path="import-clubs" element={<ImportClubs />} />
                    <Route path="import-players" element={<ImportPlayers />} />
                    <Route path="import-players-v2" element={<ImportPlayersV2 />} />
                    <Route path="import-deep" element={<ImportLeagueDeep />} />
                    <Route path="import-by-club" element={<ImportClubPlayers />} />
                    <Route path="competitions" element={<CompetitionManager />} />
                    <Route path="fix-competition-countries" element={<FixCompetitionCountries />} />
                    <Route path="fix-club-countries" element={<FixClubCountries />} />
                    <Route path="cleanup-player-stats" element={<PlayerStatsCleanup />} />
                    <Route path="repair-player-data" element={<RepairPlayerData />} />
                </Routes>
            </main>
        </div>
    );
};

export default AdminLayout;
