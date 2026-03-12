import React, { useState, useEffect } from 'react';
import { Card, Table, Badge, Stack } from '../../../../../design-system';
import api from '../../../../../services/api';

const PredictionTimeline = () => {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchPredictions = async () => {
            try {
                const res = await api.getMLUpcomingPredictions();
                setData(res || []);
            } catch (err) {
                console.error("Upcoming predictions fetch failed", err);
            } finally {
                setLoading(false);
            }
        };
        fetchPredictions();
    }, []);

    const columns = [
        {
            title: 'Match Details',
            dataIndex: 'fixture_id',
            key: 'fixture_id',
            render: (text, row) => (
                <Stack gap="none">
                    <span className="ds-text-sm ds-font-bold ds-text-main">{row.home_team} vs {row.away_team}</span>
                    <span className="ds-text-xs ds-text-dim">
                        {new Date(row.date).toLocaleDateString()} • {row.league_name}
                    </span>
                </Stack>
            )
        },
        {
            title: 'Market',
            dataIndex: 'market_type',
            key: 'market',
            render: (val) => <Badge variant="surface" size="sm">{val}</Badge>
        },
        {
            title: 'Prediction (Prob)',
            dataIndex: 'selection',
            key: 'prediction',
            render: (val, row) => (
                <Stack direction="row" gap="sm" className="ds-items-center">
                    <span className="ds-font-bold ds-text-primary-400">{val}</span>
                    <Badge variant="surface" size="sm">{(row.ml_probability * 100).toFixed(1)}%</Badge>
                </Stack>
            )
        },
        {
            title: 'Fair Odd',
            dataIndex: 'fair_odd',
            key: 'fair_odd',
            render: (val) => <span className="ds-font-mono ds-text-sm ds-text-dim">{val.toFixed(2)}</span>
        },
        {
            title: 'Value',
            dataIndex: 'bookmaker_odd',
            key: 'value',
            render: (val, row) => {
                if (!val) return <span className="ds-text-dim">-</span>;
                const edge = ((val / row.fair_odd) - 1) * 100;
                return (
                    <Badge variant={edge > 5 ? 'success' : 'neutral'} size="sm">
                        {edge > 0 ? `+${edge.toFixed(1)}%` : `${edge.toFixed(1)}%`}
                    </Badge>
                );
            }
        }
    ];

    return (
        <Stack gap="lg" className="ds-animate-reveal">
            <Card title="Prediction Timeline" subtitle="Upcoming fixtures processed by the intelligence engine. High value markers indicate profitable edges against current odds.">
                {loading ? (
                    <div className="ds-p-xl ds-text-center">
                        <Stack gap="md" className="ds-items-center">
                            <div className="ds-w-8 ds-h-8 ds-border-2 ds-border-primary-500 ds-border-t-transparent ds-rounded-full ds-animate-spin" />
                            <span className="ds-text-dim">Synthesizing future probabilities...</span>
                        </Stack>
                    </div>
                ) : (
                    <div className="ds-table-overflow">
                        <Table
                            columns={columns}
                            data={data}
                            rowKey={(record) => `${record.fixture_id}-${record.market_type}-${record.selection}`}
                        />
                        {data.length === 0 && (
                            <div className="ds-p-xl ds-text-center ds-text-dim">
                                No upcoming predictions found. Run a future sync to populate this view.
                            </div>
                        )}
                    </div>
                )}
            </Card>
        </Stack>
    );
};

export default PredictionTimeline;
