import React from 'react';
import { Badge } from '../../../../../design-system';
import { fmtDate, fmtOdd, fmtPct } from '../shared/mlUtils';

/**
 * Individual market card within a fixture.
 */
const MarketCard = ({ market }) => (
    <div className="ml-foresight__market-card">
        <div className="ml-foresight__market-head">
            <strong>{market.marketLabel}</strong>
            <Badge variant="neutral" size="sm">{market.primary.selection}</Badge>
        </div>
        <div className="ml-foresight__market-grid">
            <div><span>Probabilité</span><strong>{fmtPct(market.primary.ml_probability, 100)}</strong></div>
            <div><span>Fair odd</span><strong>{fmtOdd(market.primary.fair_odd)}</strong></div>
            <div><span>Bookmaker</span><strong>{fmtOdd(market.primary.bookmaker_odd)}</strong></div>
            <div>
                <span>2e choix</span>
                <strong>{market.rows[1] ? `${market.rows[1].selection} · ${fmtPct(market.rows[1].ml_probability, 100)}` : '—'}</strong>
            </div>
        </div>
    </div>
);

/**
 * Card representing a fixture and its predicted markets.
 */
export const ForesightFixtureCard = ({ fixture }) => {
    return (
        <div className="ml-foresight__fixture-card">
            <div className="ml-foresight__fixture-top">
                <div>
                    <strong>{fixture.homeTeam} vs {fixture.awayTeam}</strong>
                    <span>{fmtDate(fixture.date)}{fixture.round ? ` · ${fixture.round}` : ''}</span>
                </div>
                <Badge variant="primary" size="sm">{fixture.leagueName}</Badge>
            </div>
            <div className="ml-foresight__fixture-markets">
                {fixture.markets.map((market) => (
                    <MarketCard key={market.marketType} market={market} />
                ))}
            </div>
        </div>
    );
};
