import React, { useState, useEffect } from 'react';
import { Card, Table, Badge, Button, Stack, FixtureRow, TableSkeleton, Grid, MetricCard } from '../../../../design-system';
import api from '../../../../services/api';

const MLOddsPage = () => {
    const [upcoming, setUpcoming] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedFixture, setSelectedFixture] = useState(null);
    const [fixtureOdds, setFixtureOdds] = useState([]);
    const [loadingOdds, setLoadingOdds] = useState(false);

    useEffect(() => {
        fetchUpcoming();
    }, []);

    const fetchUpcoming = async () => {
        try {
            setLoading(true);
            const response = await api.getUpcomingOdds();
            setUpcoming(response.data || []);
            setLoading(false);
        } catch (err) {
            setError("Failed to load upcoming fixtures with odds.");
            setLoading(false);
        }
    };

    const handleFixtureClick = async (fixtureId) => {
        try {
            setSelectedFixture(fixtureId);
            setLoadingOdds(true);
            const response = await api.getFixtureOdds(fixtureId);
            setFixtureOdds(response.data || []);
            setLoadingOdds(false);
        } catch (err) {
            console.error(err);
            setLoadingOdds(false);
        }
    };

    const columns = [
        {
            title: 'Bookmaker',
            dataIndex: 'bookmaker_name',
            key: 'bookmaker_name',
            render: (text) => <span className="ds-font-bold ds-text-primary-400">{text}</span>
        },
        {
            title: 'Market',
            dataIndex: 'bet_name',
            key: 'bet_name',
            render: (text) => <Badge variant="surface" size="sm">{text}</Badge>
        },
        {
            title: 'Selection',
            dataIndex: 'value_label',
            key: 'value_label',
            render: (text) => <span className="ds-font-bold">{text}</span>
        },
        {
            title: 'Odd',
            dataIndex: 'value_odd',
            key: 'value_odd',
            align: 'right',
            width: '80px',
            render: (val) => <Badge variant="primary" size="md">{val.toFixed(2)}</Badge>
        },
        {
            title: 'Refreshed',
            dataIndex: 'updated_at',
            key: 'updated_at',
            align: 'right',
            width: '150px',
            render: (val) => <span className="ds-text-xs ds-text-neutral-500">{new Date(val).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        }
    ];

    const selectedMatch = upcoming.find(f => f.fixture_id === selectedFixture);

    return (
        <Stack gap="xl">
            <Grid columns="repeat(3, 1fr)" gap="lg">
                <MetricCard
                    label="Active Fixtures"
                    value={upcoming.length}
                    subValue="Upcoming week coverage"
                    variant="primary"
                />
                <MetricCard
                    label="Market Snapshot"
                    value="Real-time"
                    subValue="Direct from API-Football"
                    variant="default"
                />
                <MetricCard
                    label="Liquidity"
                    value="High"
                    subValue="Pre-match verified"
                    variant="success"
                />
            </Grid>

            <Grid columns="1fr 1fr" gap="lg" align="start">
                <Card title="Upcoming Odds" subtitle="Matches with pre-match market availability.">
                    {loading ? (
                        <div className="p-xl ds-text-center"><span className="ds-spinner"></span> Loading fixtures...</div>
                    ) : upcoming.length === 0 ? (
                        <div className="ds-text-center py-xl">
                            <p className="ds-text-neutral-400">No upcoming odds found.</p>
                            <Button variant="outline" className="mt-md" onClick={fetchUpcoming}>Refresh</Button>
                        </div>
                    ) : (
                        <div className="ds-fixtures-list ds-flex ds-flex-col ds-gap-sm">
                            {upcoming.map(fix => (
                                <div
                                    key={fix.fixture_id}
                                    onClick={() => handleFixtureClick(fix.fixture_id)}
                                    style={{
                                        cursor: 'pointer',
                                        transition: 'all 0.2s',
                                        borderRadius: 'var(--radius-md)',
                                        border: selectedFixture === fix.fixture_id ? '1px solid var(--color-primary-500)' : '1px solid transparent',
                                        background: selectedFixture === fix.fixture_id ? 'var(--color-surface-800)' : 'transparent'
                                    }}
                                    className="hover:ds-bg-surface-800"
                                >
                                    <FixtureRow
                                        date={fix.event_date}
                                        homeTeam={fix.home_name}
                                        awayTeam={fix.away_name}
                                        league={fix.league_name}
                                        status="NS"
                                    />
                                </div>
                            ))}
                        </div>
                    )}
                </Card>

                <Stack gap="lg">
                    {selectedFixture ? (
                        <Card
                            title={selectedMatch ? `${selectedMatch.home_name} vs ${selectedMatch.away_name}` : "Odds Details"}
                            subtitle={selectedMatch ? selectedMatch.league_name : "Market breakdown for the selected match."}
                        >
                            {loadingOdds ? (
                                <div className="p-xl ds-text-center"><span className="ds-spinner"></span> Fetching market data...</div>
                            ) : fixtureOdds.length === 0 ? (
                                <div className="ds-text-center py-xl ds-text-neutral-500 italic">No detailed odds available for this match.</div>
                            ) : (
                                <div className="ds-table-overflow ds-border ds-border-neutral-800 ds-rounded-lg">
                                    <Table
                                        columns={columns}
                                        data={fixtureOdds}
                                        rowKey={(record, index) => `${record.bookmaker_id}-${record.bet_id}-${record.value_label}-${index}`}
                                    />
                                </div>
                            )}
                        </Card>
                    ) : (
                        <Card variant="surface">
                            <div className="ds-text-center p-3xl">
                                <span className="ds-text-4xl mb-md ds-block">📈</span>
                                <h3 className="ds-text-heading-3 mb-xs">Select a fixture</h3>
                                <p className="ds-text-neutral-400">Choose a match from the list to view detailed bookmaker odds and market depth.</p>
                            </div>
                        </Card>
                    )}
                </Stack>
            </Grid>
        </Stack>
    );
};

export default MLOddsPage;
