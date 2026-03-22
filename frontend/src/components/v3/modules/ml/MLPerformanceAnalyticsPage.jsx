import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Badge, Button, Card, Input, Skeleton, Table, Tabs } from '../../../../design-system';
import api from '../../../../services/api';
import { useSearchParams } from 'react-router-dom';
import { MLHubEmptyState, MLHubFiltersBar, MLHubHero, MLHubMetricStrip, MLHubSection } from './shared/MLHubSurface';
import MLHubGlossaryFooter from './shared/MLHubGlossaryFooter';
import { fmtDateTime, fmtDecimal, fmtPct } from './shared/mlUtils';
import { MarketHealthGrid } from './submodules/MLAnalyticsComponents';
import './MLPerformanceAnalyticsPage.css';

// ─── Constants ───────────────────────────────────────────────────────────────

const DETAIL_MARKETS = [
    { key: 'FT_1X2',     label: '1X2 FT',     type: '1X2' },
    { key: 'HT_1X2',     label: '1X2 HT',     type: '1X2' },
    { key: 'GOALS_OU',   label: 'Goals O/U',  type: 'TOTALS' },
    { key: 'CORNERS_OU', label: 'Corners O/U', type: 'TOTALS' },
    { key: 'CARDS_OU',   label: 'Cards O/U',  type: 'TOTALS' },
];

const MARKET_FILTERS = DETAIL_MARKETS.map((m) => ({ value: m.key, label: m.label }));

const ERROR_FILTERS = [
    { value: 'all',       label: 'Tous les misses' },
    { value: 'confident', label: 'Confident misses' },
    { value: 'heavy',     label: 'Heavy misses' },
    { value: 'close',     label: 'Close calls' },
];

const TABS = [
    { id: 'roi',    label: 'ROI Lab' },
    { id: 'simu',   label: 'Simulations' },
    { id: 'errors', label: 'Error Lab' },
];

// ─── Shared helpers ──────────────────────────────────────────────────────────

const getRunLeagueLabel = (run) => run?.league_name || (run?.league_id != null ? `ID ${run.league_id}` : 'Nom indisponible');

const hasMetrics = (run) => {
    const markets = run.metrics?.markets;
    return markets && Object.keys(markets).length > 0;
};

const formatMatchDate = (value) => {
    if (!value) return 'Date indisponible';
    return new Date(value).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const formatProfit = (value) => {
    const n = Number(value || 0);
    return `${n >= 0 ? '+' : ''}${fmtDecimal(n, 2)} €`;
};

const buildMarketLeagueRows = (runs) => {
    const rows = [];
    for (const run of runs) {
        const markets = run?.metrics?.markets || {};
        for (const market of DETAIL_MARKETS) {
            const metrics = markets[market.key];
            if (!metrics) continue;
            rows.push({ runId: run.id, leagueId: run.league_id, leagueName: run.leagueName, countryName: run.countryName, seasonYear: run.season_year, horizonType: run.horizon_type, status: run.status, marketType: market.key, marketLabel: market.label, metrics });
        }
    }
    return rows;
};

const computeErrorBuckets = (rows) => {
    const c = { total: rows.length, hits: 0, misses: 0, confidentMisses: 0, closeCalls: 0, heavyMisses: 0 };
    for (const row of rows) {
        const ok = row.is_correct === 1 || row.is_correct === true;
        if (ok) c.hits += 1;
        else if (row.is_correct === 0 || row.is_correct === false) c.misses += 1;
        if (row.display_mode === '1X2') {
            const p = Number.parseFloat(String(row.primary_probability || '').replace('%', ''));
            if (!ok && p >= 55) c.confidentMisses += 1;
            if (ok && p <= 45)  c.closeCalls += 1;
        } else {
            const delta = Math.abs(Number(row.actual_numeric_value) - Number(row.expected_total));
            if (Number.isFinite(delta)) { if (delta >= 2) c.heavyMisses += 1; if (delta <= 0.5) c.closeCalls += 1; }
        }
    }
    return c;
};

const computeConfidenceSegments = (rows) => {
    const segs = [
        { key: 'high', label: '65%+',   min: 65,        max: Infinity, total: 0, hits: 0 },
        { key: 'mid',  label: '50-64%', min: 50,        max: 65,       total: 0, hits: 0 },
        { key: 'low',  label: '<50%',   min: -Infinity, max: 50,       total: 0, hits: 0 },
    ];
    for (const row of rows) {
        const ok = row.is_correct === 1 || row.is_correct === true;
        let sig = null;
        if (row.display_mode === '1X2') {
            sig = Number.parseFloat(String(row.primary_probability || '').replace('%', ''));
        } else {
            const delta = Math.abs(Number(row.actual_numeric_value) - Number(row.expected_total));
            if (Number.isFinite(delta)) sig = Math.max(0, Math.min(100, 100 - delta * 20));
        }
        if (!Number.isFinite(sig)) continue;
        const bucket = segs.find((s) => sig >= s.min && sig < s.max);
        if (!bucket) continue;
        bucket.total += 1;
        if (ok) bucket.hits += 1;
    }
    return segs.map((s) => ({ ...s, hitRate: s.total ? s.hits / s.total : null }));
};

const computeSeverity = (row) => {
    if (row.display_mode === '1X2') return Number.parseFloat(String(row.primary_probability || '').replace('%', '')) || 0;
    const actual = Number(row.actual_numeric_value);
    const expected = Number(row.expected_total);
    return Number.isFinite(actual) && Number.isFinite(expected) ? Math.abs(actual - expected) : 0;
};

const classifyRow = (row) => {
    const sev = computeSeverity(row);
    const ok = row.is_correct === 1 || row.is_correct === true;
    if (row.display_mode === '1X2') {
        if (!ok && sev >= 55) return 'confident';
        if (ok  && sev <= 45) return 'close';
        return !ok ? 'all' : 'hit';
    }
    if (sev >= 2)   return 'heavy';
    if (sev <= 0.5) return 'close';
    return !ok ? 'all' : 'hit';
};

// ─── ROI Lab tab ─────────────────────────────────────────────────────────────

const RoiLabTab = ({ runs, loading, error }) => {
    const [portfolioSize, setPortfolioSize] = useState(1000);
    const [stakePerBet, setStakePerBet]     = useState(10);
    const [selectedLeagueId, setSelectedLeagueId]   = useState('');
    const [selectedSeasonYear, setSelectedSeasonYear] = useState('');
    const [selectedAnnualSeasonYear, setSelectedAnnualSeasonYear] = useState('');
    const [roi, setRoi]         = useState(null);
    const [annualRoi, setAnnualRoi] = useState(null);
    const [roiLoading, setRoiLoading]     = useState(false);
    const [annualLoading, setAnnualLoading] = useState(false);
    const [historicalBetRows, setHistoricalBetRows] = useState([]);
    const [historicalLoading, setHistoricalLoading] = useState(false);
    const [selectedRunId, setSelectedRunId] = useState(null);
    const [selectedMarkets, setSelectedMarkets] = useState(DETAIL_MARKETS.map((m) => m.key));

    const completedRuns = useMemo(() => runs.filter((r) => r.status === 'COMPLETED' && hasMetrics(r)).sort((a, b) => Number(b.id) - Number(a.id)), [runs]);

    const leagueOptions = useMemo(() => {
        const seen = new Map();
        completedRuns.forEach((r) => {
            if (!seen.has(String(r.league_id))) seen.set(String(r.league_id), { id: String(r.league_id), name: getRunLeagueLabel(r), importanceRank: Number(r.importance_rank || 9999) });
        });
        return [...seen.values()].sort((a, b) => a.importanceRank - b.importanceRank || a.name.localeCompare(b.name));
    }, [completedRuns]);

    const leagueSeasonCoverage = useMemo(() => {
        const byLeague = new Map();
        completedRuns.forEach((r) => {
            const key = String(r.league_id);
            if (!byLeague.has(key)) byLeague.set(key, { id: key, name: getRunLeagueLabel(r), importanceRank: Number(r.importance_rank || 9999), seasons: new Set() });
            if (r.season_year != null) byLeague.get(key).seasons.add(String(r.season_year));
        });
        return [...byLeague.values()].map((l) => ({ ...l, seasons: [...l.seasons].sort((a, b) => Number(b) - Number(a)) })).sort((a, b) => a.importanceRank - b.importanceRank || a.name.localeCompare(b.name));
    }, [completedRuns]);

    const seasonOptions = useMemo(() => {
        if (!selectedLeagueId) return [];
        return [...new Set(completedRuns.filter((r) => String(r.league_id) === selectedLeagueId).map((r) => String(r.season_year)))].sort((a, b) => Number(b) - Number(a));
    }, [completedRuns, selectedLeagueId]);

    const annualSeasonOptions = useMemo(() => [...new Set(completedRuns.map((r) => String(r.season_year)).filter(Boolean))].sort((a, b) => Number(b) - Number(a)), [completedRuns]);

    useEffect(() => { if (!selectedLeagueId && leagueOptions.length) setSelectedLeagueId(leagueOptions[0].id); }, [leagueOptions, selectedLeagueId]);
    useEffect(() => { if (!selectedSeasonYear && seasonOptions.length) setSelectedSeasonYear(seasonOptions[0]); }, [seasonOptions, selectedSeasonYear]);
    useEffect(() => { if (selectedSeasonYear && !seasonOptions.includes(selectedSeasonYear)) setSelectedSeasonYear(seasonOptions[0] || ''); }, [seasonOptions, selectedSeasonYear]);
    useEffect(() => { if (!selectedAnnualSeasonYear && annualSeasonOptions.length) setSelectedAnnualSeasonYear(annualSeasonOptions[0]); }, [annualSeasonOptions, selectedAnnualSeasonYear]);
    useEffect(() => { if (selectedAnnualSeasonYear && !annualSeasonOptions.includes(selectedAnnualSeasonYear)) setSelectedAnnualSeasonYear(annualSeasonOptions[0] || ''); }, [annualSeasonOptions, selectedAnnualSeasonYear]);

    const filteredRuns = useMemo(() => completedRuns.filter((r) => {
        if (selectedLeagueId && String(r.league_id) !== selectedLeagueId) return false;
        if (selectedSeasonYear && String(r.season_year) !== selectedSeasonYear) return false;
        return true;
    }), [completedRuns, selectedLeagueId, selectedSeasonYear]);

    useEffect(() => { if (selectedRunId && !filteredRuns.some((r) => r.id === selectedRunId)) setSelectedRunId(null); }, [filteredRuns, selectedRunId]);

    useEffect(() => {
        if (!selectedLeagueId || !selectedSeasonYear) { setRoi(null); return; }
        let cancelled = false;
        setRoiLoading(true);
        api.calculateROI({ portfolioSize: Number(portfolioSize), stakePerBet: Number(stakePerBet), leagueId: Number(selectedLeagueId), seasonYear: Number(selectedSeasonYear), markets: selectedMarkets.length === DETAIL_MARKETS.length ? 'all' : selectedMarkets.join(',') })
            .then((p) => { if (!cancelled) setRoi(p); })
            .catch(() => { if (!cancelled) setRoi(null); })
            .finally(() => { if (!cancelled) setRoiLoading(false); });
        return () => { cancelled = true; };
    }, [portfolioSize, stakePerBet, selectedLeagueId, selectedSeasonYear, selectedMarkets]);

    useEffect(() => {
        if (!selectedAnnualSeasonYear) { setAnnualRoi(null); return; }
        let cancelled = false;
        setAnnualLoading(true);
        api.calculateROI({ portfolioSize: Number(portfolioSize), stakePerBet: Number(stakePerBet), seasonYear: Number(selectedAnnualSeasonYear), markets: 'all' })
            .then((p) => { if (!cancelled) setAnnualRoi(p); })
            .catch(() => { if (!cancelled) setAnnualRoi(null); })
            .finally(() => { if (!cancelled) setAnnualLoading(false); });
        return () => { cancelled = true; };
    }, [portfolioSize, stakePerBet, selectedAnnualSeasonYear]);

    const selectedRun = useMemo(() => filteredRuns.find((r) => r.id === selectedRunId) || null, [filteredRuns, selectedRunId]);
    const activeHistoricalRun = useMemo(() => selectedRun || filteredRuns[0] || null, [filteredRuns, selectedRun]);

    const annualRows = useMemo(() => {
        if (!annualRoi?.leagueBreakdown?.length) return [];
        const totalMarketMap = Object.fromEntries(DETAIL_MARKETS.map((m) => [m.key, annualRoi.marketBreakdown?.find((e) => e.marketType === m.key) || null]));
        return [
            ...annualRoi.leagueBreakdown.map((row) => ({ ...row, isTotal: false })),
            { leagueId: 'TOTAL', leagueName: 'TOTAL ANNEE', seasonYear: Number(selectedAnnualSeasonYear), totalBets: annualRoi.totalBets, totalMatches: annualRoi.totalMatches, benefit: annualRoi.benefit, roi: annualRoi.roi, markets: totalMarketMap, isTotal: true },
        ];
    }, [annualRoi, selectedAnnualSeasonYear]);

    useEffect(() => {
        if (!activeHistoricalRun?.id) { setHistoricalBetRows([]); return; }
        let cancelled = false;
        setHistoricalLoading(true);
        api.getSimulationResults(activeHistoricalRun.id)
            .then((rows) => { if (!cancelled) setHistoricalBetRows(Array.isArray(rows) ? rows : []); })
            .catch(() => { if (!cancelled) setHistoricalBetRows([]); })
            .finally(() => { if (!cancelled) setHistoricalLoading(false); });
        return () => { cancelled = true; };
    }, [activeHistoricalRun]);

    const matchColumns = useMemo(() => ([
        { key: 'match', title: 'Match', render: (_, row) => (<div className="ml-pa__cell"><strong>{row.homeTeam} vs {row.awayTeam}</strong><span>{formatMatchDate(row.date)}</span><span>{row.matchScore ? `Score final ${row.matchScore}` : 'Score indisponible'}</span></div>) },
        { key: 'bets', title: 'Paris simulés', render: (_, row) => (<div className="ml-pa__bet-list">{row.picks.map((pick, i) => (<div key={`${row.fixtureId}-${pick.marketType}-${i}`} className="ml-pa__bet-item"><strong>{pick.marketLabel}</strong><span>{pick.selection} @ {fmtDecimal(pick.bookmakerOdd, 2)}</span><span>ML {fmtPct(pick.mlProbability)}</span></div>))}</div>) },
        { key: 'outcomes', title: 'Issue réelle', render: (_, row) => (<div className="ml-pa__bet-list">{row.picks.map((pick, i) => (<div key={`${row.fixtureId}-actual-${pick.marketType}-${i}`} className="ml-pa__bet-item"><strong>{pick.marketLabel}</strong><span>{pick.actualOutcome || 'Push / indisponible'}</span><span className={pick.isHit ? 'is-positive' : 'is-negative'}>{pick.isHit ? 'Gagné' : 'Perdu'}</span></div>))}</div>) },
        { key: 'stake', title: 'Engagement', render: (_, row) => (<div className="ml-pa__cell"><strong>{fmtDecimal(row.totalStake, 0)} €</strong><span>{row.betCount} pari{row.betCount > 1 ? 's' : ''}</span><span>{row.hits}/{row.betCount} gagné{row.hits > 1 ? 's' : ''}</span></div>) },
        { key: 'profit', title: 'Gain / Perte', render: (_, row) => (<div className="ml-pa__cell"><strong className={row.totalNetProfit >= 0 ? 'is-positive' : 'is-negative'}>{row.totalNetProfit >= 0 ? '+' : ''}{fmtDecimal(row.totalNetProfit, 2)} €</strong><span>Retour {fmtDecimal(row.totalGrossReturn, 2)} €</span><span>Portefeuille {fmtDecimal(row.portfolioAfterMatch, 2)} €</span></div>) },
    ]), []);

    const historicalBetColumns = useMemo(() => ([
        { key: 'match', title: 'Match', render: (_, row) => (<div className="ml-pa__cell"><strong>{row.home_team_name} vs {row.away_team_name}</strong><span>{formatMatchDate(row.fixture_date)}</span><span>{row.score && row.score !== '-' ? `Score ${row.score}` : 'Score indisponible'}</span></div>) },
        { key: 'market', title: 'Marché', render: (_, row) => (<div className="ml-pa__cell"><strong>{row.market_label || row.market_type}</strong><span>{row.model_version || 'runtime'}</span><span>{row.round_name || '—'}</span></div>) },
        { key: 'prediction', title: 'Pari possible', render: (_, row) => (<div className="ml-pa__cell"><strong>{row.predicted_outcome || '—'}</strong><span>Confiance {row.primary_probability || '—'}</span><span>{row.expected_total_label ? `Total attendu ${row.expected_total_label}` : 'Sans total attendu'}</span></div>) },
        { key: 'actual', title: 'Issue réelle', render: (_, row) => (<div className="ml-pa__cell"><strong>{row.actual_result || '—'}</strong><span>{row.actual_numeric_label ? `Valeur réelle ${row.actual_numeric_label}` : '—'}</span><span className={row.is_correct ? 'is-positive' : 'is-negative'}>{row.is_correct == null ? 'Inconnu' : row.is_correct ? 'Hit' : 'Miss'}</span></div>) },
    ]), []);

    const annualColumns = useMemo(() => ([
        { key: 'league', title: 'Ligue', render: (_, row) => (<div className={`ml-pa__cell ${row.isTotal ? 'is-total' : ''}`}><strong>{row.leagueName}</strong><span>{row.isTotal ? `Saison ${selectedAnnualSeasonYear}` : `${row.totalMatches} matchs · ${row.totalBets} paris`}</span></div>) },
        ...DETAIL_MARKETS.map((market) => ({
            key: market.key,
            title: market.label,
            render: (_, row) => {
                const m = row.markets?.[market.key];
                if (!m) return '—';
                return (<div className="ml-pa__cell"><strong className={m.benefit >= 0 ? 'is-positive' : 'is-negative'}>{formatProfit(m.benefit)}</strong><span>{m.totalBets} paris</span><span>ROI {fmtDecimal(m.roi, 1)} %</span></div>);
            },
        })),
        { key: 'total', title: 'Total année', render: (_, row) => (<div className={`ml-pa__cell ${row.isTotal ? 'is-total' : ''}`}><strong className={row.benefit >= 0 ? 'is-positive' : 'is-negative'}>{formatProfit(row.benefit)}</strong><span>{row.totalBets} paris</span><span>ROI {fmtDecimal(row.roi, 1)} %</span></div>) },
    ]), [selectedAnnualSeasonYear]);

    const runColumns = [
        { key: 'competition', title: 'Compétition', render: (_, row) => (<div className="ml-pa__cell"><strong>{getRunLeagueLabel(row)}</strong><span>Saison {row.season_year || '—'}</span></div>) },
        { key: 'horizon', title: 'Horizon', render: (_, row) => (<div className="ml-pa__cell"><strong>{row.horizon_type?.replaceAll('_', ' ') || '—'}</strong><span>Run #{row.id}</span></div>) },
        { key: 'ft', title: 'FT 1X2', render: (_, row) => { const m = row.metrics?.markets?.FT_1X2; return m ? (<div className="ml-pa__cell"><strong>{fmtPct(m.accuracy)}</strong><span>Brier {fmtDecimal(m.brier_score)}</span></div>) : '—'; } },
        { key: 'ht', title: 'HT 1X2', render: (_, row) => { const m = row.metrics?.markets?.HT_1X2; return m ? (<div className="ml-pa__cell"><strong>{fmtPct(m.accuracy)}</strong><span>Brier {fmtDecimal(m.brier_score)}</span></div>) : '—'; } },
        { key: 'goals', title: 'Goals', render: (_, row) => { const m = row.metrics?.markets?.GOALS_OU; return m ? (<div className="ml-pa__cell"><strong>{fmtPct(m.hit_rate)}</strong><span>MAE {fmtDecimal(m.mae_total)}</span></div>) : '—'; } },
        { key: 'corners', title: 'Corners', render: (_, row) => { const m = row.metrics?.markets?.CORNERS_OU; return m ? (<div className="ml-pa__cell"><strong>{fmtPct(m.hit_rate)}</strong><span>MAE {fmtDecimal(m.mae_total)}</span></div>) : '—'; } },
        { key: 'cards', title: 'Cards', render: (_, row) => { const m = row.metrics?.markets?.CARDS_OU; return m ? (<div className="ml-pa__cell"><strong>{fmtPct(m.hit_rate)}</strong><span>MAE {fmtDecimal(m.mae_total)}</span></div>) : '—'; } },
    ];

    const hasSelection = Boolean(selectedLeagueId && selectedSeasonYear);
    const selectedLeagueName = leagueOptions.find((l) => l.id === selectedLeagueId)?.name || '';

    if (loading) return (<div className="ml-pa__tab-body"><Skeleton height="120px" /><Skeleton height="160px" /><Skeleton height="320px" /></div>);
    if (error)   return (<div className="ml-pa__tab-body"><MLHubEmptyState title="Chargement impossible" message={error} /></div>);

    return (
        <div className="ml-pa__tab-body">
            <MLHubSection title="Runs disponibles" subtitle="Compétitions et saisons déjà simulées." badge={{ label: `${leagueSeasonCoverage.length} ligues`, variant: 'neutral' }}>
                <div className="ml-pa__coverage-list">
                    {leagueSeasonCoverage.map((league) => (
                        <button key={league.id} type="button" className={`ml-pa__coverage-item ${selectedLeagueId === league.id ? 'is-active' : ''}`} onClick={() => { setSelectedLeagueId(league.id); setSelectedSeasonYear(league.seasons[0] || ''); setSelectedRunId(null); }}>
                            <strong>{league.name}</strong><span>{league.seasons.join(', ')}</span>
                        </button>
                    ))}
                </div>
            </MLHubSection>

            <MLHubSection title="Paramètres" badge={{ label: hasSelection ? `${selectedLeagueName} · ${selectedSeasonYear}` : 'Sélection requise', variant: hasSelection ? 'primary' : 'neutral' }}>
                <div className="ml-pa__roi-controls">
                    <label>Portefeuille (€)<Input type="number" min="1" value={portfolioSize} onChange={(e) => setPortfolioSize(e.target.value)} /></label>
                    <label>Mise par pari (€)<Input type="number" min="1" value={stakePerBet} onChange={(e) => setStakePerBet(e.target.value)} /></label>
                    <label>Saison
                        <select className="ml-pa__select" value={selectedSeasonYear} onChange={(e) => { setSelectedSeasonYear(e.target.value); setSelectedRunId(null); }} disabled={!selectedLeagueId}>
                            <option value="">Choisir une saison</option>
                            {seasonOptions.map((y) => (<option key={y} value={y}>{y}</option>))}
                        </select>
                    </label>
                </div>
                <div className="ml-pa__market-filter">
                    <span className="ml-pa__market-filter-label">Marchés ROI</span>
                    <div className="ml-pa__market-filter-buttons">
                        {DETAIL_MARKETS.map((m) => {
                            const active = selectedMarkets.includes(m.key);
                            return (
                                <button key={m.key} type="button"
                                    className={`ml-pa__market-btn ${active ? 'is-active' : ''}`}
                                    onClick={() => setSelectedMarkets((prev) => active && prev.length > 1 ? prev.filter((k) => k !== m.key) : active ? prev : [...prev, m.key])}
                                >{m.label}</button>
                            );
                        })}
                    </div>
                </div>
            </MLHubSection>

            {selectedAnnualSeasonYear && (
                <MLHubSection title="Tableau annuel par ligue et modèle" subtitle="Gains simulés par modèle et ligue sur la saison choisie." badge={{ label: annualLoading ? 'Calcul…' : selectedAnnualSeasonYear, variant: 'primary' }}
                    actions={<select className="ml-pa__select ml-pa__select--sm" value={selectedAnnualSeasonYear} onChange={(e) => setSelectedAnnualSeasonYear(e.target.value)}>{annualSeasonOptions.map((y) => (<option key={y} value={y}>{y}</option>))}</select>}
                >
                    {annualLoading ? <Skeleton height="220px" /> : annualRoi ? (
                        <>
                            <div className="ml-pa__roi-grid">
                                <div className="ml-pa__roi-card"><span>Ligues couvertes</span><strong>{annualRoi.leagueBreakdown?.length || 0}</strong></div>
                                <div className="ml-pa__roi-card"><span>Paris simulés</span><strong>{annualRoi.totalBets}</strong></div>
                                <div className="ml-pa__roi-card"><span>Bénéfice annuel</span><strong className={annualRoi.benefit >= 0 ? 'is-positive' : 'is-negative'}>{formatProfit(annualRoi.benefit)}</strong></div>
                                <div className="ml-pa__roi-card"><span>ROI annuel</span><strong className={annualRoi.roi >= 0 ? 'is-positive' : 'is-negative'}>{annualRoi.roi >= 0 ? '+' : ''}{fmtDecimal(annualRoi.roi, 1)} %</strong></div>
                            </div>
                            {annualRows.length ? <Table columns={annualColumns} data={annualRows} rowKey={(row) => String(row.leagueId)} /> : <p className="ml-pa__empty-note">Aucun run exploitable pour cette saison.</p>}
                        </>
                    ) : <MLHubEmptyState title="Aucune donnée annuelle" message="Pas de runs terminés avec odds exploitables pour cette saison." />}
                </MLHubSection>
            )}

            {hasSelection && (
                <MLHubSection title="Simulation ROI" badge={{ label: roiLoading ? 'Calcul…' : roi ? `${roi.totalBets} paris` : 'Aucune donnée', variant: roi ? 'primary' : 'neutral' }}>
                    {roiLoading ? <Skeleton height="96px" /> : roi ? (
                        <>
                            <div className="ml-pa__roi-scope"><strong>{roi.scope?.leagueName || selectedLeagueName}</strong><span>Saison {roi.scope?.seasonYear || selectedSeasonYear}</span><span>Source odds: {roi.scope?.oddsSource || 'indisponible'}</span></div>
                            <div className="ml-pa__roi-grid">
                                <div className="ml-pa__roi-card"><span>Paris simulés</span><strong>{roi.totalBets}</strong></div>
                                <div className="ml-pa__roi-card"><span>Matchs couverts</span><strong>{roi.totalMatches}</strong></div>
                                <div className="ml-pa__roi-card"><span>Montant total</span><strong>{fmtDecimal(roi.totalBets * Number(stakePerBet), 0)} €</strong></div>
                                <div className="ml-pa__roi-card"><span>Hit rate</span><strong>{fmtPct(roi.hitRate)}</strong></div>
                                <div className="ml-pa__roi-card"><span>Bénéfice</span><strong className={roi.benefit >= 0 ? 'is-positive' : 'is-negative'}>{roi.benefit >= 0 ? '+' : ''}{fmtDecimal(roi.benefit, 0)} €</strong></div>
                                <div className="ml-pa__roi-card"><span>ROI</span><strong className={roi.roi >= 0 ? 'is-positive' : 'is-negative'}>{roi.roi >= 0 ? '+' : ''}{fmtDecimal(roi.roi, 1)} %</strong></div>
                                <div className="ml-pa__roi-card"><span>Retrait max</span><strong>-{fmtDecimal(roi.maxDrawdown, 1)} %</strong></div>
                            </div>
                            {roi.matchResults?.length ? <Table columns={matchColumns} data={roi.matchResults} rowKey="fixtureId" /> : <p className="ml-pa__empty-note">Aucune cote historique exploitable trouvée.</p>}
                        </>
                    ) : null}
                </MLHubSection>
            )}

            {hasSelection && (
                <MLHubSection title="Tous les paris possibles" subtitle="Vue brute du dernier run complété pour cette ligue et saison." badge={{ label: activeHistoricalRun ? `Run #${activeHistoricalRun.id}` : 'Aucun run', variant: activeHistoricalRun ? 'primary' : 'neutral' }}>
                    {historicalLoading ? <Skeleton height="220px" /> : historicalBetRows.length ? <Table columns={historicalBetColumns} data={historicalBetRows} rowKey={(row) => `${row.fixture_id}-${row.market_type}`} /> : <MLHubEmptyState title="Aucun pari disponible" message="Aucun résultat de simulation retrouvé." />}
                </MLHubSection>
            )}

            {hasSelection && (
                <MLHubSection title="Runs modèles" badge={{ label: `${filteredRuns.length} runs`, variant: 'neutral' }}>
                    {filteredRuns.length ? (
                        <>
                            <Table columns={runColumns} data={filteredRuns} rowKey="id" interactive onRowClick={(row) => setSelectedRunId(row.id === selectedRunId ? null : row.id)} />
                            {selectedRun && (
                                <div className="ml-pa__run-detail">
                                    <div className="ml-pa__run-detail-head"><strong>Run #{selectedRun.id} — {selectedRun.horizon_type?.replaceAll('_', ' ')}</strong><Button variant="ghost" size="sm" onClick={() => setSelectedRunId(null)}>Fermer</Button></div>
                                    <div className="ml-pa__run-markets">
                                        {DETAIL_MARKETS.map((m) => {
                                            const metrics = selectedRun.metrics?.markets?.[m.key];
                                            if (!metrics) return null;
                                            return (
                                                <div key={m.key} className="ml-pa__run-market-card">
                                                    <strong className="ml-pa__run-market-label">{m.label}</strong>
                                                    {m.type === '1X2' ? (<><div className="ml-pa__run-market-row"><span>Hit rate</span><strong>{fmtPct(metrics.accuracy)}</strong></div><div className="ml-pa__run-market-row"><span>Brier</span><strong>{fmtDecimal(metrics.brier_score)}</strong></div><div className="ml-pa__run-market-row"><span>Log loss</span><strong>{fmtDecimal(metrics.log_loss)}</strong></div></>) : (<><div className="ml-pa__run-market-row"><span>Hit rate</span><strong>{fmtPct(metrics.hit_rate)}</strong></div><div className="ml-pa__run-market-row"><span>MAE</span><strong>{fmtDecimal(metrics.mae_total)}</strong></div></>)}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </>
                    ) : <MLHubEmptyState title="Aucun run" message="Aucun run validé pour cette ligue et cette saison." />}
                </MLHubSection>
            )}

            {!hasSelection && <MLHubEmptyState title="Sélectionne une ligue et une saison" message="Seules les compétitions ayant de vrais runs terminés sont proposées ici." />}
        </div>
    );
};

// ─── Simulations tab ─────────────────────────────────────────────────────────

const SimulationsTab = ({ runs, filters, loading, error, onReload }) => {
    const [selectedMarket, setSelectedMarket]     = useState('FT_1X2');
    const [selectedRunId, setSelectedRunId]       = useState(null);
    const [selectedLeagueId, setSelectedLeagueId] = useState('all');
    const [selectedSeason, setSelectedSeason]     = useState('all');
    const [selectedHorizon, setSelectedHorizon]   = useState('all');
    const [runResults, setRunResults]             = useState([]);
    const [runResultsLoading, setRunResultsLoading] = useState(false);

    const leagueLookup = useMemo(() => {
        const map = new Map();
        for (const row of filters) map.set(String(row.league_id), { leagueName: row.league_name, countryName: row.country_name || '' });
        return map;
    }, [filters]);

    const enrichedRuns = useMemo(() => (runs || []).map((run) => {
        const league = leagueLookup.get(String(run.league_id));
        return { ...run, leagueName: league?.leagueName || `League ${run.league_id}`, countryName: league?.countryName || '' };
    }), [leagueLookup, runs]);

    const availableLeagues = useMemo(() => {
        const map = new Map();
        for (const run of enrichedRuns) { const k = String(run.league_id); if (!map.has(k)) map.set(k, { leagueId: k, leagueName: run.leagueName, countryName: run.countryName }); }
        return [...map.values()].sort((a, b) => a.leagueName.localeCompare(b.leagueName));
    }, [enrichedRuns]);

    const availableSeasons = useMemo(() => {
        const set = new Set();
        for (const run of enrichedRuns) if (run.season_year != null) set.add(String(run.season_year));
        return [...set].sort((a, b) => Number(b) - Number(a)).map((y) => ({ value: y, label: y }));
    }, [enrichedRuns]);

    const availableHorizons = useMemo(() => {
        const set = new Set();
        for (const run of enrichedRuns) if (run.horizon_type) set.add(run.horizon_type);
        return [...set].sort().map((h) => ({ value: h, label: h.replaceAll('_', ' ') }));
    }, [enrichedRuns]);

    const filteredRuns = useMemo(() => enrichedRuns.filter((run) => {
        if (selectedLeagueId !== 'all' && String(run.league_id) !== selectedLeagueId) return false;
        if (selectedSeason   !== 'all' && String(run.season_year) !== selectedSeason)  return false;
        if (selectedHorizon  !== 'all' && run.horizon_type !== selectedHorizon)         return false;
        return true;
    }), [enrichedRuns, selectedHorizon, selectedLeagueId, selectedSeason]);

    const marketLeagueRows = useMemo(() => buildMarketLeagueRows(filteredRuns).filter((row) => row.marketType === selectedMarket).sort((a, b) => {
        const aScore = a.marketType.includes('1X2') ? Number(a.metrics.accuracy || 0) : Number(a.metrics.hit_rate || 0);
        const bScore = b.marketType.includes('1X2') ? Number(b.metrics.accuracy || 0) : Number(b.metrics.hit_rate || 0);
        return bScore - aScore;
    }), [filteredRuns, selectedMarket]);

    useEffect(() => {
        if (!marketLeagueRows.length) { setSelectedRunId(null); setRunResults([]); return; }
        if (!marketLeagueRows.some((row) => row.runId === selectedRunId)) setSelectedRunId(marketLeagueRows[0].runId);
    }, [marketLeagueRows, selectedRunId]);

    useEffect(() => {
        if (!selectedRunId) { setRunResults([]); return; }
        setRunResultsLoading(true);
        api.getSimulationResults(selectedRunId)
            .then((rows) => setRunResults(Array.isArray(rows) ? rows : []))
            .catch(() => setRunResults([]))
            .finally(() => setRunResultsLoading(false));
    }, [selectedRunId]);

    const selectedMarketRows     = useMemo(() => runResults.filter((row) => row.market_type === selectedMarket), [runResults, selectedMarket]);
    const errorBuckets           = useMemo(() => computeErrorBuckets(selectedMarketRows), [selectedMarketRows]);
    const confidenceSegments     = useMemo(() => computeConfidenceSegments(selectedMarketRows), [selectedMarketRows]);

    const marketHealthCards = useMemo(() => MARKET_FILTERS.map((market) => {
        const candidates = buildMarketLeagueRows(filteredRuns).filter((row) => row.marketType === market.value);
        if (!candidates.length) return { value: market.value, label: market.label, healthLabel: 'N/A', healthVariant: 'neutral', primaryMetric: '—', secondaryMetric: 'Aucun run' };
        const scored = candidates.map((c) => ({ ...c, score: market.value.includes('1X2') ? c.metrics.accuracy : c.metrics.hit_rate }));
        const best = scored.sort((a, b) => b.score - a.score)[0];
        return { value: market.value, label: market.label, healthLabel: `${candidates.length} runs`, healthVariant: 'neutral', primaryMetric: fmtPct(best.score, 100), secondaryMetric: best.leagueName };
    }), [filteredRuns]);

    if (loading) return <div className="ml-pa__tab-body"><Skeleton height="200px" /></div>;
    if (error)   return <div className="ml-pa__tab-body"><Card className="ml-pa__alert">{error}</Card></div>;

    return (
        <div className="ml-pa__tab-body">
            <MLHubFiltersBar filters={[
                { id: 'market',  label: 'Marché',  value: selectedMarket,   onChange: setSelectedMarket,   options: MARKET_FILTERS },
                { id: 'league',  label: 'Ligue',   value: selectedLeagueId, onChange: setSelectedLeagueId, options: [{ value: 'all', label: 'Toutes' }, ...availableLeagues.map((l) => ({ value: l.leagueId, label: l.leagueName }))] },
                { id: 'season',  label: 'Saison',  value: selectedSeason,   onChange: setSelectedSeason,   options: [{ value: 'all', label: 'Toutes' }, ...availableSeasons] },
                { id: 'horizon', label: 'Horizon', value: selectedHorizon,  onChange: setSelectedHorizon,  options: [{ value: 'all', label: 'Tous' }, ...availableHorizons] },
            ]} actions={<Button variant="ghost" size="sm" onClick={onReload}>Rafraîchir</Button>} />

            <MLHubMetricStrip metrics={[
                { label: 'Runs filtrés', value: String(filteredRuns.length), subValue: 'Périmètre actuel' },
                { label: 'Misses', value: runResultsLoading ? '…' : String(errorBuckets.misses), subValue: 'Sur le marché actif', featured: true },
                { label: 'Confidence misses', value: runResultsLoading ? '…' : String(errorBuckets.confidentMisses), subValue: 'Picks ratés haute conf' },
            ]} />

            <section className="ml-pa__market-health"><MarketHealthGrid marketSummaries={marketHealthCards} selectedMarket={selectedMarket} onMarketSelect={setSelectedMarket} /></section>

            <section className="ml-pa__grid">
                <MLHubSection title="Leaderboard" subtitle="Runs par performance sur le marché sélectionné." className="ml-pa__panel ml-pa__panel--wide">
                    <Table columns={[
                        { key: 'run',     title: 'Run',     render: (_, r) => (<div className="ml-pa__cell"><strong>#{r.runId}</strong><span>{r.horizonType?.replaceAll('_', ' ') || '—'}</span></div>) },
                        { key: 'league',  title: 'Ligue',   render: (_, r) => (<div className="ml-pa__cell"><strong>{r.leagueName}</strong><span>{r.countryName || ''}</span></div>) },
                        { key: 'season',  title: 'Saison',  render: (_, r) => (<div className="ml-pa__cell"><strong>{r.seasonYear}</strong><Badge variant={r.status === 'COMPLETED' ? 'success' : 'neutral'} size="sm">{r.status}</Badge></div>) },
                        { key: 'score',   title: 'Score',   render: (_, r) => { const m = r.metrics; if (!m) return '—'; return r.marketType.includes('1X2') ? (<div className="ml-pa__cell"><strong>Acc {fmtPct(m.accuracy, 100)}</strong><span>Brier {fmtDecimal(m.brier_score)} · LL {fmtDecimal(m.log_loss)}</span></div>) : (<div className="ml-pa__cell"><strong>Hit {fmtPct(m.hit_rate, 100)}</strong><span>MAE {fmtDecimal(m.mae_total)}</span></div>); } },
                    ]} data={marketLeagueRows} rowKey="runId" interactive onRowClick={(row) => setSelectedRunId(row.runId)} />
                </MLHubSection>
                <Card className="ml-pa__panel">
                    <div className="ml-pa__panel-head"><div className="ml-pa__kicker">Radar qualité</div><h3>Pattern d'erreurs</h3></div>
                    {runResultsLoading ? <Skeleton height="120px" /> : (
                        <>
                            <div className="ml-pa__quality-grid">
                                <div className="ml-pa__quality-item"><span>Hits</span><strong>{errorBuckets.hits}</strong></div>
                                <div className="ml-pa__quality-item"><span>Misses</span><strong>{errorBuckets.misses}</strong></div>
                                <div className="ml-pa__quality-item"><span>Close calls</span><strong>{errorBuckets.closeCalls}</strong></div>
                            </div>
                            <div className="ml-pa__confidence-list">
                                {confidenceSegments.map((s) => (<div key={s.key} className="ml-pa__confidence-item"><span>{s.label}</span><strong>{s.hitRate == null ? '—' : fmtPct(s.hitRate, 100)}</strong></div>))}
                            </div>
                        </>
                    )}
                </Card>
            </section>

        </div>
    );
};

// ─── Error Lab tab ───────────────────────────────────────────────────────────

const ErrorLabTab = ({ runs, filters, loading, error, onReload }) => {
    const [searchParams, setSearchParams] = useSearchParams();
    const [selectedRunId, setSelectedRunId]       = useState('');
    const [selectedMarket, setSelectedMarket]     = useState('FT_1X2');
    const [selectedErrorType, setSelectedErrorType] = useState('all');
    const [results, setResults]                   = useState([]);
    const [resultsLoading, setResultsLoading]     = useState(false);

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

    useEffect(() => {
        const marketFromQuery = searchParams.get('market');
        if (marketFromQuery && DETAIL_MARKETS.some((m) => m.key === marketFromQuery)) setSelectedMarket(marketFromQuery);
    }, [searchParams]);

    useEffect(() => {
        const params = new URLSearchParams();
        if (selectedRunId)    params.set('runId',     selectedRunId);
        if (selectedMarket)   params.set('market',    selectedMarket);
        if (selectedErrorType) params.set('errorType', selectedErrorType);
        setSearchParams(params, { replace: true });
    }, [selectedErrorType, selectedMarket, selectedRunId, setSearchParams]);

    useEffect(() => {
        if (!selectedRunId) { setResults([]); return; }
        let cancelled = false;
        setResultsLoading(true);
        api.getSimulationResults(selectedRunId).then((rows) => { if (!cancelled) setResults(Array.isArray(rows) ? rows : []); }).catch(() => { if (!cancelled) setResults([]); }).finally(() => { if (!cancelled) setResultsLoading(false); });
        return () => { cancelled = true; };
    }, [selectedRunId]);

    const selectedRun = useMemo(() => completedRuns.find((r) => String(r.id) === String(selectedRunId)) || null, [completedRuns, selectedRunId]);
    const marketRows  = useMemo(() => results.filter((row) => row.market_type === selectedMarket), [results, selectedMarket]);

    const filteredErrors = useMemo(() => marketRows.map((row) => ({ ...row, severity: computeSeverity(row), errorClass: classifyRow(row) })).filter((row) => {
        if (selectedErrorType === 'all')       return row.is_correct === 0 || row.is_correct === false;
        if (selectedErrorType === 'confident') return row.errorClass === 'confident';
        if (selectedErrorType === 'heavy')     return row.errorClass === 'heavy';
        if (selectedErrorType === 'close')     return row.errorClass === 'close';
        return true;
    }).sort((a, b) => b.severity - a.severity), [marketRows, selectedErrorType]);

    const stats = useMemo(() => {
        const total = marketRows.length;
        const misses    = marketRows.filter((r) => r.is_correct === 0 || r.is_correct === false).length;
        const confident = marketRows.filter((r) => classifyRow(r) === 'confident').length;
        const heavy     = marketRows.filter((r) => classifyRow(r) === 'heavy').length;
        return { total, misses, confident, heavy };
    }, [marketRows]);

    const filterControls = [
        { id: 'run', label: 'Run', value: selectedRunId, onChange: setSelectedRunId, searchable: true, options: completedRuns.map((r) => ({ value: String(r.id), label: `#${r.id} · ${r.countryName ? `${r.countryName} · ` : ''}${r.leagueName} · ${r.season_year}` })) },
        { id: 'market', label: 'Marché', value: selectedMarket, onChange: setSelectedMarket, options: MARKET_FILTERS },
        { id: 'errorType', label: "Type d'erreur", value: selectedErrorType, onChange: setSelectedErrorType, options: ERROR_FILTERS },
    ];

    const errorColumns = [
        { key: 'fixture', title: 'Fixture', render: (_, row) => (<div className="ml-pa__cell"><strong>{row.home_team_name} vs {row.away_team_name}</strong><span>{fmtDateTime(row.fixture_date)}</span>{row.score && row.score !== '-' ? <span>Score {row.score}</span> : null}{row.round_name ? <span>{row.round_name}</span> : null}</div>) },
        { key: 'market', title: 'Marché', render: (_, row) => (<div className="ml-pa__cell"><Badge variant="danger" size="sm">{row.market_label}</Badge>{row.model_version ? <span>{row.model_version}</span> : null}</div>) },
        { key: 'pick', title: 'Pick ML', render: (_, row) => (<div className="ml-pa__cell"><strong>{row.predicted_outcome || '—'}</strong><span>Confiance {row.primary_probability || '—'}</span>{row.expected_total_label ? <span>Total attendu {row.expected_total_label}</span> : null}</div>) },
        { key: 'actual', title: 'Réel', render: (_, row) => (<div className="ml-pa__cell"><strong>{row.actual_result || '—'}</strong>{row.actual_numeric_label ? <span>Valeur {row.actual_numeric_label}</span> : null}</div>) },
        { key: 'severity', title: 'Sévérité', render: (_, row) => (row.display_mode === '1X2' ? fmtPct(row.severity, 1) : row.severity.toFixed(2)) },
    ];

    if (loading) return <div className="ml-pa__tab-body"><Skeleton height="48px" /><Skeleton height="48px" /><Skeleton height="48px" /></div>;
    if (error)   return <div className="ml-pa__tab-body"><Card className="ml-pa__alert">{error}</Card></div>;

    return (
        <div className="ml-pa__tab-body">
            <MLHubFiltersBar filters={filterControls} actions={<Button variant="ghost" size="sm" onClick={onReload}>Rafraîchir</Button>} />
            <MLHubMetricStrip metrics={[
                { label: 'Total marché',  value: String(stats.total),     subValue: 'Échantillon analysé' },
                { label: 'Misses',        value: String(stats.misses),    subValue: 'Erreurs franches', featured: true },
                { label: 'Confident',     value: String(stats.confident), subValue: 'Ratés à forte confiance' },
                { label: 'Heavy',         value: String(stats.heavy),     subValue: 'Écarts structurels' },
            ]} />
            <MLHubSection title="Erreurs filtrées" subtitle="Tableau propre des erreurs triées par sévérité." badge={selectedRun ? { label: `#${selectedRun.id}`, variant: 'neutral' } : null}>
                {resultsLoading ? <Skeleton height="320px" /> : filteredErrors.length ? (
                    <Table columns={errorColumns} data={filteredErrors.map((row, i) => ({ ...row, error_key: `${row.fixture_id}-${row.market_type}-${i}` }))} rowKey="error_key" />
                ) : <p className="ml-pa__empty">Aucune erreur pour ce filtre.</p>}
            </MLHubSection>
        </div>
    );
};

// ─── Main component ───────────────────────────────────────────────────────────

const MLPerformanceAnalyticsPage = () => {
    const [activeTab, setActiveTab] = useState('roi');
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
            setError(err.message || 'Impossible de charger la page Performance & Analytics.');
            setRuns([]);
            setFilters([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    return (
        <div className="ml-pa">
            <MLHubHero
                badge={{ label: 'Performance & Analytics', variant: 'primary' }}
                title="Performance & Analytics"
                subtitle="ROI des runs modèles · Analyse des simulations · Étude des erreurs"
            />

            <div className="ml-pa__tabs-bar">
                <Tabs items={TABS} activeId={activeTab} onChange={setActiveTab} variant="pills" />
            </div>

            {activeTab === 'roi'    && <RoiLabTab    runs={runs} loading={loading} error={error} />}
            {activeTab === 'simu'   && <SimulationsTab runs={runs} filters={filters} loading={loading} error={error} onReload={load} />}
            {activeTab === 'errors' && <ErrorLabTab   runs={runs} filters={filters} loading={loading} error={error} onReload={load} />}

            <MLHubGlossaryFooter topic="analytics" />
        </div>
    );
};

export default MLPerformanceAnalyticsPage;
