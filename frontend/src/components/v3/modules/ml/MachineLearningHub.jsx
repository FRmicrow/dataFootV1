import React from 'react';
import { Routes, Route, NavLink, Navigate, useLocation } from 'react-router-dom';
import MLOrchestratorPage from './MLOrchestratorPage';
import MLSimulationDashboard from './MLSimulationDashboard';
import MLBetRecommendations from './MLBetRecommendations';
import MLOddsPage from './MLOddsPage';
import './MachineLearningHub.css';

const MachineLearningHub = () => {
    const location = useLocation();

    return (
        <div className="ml-hub-container ds-container">
            <header className="ml-hub-header">
                <div className="ds-flex ds-items-center ds-gap-md mb-md">
                    <span className="ds-text-4xl">🤖</span>
                    <div>
                        <h1 className="ds-text-heading-2 mb-xs">Machine Learning Hub</h1>
                        <p className="ds-text-body ds-text-neutral-400">
                            Predictive analytics, risk engine, and backtesting suite.
                        </p>
                    </div>
                </div>

                <div className="ds-tabs mt-lg">
                    <NavLink
                        to="/machine-learning/orchestrator"
                        className={({ isActive }) => `ds-tab ${isActive ? 'ds-tab--active' : ''}`}
                    >
                        <span>⚙️ Orchestrator & Risk Engine</span>
                    </NavLink>
                    <NavLink
                        to="/machine-learning/simulations"
                        className={({ isActive }) => `ds-tab ${isActive ? 'ds-tab--active' : ''}`}
                    >
                        <span>🧪 Simulations & Strategy</span>
                    </NavLink>
                    <NavLink
                        to="/machine-learning/betting"
                        className={({ isActive }) => `ds-tab ${isActive ? 'ds-tab--active' : ''}`}
                    >
                        <span>💰 Betting Hub</span>
                    </NavLink>
                    <NavLink
                        to="/machine-learning/odds"
                        className={({ isActive }) => `ds-tab ${isActive ? 'ds-tab--active' : ''}`}
                    >
                        <span>📊 Pre-Match Odds</span>
                    </NavLink>
                </div>
            </header>

            <main className="ml-hub-content mt-xl">
                <Routes>
                    <Route path="/" element={<Navigate to="orchestrator" replace />} />
                    <Route path="orchestrator" element={<MLOrchestratorPage />} />
                    <Route path="simulations" element={<MLSimulationDashboard />} />
                    <Route path="betting" element={<MLBetRecommendations />} />
                    <Route path="odds" element={<MLOddsPage />} />
                </Routes>
            </main>
        </div>
    );
};

export default MachineLearningHub;
