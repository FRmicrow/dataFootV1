import React, { useState, useEffect } from 'react';
import api from '../../../../services/api';
import { Card, Badge, Table, Grid, Stack, Button } from '../../../../design-system';

const MLBetRecommendations = () => {
    const [recommendations, setRecommendations] = useState(null);
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);
    const [error, setError] = useState(null);

    const fetchData = async () => {
        try {
            const res = await api.getMLRecommendations();
            setRecommendations(res.data);
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
                            <img src={row.home_logo} alt={row.home_team} style={{ width: '20px', height: '20px' }} />
                            <span className="ds-font-bold">{row.home_team}</span>
                        </div>
                        <span className="ds-text-neutral-500">vs</span>
                        <div className="ds-flex ds-items-center ds-gap-xs">
                            <span className="ds-font-bold">{row.away_team}</span>
                            <img src={row.away_logo} alt={row.away_team} style={{ width: '20px', height: '20px' }} />
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
            render: (text) => <span className="ds-font-bold ds-text-primary-400">{text}</span>
        },
        {
            title: 'Prob',
            dataIndex: 'ml_probability',
            key: 'prob',
            width: '100px',
            render: (val) => (
                <div className="ds-flex ds-flex-col">
                    <span className="ds-font-bold">{(val * 100).toFixed(1)}%</span>
                    <div className="ds-progress-bar" style={{ height: '4px', width: '100%' }}>
                        <div className="ds-progress-fill" style={{ width: `${val * 100}%`, backgroundColor: val > 0.75 ? 'var(--color-success-500)' : 'var(--color-primary-500)' }}></div>
                    </div>
                </div>
            )
        },
        {
            title: 'Fair Odd',
            dataIndex: 'fair_odd',
            key: 'fair',
            width: '100px',
            render: (val) => <span className="ds-text-neutral-300">{val.toFixed(2)}</span>
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
                <Badge variant={val > 5 ? 'success' : val > 0 ? 'primary' : 'surface'}>
                    {val ? `${val.toFixed(1)}%` : '-'}
                </Badge>
            )
        },
        {
            title: 'Date',
            dataIndex: 'date',
            key: 'date',
            width: '120px',
            render: (text) => <span className="ds-text-neutral-400 ds-text-xs">{new Date(text).toLocaleString([], { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
        }
    ];

    const pickOfTheDay = recommendations.top_confidence[0] || recommendations.all[0];

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
            <Grid columns={pickOfTheDay ? "2fr 1fr" : "1fr"} gap="xl">
                {pickOfTheDay && (
                    <Card variant="primary" style={{ position: 'relative', overflow: 'hidden' }}>
                        <div style={{ position: 'absolute', top: 0, right: 0, padding: '1rem', opacity: 0.1, fontSize: '5rem' }}>🎯</div>
                        <div className="ds-card-header">
                            <Badge variant="warning" size="sm" className="mb-xs">PICK OF THE DAY</Badge>
                            <h2 className="ds-text-heading-2">High Confidence Bet</h2>
                        </div>
                        <div className="ds-card-body">
                            <div className="ds-flex ds-justify-between ds-items-center mb-md">
                                <div className="ds-flex ds-items-center ds-gap-md">
                                    <div className="ds-text-center">
                                        <img src={pickOfTheDay.home_logo} alt={pickOfTheDay.home_team} style={{ width: '64px', height: '64px' }} />
                                        <div className="ds-font-bold mt-xs">{pickOfTheDay.home_team}</div>
                                    </div>
                                    <span className="ds-text-2xl ds-text-neutral-500">vs</span>
                                    <div className="ds-text-center">
                                        <img src={pickOfTheDay.away_logo} alt={pickOfTheDay.away_team} style={{ width: '64px', height: '64px' }} />
                                        <div className="ds-font-bold mt-xs">{pickOfTheDay.away_team}</div>
                                    </div>
                                </div>
                                <div className="ds-text-right">
                                    <div className="ds-text-neutral-400 ds-text-sm uppercase tracking-wider">{pickOfTheDay.market_type}</div>
                                    <div className="ds-text-4xl ds-font-bold ds-text-primary-400">{pickOfTheDay.selection}</div>
                                    <div className="ds-text-xl ds-text-success-400">Confidence: {(pickOfTheDay.ml_probability * 100).toFixed(1)}%</div>
                                </div>
                            </div>
                            <div className="ds-flex ds-gap-md mt-lg">
                                <div className="ds-bg-surface-800 ds-p-md ds-rounded-lg ds-flex-1 ds-text-center">
                                    <div className="ds-text-xs ds-text-neutral-400">FAIR ODD</div>
                                    <div className="ds-text-2xl ds-font-bold">{pickOfTheDay.fair_odd.toFixed(2)}</div>
                                </div>
                                <div className="ds-bg-surface-800 ds-p-md ds-rounded-lg ds-flex-1 ds-text-center ds-border ds-border-primary-500">
                                    <div className="ds-text-xs ds-text-neutral-400">BOOKIE ODD</div>
                                    <div className="ds-text-2xl ds-font-bold ds-text-primary-400">{pickOfTheDay.bookmaker_odd?.toFixed(2) || '-'}</div>
                                </div>
                                <div className="ds-bg-surface-800 ds-p-md ds-rounded-lg ds-flex-1 ds-text-center">
                                    <div className="ds-text-xs ds-text-neutral-400">EXPECTED EDGE</div>
                                    <div className="ds-text-2xl ds-font-bold ds-text-success-400">{pickOfTheDay.edge?.toFixed(1) || '-'}%</div>
                                </div>
                            </div>
                        </div>
                    </Card>
                )}

                <Card>
                    <div className="ds-card-header">
                        <h3 className="ds-text-heading-3">Value Alerts</h3>
                    </div>
                    <div className="ds-card-body">
                        {recommendations.top_value.length > 0 ? (
                            <Stack gap="md">
                                {recommendations.top_value.slice(0, 4).map((bet, idx) => (
                                    <div key={idx} className="ds-flex ds-justify-between ds-items-center ds-p-sm ds-bg-surface-800 ds-rounded-md">
                                        <div>
                                            <div className="ds-text-xs ds-text-neutral-400">{bet.home_team} vs {bet.away_team}</div>
                                            <div className="ds-font-bold">{bet.selection} <span className="ds-text-neutral-500 ds-font-normal">@{bet.bookmaker_odd?.toFixed(2)}</span></div>
                                        </div>
                                        <Badge variant="success">+{bet.edge.toFixed(1)}% Edge</Badge>
                                    </div>
                                ))}
                            </Stack>
                        ) : (
                            <div className="ds-text-center ds-text-neutral-500 p-md">No significant value bets found.</div>
                        )}
                    </div>
                </Card>
            </Grid>

            {/* All Recommendations Table */}
            <Card>
                <div className="ds-card-header ds-flex ds-justify-between ds-items-center">
                    <h2 className="ds-text-heading-3">All Upcoming Predictions</h2>
                    <Badge variant="surface">{recommendations.all.length} total insights</Badge>
                </div>
                <div className="ds-card-body" style={{ padding: 0 }}>
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
