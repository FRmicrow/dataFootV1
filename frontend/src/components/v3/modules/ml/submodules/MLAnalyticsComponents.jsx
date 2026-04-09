import React from 'react';
import { Badge, Table } from '../../../../../design-system';
import { fmtPct, fmtDecimal, getOutcomeVariant } from '../shared/mlUtils';

/**
 * Grid of market health indicators.
 */
export const MarketHealthGrid = ({ marketSummaries, selectedMarket, onMarketSelect }) => {
    return (
        <div className="ml-ana__health-grid">
            {marketSummaries.map((market) => {
                const isActive = market.value === selectedMarket;
                return (
                    <button
                        key={market.value}
                        type="button"
                        className={`ml-ana__health-card ${isActive ? 'ml-ana__health-card--active' : ''}`}
                        onClick={() => onMarketSelect(market.value)}
                    >
                        <div className="ml-ana__health-head">
                            <span className="ml-ana__health-label">{market.label}</span>
                            <Badge variant={market.healthVariant} size="sm">{market.healthLabel}</Badge>
                        </div>
                        <div className="ml-ana__health-main">
                            <span className="ml-ana__health-metric">{market.primaryMetric}</span>
                            <span className="ml-ana__health-sub">{market.secondaryMetric}</span>
                        </div>
                    </button>
                );
            })}
        </div>
    );
};

/**
 * List of top missed predictions.
 */
export const TopMissesList = ({ misses }) => {
    if (!misses?.length) return <p className="ml-ana__empty-text">Aucun "miss" notable identifié sur ce segment.</p>;

    return (
        <div className="ml-ana__misses-list">
            {misses.map((miss, idx) => (
                <div key={`${miss.fixture_id}-${idx}`} className="ml-ana__miss-item">
                    <div className="ml-ana__miss-match">
                        <strong>{miss.home_team_name} vs {miss.away_team_name}</strong>
                        <span>{miss.fixture_date}</span>
                    </div>
                    <div className="ml-ana__miss-data">
                        <div className="ml-ana__miss-pred">
                            <span>Pick {miss.predicted_outcome}</span>
                            <strong>{fmtPct(miss.primary_probability, 1)}</strong>
                        </div>
                        <div className="ml-ana__miss-actual">
                            <span>Réel</span>
                            <strong>{miss.actual_result}</strong>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
};
