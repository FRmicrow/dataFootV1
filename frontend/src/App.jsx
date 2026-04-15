import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import ImportMatrixPage from './components/v3/pages/import/ImportMatrixPage';
import ImportV3Page from './components/v3/pages/import/ImportV3Page';
import SeasonOverviewPage from './components/v3/pages/league/SeasonOverviewPage';
import V3Layout from './components/v3/layouts/V3Layout';
import V3Dashboard from './components/v3/pages/dashboard/V3Dashboard';
import V3LeaguesList from './components/v3/pages/league/V3LeaguesList';
import PlayerProfilePageV3 from './components/v3/pages/profile/PlayerProfilePageV3';
import SearchPageV3 from './components/v3/pages/search/SearchPageV3';
import ClubProfilePageV4 from './components/v4/pages/profile/ClubProfilePageV4';
import ContentStudioV3 from './components/v3/pages/studio/ContentStudioV3';
import ImportEventsPage from './components/v3/pages/import/ImportEventsPage';
import ImportLineupsPage from './components/v3/pages/import/ImportLineupsPage';
import MatchDetailPage from './components/v3/pages/match/MatchDetailPage';
import MachineLearningHub from './components/v3/modules/ml/MachineLearningHub';
import DesignSystemPage from './components/v3/pages/system/DesignSystemPage';
import SeasonOverviewPageV4 from './components/v4/pages/league/SeasonOverviewPageV4';
import V4LeaguesList from './components/v4/pages/league/V4LeaguesList';

import { ImportProvider } from './context/ImportContext.jsx';
import ErrorBoundary from './design-system/components/ErrorBoundary';
import './design-system/tokens.css';
import './App.css';

function App() {
    return (
        <ErrorBoundary>
        <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <ImportProvider>
                <div className="app">
                    <Routes>
                        {/* Redirect root to dashboard */}
                        <Route path="/" element={<Navigate to="/dashboard" replace />} />

                        {/* Main app routes using V3Layout */}
                        <Route element={<V3Layout />}>
                            <Route path="/dashboard" element={<V3Dashboard />} />
                            <Route path="/import" element={<ImportMatrixPage />} />
                            <Route path="/import/matrix-status" element={<ImportMatrixPage />} />
                            <Route path="/import/old" element={<ImportV3Page />} />
                            <Route path="/leagues" element={<V4LeaguesList />} />
                            <Route path="/leagues/:name/season/:year" element={<SeasonOverviewPageV4 />} />
                            {/* V3 league detail — kept for backwards compat (player/club links) */}
                            <Route path="/league/:id" element={<SeasonOverviewPage />} />
                            <Route path="/league/:id/season/:year" element={<SeasonOverviewPage />} />
                            <Route path="/player/:id" element={<PlayerProfilePageV3 />} />
                            <Route path="/search" element={<SearchPageV3 />} />
                            <Route path="/club/:name" element={<ClubProfilePageV4 />} />
                            <Route path="/studio" element={<ContentStudioV3 />} />
                            <Route path="/events" element={<ImportEventsPage />} />
                            <Route path="/lineups-import" element={<ImportLineupsPage />} />
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
        </ErrorBoundary>
    );
}

export default App;
