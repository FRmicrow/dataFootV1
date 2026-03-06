import React from 'react';
import { BrowserRouter as Router, Routes, Route, NavLink, Navigate } from 'react-router-dom';
import ImportMatrixPage from './components/v3/pages/import/ImportMatrixPage';
import ImportV3Page from './components/v3/pages/import/ImportV3Page';
import SeasonOverviewPage from './components/v3/pages/league/SeasonOverviewPage';
import V3Layout from './components/v3/layouts/V3Layout';
import V3Dashboard from './components/v3/pages/dashboard/V3Dashboard';
import V3LeaguesList from './components/v3/pages/league/V3LeaguesList';
import PlayerProfilePageV3 from './components/v3/pages/profile/PlayerProfilePageV3';
import SearchPageV3 from './components/v3/pages/search/SearchPageV3';
import ClubProfilePageV3 from './components/v3/pages/profile/ClubProfilePageV3';
import ContentStudioV3 from './components/v3/pages/studio/ContentStudioV3';
import HealthCenterPage from './components/v3/pages/system/HealthCenterPage';
import ImportTrophiesPage from './components/v3/pages/import/ImportTrophiesPage';
import ImportEventsPage from './components/v3/pages/import/ImportEventsPage';
import ImportLineupsPage from './components/v3/pages/import/ImportLineupsPage';
import MatchDetailPage from './components/v3/pages/match/MatchDetailPage';
import MachineLearningHub from './components/v3/modules/ml/MachineLearningHubV29';
import DesignSystemPage from './components/v3/pages/system/DesignSystemPage';

// New features from main integrated into V3 architecture
import LiveBetHub from './components/v3/pages/match/live/LiveBetHub';
import LiveBetDashboard from './components/v3/pages/match/live/LiveBetDashboard';
import LiveBetMatchDetails from './components/v3/pages/match/live/LiveBetMatchDetails';
import MonitoringConsole from './components/v3/pages/match/live/MonitoringConsole';
import SimulationDashboard from './components/v3/pages/match/live/SimulationDashboard';
import ForgeLaboratory from './components/v3/pages/system/ForgeLaboratory';
import { ImportProvider } from './context/ImportContext.jsx';
import { Navbar } from './design-system';
import './design-system/tokens.css';
import './App.css';

function App() {
    return (
        <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <ImportProvider>
                <div className="app">
                    <Navbar />

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
                            <Route path="/forge/lab" element={<ForgeLaboratory />} />
                            <Route path="/health" element={<HealthCenterPage />} />
                            <Route path="/trophies" element={<ImportTrophiesPage />} />
                            <Route path="/events" element={<ImportEventsPage />} />
                            <Route path="/lineups-import" element={<ImportLineupsPage />} />
                            <Route path="/live-bet" element={<LiveBetHub />} />
                            <Route path="/live-bet/board" element={<LiveBetDashboard />} />
                            <Route path="/live-bet/monitoring" element={<MonitoringConsole />} />
                            <Route path="/live-bet/match/:id" element={<LiveBetMatchDetails />} />
                            <Route path="/live-bet/alpha" element={<SimulationDashboard />} />
                            <Route path="/match/:id" element={<MatchDetailPage />} />
                            <Route path="/machine-learning/*" element={<MachineLearningHub />} />
                            <Route path="/design" element={<DesignSystemPage />} />
                        </Route >

                        {/* Legacy V3 path redirects */}
                        < Route path="/v3/*" element={< Navigate to="/dashboard" replace />} />
                    </Routes >
                </div >
            </ImportProvider >
        </Router >
    );
}

export default App;
