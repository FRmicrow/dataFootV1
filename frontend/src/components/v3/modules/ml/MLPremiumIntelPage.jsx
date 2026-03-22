import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Badge, Button, Card, Skeleton, Table, Tabs } from '../../../../design-system';
import api from '../../../../services/api';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { MLHubEmptyState, MLHubFiltersBar, MLHubHero, MLHubMetricStrip, MLHubSection } from './shared/MLHubSurface';
import MLHubGlossaryFooter from './shared/MLHubGlossaryFooter';
import { fmtDateTime, fmtDecimal, fmtPct, getOutcomeVariant, getStatusVariant } from './shared/mlUtils';
import './MLPremiumIntelPage.css';

// ─── Constants ───────────────────────────────────────────────────────────────

const TABS = [
    { id: 'match',  label: 'Match Premium' },
    { id: 'league', label: 'League Command' },
];

const MARKET_OPTIONS = [
    { value: 'FT_1X2',     label: '1X2 FT',     modelKey: 'FT_RESULT',      type: '1X2',    selection: null },
    { value: 'HT_1X2',     label: '1X2 HT',     modelKey: 'HT_RESULT',      type: '1X2',    selection: null },
    { value: 'GOALS_OU',   label: 'Goals O/U',  modelKey: 'GOALS_TOTAL',    type: 'TOTALS', selection: 'Over 2.5' },
    { value: 'CORNERS_OU', label: 'Corners O/U', modelKey: 'CORNERS_TOTAL', type: 'TOTALS', selection: 'Over 9.5' },
    { value: 'CARDS_OU',   label: 'Cards O/U',  modelKey: 'CARDS_TOTAL',    type: 'TOTALS', selection: 'Over 4.5' },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

const toPct = (value) => { const n = Number(value); return Number.isFinite(n) ? `${(n * 100).toFixed(1)}%` : '—'; };

const normalizeOneXTwo = (payload) =>
    Object.entries(payload?.probabilities_1n2 || {})
        .map(([selection, probability]) => ({ selection, probability: Number(probability) }))
        .filter((item) => Number.isFinite(item.probability))
        .sort((a, b) => b.probability - a.probability);

const normalizeTotals = (payload, selection) => {
    const probs = payload?.over_under_probabilities || {};
    const opposite = selection?.startsWith('Over') ? selection.replace('Over', 'Under') : selection?.replace('Under', 'Over');
    return {
        selection,
        probability: Number(probs[selection]),
        opposite,
        oppositeProbability: Number(probs[opposite]),
        expectedTotal: payload?.expected_goals?.total ?? payload?.expected_corners?.total ?? payload?.expected_cards?.total ?? null,
        context: payload?.adjustment_context || null,
    };
};

const buildLeagueRows = (runs, leagueId, seasonYear) =>
    (runs || [])
        .filter((run) => String(run.league_id) === String(leagueId) && String(run.season_year) === String(seasonYear))
        .map((run) => ({
            ...run,
            marketRows: MARKET_OPTIONS.map((market) => ({ ...market, metrics: run.metrics?.markets?.[market.value] || null })),
        }))
        .sort((a, b) => Number(b.id) - Number(a.id));

// ─── VariantCard ─────────────────────────────────────────────────────────────

const VariantCard = ({ title, badge, rows, footer }) => (
    <Card className="ml-premium__variant-card">
        <div className="ml-premium__variant-head">
            <strong>{title}</strong>
            {badge ? <Badge variant={badge.variant || 'neutral'} size="sm">{badge.label}</Badge> : null}
        </div>
        <div className="ml-premium__variant-body">
            {rows.map((row) => (
                <div key={row.label} className="ml-premium__variant-row">
                    <span>{row.label}</span><strong>{row.value}</strong>
                </div>
            ))}
        </div>
        {footer ? <div className="ml-premium__variant-footer">{footer}</div> : null}
    </Card>
);

// ─── Match Premium tab ────────────────────────────────────────────────────────

const MatchPremiumTab = ({ runs, filters, loading, error, onReload }) => {
    const [searchParams, setSearchParams]         = useSearchParams();
    const [selectedRunId, setSelectedRunId]       = useState('');
    const [selectedFixtureId, setSelectedFixtureId] = useState('');
    const [selectedMarket, setSelectedMarket]     = useState('FT_1X2');
    const [results, setResults]                   = useState([]);
    const [resultsLoading, setResultsLoading]     = useState(false);
    const [fixturePrediction, setFixturePrediction] = useState(null);
    const [fixturePredictionLoading, setFixturePredictionLoading] = useState(false);

    const leagueLookup = useMemo(() => {
        const map = new Map();
        for (const row of filters) map.set(String(row.league_id), { leagueName: row.league_name, countryName: row.country_name || '' });
        return map;
    }, [filters]);

    const completedRuns = useMemo(() => runs.filter((r) => r.status === 'COMPLETED').map((r) => {
        const league = leagueLookup.get(String(r.league_id));
        return { ...r, leagueName: league?.leagueName || `League ${r.league_id}`, countryName: league?.countryName || '' };
    }).sort((a, b) => Number(b.id) - Number(a.id)), [leagueLookup, runs]);

    useEffect(() => {
        if (!completedRuns.length) return;
        const runFromQuery = searchParams.get('runId');
        if (runFromQuery && completedRuns.some((r) => String(r.id) === runFromQuery)) { setSelectedRunId(runFromQuery); return; }
        if (!selectedRunId) setSelectedRunId(String(completedRuns[0].id));
    }, [completedRuns, searchParams, selectedRunId]);

    const selectedRun = useMemo(() => completedRuns.find((r) => String(r.id) === String(selectedRunId)) || null, [completedRuns, selectedRunId]);

    useEffect(() => {
        if (!selectedRunId) { setResults([]); return; }
        let cancelled = false;
        setResultsLoading(true);
        api.getSimulationResults(selectedRunId).then((rows) => { if (!cancelled) setResults(Array.isArray(rows) ? rows : []); }).catch(() => { if (!cancelled) setResults([]); }).finally(() => { if (!cancelled) setResultsLoading(false); });
        return () => { cancelled = true; };
    }, [selectedRunId]);

    const fixtureOptions = useMemo(() => {
        const unique = new Map();
        for (const row of results) { if (!unique.has(row.fixture_id)) unique.set(row.fixture_id, { fixtureId: row.fixture_id, label: `${row.home_team_name} vs ${row.away_team_name}`, date: row.fixture_date }); }
        return [...unique.values()].sort((a, b) => new Date(a.date) - new Date(b.date));
    }, [results]);

    useEffect(() => {
        if (!fixtureOptions.length) { setSelectedFixtureId(''); return; }
        const fixtureFromQuery = searchParams.get('fixtureId');
        if (fixtureFromQuery && fixtureOptions.some((o) => String(o.fixtureId) === fixtureFromQuery)) { setSelectedFixtureId(fixtureFromQuery); return; }
        if (!fixtureOptions.some((o) => String(o.fixtureId) === String(selectedFixtureId))) setSelectedFixtureId(String(fixtureOptions[0].fixtureId));
    }, [fixtureOptions, searchParams, selectedFixtureId]);

    useEffect(() => {
        const marketFromQuery = searchParams.get('market');
        if (marketFromQuery && MARKET_OPTIONS.some((m) => m.value === marketFromQuery)) setSelectedMarket(marketFromQuery);
    }, [searchParams]);

    useEffect(() => {
        const params = new URLSearchParams();
        if (selectedRunId)     params.set('runId',     selectedRunId);
        if (selectedFixtureId) params.set('fixtureId', selectedFixtureId);
        if (selectedMarket)    params.set('market',    selectedMarket);
        setSearchParams(params, { replace: true });
    }, [selectedFixtureId, selectedMarket, selectedRunId, setSearchParams]);

    useEffect(() => {
        if (!selectedFixtureId) { setFixturePrediction(null); return; }
        let cancelled = false;
        setFixturePredictionLoading(true);
        api.getFixturePrediction(selectedFixtureId).then((p) => { if (!cancelled) setFixturePrediction(p || null); }).catch(() => { if (!cancelled) setFixturePrediction(null); }).finally(() => { if (!cancelled) setFixturePredictionLoading(false); });
        return () => { cancelled = true; };
    }, [selectedFixtureId]);

    const selectedFixtureRows = useMemo(() => results.filter((row) => String(row.fixture_id) === String(selectedFixtureId)), [results, selectedFixtureId]);
    const runMarketRows       = useMemo(() => selectedFixtureRows.filter((row) => row.market_type === selectedMarket), [selectedFixtureRows, selectedMarket]);
    const selectedRunRow      = runMarketRows[0] || null;
    const selectedMarketConfig = MARKET_OPTIONS.find((m) => m.value === selectedMarket);
    const liveModel = fixturePrediction?.models?.[selectedMarketConfig?.modelKey];

    const filterControls = [
        { id: 'run', label: 'Run', value: selectedRunId, onChange: setSelectedRunId, searchable: true, options: completedRuns.map((r) => ({ value: String(r.id), label: `#${r.id} · ${r.countryName ? `${r.countryName} · ` : ''}${r.leagueName} · ${r.season_year} · ${r.horizon_type}` })) },
        { id: 'fixture', label: 'Fixture', value: selectedFixtureId, onChange: setSelectedFixtureId, searchable: true, options: fixtureOptions.map((o) => ({ value: String(o.fixtureId), label: `${o.label} · ${fmtDateTime(o.date)}` })) },
        { id: 'market', label: 'Marché', value: selectedMarket, onChange: setSelectedMarket, options: MARKET_OPTIONS },
    ];

    const topMetrics = [
        { label: 'Run',     value: selectedRun ? `#${selectedRun.id}` : '—', subValue: selectedRun ? `${selectedRun.leagueName} · ${selectedRun.season_year}` : 'Choisis un run', featured: true },
        { label: 'Fixture', value: selectedRunRow ? `${selectedRunRow.home_team_name} vs ${selectedRunRow.away_team_name}` : '—', subValue: selectedRunRow ? fmtDateTime(selectedRunRow.fixture_date) : 'Choisis une fixture' },
        { label: 'Marché',  value: selectedRunRow?.market_label || selectedMarketConfig?.label || '—', subValue: selectedRunRow ? `Pick ${selectedRunRow.predicted_outcome}` : 'Lecture ciblée' },
        { label: 'Verdict', value: selectedRunRow ? (selectedRunRow.is_correct ? 'Hit' : 'Miss') : '—', subValue: selectedRunRow ? `Réalité ${selectedRunRow.actual_result}` : 'Aucune donnée' },
    ];

    const liveVariants = useMemo(() => {
        if (!liveModel || !selectedMarketConfig) return [];
        if (selectedMarketConfig.type === '1X2') {
            const items = [{ key: 'base', title: 'Global actuel', badge: { label: liveModel.model_scope || 'global', variant: 'primary' }, rows: normalizeOneXTwo(liveModel).map((r) => ({ label: r.selection, value: `${(r.probability * 100).toFixed(1)}%` })), footer: liveModel.model_version || '—' }];
            if (liveModel.shadow_evaluation?.league_specific_candidate) {
                const shadow = normalizeOneXTwo(liveModel.shadow_evaluation.league_specific_candidate);
                items.push({ key: 'shadow', title: 'League shadow', badge: { label: 'shadow', variant: 'warning' }, rows: shadow.map((r) => ({ label: r.selection, value: `${(r.probability * 100).toFixed(1)}%` })), footer: liveModel.shadow_evaluation.league_specific_candidate.model_version || '—' });
            }
            return items;
        }

        const items = [];
        const raw = liveModel.adjustment_evaluation?.without_adjustment ? normalizeTotals(liveModel.adjustment_evaluation.without_adjustment, selectedMarketConfig.selection) : normalizeTotals(liveModel, selectedMarketConfig.selection);
        items.push({ key: 'raw', title: 'Brut', badge: { label: 'global', variant: 'neutral' }, rows: [{ label: raw.selection, value: toPct(raw.probability) }, { label: raw.opposite, value: toPct(raw.oppositeProbability) }, { label: 'Total attendu', value: fmtDecimal(raw.expectedTotal, 2) }], footer: liveModel.model_version || '—' });
        if (liveModel.adjustment_evaluation?.with_league_adjustment) {
            const adj = normalizeTotals(liveModel.adjustment_evaluation.with_league_adjustment, selectedMarketConfig.selection);
            items.push({ key: 'adjusted', title: 'Ajusté ligue', badge: { label: 'adjusted', variant: 'primary' }, rows: [{ label: adj.selection, value: toPct(adj.probability) }, { label: adj.opposite, value: toPct(adj.oppositeProbability) }, { label: 'Total attendu', value: fmtDecimal(adj.expectedTotal, 2) }], footer: adj.context?.league_name || liveModel.model_version || '—' });
        }
        if (liveModel.shadow_evaluation?.league_specific_candidate) {
            const shadow = normalizeTotals(liveModel.shadow_evaluation.league_specific_candidate, selectedMarketConfig.selection);
            items.push({ key: 'shadow', title: 'League shadow', badge: { label: 'shadow', variant: 'warning' }, rows: [{ label: shadow.selection, value: toPct(shadow.probability) }, { label: shadow.opposite, value: toPct(shadow.oppositeProbability) }, { label: 'Total attendu', value: fmtDecimal(shadow.expectedTotal, 2) }], footer: liveModel.shadow_evaluation.league_specific_candidate.model_version || '—' });
        }
        return items;
    }, [liveModel, selectedMarketConfig]);

    if (loading) return <div className="ml-premium__tab-body"><Skeleton height="48px" /><Skeleton height="48px" /><Skeleton height="48px" /></div>;
    if (error)   return <div className="ml-premium__tab-body"><Card className="ml-premium__alert">{error}</Card></div>;

    return (
        <div className="ml-premium__tab-body">
            <MLHubFiltersBar filters={filterControls} actions={<Button variant="ghost" size="sm" onClick={onReload}>Rafraîchir</Button>} />
            <MLHubMetricStrip metrics={topMetrics} />

            <MLHubSection title="Match analysé" subtitle="Contexte complet du match et résultat du run sur ce marché." badge={selectedRun ? { label: selectedRun.status, variant: getStatusVariant(selectedRun.status) } : null}>
                {selectedRunRow ? (
                    <div className="ml-premium__meta-list">
                        <div className="ml-premium__meta-row"><span>Match</span><strong>{selectedRunRow.home_team_name} vs {selectedRunRow.away_team_name}</strong></div>
                        <div className="ml-premium__meta-row"><span>Date</span><strong>{fmtDateTime(selectedRunRow.fixture_date)}</strong></div>
                        {selectedRunRow.score && selectedRunRow.score !== '-' ? <div className="ml-premium__meta-row"><span>Score final</span><strong>{selectedRunRow.score}</strong></div> : null}
                        {selectedRunRow.round_name ? <div className="ml-premium__meta-row"><span>Journée</span><strong>{selectedRunRow.round_name}</strong></div> : null}
                        <div className="ml-premium__meta-row"><span>Run</span><strong>#{selectedRun?.id || '—'} · {selectedRun?.leagueName || '—'} · {selectedRun?.season_year || '—'}</strong></div>
                        {selectedRunRow.model_version ? <div className="ml-premium__meta-row"><span>Modèle</span><strong>{selectedRunRow.model_version}</strong></div> : null}
                        <div className="ml-premium__meta-row"><span>Marché</span><strong>{selectedRunRow.market_label}</strong></div>
                        <div className="ml-premium__meta-row"><span>Pick ML</span><strong>{selectedRunRow.predicted_outcome}</strong></div>
                        <div className="ml-premium__meta-row"><span>Confiance</span><strong>{selectedRunRow.primary_probability || '—'}</strong></div>
                        {selectedRunRow.expected_total_label ? <div className="ml-premium__meta-row"><span>Total attendu</span><strong>{selectedRunRow.expected_total_label}</strong></div> : null}
                        <div className="ml-premium__meta-row"><span>Réalité</span><strong>{selectedRunRow.actual_result || '—'}</strong></div>
                        {selectedRunRow.actual_numeric_label ? <div className="ml-premium__meta-row"><span>Valeur réelle</span><strong>{selectedRunRow.actual_numeric_label}</strong></div> : null}
                        <div className="ml-premium__meta-row"><span>Verdict</span><Badge variant={getOutcomeVariant(selectedRunRow.is_correct)} size="sm">{selectedRunRow.is_correct ? 'Hit' : 'Miss'}</Badge></div>
                    </div>
                ) : <p className="ml-premium__empty">Sélectionne une fixture et un marché.</p>}
            </MLHubSection>

            <MLHubSection title="Moteur actuel vs historique" subtitle="Comparer le run stocké à l'état courant du moteur de prédiction.">
                {fixturePredictionLoading ? <Skeleton height="240px" /> : liveVariants.length ? (
                    <div className="ml-premium__variants-grid">{liveVariants.map((variant) => <VariantCard key={variant.key} {...variant} />)}</div>
                ) : <p className="ml-premium__empty">Le moteur actuel ne remonte pas encore de détail exploitable pour ce marché.</p>}
            </MLHubSection>

            <MLHubSection title="Tous les marchés du run" subtitle="Lecture complète de la fixture sur FT, HT, goals, corners et cards.">
                {resultsLoading ? <Skeleton height="220px" /> : selectedFixtureRows.length ? (
                    <div className="ml-premium__market-history">
                        {selectedFixtureRows.map((row) => (
                            <div key={`${row.fixture_id}-${row.market_type}`} className={`ml-premium__market-history-item ${row.market_type === selectedMarket ? 'ml-premium__market-history-item--active' : ''}`}>
                                <div className="ml-premium__market-history-head"><strong>{row.market_label}</strong><Badge variant={getOutcomeVariant(row.is_correct)} size="sm">{row.is_correct ? 'Hit' : 'Miss'}</Badge></div>
                                <div className="ml-premium__market-history-grid">
                                    <span>Pick <strong>{row.predicted_outcome}</strong></span>
                                    <span>Réel <strong>{row.actual_result}</strong></span>
                                    <span>Confiance <strong>{row.primary_probability || '—'}</strong></span>
                                    <span>Total <strong>{row.expected_total_label || '—'}</strong></span>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : <p className="ml-premium__empty">Aucun historique disponible pour cette fixture.</p>}
            </MLHubSection>
        </div>
    );
};

// ─── League Command tab ───────────────────────────────────────────────────────

const LeagueCommandTab = ({ runs, filters, loading, onReload }) => {
    const [searchParams, setSearchParams] = useSearchParams();
    const [selectedLeagueId, setSelectedLeagueId] = useState('');
    const [selectedSeason, setSelectedSeason]     = useState('');

    const leagues = useMemo(() => {
        const map = new Map();
        for (const row of filters) {
            const key = String(row.league_id);
            if (!map.has(key)) map.set(key, { leagueId: key, leagueName: row.league_name, countryName: row.country_name || '', seasons: [] });
            map.get(key).seasons.push(String(row.season_year));
        }
        return [...map.values()].map((l) => ({ ...l, seasons: [...new Set(l.seasons)].sort((a, b) => Number(b) - Number(a)) })).sort((a, b) => a.leagueName.localeCompare(b.leagueName));
    }, [filters]);

    useEffect(() => {
        if (!leagues.length) return;
        const leagueFromQuery = searchParams.get('leagueId');
        const seasonFromQuery = searchParams.get('season');
        if (leagueFromQuery && leagues.some((l) => l.leagueId === leagueFromQuery)) {
            setSelectedLeagueId(leagueFromQuery);
            const league = leagues.find((l) => l.leagueId === leagueFromQuery);
            if (seasonFromQuery && league?.seasons.includes(seasonFromQuery)) { setSelectedSeason(seasonFromQuery); return; }
            if (!selectedSeason) setSelectedSeason(league?.seasons[0] || '');
            return;
        }
        if (!selectedLeagueId) { setSelectedLeagueId(leagues[0].leagueId); setSelectedSeason(leagues[0].seasons[0] || ''); }
    }, [leagues, searchParams, selectedLeagueId, selectedSeason]);

    const selectedLeague = useMemo(() => leagues.find((l) => l.leagueId === selectedLeagueId) || null, [leagues, selectedLeagueId]);

    useEffect(() => { if (selectedLeague && !selectedLeague.seasons.includes(selectedSeason)) setSelectedSeason(selectedLeague.seasons[0] || ''); }, [selectedLeague, selectedSeason]);

    useEffect(() => {
        const params = new URLSearchParams();
        if (selectedLeagueId) params.set('leagueId', selectedLeagueId);
        if (selectedSeason)   params.set('season',   selectedSeason);
        setSearchParams(params, { replace: true });
    }, [selectedLeagueId, selectedSeason, setSearchParams]);

    const leagueRuns = useMemo(() => buildLeagueRows(runs, selectedLeagueId, selectedSeason), [runs, selectedLeagueId, selectedSeason]);

    const coveredMarketsCount = useMemo(() => {
        const keys = new Set();
        for (const run of leagueRuns) {
            for (const m of (run.marketRows || [])) {
                if (m.metrics) keys.add(m.value);
            }
        }
        return keys.size;
    }, [leagueRuns]);

    const filterControls = [
        { id: 'league', label: 'Ligue', value: selectedLeagueId, onChange: setSelectedLeagueId, searchable: true, options: leagues.map((l) => ({ value: l.leagueId, label: l.countryName ? `${l.countryName} · ${l.leagueName}` : l.leagueName })) },
        { id: 'season', label: 'Saison', value: selectedSeason, onChange: setSelectedSeason, options: (selectedLeague?.seasons || []).map((s) => ({ value: s, label: s })) },
    ];

    const topMetrics = [
        { label: 'Ligue',            value: selectedLeague?.leagueName || '—',   subValue: selectedLeague?.countryName || 'Sélectionne une ligue', featured: true },
        { label: 'Saison',           value: selectedSeason || '—',               subValue: 'Fenêtre analysée' },
        { label: 'Runs',             value: String(leagueRuns.length),            subValue: 'Historique disponible' },
        { label: 'Marchés couverts', value: String(coveredMarketsCount || 0),      subValue: 'FT, HT, goals, corners, cards' },
    ];

    const runColumns = [
        { key: 'run', title: 'Run', render: (_, run) => (<div className="ml-premium__run-cell"><strong>Run #{run.id}</strong><span>{run.horizon_type}</span></div>) },
        { key: 'status', title: 'Statut', render: (value) => <Badge variant={value === 'COMPLETED' ? 'success' : 'neutral'} size="sm">{value}</Badge>, dataIndex: 'status' },
        { key: 'ft',      title: 'FT',      render: (_, run) => { const m = run.marketRows.find((r) => r.value === 'FT_1X2')?.metrics;      return m ? `Acc ${fmtPct(m.accuracy)} · LL ${fmtDecimal(m.log_loss)}` : '—'; } },
        { key: 'ht',      title: 'HT',      render: (_, run) => { const m = run.marketRows.find((r) => r.value === 'HT_1X2')?.metrics;      return m ? `Acc ${fmtPct(m.accuracy)} · LL ${fmtDecimal(m.log_loss)}` : '—'; } },
        { key: 'goals',   title: 'Goals',   render: (_, run) => { const m = run.marketRows.find((r) => r.value === 'GOALS_OU')?.metrics;   return m ? `Hit ${fmtPct(m.hit_rate)} · MAE ${fmtDecimal(m.mae_total)}` : '—'; } },
        { key: 'corners', title: 'Corners', render: (_, run) => { const m = run.marketRows.find((r) => r.value === 'CORNERS_OU')?.metrics; return m ? `Hit ${fmtPct(m.hit_rate)} · MAE ${fmtDecimal(m.mae_total)}` : '—'; } },
        { key: 'cards',   title: 'Cards',   render: (_, run) => { const m = run.marketRows.find((r) => r.value === 'CARDS_OU')?.metrics;   return m ? `Hit ${fmtPct(m.hit_rate)} · MAE ${fmtDecimal(m.mae_total)}` : '—'; } },
    ];

    if (loading) return <div className="ml-premium__tab-body"><Skeleton height="48px" /><Skeleton height="48px" /></div>;

    return (
        <div className="ml-premium__tab-body">
            <MLHubFiltersBar filters={filterControls} actions={<Button variant="ghost" size="sm" onClick={onReload}>Rafraîchir</Button>} />
            <MLHubMetricStrip metrics={topMetrics} />
            <MLHubSection title="Runs de la ligue" subtitle="Comparer les horizons et les marchés sur une seule table." badge={selectedLeague ? { label: `${selectedLeague.leagueName} · ${selectedSeason}`, variant: 'neutral' } : null}>
                {leagueRuns.length ? <Table columns={runColumns} data={leagueRuns} rowKey="id" /> : <MLHubEmptyState title="Aucun run" message="Aucun run pour cette ligue et saison." />}
            </MLHubSection>
        </div>
    );
};

// ─── Main component ───────────────────────────────────────────────────────────

const MLPremiumIntelPage = () => {
    const [activeTab, setActiveTab] = useState('match');
    const [runs, setRuns]           = useState([]);
    const [filters, setFilters]     = useState([]);
    const [loading, setLoading]     = useState(true);
    const [error, setError]         = useState(null);

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
            setError(err.message || 'Impossible de charger Premium Intel.');
            setRuns([]);
            setFilters([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    return (
        <div className="ml-premium">
            <MLHubHero
                badge={{ label: 'Premium Intel', variant: 'primary' }}
                title="Premium Intel"
                subtitle="Lecture en profondeur d'une fixture · Analyse exhaustive par ligue et horizon"
            />

            <div className="ml-premium__tabs-bar">
                <Tabs items={TABS} activeId={activeTab} onChange={setActiveTab} variant="pills" />
            </div>

            {activeTab === 'match'  && <MatchPremiumTab  runs={runs} filters={filters} loading={loading} error={error} onReload={load} />}
            {activeTab === 'league' && <LeagueCommandTab runs={runs} filters={filters} loading={loading} error={error} onReload={load} />}

            <MLHubGlossaryFooter topic="analytics" />
        </div>
    );
};

export default MLPremiumIntelPage;
