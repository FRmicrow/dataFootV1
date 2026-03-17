import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Badge, Button, Card, Skeleton } from '../../../../design-system';
import api from '../../../../services/api';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { MLHubFiltersBar, MLHubHero, MLHubMetricStrip, MLHubSection } from './shared/MLHubSurface';
import MLHubGlossaryFooter from './shared/MLHubGlossaryFooter';
import { fmtDateTime, fmtDecimal, getOutcomeVariant, getStatusVariant } from './shared/mlUtils';
import './MLMatchPremiumPage.css';

const MARKET_OPTIONS = [
    { value: 'FT_1X2', label: '1X2 FT', modelKey: 'FT_RESULT', type: '1X2' },
    { value: 'HT_1X2', label: '1X2 HT', modelKey: 'HT_RESULT', type: '1X2' },
    { value: 'GOALS_OU', label: 'Goals O/U', modelKey: 'GOALS_TOTAL', type: 'TOTALS', selection: 'Over 2.5' },
    { value: 'CORNERS_OU', label: 'Corners O/U', modelKey: 'CORNERS_TOTAL', type: 'TOTALS', selection: 'Over 9.5' },
    { value: 'CARDS_OU', label: 'Cards O/U', modelKey: 'CARDS_TOTAL', type: 'TOTALS', selection: 'Over 4.5' },
];

const toPct = (value) => {
    const num = Number(value);
    return Number.isFinite(num) ? `${(num * 100).toFixed(1)}%` : '—';
};

const normalizeOneXTwo = (payload) => {
    const probs = payload?.probabilities_1n2 || {};
    return Object.entries(probs)
        .map(([selection, probability]) => ({
            selection,
            probability: Number(probability),
        }))
        .filter((item) => Number.isFinite(item.probability))
        .sort((a, b) => b.probability - a.probability);
};

const normalizeTotals = (payload, selection) => {
    const probs = payload?.over_under_probabilities || {};
    const opposite = selection.startsWith('Over') ? selection.replace('Over', 'Under') : selection.replace('Under', 'Over');
    return {
        selection,
        probability: Number(probs[selection]),
        opposite,
        oppositeProbability: Number(probs[opposite]),
        expectedTotal:
            payload?.expected_goals?.total ??
            payload?.expected_corners?.total ??
            payload?.expected_cards?.total ??
            null,
        context: payload?.adjustment_context || null,
    };
};

const VariantCard = ({ title, badge, rows, footer }) => (
    <Card className="ml-match-premium__variant-card">
        <div className="ml-match-premium__variant-head">
            <strong>{title}</strong>
            {badge ? <Badge variant={badge.variant || 'neutral'} size="sm">{badge.label}</Badge> : null}
        </div>
        <div className="ml-match-premium__variant-body">
            {rows.map((row) => (
                <div key={row.label} className="ml-match-premium__variant-row">
                    <span>{row.label}</span>
                    <strong>{row.value}</strong>
                </div>
            ))}
        </div>
        {footer ? <div className="ml-match-premium__variant-footer">{footer}</div> : null}
    </Card>
);

const MLMatchPremiumPage = () => {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const [runs, setRuns] = useState([]);
    const [filters, setFilters] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedRunId, setSelectedRunId] = useState('');
    const [selectedFixtureId, setSelectedFixtureId] = useState('');
    const [selectedMarket, setSelectedMarket] = useState('FT_1X2');
    const [results, setResults] = useState([]);
    const [resultsLoading, setResultsLoading] = useState(false);
    const [fixturePrediction, setFixturePrediction] = useState(null);
    const [fixturePredictionLoading, setFixturePredictionLoading] = useState(false);

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
            setError(err.message || 'Impossible de charger les runs premium.');
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
        if (!selectedRunId) {
            setSelectedRunId(String(completedRuns[0].id));
        }
    }, [completedRuns, searchParams, selectedRunId]);

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

    const fixtureOptions = useMemo(() => {
        const unique = new Map();
        for (const row of results) {
            if (!unique.has(row.fixture_id)) {
                unique.set(row.fixture_id, {
                    fixtureId: row.fixture_id,
                    label: `${row.home_team_name} vs ${row.away_team_name}`,
                    date: row.fixture_date,
                });
            }
        }
        return [...unique.values()].sort((a, b) => new Date(a.date) - new Date(b.date));
    }, [results]);

    useEffect(() => {
        if (!fixtureOptions.length) {
            setSelectedFixtureId('');
            return;
        }
        const fixtureFromQuery = searchParams.get('fixtureId');
        if (fixtureFromQuery && fixtureOptions.some((option) => String(option.fixtureId) === fixtureFromQuery)) {
            setSelectedFixtureId(fixtureFromQuery);
            return;
        }
        if (!fixtureOptions.some((option) => String(option.fixtureId) === String(selectedFixtureId))) {
            setSelectedFixtureId(String(fixtureOptions[0].fixtureId));
        }
    }, [fixtureOptions, searchParams, selectedFixtureId]);

    useEffect(() => {
        const marketFromQuery = searchParams.get('market');
        if (marketFromQuery && MARKET_OPTIONS.some((market) => market.value === marketFromQuery)) {
            setSelectedMarket(marketFromQuery);
        }
    }, [searchParams]);

    useEffect(() => {
        const params = new URLSearchParams();
        if (selectedRunId) params.set('runId', selectedRunId);
        if (selectedFixtureId) params.set('fixtureId', selectedFixtureId);
        if (selectedMarket) params.set('market', selectedMarket);
        setSearchParams(params, { replace: true });
    }, [selectedFixtureId, selectedMarket, selectedRunId, setSearchParams]);

    useEffect(() => {
        if (!selectedFixtureId) {
            setFixturePrediction(null);
            return;
        }

        let cancelled = false;
        setFixturePredictionLoading(true);
        api.getFixturePrediction(selectedFixtureId)
            .then((payload) => {
                if (!cancelled) {
                    setFixturePrediction(payload?.success ? payload : null);
                }
            })
            .catch(() => {
                if (!cancelled) {
                    setFixturePrediction(null);
                }
            })
            .finally(() => {
                if (!cancelled) {
                    setFixturePredictionLoading(false);
                }
            });

        return () => {
            cancelled = true;
        };
    }, [selectedFixtureId]);

    const selectedFixtureRows = useMemo(
        () => results.filter((row) => String(row.fixture_id) === String(selectedFixtureId)),
        [results, selectedFixtureId]
    );

    const runMarketRows = useMemo(
        () => selectedFixtureRows.filter((row) => row.market_type === selectedMarket),
        [selectedFixtureRows, selectedMarket]
    );

    const selectedRunRow = runMarketRows[0] || null;
    const selectedMarketConfig = MARKET_OPTIONS.find((market) => market.value === selectedMarket);
    const liveModel = fixturePrediction?.models?.[selectedMarketConfig?.modelKey];
    const filterControls = [
        {
            id: 'run',
            label: 'Run',
            value: selectedRunId,
            onChange: setSelectedRunId,
            searchable: true,
            options: completedRuns.map((run) => ({
                value: String(run.id),
                label: `#${run.id} · ${run.countryName ? `${run.countryName} · ` : ''}${run.leagueName} · ${run.season_year} · ${run.horizon_type}`,
            })),
        },
        {
            id: 'fixture',
            label: 'Fixture',
            value: selectedFixtureId,
            onChange: setSelectedFixtureId,
            searchable: true,
            options: fixtureOptions.map((option) => ({
                value: String(option.fixtureId),
                label: `${option.label} · ${fmtDateTime(option.date)}`,
            })),
        },
        {
            id: 'market',
            label: 'Marché',
            value: selectedMarket,
            onChange: setSelectedMarket,
            options: MARKET_OPTIONS,
        },
    ];

    const topMetrics = [
        {
            label: 'Run',
            value: selectedRun ? `#${selectedRun.id}` : '—',
            subValue: selectedRun ? `${selectedRun.leagueName} · ${selectedRun.season_year}` : 'Choisis un run',
            featured: true,
        },
        {
            label: 'Fixture',
            value: selectedRunRow ? `${selectedRunRow.home_team_name} vs ${selectedRunRow.away_team_name}` : '—',
            subValue: selectedRunRow ? fmtDateTime(selectedRunRow.fixture_date) : 'Choisis une fixture',
        },
        {
            label: 'Marché',
            value: selectedRunRow?.market_label || selectedMarketConfig?.label || '—',
            subValue: selectedRunRow ? `Pick ${selectedRunRow.predicted_outcome}` : 'Lecture ciblée',
        },
        {
            label: 'Verdict historique',
            value: selectedRunRow ? (selectedRunRow.is_correct ? 'Hit' : 'Miss') : '—',
            subValue: selectedRunRow ? `Réalité ${selectedRunRow.actual_result}` : 'Aucune donnée',
        },
    ];

    const liveVariants = useMemo(() => {
        if (!liveModel || !selectedMarketConfig) return [];

        if (selectedMarketConfig.type === '1X2') {
            const items = [];
            const base = normalizeOneXTwo(liveModel);
            items.push({
                key: 'base',
                title: 'Global actuel',
                badge: { label: liveModel.model_scope || 'global', variant: 'primary' },
                rows: base.map((row) => ({ label: row.selection, value: `${(row.probability * 100).toFixed(1)}%` })),
                footer: liveModel.model_version || '—',
            });
            if (liveModel.shadow_evaluation?.league_specific_candidate) {
                const shadow = normalizeOneXTwo(liveModel.shadow_evaluation.league_specific_candidate);
                items.push({
                    key: 'shadow',
                    title: 'League shadow',
                    badge: { label: 'shadow', variant: 'warning' },
                    rows: shadow.map((row) => ({ label: row.selection, value: `${(row.probability * 100).toFixed(1)}%` })),
                    footer: liveModel.shadow_evaluation.league_specific_candidate.model_version || '—',
                });
            }
            return items;
        }

        const items = [];
        const raw = liveModel.adjustment_evaluation?.without_adjustment
            ? normalizeTotals(liveModel.adjustment_evaluation.without_adjustment, selectedMarketConfig.selection)
            : normalizeTotals(liveModel, selectedMarketConfig.selection);
        items.push({
            key: 'raw',
            title: 'Brut',
            badge: { label: 'global', variant: 'neutral' },
            rows: [
                { label: raw.selection, value: toPct(raw.probability) },
                { label: raw.opposite, value: toPct(raw.oppositeProbability) },
                { label: 'Total attendu', value: fmtDecimal(raw.expectedTotal, 2) },
            ],
            footer: liveModel.model_version || '—',
        });

        if (liveModel.adjustment_evaluation?.with_league_adjustment) {
            const adjusted = normalizeTotals(liveModel.adjustment_evaluation.with_league_adjustment, selectedMarketConfig.selection);
            items.push({
                key: 'adjusted',
                title: 'Ajusté ligue',
                badge: { label: 'adjusted', variant: 'primary' },
                rows: [
                    { label: adjusted.selection, value: toPct(adjusted.probability) },
                    { label: adjusted.opposite, value: toPct(adjusted.oppositeProbability) },
                    { label: 'Total attendu', value: fmtDecimal(adjusted.expectedTotal, 2) },
                ],
                footer: adjusted.context?.league_name || liveModel.model_version || '—',
            });
        }

        if (liveModel.shadow_evaluation?.league_specific_candidate) {
            const shadow = normalizeTotals(liveModel.shadow_evaluation.league_specific_candidate, selectedMarketConfig.selection);
            items.push({
                key: 'shadow',
                title: 'League shadow',
                badge: { label: 'shadow', variant: 'warning' },
                rows: [
                    { label: shadow.selection, value: toPct(shadow.probability) },
                    { label: shadow.opposite, value: toPct(shadow.oppositeProbability) },
                    { label: 'Total attendu', value: fmtDecimal(shadow.expectedTotal, 2) },
                ],
                footer: liveModel.shadow_evaluation.league_specific_candidate.model_version || '—',
            });
        }

        return items;
    }, [liveModel, selectedMarketConfig]);

    return (
        <div className="ml-match-premium">
            <MLHubHero
                badge={{ label: 'Premium Match Lab', variant: 'primary' }}
                title="Match Premium"
                subtitle="Lire une fixture en profondeur: run historique, moteur actif, variantes globales et shadow."
                actions={<Button variant="ghost" onClick={load}>Rafraîchir</Button>}
            />

            {error ? <Card className="ml-match-premium__alert">{error}</Card> : null}

            {loading ? (
                <div className="ml-match-premium__loading">
                    <Skeleton height="48px" />
                    <Skeleton height="48px" />
                    <Skeleton height="48px" />
                </div>
            ) : (
                <MLHubFiltersBar filters={filterControls} />
            )}

            <MLHubMetricStrip metrics={topMetrics} />

            <section className="ml-match-premium__grid">
                <MLHubSection
                    title="Fixture sélectionnée"
                    subtitle="Contexte du match actuellement analysé."
                    badge={selectedRun ? { label: selectedRun.status, variant: getStatusVariant(selectedRun.status) } : null}
                    className="ml-match-premium__panel"
                >
                    {selectedRunRow ? (
                        <div className="ml-match-premium__meta-list">
                            <div className="ml-match-premium__meta-row"><span>Match</span><strong>{selectedRunRow.home_team_name} vs {selectedRunRow.away_team_name}</strong></div>
                            <div className="ml-match-premium__meta-row"><span>Date</span><strong>{fmtDateTime(selectedRunRow.fixture_date)}</strong></div>
                            <div className="ml-match-premium__meta-row"><span>Marché</span><strong>{selectedRunRow.market_label}</strong></div>
                            <div className="ml-match-premium__meta-row"><span>Run</span><strong>#{selectedRun?.id || '—'} · {selectedRun?.leagueName || '—'}</strong></div>
                        </div>
                    ) : (
                        <p className="ml-match-premium__empty">Sélectionne une fixture.</p>
                    )}
                </MLHubSection>

                <MLHubSection
                    title="Résultat du run"
                    subtitle="Ce que le run historique a réellement produit sur ce marché."
                    className="ml-match-premium__panel"
                >
                    {selectedRunRow ? (
                        <div className="ml-match-premium__meta-list">
                            <div className="ml-match-premium__meta-row"><span>Pick</span><strong>{selectedRunRow.predicted_outcome}</strong></div>
                            <div className="ml-match-premium__meta-row"><span>Confiance</span><strong>{selectedRunRow.primary_probability || '—'}</strong></div>
                            <div className="ml-match-premium__meta-row"><span>Réalité</span><strong>{selectedRunRow.actual_result}</strong></div>
                            <div className="ml-match-premium__meta-row"><span>Verdict</span><Badge variant={getOutcomeVariant(selectedRunRow.is_correct)} size="sm">{selectedRunRow.is_correct ? 'Hit' : 'Miss'}</Badge></div>
                            {selectedRunRow.expected_total_label ? (
                                <div className="ml-match-premium__meta-row"><span>Total attendu</span><strong>{selectedRunRow.expected_total_label}</strong></div>
                            ) : null}
                            <div className="ml-match-premium__panel-actions">
                                <Button
                                    variant="ghost"
                                    onClick={() => navigate(`/machine-learning/error-lab?runId=${selectedRunId}&market=${selectedMarket}`)}
                                >
                                    Ouvrir Error Lab
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <p className="ml-match-premium__empty">Aucune donnée de run pour ce marché.</p>
                    )}
                </MLHubSection>
            </section>

            <section className="ml-match-premium__panel-stack">
                <MLHubSection
                    title="Moteur actuel vs historique"
                    subtitle="Comparer le run stocké à l’état courant du moteur de prédiction."
                    className="ml-match-premium__panel"
                >
                    {fixturePredictionLoading ? (
                        <Skeleton height="240px" />
                    ) : liveVariants.length ? (
                        <div className="ml-match-premium__variants-grid">
                            {liveVariants.map((variant) => (
                                <VariantCard
                                    key={variant.key}
                                    title={variant.title}
                                    badge={variant.badge}
                                    rows={variant.rows}
                                    footer={variant.footer}
                                />
                            ))}
                        </div>
                    ) : (
                        <p className="ml-match-premium__empty">Le moteur actuel ne remonte pas encore de détail exploitable pour ce marché.</p>
                    )}
                </MLHubSection>

                <MLHubSection
                    title="Tous les marchés du run"
                    subtitle="Lecture complète de la fixture sur FT, HT, goals, corners et cards."
                    className="ml-match-premium__panel"
                >
                    {resultsLoading ? (
                        <Skeleton height="220px" />
                    ) : selectedFixtureRows.length ? (
                        <div className="ml-match-premium__market-history">
                            {selectedFixtureRows.map((row) => (
                                <div key={`${row.fixture_id}-${row.market_type}`} className={`ml-match-premium__market-history-item ${row.market_type === selectedMarket ? 'ml-match-premium__market-history-item--active' : ''}`}>
                                    <div className="ml-match-premium__market-history-head">
                                        <strong>{row.market_label}</strong>
                                        <Badge variant={getOutcomeVariant(row.is_correct)} size="sm">{row.is_correct ? 'Hit' : 'Miss'}</Badge>
                                    </div>
                                    <div className="ml-match-premium__market-history-grid">
                                        <span>Pick <strong>{row.predicted_outcome}</strong></span>
                                        <span>Réel <strong>{row.actual_result}</strong></span>
                                        <span>Confiance <strong>{row.primary_probability || '—'}</strong></span>
                                        <span>Total <strong>{row.expected_total_label || '—'}</strong></span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="ml-match-premium__empty">Aucun historique disponible pour cette fixture.</p>
                    )}
                </MLHubSection>
            </section>
            <MLHubGlossaryFooter topic="analytics" />
        </div>
    );
};

export default MLMatchPremiumPage;
