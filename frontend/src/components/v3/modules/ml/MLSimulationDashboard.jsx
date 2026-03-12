import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import api from '../../../../services/api';
import { Card, Badge, Table, MetricCard, Stack, Grid } from '../../../../design-system';

const ExpandedLeagueStats = ({ league_id, season_year }) => {
    const [stats, setStats] = useState(null);
    const [details, setDetails] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchDetails = async () => {
            try {
                const res = await api.getMLModelEvaluation(league_id, season_year);
                setStats(res.stats);
                setDetails(res.details || []);
            } catch (err) {
                console.error("Failed to load evaluation", err);
                setError("Could not load backtesting details.");
            } finally {
                setLoading(false);
            }
        };
        fetchDetails();
    }, [league_id, season_year]);

    const detailColumns = [
        {
            title: 'Match',
            dataIndex: 'fixture_id',
            key: 'fixture_id',
            render: (text, row) => (
                <div>
                    <div className="ds-font-bold ds-text-xs">
                        {row.home_team} vs {row.away_team}
                    </div>
                    <div className="ds-text-neutral-500" style={{ fontSize: '10px' }}>
                        {new Date(row.date).toLocaleDateString()}
                    </div>
                </div>
            )
        },
        {
            title: 'Market',
            dataIndex: 'market',
            key: 'market',
            width: '100px',
            render: (text) => <Badge variant="surface" size="sm">{text}</Badge>
        },
        {
            title: 'Prediction (Prob)',
            dataIndex: 'predicted',
            key: 'predicted',
            width: '150px',
            render: (text, row) => (
                <div className="ds-flex ds-items-center ds-gap-xs">
                    <span className="ds-font-bold ds-text-sm">{text}</span>
                    <span className="ds-text-neutral-400 ds-text-xs">{(Math.min(1.0, row.probability) * 100).toFixed(1)}%</span>
                </div>
            )
        },
        {
            title: 'Actual Result',
            dataIndex: 'actual',
            key: 'actual',
            width: '120px',
            render: (text) => <span className="ds-font-bold ds-text-neutral-300 ds-text-sm">{text}</span>
        },
        {
            title: 'Outcome',
            dataIndex: 'is_hit',
            key: 'is_hit',
            width: '100px',
            render: (isHit) => (
                <Badge size="sm" variant={isHit ? "success" : "danger"}>
                    {isHit ? '✅ HIT' : '❌ MISS'}
                </Badge>
            )
        }
    ];

    if (loading) return <div className="p-md ds-text-center"><div className="ds-spinner"></div> Loading details...</div>;
    if (error) return <div className="p-md ds-text-danger-400">{error}</div>;

    return (
        <div className="ds-p-sm" style={{ background: 'var(--color-bg-base)', borderTop: '1px solid var(--color-border)', borderBottom: '1px solid var(--color-border)' }}>
            <Stack gap="md">
                <Grid columns="repeat(3, 1fr)" gap="sm">
                    <MetricCard
                        label="Overall Hit Rate"
                        value={`${(stats?.overall_hit_rate * 100).toFixed(1)}%`}
                        variant="default"
                    />
                    <MetricCard
                        label="Brier Score"
                        value={stats?.brier_score?.toFixed(3) || '0.000'}
                    />
                    <MetricCard
                        label="Sample Size"
                        value={details.length}
                    />
                </Grid>
                <div className="ds-table-overflow ds-border ds-border-neutral-800 ds-rounded-lg" style={{ maxHeight: '350px' }}>
                    <Table
                        columns={detailColumns}
                        data={details}
                        rowKey={(record) => `${record.fixture_id}-${record.market}`}
                    />
                </div>
            </Stack>
        </div>
    );
};

ExpandedLeagueStats.propTypes = {
    league_id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    season_year: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired
};


const getAlignment = (align) => {
    if (align === 'center') return 'center';
    if (align === 'right') return 'flex-end';
    return 'flex-start';
};

const MLSimulationDashboard = () => {
    // Overview State
    const [overviewData, setOverviewData] = useState([]);
    const [loadingOverview, setLoadingOverview] = useState(true);
    const [error, setError] = useState(null);

    // Expand & Sort State
    const [expandedRowKeys, setExpandedRowKeys] = useState([]);
    const [sortConfig, setSortConfig] = useState({ key: 'importance_rank', direction: 'ASC' });

    useEffect(() => {
        const fetchOverview = async () => {
            try {
                const res = await api.getMLSimulationOverview();
                setOverviewData(res || []);
            } catch (err) {
                console.error("Failed to load generic overview", err);
                setError("Failed to fetch simulation overview.");
            } finally {
                setLoadingOverview(false);
            }
        };
        fetchOverview();
    }, []);

    const formatHitRate = (rate) => {
        if (rate === null || rate === undefined) return '-';
        const pct = rate * 100;
        let variant = 'surface';
        if (pct >= 55) variant = 'success';
        else if (pct < 45) variant = 'danger';

        return <Badge variant={variant} size="sm">{pct.toFixed(1)}%</Badge>;
    };

    const sortData = (data, config) => {
        return [...data].sort((a, b) => {
            const { key, direction } = config;

            if (key === 'importance_rank') {
                const countryA = a.country_importance_rank ?? 999;
                const countryB = b.country_importance_rank ?? 999;
                if (countryA !== countryB) {
                    return direction === 'ASC' ? countryA - countryB : countryB - countryA;
                }
                const leagueA = a.league_importance_rank ?? 999;
                const leagueB = b.league_importance_rank ?? 999;
                return direction === 'ASC' ? leagueA - leagueB : leagueB - leagueA;
            }

            const valA = a[key] ?? 0;
            const valB = b[key] ?? 0;

            if (typeof valA === 'string' && typeof valB === 'string') {
                return direction === 'ASC' ? valA.localeCompare(valB) : valB.localeCompare(valA);
            }

            return direction === 'ASC' ? valA - valB : valB - valA;
        });
    };

    const handleSort = (key) => {
        setSortConfig(prev => ({
            key,
            direction: prev.key === key && prev.direction === 'DESC' ? 'ASC' : 'DESC'
        }));
    };

    const toggleExpand = (record, isExpanding) => {
        const key = `${record.league_id}-${record.season_year}`;
        setExpandedRowKeys(prev =>
            isExpanding ? [...prev, key] : prev.filter(k => k !== key)
        );
    };

    const sortedData = sortData(overviewData, sortConfig);

    const columns = [
        {
            title: 'League',
            dataIndex: 'league_name',
            key: 'league_name',
            render: (text) => <span className="ds-font-bold">{text}</span>
        },
        {
            title: 'Rank',
            dataIndex: 'importance_rank',
            key: 'importance_rank',
            width: '60px',
            align: 'center',
            render: (val, record) => (
                <div className="ds-flex ds-flex-col ds-items-center">
                    <span className="ds-text-neutral-300 ds-text-xs" title="Country Rank">{record.country_importance_rank ?? 999}</span>
                    <span className="ds-text-neutral-500" style={{ fontSize: '10px' }} title="League Rank">{record.league_importance_rank ?? 999}</span>
                </div>
            )
        },
        {
            title: 'Year',
            dataIndex: 'season_year',
            key: 'season_year',
            width: '80px',
            align: 'center',
            render: (text) => <Badge variant="surface">{text}</Badge>
        },
        {
            title: 'Avg Hit Rate',
            dataIndex: 'global_hit_rate',
            key: 'global_hit_rate',
            width: '130px',
            align: 'right',
            render: formatHitRate
        },
        {
            title: 'Brier',
            dataIndex: 'brier_score',
            key: 'brier_score',
            width: '100px',
            align: 'right',
            render: (val) => <span className="ds-text-xs ds-text-neutral-400">{val ? val.toFixed(3) : '-'}</span>
        },
        {
            title: '1N2 FT',
            dataIndex: 'market_1n2_ft',
            key: 'market_1n2_ft',
            width: '100px',
            align: 'right',
            render: formatHitRate
        },
        {
            title: '1N2 HT',
            dataIndex: 'market_1n2_ht',
            key: 'market_1n2_ht',
            width: '100px',
            align: 'right',
            render: formatHitRate
        },
        {
            title: '',
            key: 'action',
            width: '50px',
            align: 'center',
            render: (text, record) => {
                const key = `${record.league_id}-${record.season_year}`;
                const isExpanded = expandedRowKeys.includes(key);
                return (
                    <span className="ds-text-primary-400" style={{ cursor: 'pointer', display: 'inline-block', transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
                        ▼
                    </span>
                );
            }
        }
    ].map(col => {
        if (col.key === 'action') return col;

        return {
            ...col,
            title: (
                <button
                    className="ds-table-header-button"
                    onClick={(e) => { e.stopPropagation(); handleSort(col.key); }}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        justifyContent: getAlignment(col.align),
                        width: '100%',
                        background: 'transparent',
                        border: 'none',
                        color: 'inherit',
                        fontFamily: 'inherit',
                        fontSize: 'inherit',
                        fontWeight: 'inherit',
                        cursor: 'pointer',
                        padding: 0
                    }}
                    type="button"
                    aria-label={`Sort by ${col.title}`}
                >
                    {col.title}
                    {sortConfig.key === col.key && (
                        <span style={{ fontSize: '10px', color: 'var(--color-primary-400)' }}>
                            {sortConfig.direction === 'DESC' ? '▼' : '▲'}
                        </span>
                    )}
                </button>
            )
        };
    });

    // Calculate Global Averages for Top Cards
    const avgHitRate = overviewData.length > 0
        ? overviewData.reduce((acc, curr) => acc + (curr.global_hit_rate || 0), 0) / overviewData.length
        : 0;

    const avgBrier = overviewData.length > 0
        ? overviewData.reduce((acc, curr) => acc + (curr.brier_score || 0), 0) / overviewData.length
        : 0;

    return (
        <Stack gap="xl">
            {/* Global Performance Header */}
            <Grid columns="repeat(3, 1fr)" gap="lg">
                <MetricCard
                    label="Algorithmic Confidence"
                    value={`${(avgHitRate * 100).toFixed(1)}%`}
                    subValue="Mean Hit Rate across all leagues"
                    variant="featured"
                />
                <MetricCard
                    label="Model Calibration"
                    value={avgBrier.toFixed(3)}
                    subValue="Average Brier Score (lower is better)"
                />
                <MetricCard
                    label="Coverage"
                    value={overviewData.length}
                    subValue="Active league/season pairs"
                />
            </Grid>

            <Card title="Simulation Overview" subtitle="Click any row to expand deep-dive backtesting logs and market-specific breakdowns.">
                {error && <div className="ds-alert ds-alert--error">{error}</div>}

                <div className="ds-table-overflow">
                    <Table
                        columns={columns}
                        data={sortedData}
                        rowKey={(record) => `${record.league_id}-${record.season_year}`}
                        loading={loadingOverview}
                        interactive={true}
                        onExpand={toggleExpand}
                        expandedRowKeys={expandedRowKeys}
                        expandedRowRender={(record) => (
                            <ExpandedLeagueStats
                                league_id={record.league_id}
                                season_year={record.season_year}
                            />
                        )}
                    />
                </div>
            </Card>
        </Stack>
    );
};

MLSimulationDashboard.propTypes = {}; // No props for the main dashboard

export default MLSimulationDashboard;
