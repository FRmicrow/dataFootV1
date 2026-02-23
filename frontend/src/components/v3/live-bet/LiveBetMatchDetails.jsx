import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../../services/api';
import './LiveBet.css';

const LiveBetMatchDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [saveState, setSaveState] = useState('idle');

    useEffect(() => {
        const fetchDetails = async () => {
            try {
                const res = await api.getMatchDetails(id);
                setData(res);
            } catch (err) {
                console.error("Failed to load match details", err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        fetchDetails();
    }, [id]);

    const handleSaveOdds = async () => {
        setSaveState('saving');
        try {
            await api.saveMatchOdds(id);
            setSaveState('saved');
            setTimeout(() => setSaveState('idle'), 2000);
        } catch (err) {
            console.error(err);
            setSaveState('error');
            setTimeout(() => setSaveState('idle'), 2000);
        }
    };

    if (loading) return (
        <div className="lb-match-details loading">
            <div className="spinner"></div>
            <p>Gathering Intelligence...</p>
        </div>
    );

    if (error) return (
        <div className="lb-match-details error">
            <h2>⚠️ Feed Error</h2>
            <p>{error}</p>
        </div>
    );

    if (!data || !data.fixture) return null;

    // Destructure matching backend response
    const { fixture, lineups, prediction, stats, odds, probabilities = {}, injuries = [], squads = { home: [], away: [] }, events = [], matchStats = [] } = data; // odds is now a filtered bets array
    const h2h = stats?.h2h || [];
    const matchInfo = fixture.fixture;
    const league = fixture.league;
    const teams = fixture.teams;
    const goals = fixture.goals;
    const isFinished = ['FT', 'AET', 'PEN'].includes(matchInfo.status.short);

    const getPlayerBadges = (playerId) => {
        const pEvents = events.filter(e => e.player.id === playerId);
        const badges = [];
        if (pEvents.some(e => e.type === 'Goal' && !e.detail.includes('Missed'))) badges.push('⚽');
        if (pEvents.some(e => e.type === 'Card' && e.detail.includes('Red'))) badges.push('🟥');
        return badges.join(' ');
    };

    // AC 1: Lineups (Handled by backend service)
    const isOfficial = lineups?.type === 'OFFICIAL';
    const homeLineup = lineups?.home;
    const awayLineup = lineups?.away;

    // Settlement verification
    let isPredictionCorrect = null;
    if (isFinished && prediction?.predictions?.winner) {
        const homeGoals = goals.home ?? 0;
        const awayGoals = goals.away ?? 0;
        const actualWinner = homeGoals > awayGoals ? teams.home.name : (awayGoals > homeGoals ? teams.away.name : 'Draw');

        if (prediction.predictions.winner.name === actualWinner) {
            isPredictionCorrect = true;
        } else if (prediction.predictions.winner.name === teams.home.name && homeGoals >= awayGoals && prediction.predictions.winner.comment?.includes('Draw')) {
            isPredictionCorrect = true; // Win or draw leeway
        } else {
            isPredictionCorrect = false;
        }
    }

    return (
        <div className="lb-match-details animate-fade-in">
            <div className="lb-header-actions" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <button className="lb-back-btn" onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '1rem' }}>
                    ← Back to Dashboard
                </button>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                        className={`lb-save-btn-large ${saveState}`}
                        onClick={async () => {
                            setSaveState('saving');
                            try {
                                await api.ingestDepthOdds(id);
                                setSaveState('saved');
                                // Refresh data to show more markets if any
                                const res = await api.getMatchDetails(id);
                                setData(res);
                                setTimeout(() => setSaveState('idle'), 2000);
                            } catch (err) {
                                console.error(err);
                                setSaveState('error');
                                setTimeout(() => setSaveState('idle'), 2000);
                            }
                        }}
                        disabled={saveState === 'saving'}
                        style={{
                            padding: '10px 20px',
                            borderRadius: '8px',
                            border: 'none',
                            background: saveState === 'saved' ? '#10b981' : '#f59e0b', // Amber for depth
                            color: '#fff',
                            fontWeight: 'bold',
                            cursor: saveState === 'saving' ? 'wait' : 'pointer',
                            transition: 'all 0.3s ease'
                        }}
                    >
                        {saveState === 'idle' && '⚡ Depth Sync (Multi-Market)'}
                        {saveState === 'saving' && 'Syncing...'}
                        {saveState === 'saved' && 'Deep Data Synced ✅'}
                        {saveState === 'error' && 'Error ❌'}
                    </button>
                    <button
                        className={`lb-save-btn-large ${saveState}`}
                        onClick={handleSaveOdds}
                        disabled={saveState === 'saving'}
                        style={{
                            padding: '10px 20px',
                            borderRadius: '8px',
                            border: 'none',
                            background: saveState === 'saved' ? '#10b981' : '#6366f1',
                            color: '#fff',
                            fontWeight: 'bold',
                            cursor: saveState === 'saving' ? 'wait' : 'pointer',
                            transition: 'all 0.3s ease'
                        }}
                    >
                        {saveState === 'idle' && '💾 Save Basic Odds'}
                        {saveState === 'saving' && 'Saving...'}
                        {saveState === 'saved' && 'Basic Odds Saved ✅'}
                        {saveState === 'error' && 'Error ❌'}
                    </button>
                </div>
            </div>

            {/* Hero Section */}
            <div className="lb-detail-hero">
                <div className="lb-league-header">
                    <img src={league.logo} alt="" className="league-logo-med" style={{ width: '40px', marginBottom: '10px' }} />
                    <div className="league-name-lg" style={{ fontWeight: '800', color: '#fff' }}>{league.name}</div>
                    <div className="match-time" style={{ color: '#94a3b8', fontSize: '0.9rem' }}>
                        {new Date(matchInfo.date).toLocaleString()} • {matchInfo.venue.name}
                    </div>

                    {/* Narrative Badges (US_153) */}
                    {data.narrative && (
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '12px' }}>
                            {data.narrative.derby?.is_derby && (
                                <span className="lb-narrative-badge derby">
                                    ⚔️ {data.narrative.derby.name}
                                </span>
                            )}
                            {data.narrative.stakes !== 'REGULAR' && (
                                <span className={`lb-narrative-badge stakes ${data.narrative.stakes.toLowerCase()}`}>
                                    🏆 {data.narrative.stakes} STAKES
                                </span>
                            )}
                            {data.narrative.travel_km > 300 && (
                                <span className="lb-narrative-badge travel">
                                    ✈️ {data.narrative.travel_km}km Travel
                                </span>
                            )}
                        </div>
                    )}
                </div>

                <div className="lb-score-board" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '40px', marginTop: '20px' }}>
                    <div className="lb-team-lg" style={{ textAlign: 'center' }}>
                        <img src={teams.home.logo} alt={teams.home.name} style={{ width: '80px', height: '80px', objectFit: 'contain' }} />
                        <div className="team-name-lg" style={{ fontWeight: '700', marginTop: '10px' }}>{teams.home.name}</div>
                    </div>

                    <div className="lb-score-display" style={{ fontSize: '3rem', fontWeight: '900', color: '#fff' }}>
                        {goals.home ?? '-'} : {goals.away ?? '-'}
                    </div>

                    <div className="lb-team-lg" style={{ textAlign: 'center' }}>
                        <img src={teams.away.logo} alt={teams.away.name} style={{ width: '80px', height: '80px', objectFit: 'contain' }} />
                        <div className="team-name-lg" style={{ fontWeight: '700', marginTop: '10px' }}>{teams.away.name}</div>
                    </div>
                </div>
            </div>

            {/* ML Context Header (US_019 AC 3) */}
            <div className="lb-ml-context-header" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginBottom: '30px' }}>

                {/* US_172: Intelligence Cockpit Cockpit (Enhanced) */}
                <div className="lb-context-card cockpit-main" style={{ background: 'linear-gradient(135deg, #1e1b4b, #0f172a)', padding: '24px', borderRadius: '16px', border: '1px solid #4338ca', gridColumn: 'span 2' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                        <div>
                            <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#fff', fontWeight: '900' }}>🔬 Intelligence Cockpit</h3>
                            <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: '#94a3b8' }}>Advanced Probability Overlay & Market Inconsistency Detection</p>
                        </div>
                        <div className="lb-explainer-trigger" style={{ fontSize: '0.8rem', padding: '8px 12px', background: 'rgba(99,102,241,0.1)', borderRadius: '8px' }}>
                            View Core Logic
                            <div className="lb-logic-explainer" style={{ width: '280px' }}>
                                <div className="lb-logic-title">Institutional Model Alpha</div>
                                <div className="lb-logic-item">
                                    <span className="lb-logic-item-label">Backtested Confidence:</span>
                                    <span className="lb-logic-item-val">{data.investment_value?.confidence || 72}%</span>
                                </div>
                                <div className="lb-logic-item">
                                    <span className="lb-logic-item-label">Market Efficiency:</span>
                                    <span className="lb-logic-item-val" style={{ color: '#f59e0b' }}>Moderate</span>
                                </div>
                                <div className="lb-logic-item">
                                    <span className="lb-logic-item-label">Edge Delta:</span>
                                    <span className="lb-logic-item-val">{data.investment_value?.edge || 0}%</span>
                                </div>
                                <div style={{ marginTop: '10px', fontSize: '0.65rem', color: '#64748b', fontStyle: 'italic' }}>
                                    * Model weights adjusted for recent form and squad availability.
                                </div>
                            </div>
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '30px' }}>
                        <div className="lb-prob-bar-matrix" style={{ gap: '12px' }}>
                            {/* Home */}
                            <div className="lb-prob-row">
                                <span className="lb-prob-label" style={{ fontSize: '0.85rem' }}>1</span>
                                <div className="lb-prob-track" style={{ height: '14px' }}>
                                    <div className="lb-prob-fill home" style={{ width: prediction?.predictions?.percent?.home || '33%' }}></div>
                                </div>
                                <span className="lb-prob-val" style={{ width: '45px', fontSize: '0.9rem' }}>{prediction?.predictions?.percent?.home || '33%'}</span>
                            </div>
                            {/* Draw */}
                            <div className="lb-prob-row">
                                <span className="lb-prob-label" style={{ fontSize: '0.85rem' }}>X</span>
                                <div className="lb-prob-track" style={{ height: '14px' }}>
                                    <div className="lb-prob-fill draw" style={{ width: prediction?.predictions?.percent?.draw || '33%' }}></div>
                                </div>
                                <span className="lb-prob-val" style={{ width: '45px', fontSize: '0.9rem' }}>{prediction?.predictions?.percent?.draw || '33%'}</span>
                            </div>
                            {/* Away */}
                            <div className="lb-prob-row">
                                <span className="lb-prob-label" style={{ fontSize: '0.85rem' }}>2</span>
                                <div className="lb-prob-track" style={{ height: '14px' }}>
                                    <div className="lb-prob-fill away" style={{ width: prediction?.predictions?.percent?.away || '33%' }}></div>
                                </div>
                                <span className="lb-prob-val" style={{ width: '45px', fontSize: '0.9rem' }}>{prediction?.predictions?.percent?.away || '33%'}</span>
                            </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            <div style={{ padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                <div style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '4px' }}>Alpha Advice</div>
                                <div style={{ color: '#fff', fontWeight: '800', fontSize: '1rem' }}>{prediction?.predictions?.advice || 'Monitor for In-Play Entry'}</div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                                <div style={{ padding: '10px', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '10px', border: '1px solid rgba(16, 185, 129, 0.2)', textAlign: 'center' }}>
                                    <div style={{ fontSize: '0.6rem', color: '#10b981', fontWeight: 'bold' }}>EDGE</div>
                                    <div style={{ fontSize: '1.2rem', fontWeight: '900', color: '#fff' }}>+{data.investment_value?.edge || 0}%</div>
                                </div>
                                <div style={{ padding: '10px', background: 'rgba(99, 102, 241, 0.1)', borderRadius: '10px', border: '1px solid rgba(99, 102, 241, 0.2)', textAlign: 'center' }}>
                                    <div style={{ fontSize: '0.6rem', color: '#818cf8', fontWeight: 'bold' }}>RISK</div>
                                    <div style={{ fontSize: '0.9rem', fontWeight: '900', color: '#fff', marginTop: '4px' }}>{data.investment_value?.risk_level || 'CONSIDERABLE'}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* H2H Mini Block */}
                {h2h && h2h.length > 0 && (
                    <div className="lb-context-card" style={{ background: '#1e293b', padding: '20px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <h3 style={{ margin: '0 0 15px 0', fontSize: '1.1rem', color: '#cbd5e1', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            ⚔️ Recent Head-to-Head
                        </h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {h2h.slice(0, 3).map(match => (
                                <div key={match.fixture.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                    <span style={{ color: '#94a3b8' }}>{new Date(match.fixture.date).toLocaleDateString()}</span>
                                    <span style={{ fontWeight: '700', color: '#fff' }}>
                                        {match.goals.home} - {match.goals.away}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Match Statistics (If finished and available) */}
                {isFinished && matchStats.length >= 2 && (
                    <div className="lb-context-card" style={{ background: '#1e293b', padding: '20px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <h3 style={{ margin: '0 0 15px 0', fontSize: '1.1rem', color: '#22d3ee', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            📊 Match Statistics
                        </h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.85rem' }}>
                            {['Ball Possession', 'Shots on Goal', 'Corner Kicks', 'Total passes'].map(statName => {
                                const homeStat = matchStats[0]?.statistics?.find(s => s.type === statName)?.value || '-';
                                const awayStat = matchStats[1]?.statistics?.find(s => s.type === statName)?.value || '-';

                                return (
                                    <div key={statName} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                        <span style={{ color: '#fff', fontWeight: '700', flex: 1, textAlign: 'left' }}>{homeStat}</span>
                                        <span style={{ color: '#94a3b8', flex: 2, textAlign: 'center' }}>{statName.replace('Ball ', '').replace('Total ', '')}</span>
                                        <span style={{ color: '#fff', fontWeight: '700', flex: 1, textAlign: 'right' }}>{awayStat}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Detailed Odds Top Summary */}
                {odds && odds.length > 0 && (
                    <div className="lb-context-card" style={{ background: '#1e293b', padding: '20px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <h3 style={{ margin: '0 0 15px 0', fontSize: '1.1rem', color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            💰 Key Markets
                        </h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {odds.slice(0, 3).map(market => {
                                const fairObj = probabilities[market.id];
                                return (
                                    <div key={market.id}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
                                            <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{market.name}</div>
                                            {fairObj && (
                                                <div style={{ fontSize: '0.7rem', color: '#6366f1', fontWeight: 'bold' }}>
                                                    Margin: {(fairObj.margin * 100).toFixed(1)}%
                                                </div>
                                            )}
                                        </div>
                                        <div style={{ display: 'flex', gap: '5px' }}>
                                            {market.values.slice(0, 3).map((v, i) => {
                                                const fairProb = fairObj?.probabilities?.[v.value];
                                                return (
                                                    <div key={i} style={{ flex: 1, background: 'rgba(255,255,255,0.05)', padding: '6px', borderRadius: '4px', textAlign: 'center', fontSize: '0.8rem' }}>
                                                        <div style={{ color: '#94a3b8', marginBottom: '2px', fontSize: '0.7rem' }}>{v.value}</div>
                                                        <div style={{ fontWeight: '800', color: '#fff' }}>{v.odd}</div>
                                                        {fairProb && (
                                                            <div style={{ fontSize: '0.65rem', color: '#6366f1', marginTop: '2px' }}>
                                                                {(fairProb * 100).toFixed(0)}%
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
                {/* Investment Value Block (Quant Engine) */}
                {data.investment_value && (
                    <div className="lb-context-card" style={{ background: 'linear-gradient(135deg, #064e3b, #022c22)', padding: '20px', borderRadius: '12px', border: '1px solid #059669' }}>
                        <h3 style={{ margin: '0 0 15px 0', fontSize: '1.1rem', color: '#6ee7b7', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            💎 Investment Value
                            {data.investment_value.is_value_bet && (
                                <span className="lb-value-alert" title="Edge > 3% and Confidence > 60%">
                                    🔥 VALUE DETECTED
                                </span>
                            )}
                            <span className={`lb-risk-tag ${data.investment_value.risk_level.toLowerCase()}`} style={{ marginLeft: 'auto' }}>
                                {data.investment_value.risk_level}
                            </span>
                        </h3>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                            <div style={{ background: 'rgba(0,0,0,0.2)', padding: '12px', borderRadius: '8px', textAlign: 'center' }}>
                                <div style={{ fontSize: '0.65rem', color: '#6ee7b7' }}>Calculated Edge</div>
                                <div style={{ fontSize: '1.2rem', fontWeight: '900', color: '#fff' }}>
                                    {data.investment_value.edge > 0 ? '+' : ''}{data.investment_value.edge}%
                                </div>
                            </div>
                            <div style={{ background: 'rgba(0,0,0,0.2)', padding: '12px', borderRadius: '8px', textAlign: 'center' }}>
                                <div style={{ fontSize: '0.65rem', color: '#6ee7b7' }}>Confidence</div>
                                <div style={{ fontSize: '1.2rem', fontWeight: '900', color: '#fff' }}>
                                    {data.investment_value.confidence}%
                                </div>
                            </div>
                            <div style={{ background: 'rgba(0,0,0,0.2)', padding: '12px', borderRadius: '8px', textAlign: 'center' }}>
                                <div style={{ fontSize: '0.65rem', color: '#6ee7b7' }}>Kelly Stake</div>
                                <div style={{ fontSize: '1.2rem', fontWeight: '900', color: '#4ade80' }}>
                                    {data.investment_value.kelly_suggested}%
                                </div>
                            </div>
                        </div>
                        <div style={{ marginTop: '15px', padding: '10px', background: 'rgba(255,255,255,0.05)', borderRadius: '6px', fontSize: '0.85rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                <span style={{ color: '#94a3b8' }}>Target Outcome:</span>
                                <span style={{ color: '#fff', fontWeight: 'bold', textTransform: 'uppercase' }}>{data.investment_value.best_pick}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ color: '#94a3b8' }}>Expected Value (EV):</span>
                                <span style={{ color: data.investment_value.ev > 0 ? '#4ade80' : '#f87171', fontWeight: 'bold' }}>
                                    {(data.investment_value.ev * 100).toFixed(2)}%
                                </span>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Side-by-Side Teams Layout (US_019 AC 1) */}
            <div className="lb-sbs-container" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '30px' }}>

                {/* --- HOME TEAM COLUMN --- */}
                <div className="lb-team-side" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

                    {/* Home Form */}
                    <div className="lb-sbs-card" style={{ background: 'rgba(30, 41, 59, 0.4)', borderRadius: '12px', padding: '20px', borderTop: '4px solid #6366f1' }}>
                        <div style={{ fontSize: '1.2rem', fontWeight: '800', marginBottom: '15px', color: '#fff' }}>
                            {teams.home.name} <span style={{ color: '#6366f1' }}>(Home)</span>
                        </div>
                        <div style={{ marginBottom: '10px', fontSize: '0.9rem', color: '#94a3b8' }}>Recent Form</div>
                        <div style={{ display: 'flex', gap: '5px' }}>
                            {prediction?.teams?.home?.league?.form ? (
                                prediction.teams.home.league.form.slice(-5).split('').map((char, i) => (
                                    <span key={i} style={{ width: '30px', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '6px', fontWeight: '800', color: '#fff', background: char === 'W' ? '#10b981' : char === 'D' ? '#fbbf24' : '#ef4444' }}>
                                        {char}
                                    </span>
                                ))
                            ) : <span style={{ color: '#64748b' }}>No data</span>}
                        </div>
                    </div>

                    {/* Home Lineup & Squad */}
                    <div className="lb-sbs-card" style={{ background: 'rgba(30, 41, 59, 0.4)', borderRadius: '12px', padding: '20px' }}>
                        <div style={{ fontSize: '1.1rem', fontWeight: '800', marginBottom: '15px', color: '#cbd5e1' }}>
                            {isOfficial ? '✅ Match XI' : '⚠️ Probable XI'}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
                            {homeLineup && homeLineup.startXI ? (
                                homeLineup.startXI.map((p, idx) => (
                                    <div key={idx} style={{ display: 'flex', alignItems: 'center', padding: '6px 10px', background: '#1e293b', borderRadius: '6px', justifyContent: 'space-between' }}>
                                        <div style={{ display: 'flex', alignItems: 'center' }}>
                                            <span style={{ width: '24px', fontWeight: '800', color: '#64748b', fontSize: '0.85rem' }}>{p.player.number}</span>
                                            <span style={{ fontWeight: '500', color: '#f1f5f9', fontSize: '0.95rem' }}>{p.player.name}</span>
                                        </div>
                                        <span style={{ fontSize: '1rem' }}>{getPlayerBadges(p.player.id)}</span>
                                    </div>
                                ))
                            ) : (
                                <div style={{ color: '#64748b', fontStyle: 'italic' }}>XI not available yet.</div>
                            )}
                        </div>

                        {/* Home Full Squad & Injuries */}
                        <div style={{ fontSize: '1rem', fontWeight: '800', marginBottom: '10px', color: '#94a3b8', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '15px' }}>
                            Full Squad Availability
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', maxHeight: '300px', overflowY: 'auto', paddingRight: '5px' }}>
                            {squads.home && squads.home.length > 0 ? (
                                squads.home.map(p => {
                                    // Check if player exists in injuries array
                                    const isInjured = injuries.some(inj => inj.player?.id === p.id);
                                    return (
                                        <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0', fontSize: '0.85rem', color: isInjured ? '#94a3b8' : '#cbd5e1', opacity: isInjured ? 0.6 : 1 }}>
                                            <span>{p.name} {p.number ? `(#${p.number})` : ''}</span>
                                            {isInjured ? <span title="Injured/Missing" style={{ color: '#ef4444' }}>🔴</span> : <span title="Available" style={{ color: '#10b981' }}></span>}
                                        </div>
                                    );
                                })
                            ) : (
                                <div style={{ color: '#64748b', fontSize: '0.85rem' }}>Squad roster unavailable.</div>
                            )}
                        </div>
                    </div>
                </div>

                {/* --- AWAY TEAM COLUMN --- */}
                <div className="lb-team-side" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

                    {/* Away Form */}
                    <div className="lb-sbs-card" style={{ background: 'rgba(30, 41, 59, 0.4)', borderRadius: '12px', padding: '20px', borderTop: '4px solid #ef4444' }}>
                        <div style={{ fontSize: '1.2rem', fontWeight: '800', marginBottom: '15px', color: '#fff' }}>
                            {teams.away.name} <span style={{ color: '#ef4444' }}>(Away)</span>
                        </div>
                        <div style={{ marginBottom: '10px', fontSize: '0.9rem', color: '#94a3b8' }}>Recent Form</div>
                        <div style={{ display: 'flex', gap: '5px' }}>
                            {prediction?.teams?.away?.league?.form ? (
                                prediction.teams.away.league.form.slice(-5).split('').map((char, i) => (
                                    <span key={i} style={{ width: '30px', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '6px', fontWeight: '800', color: '#fff', background: char === 'W' ? '#10b981' : char === 'D' ? '#fbbf24' : '#ef4444' }}>
                                        {char}
                                    </span>
                                ))
                            ) : <span style={{ color: '#64748b' }}>No data</span>}
                        </div>
                    </div>

                    {/* Away Lineup & Squad */}
                    <div className="lb-sbs-card" style={{ background: 'rgba(30, 41, 59, 0.4)', borderRadius: '12px', padding: '20px' }}>
                        <div style={{ fontSize: '1.1rem', fontWeight: '800', marginBottom: '15px', color: '#cbd5e1' }}>
                            {isOfficial ? '✅ Match XI' : '⚠️ Probable XI'}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
                            {awayLineup && awayLineup.startXI ? (
                                awayLineup.startXI.map((p, idx) => (
                                    <div key={idx} style={{ display: 'flex', alignItems: 'center', padding: '6px 10px', background: '#1e293b', borderRadius: '6px', justifyContent: 'space-between' }}>
                                        <div style={{ display: 'flex', alignItems: 'center' }}>
                                            <span style={{ width: '24px', fontWeight: '800', color: '#64748b', fontSize: '0.85rem' }}>{p.player.number}</span>
                                            <span style={{ fontWeight: '500', color: '#f1f5f9', fontSize: '0.95rem' }}>{p.player.name}</span>
                                        </div>
                                        <span style={{ fontSize: '1rem' }}>{getPlayerBadges(p.player.id)}</span>
                                    </div>
                                ))
                            ) : (
                                <div style={{ color: '#64748b', fontStyle: 'italic' }}>XI not available yet.</div>
                            )}
                        </div>

                        {/* Away Full Squad & Injuries */}
                        <div style={{ fontSize: '1rem', fontWeight: '800', marginBottom: '10px', color: '#94a3b8', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '15px' }}>
                            Full Squad Availability
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', maxHeight: '300px', overflowY: 'auto', paddingRight: '5px' }}>
                            {squads.away && squads.away.length > 0 ? (
                                squads.away.map(p => {
                                    // Check if player exists in injuries array
                                    const isInjured = injuries.some(inj => inj.player?.id === p.id);
                                    return (
                                        <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0', fontSize: '0.85rem', color: isInjured ? '#94a3b8' : '#cbd5e1', opacity: isInjured ? 0.6 : 1 }}>
                                            <span>{p.name} {p.number ? `(#${p.number})` : ''}</span>
                                            {isInjured ? <span title="Injured/Missing" style={{ color: '#ef4444' }}>🔴</span> : <span title="Available" style={{ color: '#10b981' }}></span>}
                                        </div>
                                    );
                                })
                            ) : (
                                <div style={{ color: '#64748b', fontSize: '0.85rem' }}>Squad roster unavailable.</div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

        </div>
    );
};

export default LiveBetMatchDetails;
