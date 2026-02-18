import React from 'react';
import { BrowserRouter as Router, Routes, Route, NavLink, Navigate } from 'react-router-dom';
import ImportV3Page from './components/v3/ImportV3Page';
import SeasonOverviewPage from './components/v3/SeasonOverviewPage';
import V3Layout from './components/v3/V3Layout';
import V3Dashboard from './components/v3/V3Dashboard';
import V3LeaguesList from './components/v3/V3LeaguesList';
import PlayerProfilePageV3 from './components/v3/PlayerProfilePageV3';
import SearchPageV3 from './components/v3/SearchPageV3';
import ClubProfilePageV3 from './components/v3/ClubProfilePageV3';
import ContentStudioV3 from './components/v3/ContentStudioV3';
import HealthCheckPage from './components/v3/HealthCheckPage';
import ImportTrophiesPage from './components/v3/ImportTrophiesPage';
import ImportEventsPage from './components/v3/ImportEventsPage';
import ImportLineupsPage from './components/v3/ImportLineupsPage';
import BettingLabsPage from './components/v3/BettingLabsPage';
import MatchDetailPage from './components/v3/MatchDetailPage';
import './App.css';

function App() {
    return (
        <Router>
            <div className="app">
                <nav className="nav">
                    <div className="nav-content">
                        <div className="nav-title">⚽ StatFoot</div>
                        <NavLink to="/dashboard" className="nav-link">
                            Dashboard
                        </NavLink>
                        <NavLink to="/leagues" className="nav-link">
                            Leagues
                        </NavLink>
                        <NavLink to="/search" className="nav-link">
                            Search
                        </NavLink>
                        <NavLink to="/studio" className="nav-link">
                            Studio
                        </NavLink>
                        <NavLink to="/import" className="nav-link">
                            Import
                        </NavLink>
                        <NavLink to="/betting-labs" className="nav-link">
                            Betting Labs
                        </NavLink>
                        <NavLink to="/health" className="nav-link">
                            Health
                        </NavLink>
                    </div>
                </nav>

                <Routes>
                    {/* Redirect root to dashboard */}
                    <Route path="/" element={<Navigate to="/dashboard" replace />} />

                    {/* Main app routes using V3Layout */}
                    <Route element={<V3Layout />}>
                        <Route path="/dashboard" element={<V3Dashboard />} />
                        <Route path="/import" element={<ImportV3Page />} />
                        <Route path="/leagues" element={<V3LeaguesList />} />
                        <Route path="/league/:id" element={<SeasonOverviewPage />} />
                        <Route path="/league/:id/season/:year" element={<SeasonOverviewPage />} />
                        <Route path="/player/:id" element={<PlayerProfilePageV3 />} />
                        <Route path="/search" element={<SearchPageV3 />} />
                        <Route path="/club/:id" element={<ClubProfilePageV3 />} />
                        <Route path="/studio" element={<ContentStudioV3 />} />
                        <Route path="/health" element={<HealthCheckPage />} />
                        <Route path="/trophies" element={<ImportTrophiesPage />} />
                        <Route path="/events" element={<ImportEventsPage />} />
                        <Route path="/lineups-import" element={<ImportLineupsPage />} />
                        <Route path="/betting-labs" element={<BettingLabsPage />} />
                        <Route path="/match/:id" element={<MatchDetailPage />} />
                    </Route>

                    {/* Legacy V3 path redirects */}
                    <Route path="/v3/*" element={<Navigate to="/dashboard" replace />} />
                </Routes>
            </div>
        </Router>
    );
}

export default App;
