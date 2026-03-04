import React, { useState, useEffect } from 'react';
import { Card, Table, Badge, Button, Stack, FixtureRow, TableSkeleton } from '../../../../design-system';
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
        { header: 'Bookmaker', accessor: 'bookmaker_name' },
        { header: 'Bet Type', accessor: 'bet_name' },
        { header: 'Selection', accessor: 'value_label' },
        {
            header: 'Odd',
            accessor: 'value_odd',
            render: (val) => <Badge variant="secondary" size="md">{val}</Badge>
        },
        {
            header: 'Updated',
            accessor: 'updated_at',
            render: (val) => <span className="ds-text-xs ds-text-neutral-500">{new Date(val).toLocaleString()}</span>
        }
    ];

    return (
        <Stack gap="lg">
            <Card title="Upcoming Fixtures with Odds" subtitle="Matches scheduled for the upcoming week with available pre-match markets.">
                {loading ? (
                    <TableSkeleton rows={5} columns={4} />
                ) : upcoming.length === 0 ? (
                    <div className="ds-text-center py-xl">
                        <p className="ds-text-neutral-400">No upcoming odds found in database.</p>
                        <Button variant="outline" className="mt-md" onClick={fetchUpcoming}>Refresh</Button>
                    </div>
                ) : (
                    <div className="ds-fixtures-list">
                        {upcoming.map(fix => (
                            <div
                                key={fix.fixture_id}
                                onClick={() => handleFixtureClick(fix.fixture_id)}
                                style={{ cursor: 'pointer', transition: 'transform 0.2s' }}
                                className={selectedFixture === fix.fixture_id ? 'selected-fixture' : ''}
                            >
                                <FixtureRow
                                    date={fix.event_date}
                                    homeTeam={fix.home_name}
                                    awayTeam={fix.away_name}
                                    league={fix.league_name}
                                    status="NS" // Not Started
                                />
                            </div>
                        ))}
                    </div>
                )
                }
            </Card>

            {selectedFixture && (
                <Card title={`Odds Details - Fixture #${selectedFixture}`}>
                    {loadingOdds ? (
                        <TableSkeleton rows={3} columns={5} />
                    ) : fixtureOdds.length === 0 ? (
                        <p className="ds-text-neutral-400">No detailed odds available for this fixture.</p>
                    ) : (
                        <Table
                            columns={columns}
                            data={fixtureOdds}
                        />
                    )}
                </Card>
            )}
        </Stack>
    );
};

export default MLOddsPage;
