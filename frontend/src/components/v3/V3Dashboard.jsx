import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { Link } from 'react-router-dom';
import './V3Dashboard.css';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend, AreaChart, Area
} from 'recharts';

const COLORS = ['#6366f1', '#a855f7', '#ec4899', '#f59e0b', '#10b981', '#06b6d4', '#3b82f6'];

const V3Dashboard = () => {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

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
            <div className="spinner"></div>
            <p>Initializing Intelligence Hub...</p>
        </div>
    );

    const { volumetrics, health_summary, players_by_country, distribution, fixture_trends } = stats;

    return (
        <div className="v3-dashboard-page animate-fade-in">
            {/* 1. Intelligence Header */}
            <header className="v3-header">
                <div className="header-meta">
                    <span className="hub-badge">OPERATIONAL COMMAND</span>
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
                                    background: health_summary.score > 80 ? '#10b981' : health_summary.score > 50 ? '#f59e0b' : '#ef4444'
                                }}
                            ></div>
                        </div>
                    </div>
                </div>
            </header>

            {/* 2. Volumetrics Grid */}
            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-label">Leagues tracked</div>
                    <div className="stat-value">{volumetrics.total_leagues}</div>
                    <div className="stat-sub">Live monitoring enabled</div>
                </div>
                <div className="stat-card">
                    <div className="stat-label">Scouted Clubs</div>
                    <div className="stat-value">{volumetrics.total_clubs}</div>
                    <div className="stat-sub">Across 55+ countries</div>
                </div>
                <div className="stat-card highlight">
                    <div className="stat-label">Active Profiles</div>
                    <div className="stat-value">{volumetrics.total_players.toLocaleString()}</div>
                    <div className="stat-sub">Verified statistical history</div>
                </div>
                <div className="stat-card">
                    <div className="stat-label">Match Instances</div>
                    <div className="stat-value">{volumetrics.total_fixtures.toLocaleString()}</div>
                    <div className="stat-sub">Deep event coverage</div>
                </div>
            </div>

            {/* 3. Visual Intelligence Layer (US_112) */}
            <div className="visual-intelligence-grid">
                <div className="chart-container">
                    <h3 className="chart-title">Nationality Distribution (Top 10)</h3>
                    <div style={{ width: '100%', height: 300 }}>
                        <ResponsiveContainer>
                            <BarChart data={players_by_country} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                <XAxis
                                    dataKey="name"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#64748b', fontSize: 10 }}
                                />
                                <YAxis
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#64748b', fontSize: 10 }}
                                />
                                <Tooltip
                                    contentStyle={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                                    itemStyle={{ color: '#fff' }}
                                    cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                                />
                                <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="chart-container">
                    <h3 className="chart-title">Continental Coverage</h3>
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
                                    contentStyle={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                                    itemStyle={{ color: '#fff' }}
                                />
                                <Legend
                                    verticalAlign="bottom"
                                    height={36}
                                    iconType="circle"
                                    formatter={(value) => <span style={{ color: '#94a3b8', fontSize: '12px' }}>{value}</span>}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="chart-container full-width">
                    <h3 className="chart-title">Fixture Acquisition Trends</h3>
                    <div style={{ width: '100%', height: 250 }}>
                        <ResponsiveContainer>
                            <AreaChart data={fixture_trends} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorFixtures" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                <XAxis
                                    dataKey="year"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#64748b', fontSize: 10 }}
                                />
                                <YAxis
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#64748b', fontSize: 10 }}
                                />
                                <Tooltip
                                    contentStyle={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                                    itemStyle={{ color: '#fff' }}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="count"
                                    stroke="#6366f1"
                                    strokeWidth={3}
                                    fillOpacity={1}
                                    fill="url(#colorFixtures)"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* 4. Operational Grid */}
            <div className="dashboard-grid">
                {/* Actions Panel */}
                <div className="dashboard-column">
                    <h3 className="column-title">Registry Operations</h3>
                    <div className="actions-grid-v2">
                        <Link to="/import" className="action-card-v2 import">
                            <div className="icon">📥</div>
                            <div className="action-info">
                                <h4>Data Acquisition</h4>
                                <p>Initialize new competitive seasons and cross-verify registries.</p>
                            </div>
                            <span className="arrow">→</span>
                        </Link>

                        <Link to="/leagues" className="action-card-v2 explore">
                            <div className="icon">🔭</div>
                            <div className="action-info">
                                <h4>Scout Explorer</h4>
                                <p>Browse hierarchies and perform deep-dive entity analysis.</p>
                            </div>
                            <span className="arrow">→</span>
                        </Link>

                        <Link to="/import/matrix-status" className="action-card-v2 health">
                            <div className="icon">🛡️</div>
                            <div className="action-info">
                                <h4>Integrity Matrix</h4>
                                <p>Analyze data completeness and resolve orphan dependencies.</p>
                            </div>
                            <span className="arrow">→</span>
                        </Link>
                    </div>
                </div>

                {/* System Alerts / Distribution placeholder (for next US) */}
                <div className="dashboard-column lg:col-span-1">
                    <h3 className="column-title">Critical Metrics</h3>
                    <div className="metrics-card">
                        <div className="metric-row">
                            <span className="label">Orphaned Profiles</span>
                            <span className={`value ${health_summary.orphans > 0 ? 'warning' : 'success'}`}>
                                {health_summary.orphans}
                            </span>
                        </div>
                        <div className="metric-row">
                            <span className="label">Partial Seasons</span>
                            <span className={`value ${health_summary.partial_seasons > 0 ? 'warning' : 'success'}`}>
                                {health_summary.partial_seasons}
                            </span>
                        </div>
                        <div className="metric-row">
                            <span className="label">Fully Synced Hubs</span>
                            <span className="value">{volumetrics.imported_seasons}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default V3Dashboard;
