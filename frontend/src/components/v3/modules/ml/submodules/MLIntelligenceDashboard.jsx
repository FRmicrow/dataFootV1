import React, { useState, useEffect } from 'react';
import { Stack, Grid, MetricCard, Card, Badge, Button, Table, Progress, ControlBar, Tabs } from '../../../../../design-system';
import api from '../../../../../services/api';
import MLPulse from './MLPulse';
import ModelDossier from './ModelDossier';
import ClubPerformanceMatrix from './ClubPerformanceMatrix';
import PredictionTimeline from './PredictionTimeline';

const IntelligenceFeed = () => {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.getMLUpcomingPredictions().then(res => {
            setData((res || []).slice(0, 5));
        }).finally(() => setLoading(false));
    }, []);

    const formatDateTime = (dateStr) => {
        const d = new Date(dateStr);
        const today = new Date();
        const tomorrow = new Date();
        tomorrow.setDate(today.getDate() + 1);

        const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        if (d.toDateString() === today.toDateString()) return `Today ${time}`;
        if (d.toDateString() === tomorrow.toDateString()) return `Tomorrow ${time}`;
        return d.toLocaleDateString([], { day: '2-digit', month: '2-digit' }) + ` ${time}`;
    };

    const columns = [
        { 
            title: 'Fixture', 
            dataIndex: 'home_team', 
            key: 'fixture', 
            render: (_, row) => (
                <Stack gap="none">
                    <span className="ds-text-sm ds-font-medium">{row.home_team} vs {row.away_team}</span>
                    <span className="ds-text-xs ds-text-dim">{formatDateTime(row.date)}</span>
                </Stack>
            )
        },
        { title: 'Market', dataIndex: 'market_type', key: 'market', render: (val) => <Badge variant="surface" size="sm">{val}</Badge> },
        { title: 'Confidence', dataIndex: 'ml_probability', key: 'prob', render: (val) => <span className="ds-font-bold ds-text-primary-400">{(val * 100).toFixed(1)}%</span> },
        { title: 'Edge', dataIndex: 'value_edge', key: 'edge', render: (val, row) => {
            const edge = row.edge || (row.bookmaker_odd ? ((row.bookmaker_odd / row.fair_odd) - 1) * 100 : 0);
            return <Badge variant={edge > 5 ? 'success' : 'neutral'} size="sm">+{ edge.toFixed(1) }%</Badge>
        }}
    ];

    return (
        <Table 
            columns={columns} 
            data={data} 
            loading={loading} 
            rowKey={(row) => `${row.fixture_id}-${row.market_type}`}
        />
    );
};

const MLIntelligenceDashboard = () => {
    const [stats, setStats] = useState({ 
        hit_rate: 0, brier: 0, 
        elite_hit_rate: 0, elite_brier: 0,
        coverage: 0 
    });
    const [loading, setLoading] = useState(true);
    const [activeView, setActiveView] = useState('overview');
    useEffect(() => {
        const fetchGlobalStats = async () => {
            try {
                const res = await api.getMLSimulationOverview();
                const overview = res || [];
                
                // Global stats
                const avgHit = overview.reduce((acc, curr) => acc + (curr.global_hit_rate || 0), 0) / (overview.length || 1);
                const avgBrier = overview.reduce((acc, curr) => acc + (curr.brier_score || 0), 0) / (overview.length || 1);
                
                // Elite Tier stats (Country importance Rank <= 3)
                const elite = overview.filter(l => l.country_importance_rank <= 3);
                const eliteHit = elite.length > 0 ? elite.reduce((acc, curr) => acc + (curr.global_hit_rate || 0), 0) / elite.length : 0;
                const eliteBrier = elite.length > 0 ? elite.reduce((acc, curr) => acc + (curr.brier_score || 0), 0) / elite.length : 0;

                setStats({ 
                    hit_rate: avgHit, 
                    brier: avgBrier, 
                    elite_hit_rate: eliteHit,
                    elite_brier: eliteBrier,
                    coverage: overview.length 
                });
            } catch (err) {
                console.error("Global stats fetch failed", err);
            } finally {
                setLoading(false);
            }
        };
        fetchGlobalStats();
    }, []);

    const tabs = [
        { id: 'overview', label: 'Overview' },
        { id: 'models', label: 'Model Dossier' },
        { id: 'clubs', label: 'Club Matrix' },
        { id: 'timeline', label: 'Prediction Timeline' }
    ];

    return (
        <Stack gap="xl">
            {/* Top Intelligence KPIs with Staggered Reveal */}
            <Stack gap="md">
                <span className="ds-text-xs ds-text-dim ds-uppercase ds-font-bold ds-tracking-widest">Elite Intelligence Cluster (Top Leagues)</span>
                <Grid columns="repeat(3, 1fr)" gap="lg">
                    {[
                        { label: 'Elite Accuracy', value: `${(stats.elite_hit_rate * 100).toFixed(1)}%`, sub: 'Top Tier Hit Rate', variant: 'featured', icon: '💎' },
                        { label: 'Elite Calibration', value: stats.elite_brier.toFixed(3), sub: 'Precise calibration', icon: '🎯' },
                        { label: 'Global Reach', value: stats.coverage, sub: 'Leagues analyzed', icon: '🌐' }
                    ].map((kpi, i) => (
                        <MetricCard
                            key={kpi.label}
                            label={kpi.label}
                            value={kpi.value}
                            subValue={kpi.sub}
                            variant={kpi.variant}
                            icon={kpi.icon}
                            className="ds-animate-reveal"
                            style={{ animationDelay: `${i * 100}ms` }}
                        />
                    ))}
                </Grid>
            </Stack>

            {/* View Selector using official Tabs component */}
            <div className="ds-animate-reveal" style={{ animationDelay: '300ms' }}>
                <ControlBar
                    left={
                        <Tabs 
                            items={tabs} 
                            activeId={activeView} 
                            onChange={setActiveView} 
                            variant="pills" 
                        />
                    }
                />
            </div>

            {/* Dynamic Content with Reveal */}
            <div key={activeView} className="ds-animate-reveal" style={{ animationDelay: '400ms' }}>
                {activeView === 'overview' && (
                    <Stack gap="lg">
                        <MLPulse />
                        
                        <Grid columns="1fr 1fr" gap="lg">
                            <Card title="Global Hit Rate Map" subtitle="Weighted average across all monitored clusters.">
                                <Stack gap="lg" className="ds-p-md">
                                    <div className="ds-flex ds-justify-between ds-items-center">
                                        <span className="ds-text-dim">Overall Backtest Precision</span>
                                        <span className="ds-font-bold ds-text-primary-400">{(stats.hit_rate * 100).toFixed(1)}%</span>
                                    </div>
                                    <Progress value={stats.hit_rate * 100} variant="primary" />
                                    
                                    <div className="ds-flex ds-justify-between ds-items-center">
                                        <span className="ds-text-dim">Brier Calibration Score</span>
                                        <span className="ds-font-mono">{stats.brier.toFixed(4)}</span>
                                    </div>
                                    <Progress value={(1 - stats.brier) * 100} variant="surface" />
                                </Stack>
                            </Card>

                            <Card title="Intelligence Feed" subtitle="Prioritized high-value picks from elite leagues.">
                                <IntelligenceFeed />
                            </Card>
                        </Grid>
                    </Stack>
                )}

                {activeView === 'models' && <ModelDossier />}
                {activeView === 'clubs' && <ClubPerformanceMatrix />}
                {activeView === 'timeline' && <PredictionTimeline />}
            </div>
        </Stack>
    );
};

export default MLIntelligenceDashboard;
