import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Badge, Button, Card, Skeleton, Table } from '../../../../design-system';
import api from '../../../../services/api';
import { useSearchParams } from 'react-router-dom';
import { MLHubFiltersBar, MLHubHero, MLHubMetricStrip, MLHubSection } from './shared/MLHubSurface';
import MLHubGlossaryFooter from './shared/MLHubGlossaryFooter';
import { fmtDateTime, fmtPct } from './shared/mlUtils';
import './MLErrorLabPage.css';

const MARKET_OPTIONS = [
    { value: 'FT_1X2', label: '1X2 FT' },
    { value: 'HT_1X2', label: '1X2 HT' },
    { value: 'GOALS_OU', label: 'Goals O/U' },
    { value: 'CORNERS_OU', label: 'Corners O/U' },
    { value: 'CARDS_OU', label: 'Cards O/U' },
];

const ERROR_FILTERS = [
    { value: 'all', label: 'Tous les misses' },
    { value: 'confident', label: 'Confident misses' },
    { value: 'heavy', label: 'Heavy misses' },
    { value: 'close', label: 'Close calls' },
];

const computeSeverity = (row) => {
    if (row.display_mode === '1X2') {
        return Number.parseFloat(String(row.primary_probability || '').replace('%', '')) || 0;
    }
    const actual = Number(row.actual_numeric_value);
    const expected = Number(row.expected_total);
    return Number.isFinite(actual) && Number.isFinite(expected) ? Math.abs(actual - expected) : 0;
};

const classifyRow = (row) => {
    const severity = computeSeverity(row);
    const isCorrect = row.is_correct === 1 || row.is_correct === true;

    if (row.display_mode === '1X2') {
        if (!isCorrect && severity >= 55) return 'confident';
        if (isCorrect && severity <= 45) return 'close';
        return !isCorrect ? 'all' : 'hit';
    }

    if (severity >= 2) return 'heavy';
    if (severity <= 0.5) return 'close';
    return !isCorrect ? 'all' : 'hit';
};

const MLErrorLabPage = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const [runs, setRuns] = useState([]);
    const [filters, setFilters] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedRunId, setSelectedRunId] = useState('');
    const [selectedMarket, setSelectedMarket] = useState('FT_1X2');
    const [selectedErrorType, setSelectedErrorType] = useState('all');
    const [results, setResults] = useState([]);
    const [resultsLoading, setResultsLoading] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const [allRuns, filterRows] = await Promise.all([
                api.getAllSimulationJobs(),
                api.getMLSimulationFilters().catch(() => []),
            ]);
            setRuns(Array.isArray(allRuns) ? allRuns : []);
            setFilters(Array.isArray(filterRows) ? filterRows : []);
        } catch (err) {
            setError(err.message || 'Impossible de charger Error Lab.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    const leagueLookup = useMemo(() => {
        const map = new Map();
        for (const row of filters) {
            map.set(String(row.league_id), {
                leagueName: row.league_name,
                countryName: row.country_name || '',
            });
        }
        return map;
    }, [filters]);

    const completedRuns = useMemo(() => {
        return runs
            .filter((run) => run.status === 'COMPLETED')
            .map((run) => {
                const league = leagueLookup.get(String(run.league_id));
                return {
                    ...run,
                    leagueName: league?.leagueName || `League ${run.league_id}`,
                    countryName: league?.countryName || '',
                };
            })
            .sort((a, b) => Number(b.id) - Number(a.id));
    }, [leagueLookup, runs]);

    useEffect(() => {
        if (!completedRuns.length) return;
        const runFromQuery = searchParams.get('runId');
        if (runFromQuery && completedRuns.some((run) => String(run.id) === runFromQuery)) {
            setSelectedRunId(runFromQuery);
            return;
        }
        if (!selectedRunId) setSelectedRunId(String(completedRuns[0].id));
    }, [completedRuns, searchParams, selectedRunId]);

    useEffect(() => {
        const marketFromQuery = searchParams.get('market');
        if (marketFromQuery && MARKET_OPTIONS.some((market) => market.value === marketFromQuery)) {
            setSelectedMarket(marketFromQuery);
        }
    }, [searchParams]);

    useEffect(() => {
        const params = new URLSearchParams();
        if (selectedRunId) params.set('runId', selectedRunId);
        if (selectedMarket) params.set('market', selectedMarket);
        if (selectedErrorType) params.set('errorType', selectedErrorType);
        setSearchParams(params, { replace: true });
    }, [selectedErrorType, selectedMarket, selectedRunId, setSearchParams]);

    const selectedRun = useMemo(
        () => completedRuns.find((run) => String(run.id) === String(selectedRunId)) || null,
        [completedRuns, selectedRunId]
    );

    useEffect(() => {
        if (!selectedRunId) {
            setResults([]);
            return;
        }
        let cancelled = false;
        setResultsLoading(true);
        api.getSimulationResults(selectedRunId)
            .then((rows) => {
                if (!cancelled) setResults(Array.isArray(rows) ? rows : []);
            })
            .catch(() => {
                if (!cancelled) setResults([]);
            })
            .finally(() => {
                if (!cancelled) setResultsLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, [selectedRunId]);

    const marketRows = useMemo(
        () => results.filter((row) => row.market_type === selectedMarket),
        [results, selectedMarket]
    );

    const filteredErrors = useMemo(() => {
        const base = marketRows
            .map((row) => ({
                ...row,
                severity: computeSeverity(row),
                errorClass: classifyRow(row),
            }))
            .filter((row) => {
                if (selectedErrorType === 'all') return row.is_correct === 0 || row.is_correct === false;
                if (selectedErrorType === 'confident') return row.errorClass === 'confident';
                if (selectedErrorType === 'heavy') return row.errorClass === 'heavy';
                if (selectedErrorType === 'close') return row.errorClass === 'close';
                return true;
            });

        return base.sort((a, b) => b.severity - a.severity);
    }, [marketRows, selectedErrorType]);

    const stats = useMemo(() => {
        const total = marketRows.length;
        const misses = marketRows.filter((row) => row.is_correct === 0 || row.is_correct === false).length;
        const confident = marketRows.filter((row) => classifyRow(row) === 'confident').length;
        const heavy = marketRows.filter((row) => classifyRow(row) === 'heavy').length;
        return { total, misses, confident, heavy };
    }, [marketRows]);

    const filterControls = [
        {
            id: 'run',
            label: 'Run',
            value: selectedRunId,
            onChange: setSelectedRunId,
            searchable: true,
            options: completedRuns.map((run) => ({
                value: String(run.id),
                label: `#${run.id} · ${run.countryName ? `${run.countryName} · ` : ''}${run.leagueName} · ${run.season_year}`,
            })),
        },
        {
            id: 'market',
            label: 'Marché',
            value: selectedMarket,
            onChange: setSelectedMarket,
            options: MARKET_OPTIONS,
        },
        {
            id: 'errorType',
            label: "Type d'erreur",
            value: selectedErrorType,
            onChange: setSelectedErrorType,
            options: ERROR_FILTERS,
        },
    ];

    const statMetrics = [
        { label: 'Total marché', value: String(stats.total), subValue: 'Échantillon analysé' },
        { label: 'Misses', value: String(stats.misses), subValue: 'Erreurs franches', featured: true },
        { label: 'Confident', value: String(stats.confident), subValue: 'Ratés à forte confiance' },
        { label: 'Heavy', value: String(stats.heavy), subValue: 'Écarts structurels' },
    ];

    const errorColumns = [
        {
            key: 'fixture',
            title: 'Fixture',
            render: (_, row) => (
                <div className="ml-error-lab__error-title">
                    <strong>{row.home_team_name} vs {row.away_team_name}</strong>
                    <span>{fmtDateTime(row.fixture_date)}</span>
                </div>
            ),
        },
        {
            key: 'market',
            title: 'Marché',
            render: (_, row) => <Badge variant="danger" size="sm">{row.market_label}</Badge>,
        },
        { key: 'pick', title: 'Pick', dataIndex: 'predicted_outcome' },
        { key: 'actual', title: 'Réel', dataIndex: 'actual_result' },
        {
            key: 'severity',
            title: 'Sévérité',
            render: (_, row) => (row.display_mode === '1X2' ? fmtPct(row.severity, 1) : row.severity.toFixed(2)),
        },
    ];

    return (
        <div className="ml-error-lab">
            <MLHubHero
                badge={{ label: 'Failure Analysis', variant: 'primary' }}
                title="Error Lab"
                subtitle="Filtrer, hiérarchiser et comprendre les erreurs les plus sensibles du système."
                actions={<Button variant="ghost" onClick={load}>Rafraîchir</Button>}
            />

            {error ? <Card className="ml-error-lab__alert">{error}</Card> : null}

            {loading ? (
                <div className="ml-error-lab__loading">
                    <Skeleton height="48px" />
                    <Skeleton height="48px" />
                    <Skeleton height="48px" />
                </div>
            ) : (
                <MLHubFiltersBar filters={filterControls} />
            )}

            <MLHubMetricStrip metrics={statMetrics} />

            <section className="ml-error-lab__panel-stack">
                <MLHubSection
                    title="Erreurs filtrées"
                    subtitle="Tableau propre des erreurs triées par sévérité."
                    badge={selectedRun ? { label: `#${selectedRun.id}`, variant: 'neutral' } : null}
                    className="ml-error-lab__panel"
                >
                    {resultsLoading ? (
                        <Skeleton height="320px" />
                    ) : filteredErrors.length ? (
                        <Table
                            columns={errorColumns}
                            data={filteredErrors.slice(0, 40).map((row, index) => ({ ...row, error_key: `${row.fixture_id}-${row.market_type}-${index}` }))}
                            rowKey="error_key"
                            className="ml-error-lab__error-table"
                        />
                    ) : (
                        <p className="ml-error-lab__empty">Aucune erreur pour ce filtre.</p>
                    )}
                </MLHubSection>
            </section>
            <MLHubGlossaryFooter topic="analytics" />
        </div>
    );
};

export default MLErrorLabPage;
