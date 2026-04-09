import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge, Button, Skeleton, Table } from '../../../../design-system';
import api from '../../../../services/api';
import { fmtDate, fmtDecimal, fmtPct } from './shared/mlUtils';
import { MLHubEmptyState, MLHubHero, MLHubMetricStrip, MLHubSection } from './shared/MLHubSurface';
import MLGlossaryTooltip from './shared/MLGlossaryTooltip';
import './MLModelCatalog.css';

const MARKET_COPY = {
    FT_RESULT: {
        title: 'FT 1X2',
        explanation: 'Prédit le résultat final 1 / N / 2. C’est le modèle principal pour la lecture match et les simulations saisonnières.',
        metrics: ['hit rate', 'brier', 'log loss'],
    },
    HT_RESULT: {
        title: 'HT 1X2',
        explanation: "Prédit l'état du match à la pause. Plus difficile que le FT, donc les écarts de calibration sont particulièrement importants.",
        metrics: ['hit rate', 'brier', 'log loss'],
    },
    GOALS_TOTAL: {
        title: 'Goals O/U',
        explanation: 'Estime le volume de buts et la probabilité des lignes de total. Le suivi se lit surtout via hit rate et MAE total.',
        metrics: ['hit rate', 'mae'],
    },
    CORNERS_TOTAL: {
        title: 'Corners O/U',
        explanation: 'Estime le volume de corners. Les horizons courts et les ajustements de ligue ont souvent le plus d’impact ici.',
        metrics: ['hit rate', 'mae'],
    },
    CARDS_TOTAL: {
        title: 'Cards O/U',
        explanation: 'Estime le volume de cartons. Marché très sensible au style de ligue et à la calibration des probabilités.',
        metrics: ['hit rate', 'mae'],
    },
};

const RUN_MARKET_MAP = {
    FT_RESULT: 'FT_1X2',
    HT_RESULT: 'HT_1X2',
    GOALS_TOTAL: 'GOALS_OU',
    CORNERS_TOTAL: 'CORNERS_OU',
    CARDS_TOTAL: 'CARDS_OU',
};

const formatRunMetric = (marketType, metrics) => {
    if (!metrics) return '—';
    if (marketType === 'FT_1X2' || marketType === 'HT_1X2') {
        return `Hit ${fmtPct(metrics.accuracy)} · Brier ${fmtDecimal(metrics.brier_score)} · LL ${fmtDecimal(metrics.log_loss)}`;
    }
    return `Hit ${fmtPct(metrics.hit_rate)} · MAE ${fmtDecimal(metrics.mae_total)}`;
};

const buildLatestRunLookup = (runs = []) => {
    const lookup = new Map();

    runs
        .filter((run) => run.status === 'COMPLETED')
        .sort((a, b) => Number(b.id) - Number(a.id))
        .forEach((run) => {
            const markets = run.metrics?.markets || {};
            Object.entries(markets).forEach(([marketType, metrics]) => {
                const key = `${run.league_id}:${marketType}`;
                if (!lookup.has(key)) {
                    lookup.set(key, {
                        runId: run.id,
                        seasonYear: run.season_year,
                        horizonType: run.horizon_type,
                        metrics,
                    });
                }
            });
        });

    return lookup;
};

const ModelMetricSummary = ({ model, latestRun }) => {
    const runMarketKey = RUN_MARKET_MAP[model.type];
    const metrics = latestRun?.metrics;

    return (
        <div className="ml-catalog__metric-summary">
            <div className="ml-catalog__metric-main">
                <span className="ml-catalog__metric-label">Dernier run validé</span>
                <strong>#{latestRun?.runId || '—'}</strong>
                <span>{latestRun ? `${latestRun.seasonYear} · ${latestRun.horizonType}` : 'Aucun run validé'}</span>
            </div>
            <div className="ml-catalog__metric-grid">
                <div className="ml-catalog__metric-box">
                    <span>Hit rate</span>
                    <strong>
                        {runMarketKey === 'FT_1X2' || runMarketKey === 'HT_1X2'
                            ? fmtPct(metrics?.accuracy)
                            : fmtPct(metrics?.hit_rate)}
                    </strong>
                </div>
                <div className="ml-catalog__metric-box">
                    <span>Brier</span>
                    <strong>{runMarketKey === 'FT_1X2' || runMarketKey === 'HT_1X2' ? fmtDecimal(metrics?.brier_score) : '—'}</strong>
                </div>
                <div className="ml-catalog__metric-box">
                    <span>Log loss</span>
                    <strong>{runMarketKey === 'FT_1X2' || runMarketKey === 'HT_1X2' ? fmtDecimal(metrics?.log_loss) : '—'}</strong>
                </div>
                <div className="ml-catalog__metric-box">
                    <span>MAE</span>
                    <strong>{runMarketKey === 'FT_1X2' || runMarketKey === 'HT_1X2' ? '—' : fmtDecimal(metrics?.mae_total)}</strong>
                </div>
            </div>
        </div>
    );
};

const MLModelCatalog = () => {
    const navigate = useNavigate();
    const [catalog, setCatalog] = useState([]);
    const [runs, setRuns] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedLeagueId, setSelectedLeagueId] = useState('');

    useEffect(() => {
        let cancelled = false;

        Promise.all([
            api.getModelsCatalog(),
            api.getAllSimulationJobs().catch(() => []),
        ])
            .then(([catalogRows, runRows]) => {
                if (cancelled) return;
                setCatalog(Array.isArray(catalogRows) ? catalogRows : []);
                setRuns(Array.isArray(runRows) ? runRows : []);
            })
            .catch((err) => {
                if (!cancelled) setError(err.message || 'Impossible de charger la page modèles.');
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, []);

    const latestRunLookup = useMemo(() => buildLatestRunLookup(runs), [runs]);

    const leagues = useMemo(() => {
        return [...catalog].sort((a, b) => (a.importanceRank || 999) - (b.importanceRank || 999));
    }, [catalog]);

    useEffect(() => {
        if (!selectedLeagueId && leagues.length) {
            setSelectedLeagueId(String(leagues[0].leagueId));
        }
    }, [leagues, selectedLeagueId]);

    const selectedLeague = useMemo(
        () => leagues.find((league) => String(league.leagueId) === String(selectedLeagueId)) || null,
        [leagues, selectedLeagueId]
    );

    const activeModels = useMemo(() => selectedLeague?.models || [], [selectedLeague]);

    const modelRows = useMemo(() => {
        return activeModels.map((model) => {
            const latestRun = latestRunLookup.get(`${selectedLeague?.leagueId}:${RUN_MARKET_MAP[model.type]}`);
            return {
                ...model,
                latestRun,
                marketTitle: MARKET_COPY[model.type]?.title || model.label,
                marketExplanation: MARKET_COPY[model.type]?.explanation || model.description,
            };
        });
    }, [activeModels, latestRunLookup, selectedLeague]);

    const topMetrics = [
        {
            label: 'Ligues couvertes',
            value: String(leagues.length),
            subValue: 'Ligues avec catalogue actif',
            featured: true,
        },
        {
            label: 'Modèles actifs',
            value: String(leagues.reduce((acc, league) => acc + (league.models?.length || 0), 0)),
            subValue: 'Tous marchés confondus',
        },
        {
            label: 'Derniers runs lus',
            value: String(runs.filter((run) => run.status === 'COMPLETED').length),
            subValue: 'Base de lecture des métriques',
        },
        {
            label: 'Ligues en shadow',
            value: 'Ciblées',
            subValue: 'Via policy runtime, pas via cette page',
        },
    ];

    const leagueTableRows = useMemo(() => {
        return leagues.map((league) => ({
            id: league.leagueId,
            leagueName: league.leagueName,
            country: league.country,
            importanceRank: league.importanceRank,
            modelsCount: league.models?.length || 0,
            ftMetrics: latestRunLookup.get(`${league.leagueId}:FT_1X2`)?.metrics || null,
            htMetrics: latestRunLookup.get(`${league.leagueId}:HT_1X2`)?.metrics || null,
            goalsMetrics: latestRunLookup.get(`${league.leagueId}:GOALS_OU`)?.metrics || null,
            cornersMetrics: latestRunLookup.get(`${league.leagueId}:CORNERS_OU`)?.metrics || null,
            cardsMetrics: latestRunLookup.get(`${league.leagueId}:CARDS_OU`)?.metrics || null,
        }));
    }, [leagues, latestRunLookup]);

    const leagueColumns = [
        {
            key: 'league',
            title: 'Ligue',
            render: (_, row) => (
                <div className="ml-catalog__league-cell">
                    <strong>{row.leagueName}</strong>
                    <span>{row.country}</span>
                </div>
            ),
        },
        {
            key: 'scope',
            title: 'Couverture',
            render: (_, row) => (
                <div className="ml-catalog__league-scope">
                    <Badge variant="neutral" size="sm">#{row.importanceRank}</Badge>
                    <span>{row.modelsCount} modèles</span>
                </div>
            ),
        },
        {
            key: 'ft',
            title: 'FT dernier run',
            render: (_, row) => formatRunMetric('FT_1X2', row.ftMetrics),
        },
        {
            key: 'ht',
            title: 'HT dernier run',
            render: (_, row) => formatRunMetric('HT_1X2', row.htMetrics),
        },
        {
            key: 'goals',
            title: 'Goals',
            render: (_, row) => formatRunMetric('GOALS_OU', row.goalsMetrics),
        },
        {
            key: 'corners',
            title: 'Corners',
            render: (_, row) => formatRunMetric('CORNERS_OU', row.cornersMetrics),
        },
        {
            key: 'cards',
            title: 'Cards',
            render: (_, row) => formatRunMetric('CARDS_OU', row.cardsMetrics),
        },
    ];

    if (loading) {
        return (
            <div className="ml-catalog">
                <Skeleton height="120px" />
                <Skeleton height="64px" />
                <Skeleton height="320px" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="ml-catalog">
                <MLHubEmptyState title="Chargement impossible" message={error} />
            </div>
        );
    }

    return (
        <div className="ml-catalog">
            <MLHubHero
                badge={{ label: 'Modèles actifs', variant: 'primary' }}
                title="Cartographie des modèles par ligue"
                subtitle="Cette page explique ce que prédit chaque marché et affiche les derniers résultats validés par ligue sur les runs saisonniers."
                actions={(
                    <div className="ml-catalog__hero-actions">
                        <MLGlossaryTooltip topic="models" label="Glossaire modèles" />
                        <Button variant="ghost" onClick={() => navigate('/machine-learning/performance')}>
                            Aller vers Performance
                        </Button>
                    </div>
                )}
            />

            <MLHubMetricStrip metrics={topMetrics} />

            <MLHubSection
                title="Comment lire les modèles"
                subtitle="Les modèles FT et HT se lisent avec hit rate, Brier et log loss. Les marchés de volume se lisent avec hit rate et MAE."
                badge={{ label: 'Référence', variant: 'neutral' }}
            >
                <div className="ml-catalog__market-copy-grid">
                    {Object.values(MARKET_COPY).map((market) => (
                        <div key={market.title} className="ml-catalog__market-copy">
                            <strong>{market.title}</strong>
                            <p>{market.explanation}</p>
                            <span>{market.metrics.join(' · ')}</span>
                        </div>
                    ))}
                </div>
            </MLHubSection>

            <MLHubSection
                title="Dernier run par ligue"
                subtitle="Vue synthétique pour repérer rapidement où les modèles tiennent la route et où la calibration se dégrade."
                badge={{ label: `${leagueTableRows.length} ligues`, variant: 'neutral' }}
            >
                <Table
                    columns={leagueColumns}
                    data={leagueTableRows}
                    rowKey="id"
                    interactive
                    onRowClick={(row) => setSelectedLeagueId(String(row.id))}
                />
            </MLHubSection>

            <MLHubSection
                title={selectedLeague ? `${selectedLeague.leagueName} · détail des modèles` : 'Détail des modèles'}
                subtitle="Chaque carte reprend le rôle du modèle, la profondeur d'entraînement et les métriques issues du dernier run saisonnier disponible pour cette ligue."
                badge={selectedLeague ? { label: selectedLeague.country, variant: 'neutral' } : null}
            >
                {modelRows.length ? (
                    <div className="ml-catalog__models-list">
                        {modelRows.map((model) => (
                            <div key={`${selectedLeague.leagueId}-${model.type}`} className="ml-catalog__model-row">
                                <div className="ml-catalog__model-copy">
                                    <div className="ml-catalog__model-head">
                                        <strong>{model.marketTitle}</strong>
                                        <div className="ml-catalog__model-badges">
                                            <Badge variant="primary" size="sm">{model.version || 'runtime'}</Badge>
                                            {model.isActive ? <Badge variant="success" size="sm">Actif</Badge> : null}
                                        </div>
                                    </div>
                                    <p>{model.marketExplanation}</p>
                                    <div className="ml-catalog__training-meta">
                                        <span>Saisons: {model.trainingDataSummary?.seasonsRange || '—'}</span>
                                        <span>Échantillons: {model.trainingDataSummary?.samplesCount?.toLocaleString?.() || '—'}</span>
                                        <span>Dernier entraînement: {fmtDate(model.trainingDataSummary?.lastTrainedAt)}</span>
                                    </div>
                                    <div className="ml-catalog__feature-inline">
                                        {(model.trainingFeatures || []).slice(0, 8).map((feature) => (
                                            <Badge key={feature.name} variant="neutral" size="sm">{feature.name}</Badge>
                                        ))}
                                    </div>
                                </div>
                                <ModelMetricSummary model={model} latestRun={model.latestRun} />
                            </div>
                        ))}
                    </div>
                ) : (
                    <MLHubEmptyState title="Aucun modèle" message="Cette ligue n'a pas encore de modèle actif dans le catalogue." />
                )}
            </MLHubSection>
        </div>
    );
};

export default MLModelCatalog;
