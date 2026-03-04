import React, { useState, useEffect } from 'react';
import api from '../../../../services/api';
import { Card, Badge, Table, Button } from '../../../../design-system';

const MLOrchestratorPage = () => {
    const [status, setStatus] = useState(null);
    const [recentAnalyses, setRecentAnalyses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const [statusRes, analysesRes] = await Promise.all([
                    api.getMLOrchestratorStatus(),
                    api.getMLRecentAnalyses()
                ]);
                setStatus(statusRes);
                setRecentAnalyses(analysesRes.data || []);
                setError(null);
            } catch (err) {
                console.error("Failed to load ML Orchestrator data", err);
                setError("Failed to connect to ML Platform backend.");
            } finally {
                setLoading(false);
            }
        };

        fetchData();
        const interval = setInterval(fetchData, 10000); // refresh every 10s
        return () => clearInterval(interval);
    }, []);

    if (loading && !status) return <div className="ds-text-center p-xl"><span className="ds-spinner"></span> Loading Orchestrator...</div>;
    if (error) return <div className="ds-alert ds-alert--error">{error}</div>;

    const isOnline = status?.status === 'online';

    const columns = [
        {
            title: 'Match Details',
            dataIndex: 'fixture_id',
            key: 'fixture_id',
            render: (text, row) => (
                <div>
                    <div className="ds-font-bold">
                        {row.league_name} - {row.home_team} - {row.away_team} - {row.round}
                    </div>
                    <div className="ds-text-neutral-400 ds-text-xs mt-2xs">
                        {new Date(row.date).toLocaleDateString()} • ID: {row.fixture_id}
                    </div>
                </div>
            )
        },
        {
            title: 'Time',
            dataIndex: 'analyzed_at',
            key: 'time',
            width: '120px',
            render: (text) => <span className="ds-text-neutral-300">{new Date(text).toLocaleTimeString()}</span>
        },
        {
            title: 'Market',
            dataIndex: 'market_type',
            key: 'market',
            width: '120px',
            render: (text) => <Badge variant="surface">{text}</Badge>
        },
        {
            title: 'Selection',
            dataIndex: 'selection',
            key: 'selection',
            width: '120px',
            render: (text) => <span className="ds-font-bold">{text}</span>
        },
        {
            title: 'Probability',
            dataIndex: 'ml_probability',
            key: 'prob',
            width: '120px',
            render: (val) => `${(val * 100).toFixed(1)}%`
        },
        {
            title: 'Fair Odd',
            dataIndex: 'fair_odd',
            key: 'odd',
            width: '120px',
            render: (val) => <span className="ds-text-accent-400 ds-font-bold ds-text-lg">{val.toFixed(2)}</span>
        }
    ];

    return (
        <div className="ds-grid ds-gap-xl" style={{ gridTemplateColumns: 'minmax(300px, 1fr) 2fr' }}>

            {/* Sidebar: Status & Metrics */}
            <div className="ds-stack ds-gap-lg">
                <Card>
                    <div className="ds-card-header">
                        <h2 className="ds-text-heading-3 ds-flex ds-items-center ds-gap-sm">
                            <span className={`ds-status-dot ${isOnline ? 'ds-status-dot--success' : 'ds-status-dot--danger'}`}></span>
                            Python Service Status
                        </h2>
                    </div>
                    <div className="ds-card-body">
                        <div className="ds-grid ds-gap-md mb-md" style={{ gridTemplateColumns: '1fr 1fr' }}>
                            <div className="ds-stat-block">
                                <span className="ds-stat-label">Service</span>
                                <span className="ds-stat-value ds-text-success-400">Online</span>
                            </div>
                            <div className="ds-stat-block">
                                <span className="ds-stat-label">Version</span>
                                <span className="ds-stat-value">{status?.version || '1.3.0'}</span>
                            </div>
                        </div>
                        <div className="ds-stat-block mb-md">
                            <span className="ds-stat-label">Main Model DB</span>
                            <span className="ds-stat-value">{status?.model_loaded ? '✅ Active' : '❌ Missing'}</span>
                        </div>
                        {status?.training?.is_training && (
                            <div className="ds-alert ds-alert--warning mt-md">
                                ⏳ Model training in progress...
                            </div>
                        )}
                    </div>
                </Card>

                <Card>
                    <div className="ds-card-header">
                        <h2 className="ds-text-heading-3">Risk Engine Database</h2>
                    </div>
                    <div className="ds-card-body">
                        <div className="ds-stat-block">
                            <span className="ds-stat-label">Total Fair Odds Computed</span>
                            <span className="ds-stat-value ds-text-primary-400">{status?.total_risk_rows?.toLocaleString() || 0}</span>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Main Area: Recent Risk Engine Output */}
            <Card className="ds-flex-1">
                <div className="ds-flex ds-justify-between ds-items-center mb-md ds-card-header">
                    <h2 className="ds-text-heading-3">Latest Risk Analyses (Fair Odds)</h2>
                    <Badge variant="primary" pulse>Live updating</Badge>
                </div>

                <div style={{ padding: '0 var(--spacing-md) var(--spacing-md)' }}>
                    <Table
                        columns={columns}
                        data={recentAnalyses}
                        rowKey={(record) => `${record.fixture_id}-${record.market_type}-${record.selection}-${record.analyzed_at}`}
                        loading={false}
                        style={{ maxHeight: '600px', overflowY: 'auto' }}
                    />
                </div>
            </Card>

        </div>
    );
};

export default MLOrchestratorPage;
