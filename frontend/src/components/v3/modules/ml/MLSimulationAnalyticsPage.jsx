import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Badge, Button, Card, Skeleton, Table } from '../../../../design-system';
import api from '../../../../services/api';
import { useNavigate } from 'react-router-dom';
import { MLHubFiltersBar, MLHubHero, MLHubMetricStrip, MLHubSection } from './shared/MLHubSurface';
import { fmtDateTime, fmtDecimal, fmtPct, getStatusVariant } from './shared/mlUtils';
import { MarketHealthGrid, TopMissesList } from './submodules/MLAnalyticsComponents';
import MLHubGlossaryFooter from './shared/MLHubGlossaryFooter';
import './MLSimulationAnalyticsPage.css';

const MARKET_FILTERS = [
    { value: 'FT_1X2', label: '1X2 FT' },
    { value: 'HT_1X2', label: '1X2 HT' },
    { value: 'GOALS_OU', label: 'Goals O/U' },
    { value: 'CORNERS_OU', label: 'Corners O/U' },
    { value: 'CARDS_OU', label: 'Cards O/U' },
];

const getScoreLabel = (marketType, metrics) => {
    if (!metrics) return '—';
    if (marketType === 'FT_1X2' || marketType === 'HT_1X2') {
        return `Acc ${fmtPct(metrics.accuracy, 100)} · LL ${fmtDecimal(metrics.log_loss)}`;
    }
    return `Hit ${fmtPct(metrics.hit_rate, 100)} · MAE ${fmtDecimal(metrics.mae_total)}`;
};

const buildMarketLeagueRows = (runs) => {
    const rows = [];
    for (const run of runs) {
        const markets = run?.metrics?.markets || {};
        for (const market of MARKET_FILTERS) {
            const metrics = markets[market.value];
            if (!metrics) continue;
            rows.push({
                runId: run.id,
                leagueId: run.league_id,
                leagueName: run.leagueName,
                countryName: run.countryName,
                seasonYear: run.season_year,
                horizonType: run.horizon_type,
                status: run.status,
                marketType: market.value,
                marketLabel: market.label,
                metrics,
            });
        }
    }
    return rows;
};

const computeErrorBuckets = (rows) => {
    const counters = { total: rows.length, hits: 0, misses: 0, confidentMisses: 0, closeCalls: 0, heavyMisses: 0 };
    for (const row of rows) {
        const isCorrect = row.is_correct === 1 || row.is_correct === true;
        if (isCorrect) counters.hits += 1;
        else if (row.is_correct === 0 || row.is_correct === false) counters.misses += 1;

        if (row.display_mode === '1X2') {
            const prob = Number.parseFloat(String(row.primary_probability || '').replace('%', ''));
            if (!isCorrect && prob >= 55) counters.confidentMisses += 1;
            if (isCorrect && prob <= 45) counters.closeCalls += 1;
        } else {
            const delta = Math.abs(Number(row.actual_numeric_value) - Number(row.expected_total));
            if (Number.isFinite(delta)) {
                if (delta >= 2) counters.heavyMisses += 1;
                if (delta <= 0.5) counters.closeCalls += 1;
            }
        }
    }
    return counters;
};

const computeConfidenceSegments = (rows) => {
    const segments = [
        { key: 'high', label: '65%+', min: 65, max: Infinity, total: 0, hits: 0 },
        { key: 'mid', label: '50-64%', min: 50, max: 65, total: 0, hits: 0 },
        { key: 'low', label: '<50%', min: -Infinity, max: 50, total: 0, hits: 0 },
    ];

    for (const row of rows) {
        const isCorrect = row.is_correct === 1 || row.is_correct === true;
        let signal = null;
        if (row.display_mode === '1X2') {
            signal = Number.parseFloat(String(row.primary_probability || '').replace('%', ''));
        } else {
            const actual = Number(row.actual_numeric_value);
            const expected = Number(row.expected_total);
            if (Number.isFinite(actual) && Number.isFinite(expected)) {
                const delta = Math.abs(actual - expected);
                signal = Math.max(0, Math.min(100, 100 - (delta * 20)));
            }
        }

        if (!Number.isFinite(signal)) continue;
        const bucket = segments.find((segment) => signal >= segment.min && signal < segment.max);
        if (!bucket) continue;
        bucket.total += 1;
        if (isCorrect) bucket.hits += 1;
    }

    return segments.map((segment) => ({
        ...segment,
        hitRate: segment.total ? segment.hits / segment.total : null,
    }));
};

const MLSimulationAnalyticsPage = () => {
    const navigate = useNavigate();
    const [runs, setRuns] = useState([]);
    const [filters, setFilters] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedMarket, setSelectedMarket] = useState('FT_1X2');
    const [selectedRunId, setSelectedRunId] = useState(null);
    const [selectedLeagueId, setSelectedLeagueId] = useState('all');
    const [selectedSeason, setSelectedSeason] = useState('all');
    const [selectedHorizon, setSelectedHorizon] = useState('all');
    const [runResults, setRunResults] = useState([]);
    const [resultsLoading, setResultsLoading] = useState(false);
    const [selectedFixtureId, setSelectedFixtureId] = useState(null);

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
            setError(err.message || 'Impossible de charger les analytics.');
            setRuns([]);
            setFilters([]);
        } finally { setLoading(false); }
    }, []);

    useEffect(() => { load(); }, [load]);

    const leagueLookup = useMemo(() => {
        const map = new Map();
        for (const row of filters) {
            map.set(String(row.league_id), { leagueName: row.league_name, countryName: row.country_name || '' });
        }
        return map;
    }, [filters]);

    const enrichedRuns = useMemo(() => {
        return (runs || []).map((run) => {
            const league = leagueLookup.get(String(run.league_id));
            return {
                ...run,
                leagueName: league?.leagueName || `League ${run.league_id}`,
                countryName: league?.countryName || '',
            };
        });
    }, [leagueLookup, runs]);

    const availableLeagues = useMemo(() => {
        const map = new Map();
        for (const run of enrichedRuns) {
            const key = String(run.league_id);
            if (!map.has(key)) map.set(key, { leagueId: key, leagueName: run.leagueName, countryName: run.countryName });
        }
        return [...map.values()].sort((a, b) => a.leagueName.localeCompare(b.leagueName));
    }, [enrichedRuns]);

    const filteredRuns = useMemo(() => {
        return enrichedRuns.filter((run) => {
            if (selectedLeagueId !== 'all' && String(run.league_id) !== selectedLeagueId) return false;
            if (selectedSeason !== 'all' && String(run.season_year) !== selectedSeason) return false;
            if (selectedHorizon !== 'all' && run.horizon_type !== selectedHorizon) return false;
            return true;
        });
    }, [enrichedRuns, selectedHorizon, selectedLeagueId, selectedSeason]);

    const marketLeagueRows = useMemo(() => {
        return buildMarketLeagueRows(filteredRuns)
            .filter((row) => row.marketType === selectedMarket)
            .sort((a, b) => {
                const aScore = a.marketType.includes('1X2') ? Number(a.metrics.accuracy || 0) : Number(a.metrics.hit_rate || 0);
                const bScore = b.marketType.includes('1X2') ? Number(b.metrics.accuracy || 0) : Number(b.metrics.hit_rate || 0);
                return bScore - aScore;
            });
    }, [filteredRuns, selectedMarket]);

    useEffect(() => {
        if (!marketLeagueRows.length) { setSelectedRunId(null); setRunResults([]); return; }
        if (!marketLeagueRows.some(row => row.runId === selectedRunId)) setSelectedRunId(marketLeagueRows[0].runId);
    }, [marketLeagueRows, selectedRunId]);

    useEffect(() => {
        if (!selectedRunId) { setRunResults([]); return; }
        setResultsLoading(true);
        api.getSimulationResults(selectedRunId)
            .then(rows => setRunResults(Array.isArray(rows) ? rows : []))
            .catch(() => setRunResults([]))
            .finally(() => setResultsLoading(false));
    }, [selectedRunId]);

    const selectedMarketRows = useMemo(() => runResults.filter(row => row.market_type === selectedMarket), [runResults, selectedMarket]);
    const errorBuckets = useMemo(() => computeErrorBuckets(selectedMarketRows), [selectedMarketRows]);
    const confidenceSegments = useMemo(() => computeConfidenceSegments(selectedMarketRows), [selectedMarketRows]);

    const marketHealthCards = useMemo(() => {
        return MARKET_FILTERS.map(market => {
            const candidates = buildMarketLeagueRows(filteredRuns).filter(row => row.marketType === market.value);
            if (!candidates.length) return { value: market.value, label: market.label, healthLabel: 'N/A', healthVariant: 'neutral', primaryMetric: '—', secondaryMetric: 'Aucun run' };
            const scored = candidates.map(c => ({ ...c, score: market.value.includes('1X2') ? c.metrics.accuracy : c.metrics.hit_rate }));
            const best = scored.sort((a, b) => b.score - a.score)[0];
            return {
                value: market.value,
                label: market.label,
                healthLabel: `${candidates.length} runs`,
                healthVariant: 'neutral',
                primaryMetric: fmtPct(best.score, 100),
                secondaryMetric: best.leagueName,
            };
        });
    }, [filteredRuns]);

    const topMisses = useMemo(() => {
        return selectedMarketRows
            .filter(row => row.is_correct === 0 || row.is_correct === false)
            .map(row => ({
                ...row,
                severity: row.display_mode === '1X2' 
                    ? (Number.parseFloat(String(row.primary_probability || '').replace('%', '')) || 0)
                    : Math.abs(Number(row.actual_numeric_value) - Number(row.expected_total)),
            }))
            .sort((a, b) => b.severity - a.severity)
            .slice(0, 8);
    }, [selectedMarketRows]);

    useEffect(() => {
        if (!selectedMarketRows.length) { setSelectedFixtureId(null); return; }
        if (!selectedMarketRows.some(row => row.fixture_id === selectedFixtureId)) setSelectedFixtureId(selectedMarketRows[0].fixture_id);
    }, [selectedFixtureId, selectedMarketRows]);

    return (
        <div className="ml-sim-analytics">
            <MLHubHero title="Analyse" subtitle="Comparer les runs et isoler les marchés robustes." actions={<Button variant="ghost" onClick={load}>Rafraîchir</Button>} />
            {error ? <Card className="ml-sim-analytics__alert">{error}</Card> : null}

            <MLHubFiltersBar filters={[
                { id: 'market', label: 'Marché', value: selectedMarket, onChange: setSelectedMarket, options: MARKET_FILTERS },
                { id: 'league', label: 'Ligue', value: selectedLeagueId, onChange: setSelectedLeagueId, options: [{ value: 'all', label: 'Toutes' }, ...availableLeagues.map(l => ({ value: l.leagueId, label: l.leagueName }))] },
            ]} />

            {loading ? <Skeleton height="200px" /> : (
                <>
                    <MLHubMetricStrip metrics={[
                        { label: 'Runs filtrés', value: String(filteredRuns.length), subValue: 'Périmètre actuel' },
                        { label: 'Misses', value: String(errorBuckets.misses), subValue: 'Sur le marché actif', featured: true },
                        { label: 'Confidence misses', value: String(errorBuckets.confidentMisses), subValue: 'Picks ratés haute conf' },
                    ]} />

                    <section className="ml-sim-analytics__market-health">
                        <MarketHealthGrid marketSummaries={marketHealthCards} selectedMarket={selectedMarket} onMarketSelect={setSelectedMarket} />
                    </section>

                    <section className="ml-sim-analytics__grid">
                        <MLHubSection title="Leaderboard" subtitle="Runs par performance sur le marché sélectionné." className="ml-sim-analytics__panel ml-sim-analytics__panel--wide">
                            <Table
                                columns={[
                                    { key: 'run', title: 'Run', render: (_, r) => `#${r.runId}` },
                                    { key: 'league', title: 'Ligue', render: (_, r) => <strong>{r.leagueName}</strong> },
                                    { key: 'season', title: 'Saison', dataIndex: 'seasonYear' },
                                    { key: 'score', title: 'Score', render: (_, r) => getScoreLabel(r.marketType, r.metrics) },
                                ]}
                                data={marketLeagueRows.slice(0, 10)}
                                rowKey="runId"
                                interactive
                                onRowClick={(row) => setSelectedRunId(row.runId)}
                            />
                        </MLHubSection>
                        <Card className="ml-sim-analytics__panel">
                            <div className="ml-sim-analytics__panel-head">
                                <div>
                                    <div className="ml-sim-analytics__kicker">Radar qualité</div>
                                    <h3>Pattern d'erreurs</h3>
                                </div>
                            </div>
                            <div className="ml-sim-analytics__quality-grid">
                                <div className="ml-sim-analytics__quality-item"><span>Hits</span><strong>{errorBuckets.hits}</strong></div>
                                <div className="ml-sim-analytics__quality-item"><span>Misses</span><strong>{errorBuckets.misses}</strong></div>
                                <div className="ml-sim-analytics__quality-item"><span>Close calls</span><strong>{errorBuckets.closeCalls}</strong></div>
                            </div>
                            <div className="ml-sim-analytics__confidence-list">
                                {confidenceSegments.map(s => (
                                    <div key={s.key} className="ml-sim-analytics__confidence-item">
                                        <span>{s.label}</span>
                                        <strong>{s.hitRate == null ? '—' : fmtPct(s.hitRate, 100)}</strong>
                                    </div>
                                ))}
                            </div>
                        </Card>
                    </section>

                    <section className="ml-sim-analytics__grid">
                        <MLHubSection title="Top Misses" subtitle="Fixtures avec le plus gros écart modèle vs réalité." className="ml-sim-analytics__panel ml-sim-analytics__panel--wide">
                             {resultsLoading ? <Skeleton height="200px" /> : <TopMissesList misses={topMisses} />}
                        </MLHubSection>
                        <Card className="ml-sim-analytics__panel">
                            <h3>Focus Match</h3>
                            <p className="ml-sim-analytics__empty">Sélectionne une fixture pour voir le drill-down.</p>
                            <Button variant="ghost" disabled>Ouvrir Match Premium</Button>
                        </Card>
                    </section>
                </>
            )}
            <MLHubGlossaryFooter topic="analytics" />
        </div>
    );
};

export default MLSimulationAnalyticsPage;
