import React, { useState, useEffect } from 'react';
import { Stack, Grid, Card, Badge, Table } from '../../../../../design-system';
import api from '../../../../../services/api';
import MLPulse from './MLPulse';

const MLDashboard = () => {
    const [recentAnalyses, setRecentAnalyses] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchRecent = async () => {
            try {
                const data = await api.getMLRecentAnalyses();
                setRecentAnalyses(data);
            } catch (err) {
                console.error("Dashboard feed fetch failed", err);
            } finally {
                setLoading(false);
            }
        };
        fetchRecent();
    }, []);

    const columns = [
        {
            dataIndex: 'league_name',
            title: 'Competition',
            render: (val, row) => (
                <Stack gap="none">
                    <span className="ds-text-sm ds-font-bold">{val}</span>
                    <span className="ds-text-xs ds-text-neutral-500">{new Date(row.date).toLocaleDateString()}</span>
                </Stack>
            )
        },
        {
            dataIndex: 'match',
            title: 'Fixture',
            render: (val, row) => <span className="ds-font-medium">{row.home_team} vs {row.away_team}</span>
        },
        {
            dataIndex: 'market_type',
            title: 'Market',
            render: (val) => <Badge variant="neutral">{val}</Badge>
        },
        {
            dataIndex: 'selection',
            title: 'Prediction',
            render: (val) => <span className="ds-font-bold ds-text-primary-400">{val}</span>
        },
        {
            dataIndex: 'ml_probability',
            title: 'Probability',
            render: (val) => {
                const num = parseFloat(val);
                return (
                    <div className="ds-flex ds-items-center ds-gap-sm">
                        <span className="ds-text-sm ds-font-medium">{isNaN(num) ? '-%' : `${(num * 100).toFixed(1)}%`}</span>
                    </div>
                );
            }
        }
    ];

    return (
        <Stack gap="xl">
            <MLPulse />

            <Card title="Intelligence Feed" subtitle="High-priority recent predictions processed by the orchestrator.">
                {loading ? (
                    <Stack gap="none" className="ds-p-xl ds-text-center ds-text-neutral-500">
                        Retrieving intelligence...
                    </Stack>
                ) : (
                    <Table
                        columns={columns}
                        data={recentAnalyses}
                    />
                )}
            </Card>

        </Stack>
    );
};

export default MLDashboard;
