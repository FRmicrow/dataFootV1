import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useNavigate } from 'react-router-dom';
import { Card, Grid, Stack, Badge, Button } from '../../design-system';
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
        <div className="v3-dashboard-page loading">
            <div className="ds-button-spinner"></div>
            <p>Initializing Intelligence Hub...</p>
        </div>
    );

    const { volumetrics, health_summary, players_by_country, distribution, fixture_trends } = stats;

    return (
        <div className="v3-dashboard-content animate-fade-in">
            {/* 1. Intelligence Header */}
            <header className="v3-header">
                <Stack direction="row" justify="space-between" align="flex-end" className="header-container">
                    <div className="header-meta">
                        <Badge variant="primary" size="md">OPERATIONAL COMMAND</Badge>
                        <h1 className="hub-title">Intelligence Hub</h1>
                        <p className="hub-subtitle">Real-time surveillance of the professional scouting ecosystem</p>
                    </div>

                    <div className="kpi-bars">
                        {/* Coverage KPI */}
                        <div className="kpi-item">
                            <div className="kpi-label">
                                <span>Data Coverage</span>
                                <span className="kpi-val">{health_summary.coverage_percent}%</span>
                            </div>
                            <div className="kpi-track">
                                <div
                                    className="kpi-fill coverage"
                                    style={{ width: `${health_summary.coverage_percent}%` }}
                                ></div>
                            </div>
                        </div>

                        {/* Health KPI */}
                        <div className="kpi-item">
                            <div className="kpi-label">
                                <span>System Health</span>
                                <span className="kpi-val">{health_summary.score}/100</span>
                            </div>
                            <div className="kpi-track">
                                <div
                                    className="kpi-fill health"
                                    style={{
                                        width: `${health_summary.score}%`,
                                        background: health_summary.score > 80 ? 'var(--color-success-500)' : health_summary.score > 50 ? 'var(--color-accent-500)' : 'var(--color-danger-500)'
                                    }}
                                ></div>
                            </div>
                        </div>
                    </div>
                </Stack>
            </header>

            {/* 2. Volumetrics Grid */}
            <Grid columns="repeat(auto-fit, minmax(240px, 1fr))" gap="var(--spacing-lg)" className="mb-xl">
                <Card>
                    <div className="stat-label">Leagues tracked</div>
                    <div className="stat-value">{volumetrics.total_leagues}</div>
                    <div className="stat-sub">Live monitoring enabled</div>
                </Card>
                <Card>
                    <div className="stat-label">Scouted Clubs</div>
                    <div className="stat-value">{volumetrics.total_clubs}</div>
                    <div className="stat-sub">Across 55+ countries</div>
                </Card>
                <Card className="highlight-card">
                    <div className="stat-label">Active Profiles</div>
                    <div className="stat-value">{volumetrics.total_players.toLocaleString()}</div>
                    <div className="stat-sub">Verified statistical history</div>
                </Card>
                <Card>
                    <div className="stat-label">Match Instances</div>
                    <div className="stat-value">{volumetrics.total_fixtures.toLocaleString()}</div>
                    <div className="stat-sub">Deep event coverage</div>
                </Card>
            </Grid>

            {/* 3. Visual Intelligence Layer */}
            <Grid columns="repeat(2, 1fr)" gap="var(--spacing-lg)" className="mb-xl">
                <Card title="Nationality Distribution" subtitle="Top 10 talent producers">
                    <div style={{ width: '100%', height: 300 }}>
                        <ResponsiveContainer>
                            <BarChart data={players_by_country} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                <XAxis
                                    dataKey="name"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: 'var(--color-text-muted)', fontSize: 10 }}
                                />
                                <YAxis
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: 'var(--color-text-muted)', fontSize: 10 }}
                                />
                                <Tooltip
                                    contentStyle={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }}
                                    itemStyle={{ color: '#fff' }}
                                    cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                                />
                                <Bar dataKey="count" fill="var(--color-primary-500)" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </Card>

                <Card title="Continental Coverage" subtitle="Global distribution of entities">
                    <div style={{ width: '100%', height: 300 }}>
                        <ResponsiveContainer>
                            <PieChart>
                                <Pie
                                    data={distribution}
                                    dataKey="count"
                                    nameKey="continent"
                                    cx="50%"
                                    cy="45%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                >
                                    {distribution?.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }}
                                    itemStyle={{ color: '#fff' }}
                                />
                                <Legend
                                    verticalAlign="bottom"
                                    height={36}
                                    iconType="circle"
                                    formatter={(value) => <span style={{ color: 'var(--color-text-muted)', fontSize: '12px' }}>{value}</span>}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </Card>

                <div style={{ gridColumn: 'span 2' }}>
                    <Card title="Fixture Acquisition Trends" subtitle="Annual growth of data ingestion">
                        <div style={{ width: '100%', height: 250 }}>
                            <ResponsiveContainer>
                                <AreaChart data={fixture_trends} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorFixtures" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="var(--color-primary-500)" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="var(--color-primary-500)" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                    <XAxis
                                        dataKey="year"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: 'var(--color-text-muted)', fontSize: 10 }}
                                    />
                                    <YAxis
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: 'var(--color-text-muted)', fontSize: 10 }}
                                    />
                                    <Tooltip
                                        contentStyle={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }}
                                        itemStyle={{ color: '#fff' }}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="count"
                                        stroke="var(--color-primary-500)"
                                        strokeWidth={3}
                                        fillOpacity={1}
                                        fill="url(#colorFixtures)"
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </Card>
                </div>
            </Grid>

            {/* 4. Operational Grid */}
            <Grid columns="2fr 1fr" gap="var(--spacing-lg)">
                <Card title="Registry Operations" subtitle="Management of core entities">
                    <Stack gap="var(--spacing-md)">
                        <div className="action-row" onClick={() => navigate('/import')}>
                            <div className="action-icon">📥</div>
                            <div className="action-content">
                                <h4>Data Acquisition</h4>
                                <p>Initialize new competitive seasons and cross-verify registries.</p>
                            </div>
                            <div className="action-arrow">→</div>
                        </div>

                        <div className="action-row" onClick={() => navigate('/leagues')}>
                            <div className="action-icon">🔭</div>
                            <div className="action-content">
                                <h4>Scout Explorer</h4>
                                <p>Browse hierarchies and perform deep-dive entity analysis.</p>
                            </div>
                            <div className="action-arrow">→</div>
                        </div>

                        <div className="action-row" onClick={() => navigate('/import/matrix-status')}>
                            <div className="action-icon">🛡️</div>
                            <div className="action-content">
                                <h4>Integrity Matrix</h4>
                                <p>Analyze data completeness and resolve orphan dependencies.</p>
                            </div>
                            <div className="action-arrow">→</div>
                        </div>
                    </Stack>
                </Card>

                <Card title="Critical Metrics" subtitle="System health identifiers">
                    <Stack gap="var(--spacing-lg)">
                        <div className="metric-row">
                            <span className="label">Orphaned Profiles</span>
                            <Badge variant={health_summary.orphans > 0 ? 'danger' : 'success'}>
                                {health_summary.orphans}
                            </Badge>
                        </div>
                        <div className="metric-row">
                            <span className="label">Partial Seasons</span>
                            <Badge variant={health_summary.partial_seasons > 0 ? 'warning' : 'success'}>
                                {health_summary.partial_seasons}
                            </Badge>
                        </div>
                        <div className="metric-row">
                            <span className="label">Fully Synced Hubs</span>
                            <span className="stat-value-sm">{volumetrics.imported_seasons}</span>
                        </div>
                        <Button variant="secondary" onClick={() => navigate('/import/matrix-status')}>View integrity report</Button>
                    </Stack>
                </Card>
            </Grid>
        </div>
    );
};

export default V3Dashboard;
