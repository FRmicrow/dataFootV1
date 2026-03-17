import React, { Suspense, lazy, useMemo } from 'react';
import { Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { Badge, Button, Card, ControlBar, Skeleton, Tabs } from '../../../../design-system';
import { PageLayout, PageHeader } from '../../layouts';
import './MachineLearningHub.css';

const MLModelCatalog = lazy(() => import('./MLModelCatalog'));
const MLPerformanceLab = lazy(() => import('./MLPerformanceLab'));
const MLForesightHub = lazy(() => import('./MLForesightHub'));
const MLSubModelBuilder = lazy(() => import('./MLSubModelBuilder'));
const MLGlossary = lazy(() => import('./MLGlossary'));
const MLOrchestratorPage = lazy(() => import('./MLOrchestratorPage'));
const MLSimulationAnalyticsPage = lazy(() => import('./MLSimulationAnalyticsPage'));
const MLMatchPremiumPage = lazy(() => import('./MLMatchPremiumPage'));
const MLErrorLabPage = lazy(() => import('./MLErrorLabPage'));
const MLLeaguePremiumPage = lazy(() => import('./MLLeaguePremiumPage'));

const navItems = [
    { id: 'models', label: 'Modèles' },
    { id: 'performance', label: 'Performance' },
    { id: 'foresight', label: 'Prévisions' },
    { id: 'orchestrator', label: 'Système' },
    { id: 'analytics', label: 'Analyse' },
    { id: 'match-premium', label: 'Match' },
    { id: 'error-lab', label: 'Erreurs' },
    { id: 'league-premium', label: 'Ligues' },
];

const secondaryItems = [
    { id: 'glossary', label: 'Glossaire' },
];

const MLHubRouteFallback = () => (
    <div className="ml-hub__fallback">
        <Card
            className="ml-hub__fallback-card"
            title="Chargement du module"
            subtitle="Le ML Hub charge la vue demandée à la demande pour réduire le bundle initial."
            extra={<Badge variant="primary" size="sm">Lazy</Badge>}
        >
            <div className="ml-hub__fallback-grid">
                <Skeleton height="72px" />
                <Skeleton height="72px" />
                <Skeleton height="240px" />
            </div>
        </Card>
    </div>
);

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
        <PageLayout className="animate-fade-in">
            <PageHeader
                title="ML Hub"
                subtitle="Pilotage des modèles · Validation des runs · Lecture métier des prédictions"
                badge={{ label: 'IA v3', variant: 'primary' }}
            />

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

            <div className="ml-hub__secondary">
                {secondaryItems.map((item) => (
                    <Button key={item.id} variant="ghost" size="sm" onClick={() => navigate(`/machine-learning/${item.id}`)}>
                        {item.label}
                    </Button>
                ))}
            </div>

            <div className="ml-hub__content">
                <Suspense fallback={<MLHubRouteFallback />}>
                    <Routes>
                        <Route path="/"            element={<Navigate to="models" replace />} />
                        <Route path="models"       element={<MLModelCatalog />} />
                        <Route path="performance"  element={<MLPerformanceLab />} />
                        <Route path="foresight"    element={<MLForesightHub />} />
                        <Route path="submodels"    element={<MLSubModelBuilder />} />
                        <Route path="glossary"     element={<MLGlossary />} />
                        <Route path="orchestrator" element={<MLOrchestratorPage />} />
                        <Route path="analytics"    element={<MLSimulationAnalyticsPage />} />
                        <Route path="match-premium" element={<MLMatchPremiumPage />} />
                        <Route path="error-lab"    element={<MLErrorLabPage />} />
                        <Route path="league-premium" element={<MLLeaguePremiumPage />} />
                        {/* Legacy redirects */}
                        <Route path="intelligence" element={<Navigate to="/machine-learning/models"    replace />} />
                        <Route path="factory"      element={<Navigate to="/machine-learning/models"    replace />} />
                        <Route path="test-lab"     element={<Navigate to="/machine-learning/foresight" replace />} />
                        <Route path="betting"      element={<Navigate to="/machine-learning/foresight" replace />} />
                        <Route path="knowledge"    element={<Navigate to="/machine-learning/glossary"  replace />} />
                        <Route path="odds"         element={<Navigate to="/machine-learning/foresight" replace />} />
                    </Routes>
                </Suspense>
            </div>
        </PageLayout>
    );
};

export default MachineLearningHub;
