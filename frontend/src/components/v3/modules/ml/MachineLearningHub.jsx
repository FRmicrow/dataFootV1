import React, { Suspense, lazy, useMemo } from 'react';
import { Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { Badge, Button, Card, ControlBar, Skeleton, Tabs } from '../../../../design-system';
import { PageLayout, PageHeader } from '../../layouts';
import './MachineLearningHub.css';

const MLModelCatalog = lazy(() => import('./MLModelCatalog'));
const MLPerformanceAnalyticsPage = lazy(() => import('./MLPerformanceAnalyticsPage'));
const MLForesightHub = lazy(() => import('./MLForesightHub'));
const MLSubModelBuilder = lazy(() => import('./MLSubModelBuilder'));
const MLGlossary = lazy(() => import('./MLGlossary'));
const MLOrchestratorPage = lazy(() => import('./MLOrchestratorPage'));
const MLPremiumIntelPage = lazy(() => import('./MLPremiumIntelPage'));

const navItems = [
    { id: 'models', label: 'Modèles' },
    { id: 'foresight', label: 'Prévisions' },
    { id: 'performance', label: 'Performance' },
    { id: 'premium', label: 'Premium Intel' },
    { id: 'orchestrator', label: 'Système' },
];

const secondaryItems = [
    { id: 'submodels', label: 'Sub-modèles' },
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

    const handleSecondaryNav = (id) => navigate(`/machine-learning/${id}`);

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
                    <Button key={item.id} variant="ghost" size="sm" onClick={() => handleSecondaryNav(item.id)}>
                        {item.label}
                    </Button>
                ))}
            </div>

            <div className="ml-hub__content">
                <Suspense fallback={<MLHubRouteFallback />}>
                    <Routes>
                        <Route path="/"            element={<Navigate to="models" replace />} />
                        <Route path="models"       element={<MLModelCatalog />} />
                        <Route path="foresight"    element={<MLForesightHub />} />
                        <Route path="performance"  element={<MLPerformanceAnalyticsPage />} />
                        <Route path="premium"      element={<MLPremiumIntelPage />} />
                        <Route path="orchestrator" element={<MLOrchestratorPage />} />
                        <Route path="submodels"    element={<MLSubModelBuilder />} />
                        <Route path="glossary"     element={<MLGlossary />} />
                        {/* Legacy redirects — V36bis consolidation */}
                        <Route path="analytics"      element={<Navigate to="/machine-learning/performance" replace />} />
                        <Route path="error-lab"      element={<Navigate to="/machine-learning/performance" replace />} />
                        <Route path="match-premium"  element={<Navigate to="/machine-learning/premium" replace />} />
                        <Route path="league-premium" element={<Navigate to="/machine-learning/premium" replace />} />
                        {/* Legacy redirects — pre-V36 */}
                        <Route path="intelligence" element={<Navigate to="/machine-learning/models"       replace />} />
                        <Route path="factory"      element={<Navigate to="/machine-learning/models"       replace />} />
                        <Route path="test-lab"     element={<Navigate to="/machine-learning/foresight"    replace />} />
                        <Route path="betting"      element={<Navigate to="/machine-learning/foresight"    replace />} />
                        <Route path="knowledge"    element={<Navigate to="/machine-learning/glossary"     replace />} />
                        <Route path="odds"         element={<Navigate to="/machine-learning/foresight"    replace />} />
                        <Route path="system"       element={<Navigate to="/machine-learning/orchestrator" replace />} />
                        <Route path="analyse"      element={<Navigate to="/machine-learning/performance"  replace />} />
                        <Route path="match"        element={<Navigate to="/machine-learning/premium"      replace />} />
                        <Route path="erreurs"      element={<Navigate to="/machine-learning/performance"  replace />} />
                        <Route path="ligues"       element={<Navigate to="/machine-learning/premium"      replace />} />
                        <Route path="*"            element={<Navigate to="/machine-learning/models"       replace />} />
                    </Routes>
                </Suspense>
            </div>
        </PageLayout>
    );
};

export default MachineLearningHub;
