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

const LIVE_STATUSES = new Set(['1H', 'HT', '2H', 'ET', 'BT', 'P', 'INT', 'LIVE']);

const LIVE_STATUS_LABELS = {
    '1H': '1ère MT',
    HT: 'Mi-temps',
    '2H': '2ème MT',
    ET: 'Prol.',
    BT: 'Pause prol.',
    P: 'Tirs au but',
    INT: 'Interrompu',
    LIVE: 'En cours',
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

const RESULT_OUTCOMES = ['1', 'N', '2'];

const renderResultMarket = (market) => {
    const probs = market.probabilities || {};
    return (
        <>
            <div className="ml-foresight__prob-table">
                {RESULT_OUTCOMES.map((outcome) => {
                    const prob = probs[outcome] ?? null;
                    const isBest = outcome === market.selection;
                    return (
                        <div key={outcome} className={`ml-foresight__prob-row${isBest ? ' is-best' : ''}`}>
                            <span className="ml-foresight__prob-outcome">{outcome}</span>
                            <div className="ml-foresight__prob-bar-wrap">
                                <div
                                    className="ml-foresight__prob-bar"
                                    style={{ width: `${Math.round((prob ?? 0) * 100)}%` }}
                                />
                            </div>
                            <strong className="ml-foresight__prob-value">
                                {prob != null ? fmtPct(prob, 100) : '—'}
                            </strong>
                        </div>
                    );
                })}
            </div>
            <div className="ml-foresight__market-footer">
                <span>Modèle</span><strong>{market.modelVersion || 'runtime'}</strong>
            </div>
        </>
    );
};

const renderTotalMarket = (market) => {
    const probs = market.probabilities || {};

    // Group probabilities by line: { '2.5': { over: 0.72, under: 0.28 }, ... }
    const lines = {};
    for (const [key, prob] of Object.entries(probs)) {
        const m = key.match(/^(Over|Under)\s+([\d.]+)$/i);
        if (m) {
            const line = m[2];
            if (!lines[line]) lines[line] = {};
            lines[line][m[1].toLowerCase()] = prob;
        }
    }

    const sortedLines = Object.keys(lines).sort((a, b) => Number(a) - Number(b));
    const bestLine = market.line != null ? String(market.line) : null;

    return (
        <>
            {market.expectedTotal != null && (
                <div className="ml-foresight__market-footer">
                    <span>Total attendu</span>
                    <strong>{fmtDecimal(market.expectedTotal, 2)}</strong>
                    {market.expectedHome != null && (
                        <span className="ml-foresight__market-sub">
                            ({fmtDecimal(market.expectedHome, 1)} – {fmtDecimal(market.expectedAway, 1)})
                        </span>
                    )}
                </div>
            )}
            {sortedLines.length > 0 && (
                <div className="ml-foresight__ou-table">
                    <div className="ml-foresight__ou-header">
                        <span>Ligne</span>
                        <span>Over</span>
                        <span>Under</span>
                    </div>
                    {sortedLines.map((line) => {
                        const { over, under } = lines[line];
                        const isBest = bestLine === line;
                        return (
                            <div key={line} className={`ml-foresight__ou-row${isBest ? ' is-best' : ''}`}>
                                <span>{line}</span>
                                <strong>{over != null ? fmtPct(over, 100) : '—'}</strong>
                                <strong>{under != null ? fmtPct(under, 100) : '—'}</strong>
                            </div>
                        );
                    })}
                </div>
            )}
        </>
    );
};

const MarketCard = ({ marketKey, market }) => {
    const isResultMarket = marketKey === 'ftResult' || marketKey === 'htResult';

    return (
        <div className="ml-foresight__market-card">
            <div className="ml-foresight__market-head">
                <strong>{MARKET_LABELS[marketKey] || marketKey}</strong>
                <Badge variant="neutral" size="sm">{market.selection}</Badge>
            </div>
            <div className="ml-foresight__market-body">
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
    const isLive = LIVE_STATUSES.has(fixture.status);
    const liveLabel = isLive ? (LIVE_STATUS_LABELS[fixture.status] || 'En cours') : null;

    return (
        <div className={`ml-foresight__fixture-card ${compact ? 'is-compact' : ''} ${fixture.predictionStatus === 'missing' ? 'is-pending' : ''} ${isLive ? 'is-live' : ''}`}>
            <div className="ml-foresight__fixture-top">
                <div>
                    <strong>{fixture.homeTeam?.name} vs {fixture.awayTeam?.name}</strong>
                    <span>{fmtDateTime(fixture.date)}{fixture.round ? ` · ${fixture.round}` : ''}</span>
                </div>
                <div className="ml-foresight__fixture-badges">
                    {isLive && <Badge variant="danger" size="sm">{liveLabel}</Badge>}
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
