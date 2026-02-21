/**
 * MLIntelligenceBadge.jsx — Compact intelligence badge for match cards (US_028 AC 1)
 *
 * Shows on GameCard if ML service is available.
 * Rule: only shown if edge >= 3% (EDGE_THRESHOLD_SHOW).
 * Hidden if ML service is unavailable — no errors shown to user.
 */

import React from 'react';

const EDGE_COLORS = {
    STRONG: { bg: 'rgba(16, 185, 129, 0.15)', border: '#10b981', text: '#10b981', dot: '🟢' },
    MODERATE: { bg: 'rgba(251, 191, 36, 0.15)', border: '#fbbf24', text: '#fbbf24', dot: '🟡' },
    WEAK: { bg: 'rgba(249, 115, 22, 0.12)', border: '#f97316', text: '#f97316', dot: '🟠' },
    NO_VALUE: null,
};

const OUTCOME_LABELS = { home: 'Home', draw: 'Draw', away: 'Away' };

/**
 * @param {object} props
 * @param {object|null} props.prediction  — full prediction response from /prediction endpoint
 * @param {boolean} props.loading         — show skeleton if true
 */
const MLIntelligenceBadge = ({ prediction, loading }) => {
    // Skeleton while async prediction loads
    if (loading) {
        return (
            <div
                className="ml-badge-skeleton"
                style={{
                    height: '42px',
                    borderRadius: '8px',
                    background: 'linear-gradient(90deg, #1e293b 25%, #334155 50%, #1e293b 75%)',
                    backgroundSize: '200% 100%',
                    animation: 'ml-shimmer 1.5s infinite',
                    marginTop: '10px',
                    opacity: 0.6,
                }}
            />
        );
    }

    // No prediction or no value bet → render nothing (graceful degradation)
    if (!prediction?.prediction || !prediction?.edge?.value_bet) return null;

    const { probabilities, top_market, model_version } = prediction.prediction;
    const { edge, stakes } = prediction;
    const valueBet = edge?.value_bet;

    if (!valueBet) return null;

    // Classify confidence
    const edgeVal = edge[valueBet] ?? 0;
    let confidence = 'NO_VALUE';
    if (edgeVal >= 0.10) confidence = 'STRONG';
    else if (edgeVal >= 0.05) confidence = 'MODERATE';
    else if (edgeVal >= 0.03) confidence = 'WEAK';

    if (confidence === 'NO_VALUE') return null;

    const colors = EDGE_COLORS[confidence];
    const prob = probabilities?.[valueBet];
    const stakeKey = `${valueBet}_quarter_kelly`;
    const stake = stakes?.[stakeKey];
    const edgePct = (edgeVal * 100).toFixed(1);

    return (
        <div
            className="ml-intelligence-badge"
            style={{
                marginTop: '10px',
                padding: '8px 12px',
                borderRadius: '8px',
                background: colors.bg,
                border: `1px solid ${colors.border}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '8px',
                fontSize: '0.78rem',
                animation: 'ml-fade-in 0.4s ease',
            }}
        >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '0.9rem' }}>🧠</span>
                <span style={{ color: '#cbd5e1', fontWeight: '600' }}>
                    {OUTCOME_LABELS[valueBet]} {prob ? `${(prob * 100).toFixed(0)}%` : ''}
                </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ color: colors.text, fontWeight: '700' }}>
                    {colors.dot} +{edgePct}% EDGE
                </span>
                {stake > 0 && (
                    <span style={{
                        background: 'rgba(255,255,255,0.08)',
                        borderRadius: '4px',
                        padding: '2px 6px',
                        color: '#94a3b8',
                    }}>
                        Stake: {(stake * 100).toFixed(1)}%
                    </span>
                )}
            </div>
        </div>
    );
};

export default MLIntelligenceBadge;
