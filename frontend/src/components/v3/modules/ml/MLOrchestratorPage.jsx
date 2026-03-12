import React, { useState, useEffect } from 'react';
import api from '../../../../services/api';
import { Card, Badge, Table, Button, MetricCard, Stack, Grid } from '../../../../design-system';

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
                setRecentAnalyses(analysesRes || []);
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
                        {row.league_name} - {row.home_team} - {row.away_team}
                    </div>
                    <div className="ds-text-neutral-400 ds-text-xs mt-2xs">
                        {new Date(row.date).toLocaleDateString()} • {row.round}
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
            render: (val) => <Badge variant="primary" size="md">{val.toFixed(2)}</Badge>
        }
    ];

    return (
        <Stack gap="xl">
            {/* Status Overview */}
            <Grid columns="repeat(4, 1fr)" gap="lg">
                <MetricCard
                    label="Python Service"
                    value={isOnline ? "Online" : "Offline"}
                    variant={isOnline ? "featured" : "default"}
                    icon={isOnline ? "🌐" : "⚠️"}
                />
                <MetricCard
                    label="Model Engine"
                    value={status?.model_loaded ? "Active" : "Locked"}
                    subValue={`v${status?.version || '1.3.0'}`}
                    variant={status?.model_loaded ? "featured" : "default"}
                    icon="🧠"
                />
                <MetricCard
                    label="Risk Database"
                    value={status?.total_risk_rows?.toLocaleString() || 0}
                    subValue="Computed Fair Odds"
                    icon="📊"
                />
                <MetricCard
                    label="Status"
                    value={status?.training?.is_training ? "Training" : "Idle"}
                    variant={status?.training?.is_training ? "featured" : "default"}
                    icon="⚙️"
                />
            </Grid>

            {/* Main Content Area */}
            <Card title="Latest Risk Analyses" subtitle="Real-time fair odds calculated by the backend engine.">
                <div className="ds-flex ds-justify-between ds-items-center mb-md px-md">
                    <Badge variant="primary" pulse>Live Pulse Active</Badge>
                </div>

                <div className="ds-table-overflow">
                    <Table
                        columns={columns}
                        data={recentAnalyses}
                        rowKey={(record) => `${record.fixture_id}-${record.market_type}-${record.selection}-${record.analyzed_at}`}
                        loading={false}
                    />
                </div>
            </Card>

            {/* Service Controls / Quick Actions */}
            <Card title="Quick Actions" subtitle="Trigger manual operations for odds synchronization and model management.">
                <Grid columns="repeat(4, 1fr)" gap="md">
                    <Button
                        variant="primary"
                        icon="⏪"
                        block
                        onClick={async () => {
                            try {
                                await api.runMLOddsCatchup();
                                globalThis.alert("Past odds sync triggered.");
                            } catch (err) {
                                console.error("Past odds sync failed:", err);
                                globalThis.alert("Sync failed.");
                            }
                        }}
                    >
                        Sync Past Odds
                    </Button>
                    <Button
                        variant="primary"
                        icon="⏩"
                        block
                        onClick={async () => {
                            try {
                                await api.syncMLUpcomingOdds();
                                globalThis.alert("Future odds sync triggered.");
                            } catch (err) {
                                console.error("Future odds sync failed:", err);
                                globalThis.alert("Sync failed.");
                            }
                        }}
                    >
                        Sync Future Odds
                    </Button>
                    <Button
                        variant="outline"
                        icon="📈"
                        block
                        onClick={() => api.syncMLAdvancedOdds()}
                    >
                        Detailed Market Sync
                    </Button>
                    <Button
                        variant="surface"
                        icon="🧠"
                        block
                        disabled
                    >
                        Retrain Models
                    </Button>
                </Grid>
            </Card>
        </Stack>
    );
};

export default MLOrchestratorPage;
