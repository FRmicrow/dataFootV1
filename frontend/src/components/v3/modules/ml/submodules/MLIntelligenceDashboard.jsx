import React, { useState, useEffect } from 'react';
import { Stack, Grid, MetricCard, Card, Badge, Button } from '../../../../../design-system';
import api from '../../../../../services/api';
import MLPulse from './MLPulse';
import ModelDossier from './ModelDossier';
import ClubPerformanceMatrix from './ClubPerformanceMatrix';
import PredictionTimeline from './PredictionTimeline';

const MLIntelligenceDashboard = () => {
    const [stats, setStats] = useState({ hit_rate: 0, brier: 0, coverage: 0 });
    const [loading, setLoading] = useState(true);
    const [activeView, setActiveView] = useState('overview'); // 'overview', 'models', 'clubs', 'timeline'

    useEffect(() => {
        const fetchGlobalStats = async () => {
            try {
                const res = await api.getMLSimulationOverview();
                const overview = res || [];
                const avgHit = overview.reduce((acc, curr) => acc + (curr.global_hit_rate || 0), 0) / (overview.length || 1);
                const avgBrier = overview.reduce((acc, curr) => acc + (curr.brier_score || 0), 0) / (overview.length || 1);
                setStats({ hit_rate: avgHit, brier: avgBrier, coverage: overview.length });
            } catch (err) {
                console.error("Global stats fetch failed", err);
            } finally {
                setLoading(false);
            }
        };
        fetchGlobalStats();
    }, []);

    return (
        <Stack gap="xl">
            {/* Top Intelligence KPIs */}
            <Grid columns="repeat(3, 1fr)" gap="lg">
                <MetricCard
                    label="Algorithmic Confidence"
                    value={`${(stats.hit_rate * 100).toFixed(1)}%`}
                    subValue="Mean accuracy across verified markets"
                    variant="primary"
                    icon="🧠"
                />
                <MetricCard
                    label="Logic Calibration"
                    value={stats.brier.toFixed(3)}
                    subValue="Brier Score (Confidence vs Outcome)"
                    icon="🎯"
                />
                <MetricCard
                    label="Predictive Coverage"
                    value={stats.coverage}
                    subValue="Active League/Season clusters"
                    icon="🌐"
                />
            </Grid>

            {/* View Selector Tabs */}
            <div className="ds-flex ds-gap-sm ds-p-xs ds-bg-neutral-900 ds-rounded-lg ds-border ds-border-neutral-800">
                <Button 
                    variant={activeView === 'overview' ? 'primary' : 'surface'} 
                    size="sm" 
                    onClick={() => setActiveView('overview')}
                >
                    Overview
                </Button>
                <Button 
                    variant={activeView === 'models' ? 'primary' : 'surface'} 
                    size="sm" 
                    onClick={() => setActiveView('models')}
                >
                    Model Dossier
                </Button>
                <Button 
                    variant={activeView === 'clubs' ? 'primary' : 'surface'} 
                    size="sm" 
                    onClick={() => setActiveView('clubs')}
                >
                    Club Matrix
                </Button>
                <Button 
                    variant={activeView === 'timeline' ? 'primary' : 'surface'} 
                    size="sm" 
                    onClick={() => setActiveView('timeline')}
                >
                    Prediction Timeline
                </Button>
            </div>

            {/* Dynamic Content */}
            {activeView === 'overview' && (
                <Stack gap="lg">
                    <MLPulse />
                    <Card title="Intelligence Feed" subtitle="Latest high-probability risk analysis from the orchestrator.">
                         <p className="ds-text-neutral-500 ds-p-md">Live feed is active and monitoring upcoming fixtures.</p>
                         {/* We can embed a simplified Table here or a custom component */}
                    </Card>
                </Stack>
            )}

            {activeView === 'models' && <ModelDossier />}
            {activeView === 'clubs' && <ClubPerformanceMatrix />}
            {activeView === 'timeline' && <PredictionTimeline />}
        </Stack>
    );
};

export default MLIntelligenceDashboard;
