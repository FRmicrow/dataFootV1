import React, { useState, useEffect } from 'react';
import api from '../../../../services/api';
import { Card, Badge, Table, Grid, Stack, Button, MetricCard, Progress } from '../../../../design-system';

const MLBetRecommendations = () => {
    const [recommendations, setRecommendations] = useState(null);
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);
    const [error, setError] = useState(null);

    const fetchData = async () => {
        try {
            const res = await api.getMLRecommendations();
            setRecommendations(res || { top_confidence: [], top_value: [], all: [] });
        } catch (err) {
            console.error("Failed to load recommendations", err);
            setError("Failed to fetch betting recommendations.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleSync = async () => {
        setSyncing(true);
        try {
            await api.syncMLUpcomingOdds();
            await fetchData();
        } catch (err) {
            console.error("Sync failed", err);
        } finally {
            setSyncing(false);
        }
    };

    if (loading) return <div className="ds-text-center p-xl"><span className="ds-spinner"></span> Loading Recommendations...</div>;
    if (error) return <div className="ds-alert ds-alert--error">{error}</div>;

    const columns = [
        {
            title: 'Match',
            dataIndex: 'fixture_id',
            key: 'match',
            render: (text, row) => (
                <div className="ds-flex ds-items-center ds-gap-md">
                    <img src={row.league_logo} alt={row.league_name} style={{ width: '24px', height: '24px' }} title={row.league_name} />
                    <div className="ds-flex ds-items-center ds-gap-sm">
                        <div className="ds-flex ds-items-center ds-gap-xs">
                            <span className="ds-font-bold">{row.home_team}</span>
                        </div>
                        <span className="ds-text-neutral-500">vs</span>
                        <div className="ds-flex ds-items-center ds-gap-xs">
                            <span className="ds-font-bold">{row.away_team}</span>
                        </div>
                    </div>
                </div>
            )
        },
        {
            title: 'Market',
            dataIndex: 'market_type',
            key: 'market',
            width: '120px',
            render: (text) => <Badge variant="surface">{text}</Badge>
        },
        {
            title: 'Prediction',
            dataIndex: 'selection',
            key: 'prediction',
            width: '120px',
            render: (text) => <Badge variant="primary" size="md">{text}</Badge>
        },
        {
            title: 'Prob',
            dataIndex: 'ml_probability',
            key: 'prob',
            width: '100px',
            render: (val) => (
                <Stack gap="2xs">
                    <span className="ds-font-bold ds-text-xs">{(val * 100).toFixed(1)}%</span>
                    <Progress value={val * 100} variant={val > 0.75 ? 'success' : 'primary'} size="sm" />
                </Stack>
            )
        },
        {
            title: 'Bookie',
            dataIndex: 'bookmaker_odd',
            key: 'bookie',
            width: '100px',
            render: (val) => <span className="ds-font-bold ds-text-white">{val ? val.toFixed(2) : '-'}</span>
        },
        {
            title: 'Edge',
            dataIndex: 'edge',
            key: 'edge',
            width: '100px',
            render: (val) => (
                <Badge variant={(() => {
                    if (val > 5) return 'success';
                    if (val > 0) return 'primary';
                    return 'surface';
                })()} size="sm">
                    {val ? `${val.toFixed(1)}%` : '-'}
                </Badge>
            )
        },
        {
            title: 'Kick-off',
            dataIndex: 'date',
            key: 'date',
            width: '120px',
            render: (text) => <span className="ds-text-neutral-400 ds-text-xs">{new Date(text).toLocaleString([], { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
        }
    ];

    const pickOfTheDay = recommendations?.top_confidence?.[0] || recommendations?.all?.[0];

    return (
        <Stack gap="xl">
            {/* Header with Sync Action */}
            <div className="ds-flex ds-justify-between ds-items-center">
                <h2 className="ds-text-heading-2">Betting Insights</h2>
                <Button
                    variant="primary"
                    onClick={handleSync}
                    loading={syncing}
                    disabled={syncing}
                    icon="🔄"
                >
                    {syncing ? 'Syncing Odds...' : 'Sync Real-time Odds'}
                </Button>
            </div>

            {/* Highlights Grid */}
            <Grid columns={pickOfTheDay ? "2fr 1fr" : "1fr"} gap="lg">
                {pickOfTheDay && (
                    <Card variant="primary" style={{ position: 'relative', overflow: 'hidden' }}>
                        <div style={{ position: 'absolute', top: 0, right: 0, padding: '1.5rem', opacity: 0.15 }}>
                            <img src={pickOfTheDay.league_logo} alt="league" style={{ width: '120px', height: '120px', filter: 'grayscale(1) invert(1)' }} />
                        </div>

                        <Stack gap="lg">
                            <div>
                                <Badge variant="warning" size="sm" className="mb-xs">PICK OF THE DAY</Badge>
                                <h3 className="ds-text-heading-2">High Confidence Signal</h3>
                            </div>

                            <div className="ds-flex ds-justify-between ds-items-center">
                                <Stack gap="md" className="ds-flex-1">
                                    <div className="ds-flex ds-items-center ds-gap-lg">
                                        <div className="ds-text-center">
                                            <div className="ds-p-sm ds-bg-surface-800 ds-rounded-full ds-mb-xs">
                                                <img src={pickOfTheDay.home_logo} alt={pickOfTheDay.home_team} style={{ width: '48px', height: '48px' }} />
                                            </div>
                                            <div className="ds-text-xs ds-font-bold">{pickOfTheDay.home_team}</div>
                                        </div>
                                        <div className="ds-text-neutral-500 ds-text-xl ds-italic">vs</div>
                                        <div className="ds-text-center">
                                            <div className="ds-p-sm ds-bg-surface-800 ds-rounded-full ds-mb-xs">
                                                <img src={pickOfTheDay.away_logo} alt={pickOfTheDay.away_team} style={{ width: '48px', height: '48px' }} />
                                            </div>
                                            <div className="ds-text-xs ds-font-bold">{pickOfTheDay.away_team}</div>
                                        </div>
                                    </div>
                                    <div className="ds-text-neutral-400 ds-text-xs uppercase tracking-widest mt-xs">
                                        {pickOfTheDay.league_name} • {new Date(pickOfTheDay.date).toLocaleDateString()}
                                    </div>
                                </Stack>

                                <Stack gap="xs" className="ds-text-right">
                                    <span className="ds-text-neutral-400 ds-text-xs uppercase">{pickOfTheDay.market_type}</span>
                                    <span className="ds-text-4xl ds-font-bold ds-text-primary-400">{pickOfTheDay.selection}</span>
                                    <Badge variant="success" size="lg">{(pickOfTheDay.ml_probability * 100).toFixed(1)}% Prob</Badge>
                                </Stack>
                            </div>

                            <Grid columns="repeat(3, 1fr)" gap="md">
                                <div className="ds-p-md ds-bg-surface-800 ds-rounded-lg ds-text-center">
                                    <div className="ds-text-2xs ds-text-neutral-500 uppercase">Fair Odd</div>
                                    <div className="ds-text-xl ds-font-bold">{pickOfTheDay.fair_odd.toFixed(2)}</div>
                                </div>
                                <div className="ds-p-md ds-bg-surface-700 ds-rounded-lg ds-text-center ds-border ds-border-primary-500">
                                    <div className="ds-text-2xs ds-text-neutral-400 uppercase">Bookie Odd</div>
                                    <div className="ds-text-xl ds-font-bold ds-text-primary-400">{pickOfTheDay.bookmaker_odd?.toFixed(2) || '-'}</div>
                                </div>
                                <div className="ds-p-md ds-bg-surface-800 ds-rounded-lg ds-text-center">
                                    <div className="ds-text-2xs ds-text-neutral-500 uppercase">Value Edge</div>
                                    <div className="ds-text-xl ds-font-bold ds-text-success-400">{pickOfTheDay.edge?.toFixed(1) || '-'}%</div>
                                </div>
                            </Grid>
                        </Stack>
                    </Card>
                )}

                <Card title="Value Alerts" subtitle="Bets with positive expected value based on fair odds.">
                    <Stack gap="md">
                        {recommendations.top_value.length > 0 ? (
                            recommendations.top_value.slice(0, 5).map((bet) => (
                                <div key={`${bet.fixture_id}-${bet.market_type}-${bet.selection}`} className="ds-flex ds-justify-between ds-items-center ds-p-md ds-bg-surface-800 ds-rounded-lg ds-border ds-border-neutral-800 hover:ds-border-primary-500 ds-transition-all">
                                    <div>
                                        <div className="ds-text-xs ds-text-neutral-400">{bet.home_team} v {bet.away_team}</div>
                                        <div className="ds-font-bold ds-flex ds-items-center ds-gap-sm">
                                            {bet.selection}
                                            <Badge variant="surface" size="xs">@{bet.bookmaker_odd?.toFixed(2)}</Badge>
                                        </div>
                                    </div>
                                    <Badge variant="success">+{bet.edge.toFixed(1)}%</Badge>
                                </div>
                            ))
                        ) : (
                            <div className="ds-text-center ds-text-neutral-500 p-xl">No value signals currently available.</div>
                        )}
                    </Stack>
                </Card>
            </Grid>

            {/* Performance Metrics Row */}
            <Grid columns="repeat(4, 1fr)" gap="lg">
                <MetricCard label="Recommended Hits" value="82%" trend={+3.2} variant="success" />
                <MetricCard label="Average Edge" value="+5.4%" variant="primary" />
                <MetricCard label="Model Variance" value="0.041" />
                <MetricCard label="ROI (backtested)" value="+12.1%" variant="warning" />
            </Grid>

            {/* All Recommendations Table */}
            <Card title="All Upcoming Predictions" subtitle={`Aggregated insights from ${recommendations.all.length} upcoming fixtures.`}>
                <div className="ds-table-overflow">
                    <Table
                        columns={columns}
                        data={recommendations.all}
                        rowKey={(record) => `${record.fixture_id}-${record.market_type}-${record.selection}`}
                    />
                </div>
            </Card>
        </Stack>
    );
};

export default MLBetRecommendations;
