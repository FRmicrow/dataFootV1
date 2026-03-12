import React, { useMemo } from 'react';
import { Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { ControlBar, Tabs, Stack } from '../../../../design-system';
import MLOrchestratorPage from './MLOrchestratorPage';
import MLSimulationDashboard from './MLSimulationDashboard';
import MLIntelligenceDashboard from './submodules/MLIntelligenceDashboard';
import MLTestLab from './submodules/MLTestLab';
import MLBetRecommendations from './MLBetRecommendations';
import MLOddsPage from './MLOddsPage';
import MLModelFactory from './submodules/MLModelFactory';
import MLKnowledgeBase from './submodules/MLKnowledgeBase';

const MachineLearningHub = () => {
    const navigate = useNavigate();
    const location = useLocation();

    const navItems = [
        { id: 'intelligence', label: 'Intelligence', icon: '🧠' },
        { id: 'orchestrator', label: 'Orchestrator', icon: '⚙️' },
        { id: 'factory', label: 'Model Factory', icon: '⚒️' },
        { id: 'test-lab', label: 'Test Lab', icon: '🧪' },
        { id: 'performance', label: 'Performance', icon: '📊' },
        { id: 'betting', label: 'Betting Hub', icon: '💰' },
        { id: 'knowledge', label: 'Knowledge Base', icon: '📖' }
    ];

    const activeTab = useMemo(() => {
        const segments = location.pathname.split('/').filter(Boolean);
        const last = segments[segments.length - 1];
        const validIds = navItems.map(item => item.id);
        return validIds.includes(last) ? last : 'intelligence';
    }, [location]);

    const handleTabChange = (id) => {
        navigate(`/machine-learning/${id}`);
    };

    return (
        <div className="ml-hub-container ds-container">
            <header className="ml-hub-header ds-p-xl ds-mb-2xl">
                <Stack direction="row" gap="md" className="ds-items-center mb-lg">
                    <span className="ds-text-4xl">🤖</span>
                    <div>
                        <h1 className="ds-text-heading-2 mb-xs">Machine Learning Hub</h1>
                        <p className="ds-text-body ds-text-neutral-400">
                            Predictive analytics, risk engine, and backtesting suite.
                        </p>
                    </div>
                </Stack>

                <ControlBar
                    left={
                        <Tabs
                            items={navItems}
                            activeId={activeTab}
                            onChange={handleTabChange}
                            variant="pills"
                        />
                    }
                />
            </header>

            <main className="ml-hub-content mt-xl">
                <Routes>
                    <Route path="/" element={<Navigate to="intelligence" replace />} />
                    <Route path="intelligence" element={<MLIntelligenceDashboard />} />
                    <Route path="orchestrator" element={<MLOrchestratorPage />} />
                    <Route path="factory" element={<MLModelFactory />} />
                    <Route path="test-lab" element={<MLTestLab />} />
                    <Route path="performance" element={<MLSimulationDashboard />} />
                    <Route path="betting" element={<MLBetRecommendations />} />
                    <Route path="odds" element={<MLOddsPage />} />
                    <Route path="knowledge" element={<MLKnowledgeBase />} />
                </Routes>
            </main>
        </div>
    );
};

export default MachineLearningHub;
