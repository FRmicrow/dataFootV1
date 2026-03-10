import React, { useState, useEffect } from 'react';
import api from '../../../../services/api';
import { useNavigate } from 'react-router-dom';
import {
    Card, Grid, Stack, Badge, Button,
    Progress, MetricCard, MetricCardSkeleton, CardSkeleton, Skeleton
} from '../../../../design-system';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend, AreaChart, Area
} from 'recharts';
import './V3Dashboard.css';

const COLORS = ['#8b5cf6', '#a855f7', '#ec4899', '#f59e0b', '#10b981', '#06b6d4', '#3b82f6'];

const V3Dashboard = () => {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const data = await api.getStats();
                setStats(data);
            } catch (error) {
                console.error("Failed to load V3 stats", error);
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
    }, []);

    if (loading || !stats) return (
        <div className="v3-dashboard-content">
            <header className="v3-header mb-xl">
                <Skeleton width="200px" height="40px" style={{ marginBottom: '12px' }} />
                <Skeleton width="300px" height="20px" />
            </header>
            <Grid columns="repeat(auto-fit, minmax(240px, 1fr))" gap="var(--spacing-md)" style={{ marginBottom: 'var(--spacing-xl)' }}>
                {Array.from({ length: 4 }).map((_, i) => <MetricCardSkeleton key={`skeleton-metric-${i}`} />)}
            </Grid>
            <Grid columns="repeat(2, 1fr)" gap="var(--spacing-lg)">
                <CardSkeleton />
                <CardSkeleton />
            </Grid>
        </div>
    );

    const { volumetrics, health_summary, players_by_country, distribution, fixture_trends } = stats;

    const getHealthVariant = (score) => {
        if (score > 80) return 'success';
        if (score > 50) return 'warning';
        return 'danger';
    };

    return (
        <div className="v3-dashboard-content animate-fade-in">
            {/* 1. Intelligence Header */}
            <header className="v3-header mb-xl">
                <Stack direction="row" justify="space-between" align="center">
                    <div className="header-meta">
                        <Badge variant="primary" className="mb-xs">OPERATIONAL COMMAND</Badge>
                        <h1 className="v3-header__title">Intelligence Hub</h1>
                        <p className="v3-header__subtitle">Real-time surveillance of the professional scouting ecosystem</p>
                    </div>

                    <Stack direction="row" gap="var(--spacing-lg)" className="v3-header__progress-row">

                        <Progress
                            label="Data Coverage"
                            value={health_summary.coverage_percent}
                            showLabel
                            className="flex-1"
                        />
                        <Progress
                            label="System Health"
                            value={health_summary.score}
                            variant={getHealthVariant(health_summary.score)}
                            showLabel
                            className="flex-1"
                        />
                    </Stack>
                </Stack>
            </header>

            {/* 2. Volumetrics Grid */}
            <Grid columns="repeat(auto-fit, minmax(240px, 1fr))" gap="var(--spacing-md)" className="mb-xl">
                <MetricCard label="Leagues" value={volumetrics.total_leagues} subValue="Live monitoring enabled" />
                <MetricCard label="Clubs" value={volumetrics.total_clubs} subValue="Across 55+ countries" />
                <MetricCard
                    label="Players"
                    value={volumetrics.total_players.toLocaleString()}
                    subValue="Verified profiles"
                    variant="featured"
                />
                <MetricCard label="Fixtures" value={volumetrics.total_fixtures.toLocaleString()} subValue="Event coverage" />
            </Grid>

            {/* 3. Visual Intelligence Layer */}
            <Grid columns="repeat(2, 1fr)" gap="var(--spacing-lg)" className="mb-xl">
                <Card title="Nationality Distribution" subtitle="Top talent producing countries">
                    <div className="v3-chart-container">
                        <ResponsiveContainer>
                            <BarChart data={players_by_country} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'var(--color-text-dim)', fontSize: 10 }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--color-text-dim)', fontSize: 10 }} />
                                <Tooltip
                                    contentStyle={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', backdropFilter: 'var(--glass-blur)' }}
                                    itemStyle={{ color: '#fff' }}
                                    cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                                />
                                <Bar dataKey="count" fill="var(--color-primary-600)" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </Card>

                <Card title="Continental Scope" subtitle="Global distribution of scouted entities">
                    <div className="v3-chart-container">
                        <ResponsiveContainer>
                            <PieChart>
                                <Pie
                                    data={distribution}
                                    dataKey="count"
                                    nameKey="continent"
                                    cx="50%"
                                    cy="45%"
                                    innerRadius={70}
                                    outerRadius={90}
                                    paddingAngle={8}
                                >
                                    {distribution?.map((entry) => (
                                        <Cell key={`cell-${entry.continent}`} fill={COLORS[distribution.indexOf(entry) % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', backdropFilter: 'var(--glass-blur)' }}
                                />
                                <Legend verticalAlign="bottom" align="center" iconType="circle" />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </Card>

                <div className="v3-chart-span-full">
                    <Card title="Sync Acceleration" subtitle="Historical ingestion performance">
                        <div className="v3-chart-container--sm">
                            <ResponsiveContainer>
                                <AreaChart data={fixture_trends} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorFixtures" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="var(--color-primary-500)" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="var(--color-primary-500)" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                    <XAxis dataKey="year" axisLine={false} tickLine={false} tick={{ fill: 'var(--color-text-dim)', fontSize: 10 }} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--color-text-dim)', fontSize: 10 }} />
                                    <Tooltip
                                        contentStyle={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', backdropFilter: 'var(--glass-blur)' }}
                                    />
                                    <Area type="monotone" dataKey="count" stroke="var(--color-primary-500)" strokeWidth={3} fillOpacity={1} fill="url(#colorFixtures)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </Card>
                </div>
            </Grid>

            {/* 4. Operational Grid */}
            <Grid columns="2fr 1fr" gap="var(--spacing-lg)">
                <Card title="Registry Operations" subtitle="Management of core entities">
                    <Stack gap="var(--spacing-sm)">
                        {[
                            { title: 'Data Acquisition', desc: 'Initialize new competitive seasons', path: '/import' },
                            { title: 'Scout Explorer', desc: 'Browse hierarchies and entity analysis', path: '/leagues' },
                            { title: 'Integrity Matrix', desc: 'Resolve orphan dependencies', path: '/import/matrix-status' }
                        ].map((action) => (
                            <button
                                key={action.path}
                                className="action-row ds-button-reset"
                                onClick={() => navigate(action.path)}
                                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') navigate(action.path); }}
                                aria-label={action.title}
                            >
                                <div className="action-row__content">
                                    <h4 className="action-row__title">{action.title}</h4>
                                    <p className="action-row__desc">{action.desc}</p>
                                </div>
                                <div className="action-arrow">→</div>
                            </button>
                        ))}
                    </Stack>
                </Card>

                <Card title="Integrity Score" subtitle="System health markers">
                    <Stack gap="var(--spacing-md)">
                        <Grid columns="1fr auto" align="center" className="v3-integrity-row">
                            <span className="v3-integrity-label">Orphaned Profiles</span>
                            <Badge variant={health_summary.orphans > 0 ? 'danger' : 'success'}>{health_summary.orphans}</Badge>
                        </Grid>
                        <Grid columns="1fr auto" align="center" className="v3-integrity-row">
                            <span className="v3-integrity-label">Partial Seasons</span>
                            <Badge variant={health_summary.partial_seasons > 0 ? 'warning' : 'success'}>{health_summary.partial_seasons}</Badge>
                        </Grid>
                        <Grid columns="1fr auto" align="center" className="v3-integrity-row--last">
                            <span className="v3-integrity-label">Legacy Modules</span>
                            <span className="v3-integrity-value">{volumetrics.imported_seasons}</span>
                        </Grid>
                        <Button variant="secondary" onClick={() => navigate('/import/matrix-status')}>Full Audit Report</Button>
                    </Stack>
                </Card>
            </Grid>
        </div>
    );
};

export default V3Dashboard;
