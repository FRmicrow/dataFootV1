import React from 'react';
import { Badge } from '../../../../../design-system';
import { fmtDateTime, fmtDecimal, fmtPct, getOutcomeVariant } from '../shared/mlUtils';

const MARKET_LABELS = {
    ftResult: 'FT 1X2',
    htResult: 'HT 1X2',
    goalsTotal: 'Goals O/U',
    cornersTotal: 'Corners O/U',
    cardsTotal: 'Cards O/U',
};

const STATUS_LABELS = {
    ready: 'Prêt',
    partial: 'Partiel',
    missing: 'En attente',
};

const STATUS_VARIANTS = {
    ready: 'success',
    partial: 'warning',
    missing: 'neutral',
};

const renderResultMarket = (market) => (
    <>
        <div><span>Sélection</span><strong>{market.selection}</strong></div>
        <div><span>Probabilité</span><strong>{fmtPct(market.probability, 100)}</strong></div>
        <div><span>Lecture</span><strong>{market.selectionLabel}</strong></div>
        <div><span>Version</span><strong>{market.modelVersion || 'runtime'}</strong></div>
    </>
);

const renderTotalMarket = (market) => (
    <>
        <div><span>Sélection</span><strong>{market.selection}</strong></div>
        <div><span>Probabilité</span><strong>{fmtPct(market.probability, 100)}</strong></div>
        <div><span>Total attendu</span><strong>{fmtDecimal(market.expectedTotal, 2)}</strong></div>
        <div><span>Ligne</span><strong>{market.line}</strong></div>
    </>
);

const MarketCard = ({ marketKey, market }) => {
    const isResultMarket = marketKey === 'ftResult' || marketKey === 'htResult';

    return (
        <div className="ml-foresight__market-card">
            <div className="ml-foresight__market-head">
                <strong>{MARKET_LABELS[marketKey] || marketKey}</strong>
                <Badge variant="neutral" size="sm">{market.selection}</Badge>
            </div>
            <div className="ml-foresight__market-grid">
                {isResultMarket ? renderResultMarket(market) : renderTotalMarket(market)}
            </div>
        </div>
    );
};

const getPendingMessage = (fixture) => {
    const availableMarkets = Object.values(fixture.markets || {}).filter(Boolean).length;
    if (availableMarkets > 0) {
        return 'FT 1X2 en attente. Les autres marchés disponibles restent affichés.';
    }
    return 'Prédiction en attente pour ce match.';
};

export const ForesightFixtureCard = ({ fixture, compact = false }) => {
    const marketEntries = Object.entries(fixture.markets || {}).filter(([, value]) => value);
    const hasProjectedResult = Boolean(fixture.projectedResult);

    return (
        <div className={`ml-foresight__fixture-card ${compact ? 'is-compact' : ''} ${fixture.predictionStatus === 'missing' ? 'is-pending' : ''}`}>
            <div className="ml-foresight__fixture-top">
                <div>
                    <strong>{fixture.homeTeam?.name} vs {fixture.awayTeam?.name}</strong>
                    <span>{fmtDateTime(fixture.date)}{fixture.round ? ` · ${fixture.round}` : ''}</span>
                </div>
                <div className="ml-foresight__fixture-badges">
                    {fixture.leagueName ? <Badge variant="neutral" size="sm">{fixture.leagueName}</Badge> : null}
                    <Badge variant={STATUS_VARIANTS[fixture.predictionStatus] || 'neutral'} size="sm">
                        {STATUS_LABELS[fixture.predictionStatus] || fixture.predictionStatus}
                    </Badge>
                </div>
            </div>

            {hasProjectedResult ? (
                <div className="ml-foresight__projected-result">
                    <span>Résultat projeté</span>
                    <strong>{fixture.projectedResult.label}</strong>
                    <Badge variant="success" size="sm">{fmtPct(fixture.projectedResult.probability, 100)}</Badge>
                </div>
            ) : (
                <div className="ml-foresight__pending-state">
                    <span>Projection FT</span>
                    <strong>{getPendingMessage(fixture)}</strong>
                </div>
            )}

            {!compact && (
                marketEntries.length ? (
                    <div className="ml-foresight__fixture-markets">
                        {marketEntries.map(([marketKey, market]) => (
                            <MarketCard key={marketKey} marketKey={marketKey} market={market} />
                        ))}
                    </div>
                ) : (
                    <div className="ml-foresight__pending-state is-subtle">
                        <span>Marchés</span>
                        <strong>Aucun output ML persisté pour l’instant.</strong>
                    </div>
                )
            )}
        </div>
    );
};

export const HistoricalFixtureRow = ({ fixture }) => {
    const marketEntries = Object.entries(fixture.markets || {}).filter(([, value]) => value);
    const ftVerdictLabel = fixture.verdict === 'hit' ? 'Hit' : fixture.verdict === 'miss' ? 'Miss' : null;

    return (
        <div className="ml-foresight__history-row">
            <div className="ml-foresight__history-head">
                <div className="ml-foresight__history-main">
                    <strong>{fixture.homeTeam?.name} vs {fixture.awayTeam?.name}</strong>
                    <span>{fmtDateTime(fixture.date)}{fixture.round ? ` · ${fixture.round}` : ''}</span>
                </div>
                <div className="ml-foresight__history-badges">
                    {fixture.sourceRun?.simulationId ? <Badge variant="neutral" size="sm">Run #{fixture.sourceRun.simulationId}</Badge> : null}
                    {fixture.sourceRun?.horizonType ? <Badge variant="neutral" size="sm">{fixture.sourceRun.horizonType}</Badge> : null}
                    {ftVerdictLabel ? <Badge variant={getOutcomeVariant(fixture.verdict === 'hit')} size="sm">{ftVerdictLabel}</Badge> : null}
                    <Badge variant="neutral" size="sm">{marketEntries.length} marches</Badge>
                </div>
            </div>

            <div className="ml-foresight__history-grid">
                <div>
                    <span>Score final</span>
                    <strong>{fixture.actualScore || '—'}</strong>
                </div>
                <div>
                    <span>Resultat reel</span>
                    <strong>{fixture.actualResult?.label || '—'}</strong>
                </div>
                <div>
                    <span>Projection FT</span>
                    <strong>
                        {fixture.projectedResult
                            ? `${fixture.projectedResult.label} · ${fmtPct(fixture.projectedResult.probability, 100)}`
                            : 'FT 1X2 indisponible'}
                    </strong>
                </div>
            </div>

            {marketEntries.length ? (
                <div className="ml-foresight__history-market-list">
                    {marketEntries.map(([marketKey, market]) => (
                        <Badge
                            key={marketKey}
                            variant={getOutcomeVariant(market.isCorrect)}
                            size="sm"
                        >
                            {(MARKET_LABELS[marketKey] || marketKey)} · {market.selection}
                            {market.actualSelection ? ` / ${market.actualSelection}` : ''}
                        </Badge>
                    ))}
                </div>
            ) : (
                <div className="ml-foresight__pending-state is-subtle">
                    <span>Historique ML</span>
                    <strong>Aucun output de run n&apos;est persiste pour ce match.</strong>
                </div>
            )}
        </div>
    );
};
