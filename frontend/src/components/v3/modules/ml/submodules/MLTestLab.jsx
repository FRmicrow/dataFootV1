import React, { useState, useEffect, useMemo } from 'react';
import { Card, Grid, Stack, Badge, Button, Table, Input, Progress } from '../../../../../design-system';
import api from '../../../../../services/api';

const MLTestLab = () => {
    const [fixtures, setFixtures] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [filters, setFilters] = useState({ leagues: [], maxDate: '' });
    const [prediction, setPrediction] = useState(null);
    const [loading, setLoading] = useState(false);

    const topLeagues = [
        'Champions League', 'Europa League', 'Conference League',
        'Ligue 1', 'Premier League', 'Bundesliga', 'Serie A', 'La Liga'
    ];

    const toggleLeague = (league) => {
        setFilters(prev => ({
            ...prev,
            leagues: prev.leagues.includes(league) 
                ? prev.leagues.filter(l => l !== league)
                : [...prev.leagues, league]
        }));
    };

    const fetchUpcoming = async () => {
        setLoading(true);
        try {
            const params = {};
            if (filters.leagues.length > 0) params.leagues = filters.leagues.join(',');
            if (filters.maxDate) params.maxDate = filters.maxDate;

            const res = await api.getMLUpcomingPredictions(params);
            // deduplicate by fixture_id since Predictions API returns market rows
            const uniqueFixtures = [];
            const seen = new Set();
            (res || []).forEach(f => {
                if (!seen.has(f.fixture_id)) {
                    uniqueFixtures.push(f);
                    seen.add(f.fixture_id);
                }
            });
            setFixtures(uniqueFixtures);
        } catch (err) {
            console.error("Upcoming fetch failed", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUpcoming();
    }, [filters]);

    const runAnalysis = async (fixtureId, fixtureLabel) => {
        setLoading(true);
        try {
            const res = await api.predictFixtureAll(fixtureId);
            setPrediction({ ...res, label: fixtureLabel, fixture_id: fixtureId });
        } catch (err) {
            console.error("Analysis failed", err);
        } finally {
            setLoading(false);
        }
    };

    const filteredFixtures = useMemo(() => {
        if (!searchTerm) return fixtures;
        const s = searchTerm.toLowerCase();
        return fixtures.filter(f =>
            f.home_team?.toLowerCase().includes(s) ||
            f.away_team?.toLowerCase().includes(s) ||
            f.league_name?.toLowerCase().includes(s)
        );
    }, [fixtures, searchTerm]);

    const columns = [
        {
            title: 'Competition',
            dataIndex: 'league_name',
            key: 'league',
            render: (text, row) => (
                <Stack gap="none">
                    <span className="ds-text-sm ds-font-bold ds-text-main">{text}</span>
                    <span className="ds-text-xs ds-text-dim">{new Date(row.date).toLocaleDateString()}</span>
                </Stack>
            )
        },
        {
            title: 'Fixture',
            dataIndex: 'fixture_id',
            key: 'match',
            render: (_, row) => (
                <span className="ds-font-medium ds-text-main">{row.home_team} vs {row.away_team}</span>
            )
        },
        {
            title: 'Market',
            dataIndex: 'market_type',
            key: 'market',
            render: (val) => <Badge variant="surface" size="sm">{val}</Badge>
        },
        {
            title: 'Prediction',
            dataIndex: 'selection',
            key: 'pred',
            render: (val) => <span className="ds-font-bold ds-text-primary-400">{val}</span>
        },
        {
            title: 'Confidence',
            dataIndex: 'ml_probability',
            key: 'prob',
            render: (val) => (
                <Stack gap="2xs" style={{ width: '100px' }}>
                    <span className="ds-text-xs">{(val * 100).toFixed(1)}%</span>
                    <Progress value={val * 100} variant="primary" size="sm" />
                </Stack>
            )
        },
        {
            title: 'Edge',
            dataIndex: 'edge',
            key: 'edge',
            render: (val, row) => {
                const edge = val || (row.bookmaker_odd ? ((row.bookmaker_odd / row.fair_odd) - 1) * 100 : 0);
                return <Badge variant={edge > 5 ? 'success' : 'neutral'} size="sm">+{edge.toFixed(1)}%</Badge>
            }
        },
        {
            title: 'Intelligence',
            dataIndex: 'fixture_id',
            key: 'action',
            render: (id, row) => (
                <Button
                    size="sm"
                    variant="surface"
                    onClick={() => runAnalysis(id, `${row.home_team} vs ${row.away_team}`)}
                    loading={loading && prediction?.fixture_id === id}
                >
                    Analyze
                </Button>
            )
        }
    ];

    return (
        <Stack gap="xl" className="ds-animate-reveal">
            <Card
                title="Lab Control"
                subtitle="High-priority upcoming matches ready for simulation. Use this sandbox to manually trigger the full submodel ensemble."
            >
                <Stack gap="md">
                    <Stack gap="sm">
                        <div className="ds-flex ds-flex-wrap ds-gap-xs">
                            {topLeagues.map(league => (
                                <Button 
                                    key={league}
                                    variant={filters.leagues.includes(league) ? 'primary' : 'surface'}
                                    size="sm"
                                    onClick={() => toggleLeague(league)}
                                >
                                    {league}
                                </Button>
                            ))}
                        </div>
                        <div className="ds-flex ds-items-center ds-gap-sm">
                            <span className="ds-text-xs ds-text-dim">Date Maximum:</span>
                            <input 
                                type="date" 
                                value={filters.maxDate}
                                onChange={(e) => setFilters(prev => ({ ...prev, maxDate: e.target.value }))}
                                className="ds-input ds-input--sm"
                                style={{ width: 'auto', background: 'var(--ds-bg-surface-800)', border: '1px solid var(--ds-border-neutral)', color: 'white', borderRadius: '4px', padding: '2px 8px' }}
                            />
                            {filters.maxDate && (
                                <Button variant="ghost" size="xs" onClick={() => setFilters(prev => ({ ...prev, maxDate: '' }))}>Clear</Button>
                            )}
                        </div>
                    </Stack>

                    <Input
                        placeholder="Filter by team or league..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />

                    <div className="ds-table-overflow ds-max-h-[400px]">
                        <Table
                            columns={columns}
                            data={filteredFixtures}
                            loading={loading && fixtures.length === 0}
                            rowKey="fixture_id"
                        />
                        {!loading && filteredFixtures.length === 0 && (
                            <div className="ds-p-xl ds-text-center ds-text-dim">
                                No fixtures found for analysis.
                            </div>
                        )}
                    </div>
                </Stack>
            </Card>

            {prediction && prediction.success && (
                <Card
                    title="Simulation Intelligence"
                    subtitle={`Generated report for ${prediction.label}`}
                    onClose={() => setPrediction(null)}
                    className="ds-animate-reveal"
                >
                    <Grid columns="1fr 2fr" gap="xl">
                        <Stack gap="lg">
                            <h3 className="ds-text-lg ds-font-bold mb-md ds-text-main">Risk Profile</h3>
                            {prediction.predictions?.map((p, idx) => (
                                <Stack gap="xs" key={`${p.market}-${idx}`} className="mb-md">
                                    <Stack direction="row" className="ds-justify-between ds-items-center">
                                        <Badge variant="surface" size="sm">
                                            {p.market}
                                        </Badge>
                                        <Stack direction="row" gap="sm" className="ds-items-center">
                                            <span className="ds-font-bold ds-text-primary-400">{p.selection}</span>
                                            <span className="ds-text-xs ds-text-dim">{(p.ml_probability * 100).toFixed(1)}%</span>
                                        </Stack>
                                    </Stack>
                                    <Progress value={p.ml_probability * 100} variant="primary" size="sm" />
                                </Stack>
                            ))}
                        </Stack>

                        <Stack gap="md" className="ds-p-lg ds-rounded-lg ds-border ds-border-primary-500/20 ds-bg-card">
                            <h3 className="ds-text-lg ds-font-bold ds-text-primary-400">Master Payload</h3>
                            <div className="ds-max-h-[500px] ds-overflow-auto ds-bg-black ds-p-md ds-rounded ds-border ds-border-white/5">
                                <pre className="ds-text-xs ds-text-success-400 ds-font-mono">
                                    {JSON.stringify(prediction, null, 2)}
                                </pre>
                            </div>
                        </Stack>
                    </Grid>
                </Card>
            )}
        </Stack>
    );
};

export default MLTestLab;
