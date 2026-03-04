import React, { useState, useEffect } from 'react';
import api from '../../../services/api';
import { Card, Badge, Table, Button } from '../../../design-system';

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

    if (loading) return <div className="p-md ds-text-center"><div className="ds-button-spinner"></div> Loading details...</div>;
    if (error) return <div className="p-md ds-text-danger-400">{error}</div>;

    return (
        <div className="ds-p-sm" style={{ background: 'var(--color-bg-base)', borderTop: '1px solid var(--color-border)', borderBottom: '1px solid var(--color-border)' }}>
            <div className="ds-border ds-border-neutral-800 ds-rounded-lg" style={{ maxHeight: '350px', overflowY: 'auto' }}>
                <Table
                    columns={detailColumns}
                    data={details}
                    rowKey={(record) => `${record.fixture_id}-${record.market}`}
                />
            </div>
        </div>
    );
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
                setOverviewData(res.data || []);
            } catch (err) {
                console.error("Failed to load generic overview", err);
                setError("Failed to fetch simulation overview.");
            } finally {
                setLoadingOverview(false);
            }
        };
        fetchOverview();
    }, []);

    /*
     * [!TIP]
     * > **Trend Analysis Strategy**: By including `captured_at` in the Primary Key, we store the full "Line Movement". This allows future ML models to calculate deltas between Opening, Intermediate, and Closing prices (Smart Money signals).
     * >
     * > **Data Retention**: We will **NOT** delete pre-match snapshots after the match ends. Keeping the full history is essential for training the ML model to recognize betting patterns. We will monitor DB size but prioritize "Data Quality" over "Storage Space".
     */
    const formatHitRate = (rate) => {
        if (rate === null || rate === undefined) return '-';
        const pct = rate * 100;
        let colorClass = 'ds-text-neutral-300';
        if (pct >= 55) colorClass = 'ds-text-success-400';
        else if (pct < 45) colorClass = 'ds-text-danger-400';

        return <span className={`ds-font-bold ${colorClass}`}>{pct.toFixed(1)}%</span>;
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

    const sortedData = [...overviewData].sort((a, b) => {
        const key = sortConfig.key;

        // Custom Nested Sort for importance_rank
        if (key === 'importance_rank') {
            const countryA = a.country_importance_rank ?? 999;
            const countryB = b.country_importance_rank ?? 999;
            if (countryA !== countryB) {
                return sortConfig.direction === 'ASC' ? countryA - countryB : countryB - countryA;
            }
            const leagueA = a.league_importance_rank ?? 999;
            const leagueB = b.league_importance_rank ?? 999;
            return sortConfig.direction === 'ASC' ? leagueA - leagueB : leagueB - leagueA;
        }

        let valA = a[key] ?? 0;
        let valB = b[key] ?? 0;

        // String comparison
        if (typeof valA === 'string' && typeof valB === 'string') {
            return sortConfig.direction === 'ASC'
                ? valA.localeCompare(valB)
                : valB.localeCompare(valA);
        }

        // Numeric comparison
        return sortConfig.direction === 'ASC' ? valA - valB : valB - valA;
    });

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
            title: 'Global Hit Rate',
            dataIndex: 'global_hit_rate',
            key: 'global_hit_rate',
            width: '130px',
            align: 'right',
            render: formatHitRate
        },
        {
            title: 'Brier Score',
            dataIndex: 'brier_score',
            key: 'brier_score',
            width: '120px',
            align: 'right',
            render: (val) => val ? val.toFixed(3) : '-'
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
    ].map(col => ({
        ...col,
        title: col.key !== 'action' ? (
            <div
                onClick={(e) => { e.stopPropagation(); handleSort(col.key); }}
                style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', justifyContent: col.align === 'center' ? 'center' : col.align === 'right' ? 'flex-end' : 'flex-start' }}
            >
                {col.title}
                {sortConfig.key === col.key && (
                    <span style={{ fontSize: '10px', color: 'var(--color-primary-400)' }}>
                        {sortConfig.direction === 'DESC' ? '▼' : '▲'}
                    </span>
                )}
            </div>
        ) : col.title
    }));

    return (
        <Card style={{ height: 'calc(100vh - 120px)', display: 'flex', flexDirection: 'column', padding: 'var(--spacing-md)' }}>
            <div className="ds-card-body ds-flex ds-flex-col ds-gap-xl" style={{ flex: 1, overflowY: 'auto', paddingRight: 'var(--spacing-sm)' }}>
                {error && <div className="ds-alert ds-alert--error">{error}</div>}

                <div className="ds-flex ds-flex-col ds-gap-md" style={{ flex: 1 }}>
                    <div>
                        <h2 className="ds-text-heading-3 mb-xs">Simulation Overview</h2>
                        <p className="ds-text-body ds-text-neutral-400">
                            Global algorithmic performance. Click any row to expand deep-dive backtesting logs.
                        </p>
                    </div>

                    <div className="ds-border ds-border-neutral-800 ds-rounded-lg" style={{ overflow: 'hidden', flex: 1, display: 'flex', flexDirection: 'column' }}>
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
                            style={{ flex: 1 }}
                        />
                    </div>
                </div>

            </div>
        </Card>
    );
};

export default MLSimulationDashboard;
