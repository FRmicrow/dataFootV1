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
                    <span className="ds-text-sm ds-font-bold">{row.home_team} vs {row.away_team}</span>
                    <span className="ds-text-xs ds-text-neutral-500">
                        {new Date(row.date).toLocaleDateString()} • {row.league_name}
                    </span>
                </Stack>
            )
        },
        {
            title: 'Market',
            dataIndex: 'market_type',
            key: 'market',
            width: '120px',
            render: (val) => <Badge variant="surface" size="sm">{val}</Badge>
        },
        {
            title: 'Prediction (Prob)',
            dataIndex: 'selection',
            key: 'prediction',
            width: '180px',
            render: (val, row) => (
                <div className="ds-flex ds-items-center ds-gap-sm">
                    <span className="ds-font-bold ds-text-primary-400">{val}</span>
                    <Badge variant="neutral" size="sm">{(row.ml_probability * 100).toFixed(1)}%</Badge>
                </div>
            )
        },
        {
            title: 'Fair Odd',
            dataIndex: 'fair_odd',
            key: 'fair_odd',
            width: '100px',
            align: 'right',
            render: (val) => <span className="ds-font-mono ds-text-xs">{val.toFixed(2)}</span>
        },
        {
            title: 'Value',
            dataIndex: 'bookmaker_odd',
            key: 'value',
            width: '100px',
            align: 'right',
            render: (val, row) => {
                if (!val) return '-';
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
        <Stack gap="lg">
            <Card title="Prediction Timeline" subtitle="Upcoming fixtures processed by the intelligence engine. High value markers indicate profitable edges against current odds.">
                {loading ? (
                    <div className="ds-p-xl ds-text-center"><span className="ds-spinner"></span> Synthesizing future probabilities...</div>
                ) : (
                    <div className="ds-table-overflow">
                        <Table
                            columns={columns}
                            data={data}
                            rowKey={(record) => `${record.fixture_id}-${record.market_type}-${record.selection}`}
                        />
                        {data.length === 0 && (
                            <div className="ds-p-xl ds-text-center ds-text-neutral-500">
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
