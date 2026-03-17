import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Badge, Button, Card, Progress, Skeleton, Table } from '../../../../design-system';
import api from '../../../../services/api';
import { MLHubEmptyState, MLHubFiltersBar, MLHubHero, MLHubMetricStrip, MLHubSection } from './shared/MLHubSurface';
import { fmtDateTime, getStatusVariant, STATUS_COPY } from './shared/mlUtils';
import { useMLSimulation } from './shared/useMLSimulation';
import { SimulationResultsTable } from './submodules/MLOrchestratorComponents';
import './MLOrchestratorPage.css';

const HORIZON_OPTIONS = [
    { value: 'FULL_HISTORICAL', label: 'Full Historical' },
    { value: '5Y_ROLLING', label: '5Y Rolling' },
    { value: '3Y_ROLLING', label: '3Y Rolling' },
];

const MARKET_FILTERS = [
    { value: 'FT_1X2', label: '1X2' },
    { value: 'HT_1X2', label: 'HT' },
    { value: 'GOALS_OU', label: 'Goals' },
    { value: 'CORNERS_OU', label: 'Corners' },
    { value: 'CARDS_OU', label: 'Cards' },
];

const buildFilterRowsFromOverview = (rows) => {
    const seen = new Set();
    const normalized = [];

    for (const row of rows || []) {
        if (!row?.league_id || !row?.season_year || !row?.league_name) continue;
        const key = `${row.league_id}-${row.season_year}`;
        if (seen.has(key)) continue;
        seen.add(key);
        normalized.push({
            league_id: row.league_id,
            league_name: row.league_name,
            season_year: row.season_year,
            country_name: row.country_name || '',
            flag_url: row.flag_url || '',
        });
    }

    return normalized.sort((a, b) =>
        a.league_name.localeCompare(b.league_name) || Number(b.season_year) - Number(a.season_year)
    );
};

const formatMarketSnapshot = (marketKey, metrics) => {
    if (!metrics) return '—';
    const accuracy = metrics.accuracy ?? metrics.hit_rate;
    if (!accuracy) return '—';
    
    const accuracyPct = Math.round(Number(accuracy) * 100) + '%';
    const detail = marketKey === 'FT_1X2' || marketKey === 'HT_1X2'
        ? `LL ${(metrics.log_loss || 0).toFixed(3)}`
        : `MAE ${(metrics.mae_total || 0).toFixed(3)}`;
    
    return `${accuracyPct} · ${detail}`;
};

const MLOrchestratorPage = () => {
    const [filters, setFilters] = useState([]);
    const [loadingFilters, setLoadingFilters] = useState(true);
    const [filtersError, setFiltersError] = useState(null);

    const [selectedLeagueId, setSelectedLeagueId] = useState('');
    const [selectedSeasonYear, setSelectedSeasonYear] = useState('');
    const [selectedHorizon, setSelectedHorizon] = useState('FULL_HISTORICAL');
    const [selectedMarket, setSelectedMarket] = useState('FT_1X2');

    const [recentRuns, setRecentRuns] = useState([]);
    const [allRuns, setAllRuns] = useState([]);

    const {
        status,
        results,
        loading: resultsLoading,
        error: runError,
        readiness,
        readinessLoading,
        activeSimulationId,
        fetchStatusBundle,
        fetchResults,
        fetchReadiness,
        startSimulation,
        setStatus,
        setActiveSimulationId,
        marketSummaries,
        summaryMetrics,
    } = useMLSimulation();

    const fetchAllRuns = useCallback(async () => {
        try {
            const rows = await api.getAllSimulationJobs();
            setAllRuns(Array.isArray(rows) ? rows : []);
        } catch {
            setAllRuns([]);
        }
    }, []);

    const groupedLeagues = useMemo(() => {
        const byLeague = {};
        for (const row of filters) {
            const leagueKey = String(row.league_id);
            if (!byLeague[leagueKey]) {
                byLeague[leagueKey] = {
                    leagueId: String(row.league_id),
                    leagueName: row.league_name,
                    countryName: row.country_name || '',
                    flagUrl: row.flag_url || '',
                    seasons: [],
                };
            }
            byLeague[leagueKey].seasons.push(String(row.season_year));
        }
        return Object.values(byLeague)
            .map((league) => ({
                ...league,
                seasons: [...new Set(league.seasons)].sort((a, b) => Number(b) - Number(a)),
            }))
            .sort((a, b) => a.leagueName.localeCompare(b.leagueName));
    }, [filters]);

    const selectedLeague = useMemo(
        () => groupedLeagues.find((league) => league.leagueId === selectedLeagueId) || null,
        [groupedLeagues, selectedLeagueId]
    );

    const selectedRun = useMemo(() => {
        if (status?.id) return status;
        return recentRuns.find((run) => run.horizon_type === selectedHorizon) || recentRuns[0] || null;
    }, [recentRuns, selectedHorizon, status]);

    const availableMarkets = useMemo(() => {
        return new Set((results || []).map((row) => row.market_type).filter(Boolean));
    }, [results]);

    const filteredResults = useMemo(() => {
        return (results || []).filter((row) => (row.market_type || 'FT_1X2') === selectedMarket);
    }, [results, selectedMarket]);

    const aggregateRuns = useMemo(() => {
        const latestByScope = new Map();
        for (const run of allRuns) {
            if (!run?.league_id || !run?.season_year || !run?.horizon_type) continue;
            const key = `${run.league_id}-${run.season_year}-${run.horizon_type}`;
            const current = latestByScope.get(key);
            if (!current || Number(run.id) > Number(current.id)) latestByScope.set(key, run);
        }

        const leagueLookup = new Map(groupedLeagues.map((league) => [league.leagueId, league]));

        return [...latestByScope.values()]
            .filter((run) => !selectedHorizon || run.horizon_type === selectedHorizon)
            .map((run) => {
                const league = leagueLookup.get(String(run.league_id));
                return {
                    ...run,
                    leagueName: league?.leagueName || `League ${run.league_id}`,
                    countryName: league?.countryName || '',
                    marketMetrics: run.metrics?.markets || {},
                };
            })
            .sort((a, b) => {
                if (String(a.league_id) === String(selectedLeagueId) && String(b.league_id) !== String(selectedLeagueId)) return -1;
                if (String(b.league_id) === String(selectedLeagueId) && String(a.league_id) !== String(selectedLeagueId)) return 1;
                if ((b.season_year || 0) !== (a.season_year || 0)) return Number(b.season_year || 0) - Number(a.season_year || 0);
                return a.leagueName.localeCompare(b.leagueName);
            });
    }, [allRuns, groupedLeagues, selectedHorizon, selectedLeagueId]);

    const loadFilters = useCallback(async () => {
        setLoadingFilters(true);
        setFiltersError(null);
        try {
            let rows = [];
            try {
                const primaryRows = await api.getMLSimulationFilters();
                rows = Array.isArray(primaryRows) ? primaryRows : [];
            } catch { rows = []; }

            if (!rows.length) {
                const overviewRows = await api.getMLSimulationOverview();
                rows = buildFilterRowsFromOverview(Array.isArray(overviewRows) ? overviewRows : []);
            }
            setFilters(rows);
        } catch (error) {
            setFiltersError(error.message || 'Impossible de charger les filtres.');
            setFilters([]);
        } finally { setLoadingFilters(false); }
    }, []);

    useEffect(() => { loadFilters(); fetchAllRuns(); }, [loadFilters, fetchAllRuns]);

    useEffect(() => {
        if (!groupedLeagues.length) return;
        if (!selectedLeagueId) {
            setSelectedLeagueId(groupedLeagues[0].leagueId);
            setSelectedSeasonYear(groupedLeagues[0].seasons[0] || '');
            return;
        }
        if (selectedLeague && !selectedLeague.seasons.includes(selectedSeasonYear)) {
            setSelectedSeasonYear(selectedLeague.seasons[0] || '');
        }
    }, [groupedLeagues, selectedLeague, selectedLeagueId, selectedSeasonYear]);

    useEffect(() => {
        if (!selectedLeagueId || !selectedSeasonYear) return;
        setActiveSimulationId(null);
        fetchReadiness(selectedLeagueId, selectedSeasonYear);
        fetchStatusBundle(selectedLeagueId, selectedSeasonYear, selectedHorizon);
        api.getLeagueSimulations(selectedLeagueId).then(rows => setRecentRuns(Array.isArray(rows) ? rows : []));
    }, [fetchReadiness, fetchStatusBundle, selectedHorizon, selectedLeagueId, selectedSeasonYear, setActiveSimulationId]);

    useEffect(() => {
        const currentStatus = status?.status;
        if (currentStatus !== 'RUNNING' && currentStatus !== 'PENDING') return undefined;
        const interval = setInterval(() => fetchStatusBundle(selectedLeagueId, selectedSeasonYear, selectedHorizon, activeSimulationId), 5000);
        return () => clearInterval(interval);
    }, [fetchStatusBundle, status, selectedLeagueId, selectedSeasonYear, selectedHorizon, activeSimulationId]);

    const handleLaunch = async () => {
        await startSimulation({ leagueId: selectedLeagueId, seasonYear: selectedSeasonYear, horizon: selectedHorizon });
        fetchAllRuns();
    };

    const topMetrics = [
        { label: 'Readiness', value: readinessLoading ? '…' : STATUS_COPY[readiness?.status] || '—', subValue: readiness?.message || 'Préflight check', featured: true },
        { label: 'Run status', value: STATUS_COPY[status?.status || readiness?.status || 'NONE'], subValue: selectedRun?.stage || 'Aucun stage actif' },
        { label: 'Progression', value: `${status?.progress || 0}%`, subValue: selectedRun?.current_month ? `Mois ${selectedRun.current_month}` : 'Chronologie' },
        { label: 'Matchs visibles', value: String(results.length), subValue: selectedRun?.id ? `Run #${selectedRun.id}` : 'Aucun résultat' },
    ];

    const aggregateColumns = [
        { key: 'league', title: 'Ligue', render: (_, run) => (
            <button type="button" className="ml-orch__aggregate-link" onClick={() => {
                setActiveSimulationId(run.id); setSelectedLeagueId(String(run.league_id)); setSelectedSeasonYear(String(run.season_year)); setStatus(run); fetchResults(run.id);
            }}>
                <strong>{run.leagueName}</strong><span>{run.countryName}</span>
            </button>
        )},
        { key: 'season', title: 'Saison', dataIndex: 'season_year' },
        { key: 'status', title: 'Statut', dataIndex: 'status', render: (val) => <Badge variant={getStatusVariant(val)} size="sm">{STATUS_COPY[val] || val}</Badge> },
        { key: 'ft', title: 'FT', render: (_, run) => formatMarketSnapshot('FT_1X2', run.marketMetrics.FT_1X2) },
        { key: 'ht', title: 'HT', render: (_, run) => formatMarketSnapshot('HT_1X2', run.marketMetrics.HT_1X2) },
        { key: 'goals', title: 'Goals', render: (_, run) => formatMarketSnapshot('GOALS_OU', run.marketMetrics.GOALS_OU) },
        { key: 'corners', title: 'Corners', render: (_, run) => formatMarketSnapshot('CORNERS_OU', run.marketMetrics.CORNERS_OU) },
        { key: 'cards', title: 'Cards', render: (_, run) => formatMarketSnapshot('CARDS_OU', run.marketMetrics.CARDS_OU) },
    ];

    return (
        <div className="ml-orch">
            <MLHubHero title="Système" subtitle="Piloter une simulation et suivre son exécution." actions={(
                <>
                    <Button variant="ghost" onClick={() => fetchStatusBundle(selectedLeagueId, selectedSeasonYear, selectedHorizon)}>Rafraîchir</Button>
                    <Button variant="primary" onClick={handleLaunch} disabled={readiness?.status !== 'READY'}>Lancer simulation</Button>
                </>
            )} />

            {filtersError || runError ? <Card className="ml-orch__alert ml-orch__alert--error">{filtersError || runError}</Card> : null}

            {loadingFilters ? <Skeleton height="44px" /> : <MLHubFiltersBar filters={[
                { id: 'league', label: 'Ligue', value: selectedLeagueId, onChange: setSelectedLeagueId, options: groupedLeagues.map(l => ({ value: l.leagueId, label: `${l.countryName} · ${l.leagueName}` })) },
                { id: 'season', label: 'Saison', value: selectedSeasonYear, onChange: setSelectedSeasonYear, options: (selectedLeague?.seasons || []).map(s => ({ value: s, label: s })) },
                { id: 'horizon', label: 'Horizon', value: selectedHorizon, onChange: setSelectedHorizon, options: HORIZON_OPTIONS },
            ]} />}

            <MLHubMetricStrip metrics={topMetrics} />

            <MLHubSection title="Lecture agrégée" subtitle="Derniers runs disponibles.">
                <Table columns={aggregateColumns} data={aggregateRuns} rowKey="id" interactive className="plain ml-orch__aggregate-table-ds" />
            </MLHubSection>

            <section className="ml-orch__main">
                <div className="ml-orch__column ml-orch__column--primary">
                    <MLHubSection title="Lecture temps réel" subtitle="Pilotage du run actif." badge={{ label: STATUS_COPY[status?.status || readiness?.status] || 'NONE', variant: getStatusVariant(status?.status || readiness?.status) }}>
                        <Progress value={status?.progress || 0} />
                        <div className="ml-orch__summary-grid">
                            <div className="ml-orch__summary-item"><span>Features</span><strong>{readiness?.feature_coverage}%</strong></div>
                            <div className="ml-orch__summary-item"><span>Fixtures</span><strong>{readiness?.total_fixtures}</strong></div>
                            <div className="ml-orch__summary-item"><span>Modèle</span><strong>{readiness?.has_model ? 'Oui' : 'Non'}</strong></div>
                        </div>
                    </MLHubSection>

                    <MLHubSection title="Predictions vs réalité" subtitle="Détail match par match.">
                        <div className="ml-orch__market-filters">
                            {MARKET_FILTERS.map(m => (
                                <Button key={m.value} variant={selectedMarket === m.value ? 'primary' : 'ghost'} size="sm" disabled={!availableMarkets.has(m.value)} onClick={() => setSelectedMarket(m.value)}>
                                    {m.label}
                                </Button>
                            ))}
                        </div>
                        {marketSummaries.length === 0 ? null : (
                            <MLHubMetricStrip
                                metrics={marketSummaries.map((market) => ({
                                    label: market.label,
                                    value: market.metrics[0]?.value || '—',
                                    subValue: market.metrics.slice(1).map((metric) => `${metric.label} ${metric.value}`).join(' · '),
                                    featured: market.value === selectedMarket,
                                }))}
                            />
                        )}
                        {resultsLoading ? <Skeleton height="200px" /> : <SimulationResultsTable results={filteredResults} selectedMarket={selectedMarket} />}
                    </MLHubSection>
                </div>

                <div className="ml-orch__column ml-orch__column--secondary">
                    <MLHubSection title="Résumé du run" subtitle="Dernière MAE / Accuracy.">
                        <div className="ml-orch__sidebar-list">
                            <div className="ml-orch__sidebar-row"><span>Dernier HB</span><strong>{fmtDateTime(selectedRun?.last_heartbeat || selectedRun?.created_at)}</strong></div>
                            <div className="ml-orch__sidebar-row"><span>Stage</span><strong>{selectedRun?.stage || '—'}</strong></div>
                            <div className="ml-orch__sidebar-row">
                                <span>Mode</span>
                                <strong>STATIC</strong>
                            </div>
                            <div className="ml-orch__sidebar-row">
                                <span>Horizon demandé</span>
                                <strong>{selectedHorizon}</strong>
                            </div>
                        </div>
                        {summaryMetrics.length ? (
                            <div className="ml-orch__metric-pills">
                                {summaryMetrics.map((metric) => (
                                    <div key={metric.key} className="ml-orch__metric-pill">
                                        <span>{metric.label}</span>
                                        <strong>{metric.value}</strong>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="ml-orch__sidebar-empty">
                                Les métriques finales du run s’affichent ici dès qu’un résumé est disponible.
                            </p>
                        )}
                    </MLHubSection>

                    <MLHubSection title="Runs récents" subtitle="Basculer rapidement vers un run précédent sur le même scope.">
                        {recentRuns.length === 0 ? (
                            <p className="ml-orch__sidebar-empty">Aucun run enregistré pour cette ligue.</p>
                        ) : (
                            <div className="ml-orch__run-list">
                                {recentRuns.slice(0, 8).map((run) => (
                                    <button
                                        key={run.id}
                                        type="button"
                                        className={`ml-orch__run-item ${selectedRun?.id === run.id ? 'ml-orch__run-item--active' : ''}`}
                                        onClick={() => {
                                            setStatus(run);
                                            fetchResults(run.id);
                                        }}
                                    >
                                        <div className="ml-orch__run-item-top">
                                            <strong>Run #{run.id}</strong>
                                            <Badge variant={getStatusVariant(run.status)} size="sm">
                                                {STATUS_COPY[run.status] || run.status}
                                            </Badge>
                                        </div>
                                        <div className="ml-orch__run-item-meta">
                                            <span>{run.horizon_type}</span>
                                            <span>{fmtDateTime(run.last_heartbeat || run.created_at)}</span>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </MLHubSection>

                    <MLHubSection title="Comment lire l’écran" subtitle="Clés de lecture rapides pour exploiter l’outil.">
                        <ul className="ml-orch__notes-list">
                            <li>La table centrale affiche les matchs dans l’ordre réel de la saison.</li>
                            <li>Le filtre marché permet de basculer entre FT, HT, Goals, Corners et Cards.</li>
                            <li>Les marchés 1X2 affichent la distribution 1 / X / 2 et le pick dominant.</li>
                            <li>Les marchés totals affichent le pick Over/Under, sa probabilité et le total attendu.</li>
                            <li>La colonne résultat confronte ce pick au score ou total réel et au verdict hit/miss.</li>
                            <li>Le panneau latéral garde les runs précédents pour rejouer ou comparer une saison.</li>
                        </ul>
                    </MLHubSection>
                </div>
            </section>
        </div>
    );
};

export default MLOrchestratorPage;
