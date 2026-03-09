import React from 'react';
import { Routes, Route, NavLink, Navigate } from 'react-router-dom';
import MLOrchestratorPage from './MLOrchestratorPage';
import MLSimulationDashboard from './MLSimulationDashboard';
import MLBetRecommendations from './MLBetRecommendations';
import MLOddsPage from './MLOddsPage';
import './MachineLearningHub.css';

const MachineLearningHub = () => {

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

                <nav className="ml-control-bar mt-lg">
                    <NavLink
                        to="/machine-learning/orchestrator"
                        className={({ isActive }) => `ml-control-btn ${isActive ? 'active' : ''}`}
                    >
                        <span>⚙️</span> Orchestrator
                    </NavLink>
                    <NavLink
                        to="/machine-learning/simulations"
                        className={({ isActive }) => `ml-control-btn ${isActive ? 'active' : ''}`}
                    >
                        <span>🧪</span> Simulations
                    </NavLink>
                    <NavLink
                        to="/machine-learning/betting"
                        className={({ isActive }) => `ml-control-btn ${isActive ? 'active' : ''}`}
                    >
                        <span>💰</span> Betting Hub
                    </NavLink>
                    <NavLink
                        to="/machine-learning/odds"
                        className={({ isActive }) => `ml-control-btn ${isActive ? 'active' : ''}`}
                    >
                        <span>📊</span> Odds
                    </NavLink>
                </nav>
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
