/**
 * MLPredictionPanel.jsx — Full ML Intelligence block for the match detail page (US_028 AC 2, 3, 4)
 *
 * Shows:
 *  • Internal model probabilities (Home / Draw / Away)
 *  • Edge vs bookmaker odds (color-coded by tier)
 *  • Quarter-Kelly stake suggestion
 *  • "Why this prediction?" feature accordion (AC 3)
 *  • Historical track record (AC 4)
 *
 * Graceful degradation: if prediction is null or error, renders nothing.
 */

import React, { useState, useEffect } from 'react';
import api from '../../../services/api';

const CONFIDENCE_CONFIG = {
    STRONG: { color: '#10b981', bg: 'rgba(16,185,129,0.12)', label: 'STRONG', dots: 6 },
    MODERATE: { color: '#fbbf24', bg: 'rgba(251,191,36,0.12)', label: 'MODERATE', dots: 4 },
    WEAK: { color: '#f97316', bg: 'rgba(249,115,22,0.1)', label: 'WEAK', dots: 2 },
    NO_VALUE: { color: '#64748b', bg: 'transparent', label: 'NO VALUE', dots: 0 },
};

function EdgeBar({ edgeVal }) {
    let confidence = 'NO_VALUE';
    if (edgeVal >= 0.10) confidence = 'STRONG';
    else if (edgeVal >= 0.05) confidence = 'MODERATE';
    else if (edgeVal >= 0.03) confidence = 'WEAK';

    const cfg = CONFIDENCE_CONFIG[confidence];
    const isPositive = edgeVal > 0;

    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ color: isPositive ? cfg.color : '#64748b', fontWeight: '700', minWidth: '72px' }}>
                {edgeVal >= 0 ? '+' : ''}{(edgeVal * 100).toFixed(1)}%
            </span>
            {isPositive && confidence !== 'NO_VALUE' ? (
                <div style={{ display: 'flex', gap: '3px' }}>
                    {Array.from({ length: 6 }, (_, i) => (
                        <div
                            key={i}
                            style={{
                                width: '8px', height: '8px', borderRadius: '50%',
                                background: i < cfg.dots ? cfg.color : 'rgba(255,255,255,0.1)',
                                transition: 'background 0.2s',
                            }}
                        />
                    ))}
                </div>
            ) : null}
            {isPositive && confidence !== 'NO_VALUE' && (
                <span style={{
                    fontSize: '0.72rem', fontWeight: '700', color: cfg.color,
                    background: cfg.bg, padding: '2px 7px', borderRadius: '4px',
                }}>
                    {cfg.label}
                </span>
            )}
            {!isPositive || confidence === 'NO_VALUE' ? (
                <span style={{ fontSize: '0.75rem', color: '#475569' }}>No value</span>
            ) : null}
        </div>
    );
}

function SkeletonBlock() {
    return (
        <div style={{
            background: 'linear-gradient(135deg, #1a2336, #1e293b)',
            borderRadius: '12px',
            border: '1px solid rgba(99,102,241,0.2)',
            padding: '20px',
        }}>
            {[80, 60, 90, 50].map((w, i) => (
                <div key={i} style={{
                    height: '14px', width: `${w}%`, marginBottom: '14px',
                    borderRadius: '6px',
                    background: 'linear-gradient(90deg, #1e293b 25%, #334155 50%, #1e293b 75%)',
                    backgroundSize: '200% 100%',
                    animation: 'ml-shimmer 1.5s infinite',
                }} />
            ))}
        </div>
    );
}

/**
 * @param {number}  fixtureId
 * @param {number}  leagueId   — for track record widget
 */
const MLPredictionPanel = ({ fixtureId, leagueId }) => {
    const [prediction, setPrediction] = useState(null);
    const [performance, setPerformance] = useState(null);
    const [loading, setLoading] = useState(true);
    const [featuresOpen, setFeaturesOpen] = useState(false);

    useEffect(() => {
        if (!fixtureId) { setLoading(false); return; }

        let cancelled = false;

        const load = async () => {
            setLoading(true);
            try {
                const [predRes, perfRes] = await Promise.allSettled([
                    api.getMatchPrediction(fixtureId),
                    leagueId ? api.getModelPerformance(leagueId) : Promise.resolve(null),
                ]);

                if (!cancelled) {
                    if (predRes.status === 'fulfilled') setPrediction(predRes.value);
                    if (perfRes.status === 'fulfilled' && perfRes.value) setPerformance(perfRes.value);
                }
            } catch (_) {
                // Silent — ML not available
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        load();
        return () => { cancelled = true; };
    }, [fixtureId, leagueId]);

    if (loading) return <SkeletonBlock />;
    if (!prediction?.prediction) return null; // ML unavailable — render nothing

    const { prediction: pred, edge, stakes, bookmaker } = prediction;
    const { probabilities, model_version, top_features = [] } = pred;
    const valueBet = edge?.value_bet;
    const stakeKey = valueBet ? `${valueBet}_quarter_kelly` : null;
    const stakeVal = stakeKey ? stakes?.[stakeKey] : 0;

    const outcomeLabels = { home: 'Home', draw: 'Draw', away: 'Away' };

    return (
        <div
            id={`ml-panel-${fixtureId}`}
            style={{
                background: 'linear-gradient(135deg, #1a2336 0%, #1e293b 100%)',
                borderRadius: '12px',
                border: '1px solid rgba(99,102,241,0.35)',
                padding: '20px',
                marginTop: '16px',
                animation: 'ml-fade-in 0.5s ease',
            }}
        >
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ margin: 0, fontSize: '1rem', color: '#a5b4fc', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    🧠 Internal Model
                    <span style={{ fontSize: '0.7rem', background: 'rgba(99,102,241,0.15)', color: '#6366f1', padding: '2px 7px', borderRadius: '10px', fontWeight: '600' }}>
                        v{model_version} · LightGBM
                    </span>
                </h3>
            </div>

            {/* Probability bars */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '20px' }}>
                {['home', 'draw', 'away'].map(outcome => {
                    const prob = probabilities?.[outcome] ?? 0;
                    const isTop = valueBet === outcome;
                    return (
                        <div key={outcome} style={{
                            background: isTop ? 'rgba(99,102,241,0.12)' : 'rgba(255,255,255,0.03)',
                            border: `1px solid ${isTop ? 'rgba(99,102,241,0.4)' : 'rgba(255,255,255,0.06)'}`,
                            borderRadius: '8px',
                            padding: '10px',
                            textAlign: 'center',
                            transition: 'all 0.2s',
                        }}>
                            <div style={{ color: '#64748b', fontSize: '0.72rem', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                {outcomeLabels[outcome]}
                            </div>
                            <div style={{ color: isTop ? '#a5b4fc' : '#cbd5e1', fontWeight: '800', fontSize: '1.5rem' }}>
                                {(prob * 100).toFixed(0)}%
                            </div>
                            <div style={{
                                marginTop: '6px', height: '3px', borderRadius: '2px',
                                background: isTop ? '#6366f1' : '#1e293b',
                                width: `${(prob * 100).toFixed(0)}%`, minWidth: '4px',
                                transition: 'width 0.6s ease',
                            }} />
                        </div>
                    );
                })}
            </div>

            {/* Edge vs bookmaker */}
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '14px', marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        📊 Edge vs {bookmaker?.source || 'Bookmaker'} Odds
                    </div>
                    {!bookmaker?.odds_home && (
                        <span style={{ fontSize: '0.7rem', color: '#f59e0b', background: 'rgba(245,158,11,0.1)', padding: '2px 8px', borderRadius: '4px' }}>
                            ⚠️ Missing Odds
                        </span>
                    )}
                </div>

                {!bookmaker?.odds_home ? (
                    <div style={{ padding: '10px', borderRadius: '8px', background: 'rgba(255,165,0,0.03)', border: '1px dashed rgba(245,158,11,0.2)', textAlign: 'center' }}>
                        <p style={{ margin: 0, fontSize: '0.8rem', color: '#94a3b8' }}>
                            Value analysis is hidden because no bookmaker odds are currently synced for this match.
                        </p>
                        <button
                            onClick={() => api.saveMatchOdds(fixtureId).then(() => window.location.reload())}
                            style={{ marginTop: '10px', background: '#6366f1', border: 'none', color: '#fff', padding: '4px 12px', borderRadius: '6px', fontSize: '0.75rem', cursor: 'pointer' }}
                        >
                            🔄 Try Import Odds
                        </button>
                    </div>
                ) : (
                    ['home', 'draw', 'away'].map(outcome => (
                        <div key={outcome} style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            padding: '6px 0',
                            borderBottom: '1px solid rgba(255,255,255,0.04)',
                        }}>
                            <span style={{ width: '50px', color: '#94a3b8', fontSize: '0.82rem' }}>{outcomeLabels[outcome]}</span>
                            <EdgeBar edgeVal={edge?.[outcome] ?? 0} />
                        </div>
                    ))
                )}
            </div>

            {/* Quarter-Kelly recommendation */}
            {valueBet && stakeVal > 0 && (
                <div style={{
                    background: 'rgba(16,185,129,0.08)',
                    border: '1px solid rgba(16,185,129,0.25)',
                    borderRadius: '8px',
                    padding: '12px 16px',
                    marginBottom: '16px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                }}>
                    <div>
                        <div style={{ color: '#10b981', fontWeight: '700', fontSize: '0.9rem' }}>
                            💰 Quarter-Kelly: {(stakeVal * 100).toFixed(1)}% of bankroll
                        </div>
                        <div style={{ color: '#64748b', fontSize: '0.78rem', marginTop: '3px' }}>
                            Value bet: <strong style={{ color: '#a5b4fc' }}>{outcomeLabels[valueBet]}</strong>
                            {bookmaker?.[`odds_${valueBet}`] && (
                                <> · odds {bookmaker[`odds_${valueBet}`]}</>
                            )}
                        </div>
                    </div>
                    <div style={{
                        background: 'rgba(16,185,129,0.15)',
                        borderRadius: '50%',
                        width: '36px', height: '36px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '1.2rem',
                    }}>
                        ✅
                    </div>
                </div>
            )}

            {/* Feature accordion (AC 3) */}
            {top_features.length > 0 && (
                <details
                    open={featuresOpen}
                    onToggle={e => setFeaturesOpen(e.target.open)}
                    style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '12px' }}
                >
                    <summary style={{
                        cursor: 'pointer', color: '#64748b', fontSize: '0.82rem', fontWeight: '600',
                        listStyle: 'none', display: 'flex', alignItems: 'center', gap: '6px',
                        userSelect: 'none',
                    }}>
                        <span style={{ transition: 'transform 0.2s', transform: featuresOpen ? 'rotate(90deg)' : '' }}>▶</span>
                        🔍 Why this prediction?
                    </summary>
                    <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {top_features.map((feat, idx) => (
                            <div key={feat.feature} style={{
                                display: 'flex', alignItems: 'center', gap: '10px',
                                padding: '6px 10px', background: 'rgba(255,255,255,0.03)',
                                borderRadius: '6px', fontSize: '0.82rem',
                            }}>
                                <span style={{ color: '#475569', width: '18px', textAlign: 'right', fontWeight: '600' }}>
                                    {idx + 1}.
                                </span>
                                <span style={{ flex: 1, color: '#cbd5e1' }}>
                                    {feat.feature.replace(/_/g, ' ')}
                                </span>
                                <span style={{
                                    color: feat.impact >= 0 ? '#10b981' : '#ef4444',
                                    fontWeight: '700',
                                    minWidth: '60px', textAlign: 'right',
                                }}>
                                    {feat.impact >= 0 ? '+' : ''}{(feat.impact * 100).toFixed(1)}% impact
                                </span>
                            </div>
                        ))}
                        <div style={{ marginTop: '8px', fontSize: '0.7rem', color: '#334155', textAlign: 'right' }}>
                            Model v{model_version} · Powered by LightGBM
                        </div>
                    </div>
                </details>
            )}

            {/* Historical track record (AC 4) */}
            {performance && performance.total > 0 && (
                <div style={{
                    marginTop: '16px',
                    borderTop: '1px solid rgba(255,255,255,0.06)',
                    paddingTop: '14px',
                    fontSize: '0.8rem',
                }}>
                    <div style={{ color: '#64748b', fontWeight: '600', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        📈 Model Track Record (this league)
                    </div>
                    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                        {[
                            { label: 'Bets', val: performance.total },
                            { label: 'Won', val: performance.won, color: '#10b981' },
                            { label: 'Lost', val: performance.lost, color: '#ef4444' },
                            { label: 'Accuracy', val: `${performance.accuracy}%`, color: '#a5b4fc' },
                            {
                                label: 'ROI',
                                val: `${performance.roi >= 0 ? '+' : ''}${performance.roi}%`,
                                color: performance.roi >= 0 ? '#10b981' : '#ef4444',
                            },
                        ].map(item => (
                            <div key={item.label} style={{
                                background: 'rgba(255,255,255,0.04)',
                                borderRadius: '6px', padding: '6px 10px', textAlign: 'center',
                            }}>
                                <div style={{ color: '#475569', fontSize: '0.7rem' }}>{item.label}</div>
                                <div style={{ color: item.color || '#cbd5e1', fontWeight: '700' }}>{item.val}</div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default MLPredictionPanel;
