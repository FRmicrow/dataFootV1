import React, { useState, useEffect } from 'react';
import { Card, Table, Badge, Stack, Grid, MetricCard } from '../../../../../design-system';
import api from '../../../../../services/api';

const ClubPerformanceMatrix = () => {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await api.getMLClubEvaluation();
                setData(res || []);
            } catch (err) {
                console.error("Club evaluation fetch failed", err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const columns = [
        {
            title: 'Club',
            dataIndex: 'team_name',
            key: 'team_name',
            render: (text) => <span className="ds-font-bold ds-text-main">{text}</span>
        },
        {
            title: 'Sample Size',
            dataIndex: 'total',
            key: 'total',
            render: (val) => <span className="ds-text-dim">{val} matches</span>
        },
        {
            title: '1X2 Hit Rate',
            dataIndex: 'by_market',
            key: 'hit_rate_1x2',
            render: (val) => {
                const m = val['1X2'] || val['1N2_FT'];
                if (!m) return '-';
                const rate = (m.h / m.t) * 100;
                return <Badge variant={rate > 60 ? 'success' : 'surface'}>{rate.toFixed(1)}%</Badge>;
            }
        },
        {
            title: 'Corners Hit Rate',
            dataIndex: 'by_market',
            key: 'hit_rate_corners',
            render: (val) => {
                const m = val['CORNERS'];
                if (!m) return '-';
                const rate = (m.h / m.t) * 100;
                return <Badge variant={rate > 60 ? 'success' : 'surface'}>{rate.toFixed(1)}%</Badge>;
            }
        },
        {
            title: 'Overall Accuracy',
            dataIndex: 'hit_rate',
            key: 'hit_rate',
            render: (val) => <span className="ds-font-bold ds-text-primary-400">{(val * 100).toFixed(1)}%</span>
        }
    ];

    return (
        <Stack gap="lg" className="ds-animate-reveal">
            <Card title="Club Performance Matrix" subtitle="Analyzing model precision on a per-team basis across all historical simulations.">
                {loading ? (
                    <div className="ds-p-xl ds-text-center">
                        <Stack gap="md" className="ds-items-center">
                            <div className="ds-w-8 ds-h-8 ds-border-2 ds-border-primary-500 ds-border-t-transparent ds-rounded-full ds-animate-spin" />
                            <span className="ds-text-dim">Calibrating club metrics...</span>
                        </Stack>
                    </div>
                ) : (
                    <div className="ds-table-overflow">
                        <Table
                            columns={columns}
                            data={data}
                            rowKey="team_id"
                        />
                    </div>
                )}
            </Card>
        </Stack>
    );
};

export default ClubPerformanceMatrix;
