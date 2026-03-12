import React, { useMemo } from 'react';
import { Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { ControlBar, Tabs, Stack } from '../../../../design-system';
import MLModelCatalog from './MLModelCatalog';
import MLPerformanceLab from './MLPerformanceLab';
import MLForesightHub from './MLForesightHub';
import MLSubModelBuilder from './MLSubModelBuilder';
import MLGlossary from './MLGlossary';
import MLOrchestratorPage from './MLOrchestratorPage';
import './MachineLearningHub.css';

const navItems = [
    { id: 'models',       label: 'Modèles',     icon: '🔬' },
    { id: 'performance',  label: 'Performance',  icon: '📊' },
    { id: 'foresight',    label: 'Prévisions',   icon: '🔭' },
    { id: 'submodels',    label: 'Sub-Models',   icon: '🧬' },
    { id: 'glossary',     label: 'Glossaire',    icon: '📖' },
    { id: 'orchestrator', label: 'Système',      icon: '⚙️' },
];

const MachineLearningHub = () => {
    const navigate = useNavigate();
    const location = useLocation();

    const activeTab = useMemo(() => {
        const segments = location.pathname.split('/').filter(Boolean);
        const last = segments[segments.length - 1];
        return navItems.some(item => item.id === last) ? last : 'models';
    }, [location]);

    const handleTabChange = (id) => navigate(`/machine-learning/${id}`);

    return (
        <div className="ml-hub ds-container">
            <header className="ml-hub__header ds-p-xl ds-mb-2xl">
                <Stack direction="row" gap="md" className="ds-items-center mb-lg">
                    <span className="ml-hub__icon">⚡</span>
                    <div>
                        <h1 className="ml-hub__title">Intelligence Hub</h1>
                        <p className="ml-hub__subtitle">Modèles prédictifs · Performance · Analyse de valeur</p>
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

            <main className="ml-hub__content">
                <Routes>
                    <Route path="/" element={<Navigate to="models" replace />} />
                    <Route path="models"       element={<MLModelCatalog />} />
                    <Route path="performance"  element={<MLPerformanceLab />} />
                    <Route path="foresight"    element={<MLForesightHub />} />
                    <Route path="submodels"    element={<MLSubModelBuilder />} />
                    <Route path="glossary"     element={<MLGlossary />} />
                    <Route path="orchestrator" element={<MLOrchestratorPage />} />
                    {/* Legacy redirects */}
                    <Route path="intelligence" element={<Navigate to="/machine-learning/models" replace />} />
                    <Route path="factory"      element={<Navigate to="/machine-learning/models" replace />} />
                    <Route path="test-lab"     element={<Navigate to="/machine-learning/foresight" replace />} />
                    <Route path="betting"      element={<Navigate to="/machine-learning/foresight" replace />} />
                    <Route path="knowledge"    element={<Navigate to="/machine-learning/glossary" replace />} />
                    <Route path="odds"         element={<Navigate to="/machine-learning/foresight" replace />} />
                </Routes>
            </main>
        </div>
    );
};

export default MachineLearningHub;
