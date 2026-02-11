import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, NavLink } from 'react-router-dom';
import LeagueManager from './components/LeagueManager';
import DatabasePage from './components/DatabasePage';
import PlayerDetail from './components/PlayerDetail';
import TeamDetail from './components/TeamDetail';
import PalmaresPage from './components/PalmaresPage';
import AdminLayout from './components/admin/AdminLayout';
import FootballDataPage from './components/FootballDataPage';
import ClubDetailPage from './components/ClubDetailPage';
import CompetitionPortal from './components/CompetitionPortal';
import ImportV3Page from './components/v3/ImportV3Page';
import SeasonOverviewPage from './components/v3/SeasonOverviewPage';
import V3Layout from './components/v3/V3Layout';
import V3Dashboard from './components/v3/V3Dashboard';
import V3LeaguesList from './components/v3/V3LeaguesList';
import PlayerProfilePageV3 from './components/v3/PlayerProfilePageV3';
import SearchPageV3 from './components/v3/SearchPageV3';
import ClubProfilePageV3 from './components/v3/ClubProfilePageV3';
import ContentStudioV3 from './components/v3/ContentStudioV3';
import './App.css';




function App() {
    return (
        <Router>
            <div className="app">
                <nav className="nav">
                    <div className="nav-content">
                        <div className="nav-title">⚽ Football Player Database</div>
                        <NavLink to="/import" className="nav-link">
                            League Manager
                        </NavLink>
                        <NavLink to="/football-data" className="nav-link">
                            Football Data
                        </NavLink>
                        <NavLink to="/palmares" className="nav-link">
                            Palmares
                        </NavLink>
                        <NavLink to="/admin" className="nav-link">
                            Administration
                        </NavLink>
                        <NavLink to="/v3/dashboard" className="nav-link v3-nav-btn">
                            🧪 V3 POC
                        </NavLink>
                    </div>
                </nav>

                <Routes>
                    <Route path="/" element={<FootballDataPage />} />
                    <Route path="/import" element={<LeagueManager />} />
                    <Route path="/database" element={<DatabasePage />} />
                    <Route path="/football-data" element={<FootballDataPage />} />
                    <Route path="/palmares" element={<PalmaresPage />} />
                    <Route path="/player/:id" element={<PlayerDetail />} />
                    <Route path="/team/:id" element={<TeamDetail />} />
                    <Route path="/club/:id" element={<ClubDetailPage />} />
                    <Route path="/competition/:id" element={<CompetitionPortal />} />
                    <Route path="/competition/:id/:year" element={<CompetitionPortal />} />
                    {/* V3 Experimental Section */}
                    <Route path="/v3" element={<V3Layout />}>
                        <Route path="dashboard" element={<V3Dashboard />} />
                        <Route path="import" element={<ImportV3Page />} />
                        <Route path="leagues" element={<V3LeaguesList />} />
                        <Route path="league/:id" element={<SeasonOverviewPage />} />
                        <Route path="league/:id/season/:year" element={<SeasonOverviewPage />} />
                        <Route path="player/:id" element={<PlayerProfilePageV3 />} />
                        <Route path="search" element={<SearchPageV3 />} />
                        <Route path="club/:id" element={<ClubProfilePageV3 />} />
                        <Route path="studio" element={<ContentStudioV3 />} />
                    </Route>

                    <Route path="/admin/*" element={<AdminLayout />} />
                </Routes>
            </div>
        </Router>
    );
}

export default App;
