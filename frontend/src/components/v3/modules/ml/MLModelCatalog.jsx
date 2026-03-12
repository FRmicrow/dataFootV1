import React, { useState, useEffect } from 'react';
import { Card, Badge, MetricCard, Skeleton, Stack } from '../../../../design-system';
import Accordion from '../../../../design-system/components/Accordion';
import api from '../../../../services/api';
import './MLModelCatalog.css';

const CATEGORY_COLORS = {
    form:        { bg: 'var(--color-info)',    label: 'Forme'       },
    historical:  { bg: 'var(--color-success)', label: 'Historique'  },
    contextual:  { bg: 'var(--color-warning)', label: 'Contextuel'  },
    odds:        { bg: 'var(--color-accent)',  label: 'Cotes'       },
    advanced:    { bg: 'var(--color-error)',   label: 'Avancé'      },
};

const MARKET_ICONS = {
    FT_RESULT:     '⚽',
    HT_RESULT:     '⏱️',
    CORNERS_TOTAL: '🚩',
    CARDS_TOTAL:   '🟨',
};

const ProbBar = ({ label, value, color }) => (
    <div className="ml-catalog__prob-row">
        <span className="ml-catalog__prob-label">{label}</span>
        <div className="ml-catalog__prob-track">
            <div className="ml-catalog__prob-fill" style={{ width: `${Math.round(value * 100)}%`, background: color }} />
        </div>
        <span className="ml-catalog__prob-value">{Math.round(value * 100)}%</span>
    </div>
);

const ExamplePrediction = ({ example, modelType }) => {
    const isCornerOrCard = modelType === 'CORNERS_TOTAL' || modelType === 'CARDS_TOTAL';

    return (
        <div className="ml-catalog__example">
            <p className="ml-catalog__example-label">
                <span>📌</span> {example.fixtureLabel}
            </p>
            <div className="ml-catalog__prob-bars">
                {isCornerOrCard ? (
                    <>
                        <ProbBar label="Over" value={example.prediction.over ?? 0} color="var(--color-success)" />
                        <ProbBar label="Under" value={example.prediction.under ?? 0} color="var(--color-text-muted)" />
                    </>
                ) : (
                    <>
                        <ProbBar label={example.homeTeam ?? 'Domicile'} value={example.prediction.home ?? 0} color="var(--color-accent)" />
                        <ProbBar label="Nul" value={example.prediction.draw ?? 0} color="var(--color-warning)" />
                        <ProbBar label={example.awayTeam ?? 'Extérieur'} value={example.prediction.away ?? 0} color="var(--color-info)" />
                    </>
                )}
            </div>
            {example.topFeatures?.length > 0 && (
                <div className="ml-catalog__top-features">
                    <p className="ml-catalog__top-features-title">Top facteurs</p>
                    {example.topFeatures.map((f, i) => (
                        <div key={i} className="ml-catalog__feature-contrib">
                            <span className={`ml-catalog__feature-dir ml-catalog__feature-dir--${f.direction}`}>
                                {f.direction === 'positive' ? '↑' : '↓'}
                            </span>
                            <span className="ml-catalog__feature-name">{f.feature}</span>
                            <Badge variant={f.impact === 'high' ? 'danger' : f.impact === 'medium' ? 'warning' : 'default'}>
                                {f.impact}
                            </Badge>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

const ModelCard = ({ model }) => {
    const [showExample, setShowExample] = useState(false);

    return (
        <Card className="ml-catalog__model-card">
            <div className="ml-catalog__model-header">
                <span className="ml-catalog__model-icon">{MARKET_ICONS[model.type] ?? '🤖'}</span>
                <div className="ml-catalog__model-title-group">
                    <h3 className="ml-catalog__model-title">{model.label}</h3>
                    <div className="ml-catalog__model-badges">
                        <Badge variant="success">{model.version}</Badge>
                        {model.isActive && <Badge variant="info">● ACTIF</Badge>}
                    </div>
                </div>
            </div>

            <p className="ml-catalog__model-desc">{model.description}</p>

            <div className="ml-catalog__features-section">
                <p className="ml-catalog__section-title">Features utilisées</p>
                <div className="ml-catalog__feature-chips">
                    {model.trainingFeatures.map((f, i) => {
                        const cat = CATEGORY_COLORS[f.category] ?? CATEGORY_COLORS.form;
                        return (
                            <span
                                key={i}
                                className="ml-catalog__feature-chip"
                                style={{ borderColor: cat.bg, color: cat.bg }}
                                title={f.description}
                            >
                                {f.name}
                            </span>
                        );
                    })}
                </div>
                <div className="ml-catalog__category-legend">
                    {Object.entries(CATEGORY_COLORS).map(([key, val]) => (
                        <span key={key} className="ml-catalog__legend-item" style={{ color: val.bg }}>
                            ■ {val.label}
                        </span>
                    ))}
                </div>
            </div>

            <div className="ml-catalog__training-summary">
                <span className="ml-catalog__summary-item">
                    📅 {model.trainingDataSummary.seasonsRange}
                </span>
                {model.trainingDataSummary.samplesCount && (
                    <span className="ml-catalog__summary-item">
                        🗃 {model.trainingDataSummary.samplesCount.toLocaleString()} exemples
                    </span>
                )}
                {model.trainingDataSummary.lastTrainedAt && (
                    <span className="ml-catalog__summary-item">
                        🔄 MAJ {new Date(model.trainingDataSummary.lastTrainedAt).toLocaleDateString('fr-FR')}
                    </span>
                )}
            </div>

            <div className="ml-catalog__metrics">
                <MetricCard
                    label="Hit Rate"
                    value={model.metrics.accuracy ? `${Math.round(model.metrics.accuracy * 100)}%` : '—'}
                    icon="🎯"
                />
                <MetricCard
                    label="Brier Score"
                    value={model.metrics.brierScore != null ? model.metrics.brierScore.toFixed(3) : '—'}
                    icon="📐"
                    subValue="0 = parfait"
                />
            </div>

            {model.examplePrediction && (
                <div className="ml-catalog__example-toggle">
                    <button
                        className="ml-catalog__toggle-btn"
                        onClick={() => setShowExample(!showExample)}
                    >
                        {showExample ? '▼' : '▶'} Exemple de prédiction
                    </button>
                    {showExample && (
                        <ExamplePrediction example={model.examplePrediction} modelType={model.type} />
                    )}
                </div>
            )}
        </Card>
    );
};

const MLModelCatalog = () => {
    const [catalog, setCatalog] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        api.getModelsCatalog()
            .then(data => setCatalog(Array.isArray(data) ? data : []))
            .catch(err => setError(err.message))
            .finally(() => setLoading(false));
    }, []);

    if (loading) return (
        <div className="ml-catalog">
            <div className="ml-catalog__header">
                <Skeleton width="200px" height="32px" />
                <Skeleton width="120px" height="20px" />
            </div>
            {[1, 2].map(i => <Skeleton key={i} height="200px" className="ds-mb-lg" />)}
        </div>
    );

    if (error) return (
        <div className="ml-catalog">
            <Card className="ml-catalog__error">
                <p>⚠️ Erreur lors du chargement du catalogue : {error}</p>
            </Card>
        </div>
    );

    const totalModels = catalog.reduce((acc, l) => acc + l.models.length, 0);

    return (
        <div className="ml-catalog">
            <div className="ml-catalog__header">
                <h2 className="ml-catalog__title">🔬 Catalogue des Modèles</h2>
                <p className="ml-catalog__meta">
                    {catalog.length} ligue{catalog.length > 1 ? 's' : ''} · {totalModels} modèles actifs
                </p>
            </div>

            {catalog.length === 0 ? (
                <Card className="ml-catalog__empty">
                    <Stack direction="col" gap="sm" className="ds-items-center ds-text-center">
                        <span style={{ fontSize: '2rem' }}>🤖</span>
                        <p>Aucun modèle déployé. Lance une simulation Forge pour commencer.</p>
                    </Stack>
                </Card>
            ) : (
                <div className="ml-catalog__leagues">
                    {catalog.map((league, idx) => (
                        <Accordion
                            key={league.leagueId}
                            defaultExpanded={idx === 0}
                            maxHeight="none"
                            title={
                                <div className="ml-catalog__accordion-title">
                                    {league.leagueLogo && (
                                        <img src={league.leagueLogo} alt="" className="ml-catalog__league-logo" />
                                    )}
                                    <span>{league.leagueName}</span>
                                    <span className="ml-catalog__country">{league.country}</span>
                                </div>
                            }
                            headerRight={
                                <Badge variant="default">#{league.importanceRank}</Badge>
                            }
                        >
                            <div className="ml-catalog__models-grid">
                                {league.models.map((model, i) => (
                                    <ModelCard key={i} model={model} />
                                ))}
                            </div>
                        </Accordion>
                    ))}
                </div>
            )}
        </div>
    );
};

export default MLModelCatalog;
