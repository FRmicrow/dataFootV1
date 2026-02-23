import React from 'react';
import { BrowserRouter as Router, Routes, Route, NavLink, Navigate } from 'react-router-dom';
import ImportMatrixPage from './components/v3/ImportMatrixPage';
import ImportV3Page from './components/v3/ImportV3Page';
import SeasonOverviewPage from './components/v3/SeasonOverviewPage';
import V3Layout from './components/v3/V3Layout';
import V3Dashboard from './components/v3/V3Dashboard';
import V3LeaguesList from './components/v3/V3LeaguesList';
import PlayerProfilePageV3 from './components/v3/PlayerProfilePageV3';
import SearchPageV3 from './components/v3/SearchPageV3';
import ClubProfilePageV3 from './components/v3/ClubProfilePageV3';
import ContentStudioV3 from './components/v3/ContentStudioV3';
import HealthCenterPage from './components/v3/HealthCenterPage';
import ImportTrophiesPage from './components/v3/ImportTrophiesPage';
import ImportEventsPage from './components/v3/ImportEventsPage';
import ImportLineupsPage from './components/v3/ImportLineupsPage';
import MatchDetailPage from './components/v3/MatchDetailPage';
import LiveBetHub from './components/v3/live-bet/LiveBetHub';
import LiveBetDashboard from './components/v3/live-bet/LiveBetDashboard';
import LiveBetMatchDetails from './components/v3/live-bet/LiveBetMatchDetails';
import MonitoringConsole from './components/v3/live-bet/MonitoringConsole';
import TelemetryConsole from './components/v3/TelemetryConsole';
import { ImportProvider } from './context/ImportContext.jsx';
import './App.css';

function App() {
    return (
        <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <ImportProvider>
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
                            <NavLink to="/live-bet" className="nav-link" style={{ color: '#f59e0b', fontWeight: 'bold' }}>
                                🔥 Live Bet
                            </NavLink>
                            <NavLink to="/health" className="nav-link" style={{ color: '#10b981' }}>
                                🛡️ Health
                            </NavLink>
                        </div>
                    </nav>

                    <Routes>
                        {/* Redirect root to dashboard */}
                        <Route path="/" element={<Navigate to="/dashboard" replace />} />

                        {/* Main app routes using V3Layout */}
                        <Route element={<V3Layout />}>
                            <Route path="/dashboard" element={<V3Dashboard />} />
                            <Route path="/import" element={<ImportMatrixPage />} />
                            <Route path="/import/matrix-status" element={<ImportMatrixPage />} />
                            <Route path="/import/old" element={<ImportV3Page />} />
                            <Route path="/leagues" element={<V3LeaguesList />} />
                            <Route path="/league/:id" element={<SeasonOverviewPage />} />
                            <Route path="/league/:id/season/:year" element={<SeasonOverviewPage />} />
                            <Route path="/player/:id" element={<PlayerProfilePageV3 />} />
                            <Route path="/search" element={<SearchPageV3 />} />
                            <Route path="/club/:id" element={<ClubProfilePageV3 />} />
                            <Route path="/studio" element={<ContentStudioV3 />} />
                            <Route path="/health" element={<HealthCenterPage />} />
                            <Route path="/trophies" element={<ImportTrophiesPage />} />
                            <Route path="/events" element={<ImportEventsPage />} />
                            <Route path="/lineups-import" element={<ImportLineupsPage />} />
                            <Route path="/live-bet" element={<LiveBetHub />} />
                            <Route path="/live-bet/board" element={<LiveBetDashboard />} />
                            <Route path="/live-bet/monitoring" element={<MonitoringConsole />} />
                            <Route path="/live-bet/match/:id" element={<LiveBetMatchDetails />} />
                            <Route path="/match/:id" element={<MatchDetailPage />} />
                        </Route>

                        {/* Legacy V3 path redirects */}
                        <Route path="/v3/*" element={<Navigate to="/dashboard" replace />} />
                    </Routes>
                    <TelemetryConsole />
                </div>
            </ImportProvider>
        </Router>
    );
}

export default App;
