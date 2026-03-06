import React from 'react';
import { Routes, Route, NavLink, Navigate } from 'react-router-dom';
import { Stack, Grid, MetricCard, Card, Badge } from '../../../../design-system';
import MLDashboard from './submodules/MLDashboard';
import MLLeaderboard from './submodules/MLLeaderboard';
import MLTestLab from './submodules/MLTestLab';
import MLModelFactory from './submodules/MLModelFactory';
import './MachineLearningHubV29.css';

const MachineLearningHubV29 = () => {
    return (
        <Stack gap="xl" className="ml-hub-v29 ds-container">
            <header className="ml-hub-header">
                <Stack gap="lg">
                    <div className="ds-flex ds-justify-between ds-items-center">
                        <div className="ds-flex ds-items-center ds-gap-md">
                            <div className="ml-glow-icon">🤖</div>
                            <Stack gap="none">
                                <h1 className="ds-text-heading-1 ds-text-gradient">ML Command Center</h1>
                                <span className="ds-text-body ds-text-neutral-400">Advanced Predictive Intelligence & Model Governance</span>
                            </Stack>
                        </div>
                        <div className="ml-live-pulse">
                            <Badge variant="primary" pulse>Live Pulse Active</Badge>
                        </div>
                    </div>

                    <div className="ml-v29-nav">
                        <NavLink to="/machine-learning/dashboard" className={({ isActive }) => `ml-nav-link ${isActive ? 'active' : ''}`}>
                            <span>🏠</span> Overview
                        </NavLink>
                        <NavLink to="/machine-learning/leaderboard" className={({ isActive }) => `ml-nav-link ${isActive ? 'active' : ''}`}>
                            <span>🏆</span> Leaderboard
                        </NavLink>
                        <NavLink to="/machine-learning/test-lab" className={({ isActive }) => `ml-nav-link ${isActive ? 'active' : ''}`}>
                            <span>🧪</span> Test Lab
                        </NavLink>
                        <NavLink to="/machine-learning/factory" className={({ isActive }) => `ml-nav-link ${isActive ? 'active' : ''}`}>
                            <span>🔨</span> Model Factory
                        </NavLink>
                    </div>
                </Stack>
            </header>

            <main className="ml-hub-content">
                <Routes>
                    <Route path="/" element={<Navigate to="dashboard" replace />} />
                    <Route path="dashboard" element={<MLDashboard />} />
                    <Route path="leaderboard" element={<MLLeaderboard />} />
                    <Route path="test-lab" element={<MLTestLab />} />
                    <Route path="factory" element={<MLModelFactory />} />
                </Routes>
            </main>
        </Stack>

    );
};

export default MachineLearningHubV29;
