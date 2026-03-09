import React, { useState, useEffect, useMemo } from 'react';
import { Card, Grid, Stack, Badge, Button, Table } from '../../../../../design-system';
import api from '../../../../../services/api';

const MLTestLab = () => {
    const [fixtures, setFixtures] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [prediction, setPrediction] = useState(null);
    const [loading, setLoading] = useState(false);

    const fetchUpcoming = async () => {
        setLoading(true);
        try {
            const res = await api.getUpcomingOdds();
            if (res.success) {
                setFixtures(res.data);
            }
        } catch (err) {
            console.error("Upcoming fetch failed", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUpcoming();
    }, []);

    const runAnalysis = async (fixtureId, fixtureLabel) => {
        setLoading(true);
        try {
            const res = await api.getFixturePrediction(fixtureId);
            setPrediction({ ...res, label: fixtureLabel });
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
            f.home_name?.toLowerCase().includes(s) ||
            f.away_name?.toLowerCase().includes(s) ||
            f.league_name?.toLowerCase().includes(s)
        );
    }, [fixtures, searchTerm]);

    const columns = [
        {
            dataIndex: 'league',
            title: 'Competition',
            render: (_, row) => (
                <Stack gap="none">
                    <span className="ds-text-sm ds-font-bold">{row.league_name}</span>
                    <span className="ds-text-xs ds-text-neutral-500">{new Date(row.event_date).toLocaleDateString()}</span>
                </Stack>
            )
        },
        {
            dataIndex: 'match',
            title: 'Fixture',
            render: (_, row) => (
                <span className="ds-font-medium">{row.home_name} vs {row.away_name}</span>
            )
        },
        {
            dataIndex: 'action',
            title: 'Intelligence',
            render: (_, row) => (
                <Button
                    size="sm"
                    variant="primary"
                    onClick={() => runAnalysis(row.fixture_id, `${row.home_name} vs ${row.away_name}`)}
                    loading={loading && prediction?.fixture_id === row.fixture_id}
                >
                    Run Model
                </Button>
            )
        }
    ];

    return (
        <Stack gap="xl">
            <Card
                title="Lab Control"
                subtitle="High-priority upcoming matches ready for simulation."
            >
                <Stack gap="md">
                    <Stack direction="row" gap="md" className="ds-w-full">
                        <input
                            type="text"
                            placeholder="Filter by team or league..."
                            className="ds-input ds-flex-1"
                            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', padding: '8px 12px', borderRadius: '6px' }}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </Stack>

                    <div style={{ maxHeight: '400px', overflowY: 'auto', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '8px' }}>
                        <Table
                            columns={columns}
                            data={filteredFixtures}
                            loading={loading && fixtures.length === 0}
                            className="ds-table-compact"
                        />
                    </div>
                </Stack>
            </Card>

            {prediction && (
                <Card
                    title="Simulation Intelligence"
                    subtitle={`Generated report for ${prediction.label}`}
                    onClose={() => setPrediction(null)}
                >
                    <Grid columns="1fr 2fr" gap="xl">
                        <Stack gap="lg">
                            <h3 className="ds-text-lg ds-font-bold mb-md">Probabilities</h3>
                            {Object.entries(prediction.probabilities || {}).map(([outcome, prob]) => (
                                <Stack gap="xs" key={outcome} className="mb-md">
                                    <Stack direction="row" className="ds-justify-between ds-items-center">
                                        <Badge variant={(() => {
                                            if (outcome === 'home') return 'primary';
                                            if (outcome === 'draw') return 'neutral';
                                            return 'warning';
                                        })()}>
                                            {outcome.toUpperCase()}
                                        </Badge>
                                        <span className="ds-font-bold">{(prob * 100).toFixed(1)}%</span>
                                    </Stack>
                                    <div style={{ height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
                                        <div style={{
                                            width: `${prob * 100}%`,
                                            height: '100%',
                                            background: 'var(--color-primary-500)',
                                            transition: 'width 1s cubic-bezier(0.4, 0, 0.2, 1)'
                                        }} />
                                    </div>
                                </Stack>
                            ))}
                        </Stack>

                        <Stack gap="md" className="ds-bg-neutral-900 ds-p-lg ds-rounded-lg ds-border ds-border-primary-500/20">
                            <h3 className="ds-text-lg ds-font-bold ds-text-primary-400">Model Payload</h3>
                            <pre className="ds-text-sm ds-text-neutral-300" style={{ whiteSpace: 'pre-wrap', overflowWrap: 'break-word' }}>
                                {JSON.stringify(prediction, null, 2)}
                            </pre>
                        </Stack>
                    </Grid>
                </Card>
            )}
        </Stack>
    );
};

export default MLTestLab;
