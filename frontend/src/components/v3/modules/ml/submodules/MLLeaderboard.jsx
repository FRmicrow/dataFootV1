import React, { useState, useEffect } from 'react';
import { Card, Table, Badge, Stack } from '../../../../../design-system';
import api from '../../../../../services/api';

const MLLeaderboard = () => {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await api.getMLSimulationOverview();
                if (res.success) {
                    setData(res.data);
                }
            } catch (err) {
                console.error("Leaderboard fetch failed", err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const columns = [
        {
            dataIndex: 'league_name',
            title: 'Competition',
            render: (val, row) => (
                <Stack gap="none">
                    <span className="ds-text-sm ds-font-bold">{val}</span>
                    <span className="ds-text-xs ds-text-neutral-500">Season {row.season_year}</span>
                </Stack>
            )
        },
        {
            dataIndex: 'global_hit_rate',
            title: 'Accuracy',
            render: (val) => {
                const percentage = (val || 0) * 100;
                return (
                    <div className="ds-flex ds-items-center ds-gap-sm">
                        <div style={{
                            flex: 1,
                            minWidth: '60px',
                            height: '6px',
                            background: 'rgba(255,255,255,0.05)',
                            borderRadius: '3px',
                            overflow: 'hidden'
                        }}>
                            <div style={{
                                width: `${percentage}%`,
                                height: '100%',
                                background: val > 0.65 ? 'var(--color-success-500)' : val > 0.5 ? 'var(--color-warning-500)' : 'var(--color-danger-500)',
                                transition: 'width 1s ease-out'
                            }} />
                        </div>
                        <span className="ds-text-sm ds-font-bold">{percentage.toFixed(1)}%</span>
                    </div>
                );
            }
        },
        {
            dataIndex: 'market_1n2_ft',
            title: '1N2 FT',
            render: (val) => typeof val === 'number' ? <Badge variant="neutral">{(val * 100).toFixed(1)}%</Badge> : '-'
        },
        {
            dataIndex: 'market_1n2_ht',
            title: '1N2 HT',
            render: (val) => typeof val === 'number' ? <Badge variant="neutral">{(val * 100).toFixed(1)}%</Badge> : '-'
        },
        {
            dataIndex: 'brier_score',
            title: 'Error',
            render: (val) => typeof val === 'number' ? <span className="ds-text-neutral-400 ds-text-xs">{val.toFixed(3)}</span> : '-'
        }
    ];

    return (
        <Card title="Intelligence Ranking" subtitle="Historical model performance across verified competitions.">
            {loading ? (
                <Stack gap="none" className="ds-p-xl ds-text-center ds-text-neutral-500">
                    Processing performance metrics...
                </Stack>
            ) : (
                <Table
                    columns={columns}
                    data={data}
                />
            )}
        </Card>
    );
};

export default MLLeaderboard;
