import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../../../../services/api';
import { Skeleton, CardSkeleton, MetricCardSkeleton } from '../../../../../design-system';
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
        <div className="lb-match-details">
            {/* Back button skeleton */}
            <div className="lb-skeleton__header">
                <Skeleton width="160px" height="20px" />
                <div className="lb-skeleton__btn-group">
                    <Skeleton width="180px" height="40px" />
                    <Skeleton width="150px" height="40px" />
                </div>
            </div>
            {/* Hero section skeleton */}
            <div className="lb-detail-hero" style={{ padding: 'var(--spacing-xl)' }}>
                <div className="lb-skeleton__hero-center">
                    <Skeleton width="40px" height="40px" style={{ margin: '0 auto var(--spacing-sm)' }} />
                    <Skeleton width="200px" height="20px" style={{ margin: '0 auto var(--spacing-xs)' }} />
                    <Skeleton width="280px" height="14px" style={{ margin: '0 auto' }} />
                </div>
                <div className="lb-skeleton__score-row">
                    <div className="lb-skeleton__score-team">
                        <Skeleton width="80px" height="80px" style={{ margin: '0 auto' }} />
                        <Skeleton width="120px" height="16px" style={{ margin: 'var(--spacing-sm) auto 0' }} />
                    </div>
                    <Skeleton width="100px" height="48px" />
                    <div className="lb-skeleton__score-team">
                        <Skeleton width="80px" height="80px" style={{ margin: '0 auto' }} />
                        <Skeleton width="120px" height="16px" style={{ margin: 'var(--spacing-sm) auto 0' }} />
                    </div>
                </div>
            </div>
            {/* Intelligence cockpit + context cards skeleton */}
            <div className="lb-skeleton__context-grid">
                <div className="lb-skeleton__context-grid--span2">
                    <CardSkeleton />
                </div>
                <CardSkeleton />
                <CardSkeleton />
            </div>
            {/* Two-column team layout skeleton */}
            <div className="lb-skeleton__teams-grid">
                <div className="lb-skeleton__team-col">
                    <CardSkeleton />
                    <CardSkeleton />
                </div>
                <div className="lb-skeleton__team-col">
                    <CardSkeleton />
                    <CardSkeleton />
                </div>
            </div>
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

    const getFormBadgeClass = (c) => {
        if (c === 'W') return 'lb-form-badge lb-form-badge--W';
        if (c === 'D') return 'lb-form-badge lb-form-badge--D';
        return 'lb-form-badge lb-form-badge--L';
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
        const getWinner = () => {
            if (homeGoals > awayGoals) return teams.home.name;
            if (awayGoals > homeGoals) return teams.away.name;
            return 'Draw';
        };
        const actualWinner = getWinner();

        if (prediction.predictions.winner.name === actualWinner) {
            isPredictionCorrect = true;
        } else if (prediction.predictions.winner.name === teams.home.name && homeGoals >= awayGoals && prediction.predictions.winner.comment?.includes('Draw')) {
            isPredictionCorrect = true; // Win or draw leeway
        } else {
            isPredictionCorrect = false;
        }
    }

    const renderLineupList = (lineup) => {
        if (!lineup || !lineup.startXI) {
            return <div className="lb-lineup-empty">XI not available yet.</div>;
        }
        return lineup.startXI.map((p) => (
            <div key={p.player.id} className="lb-player-row">
                <div className="lb-player-row__info">
                    <span className="lb-player-row__number">{p.player.number}</span>
                    <span className="lb-player-row__name">{p.player.name}</span>
                </div>
                <span className="lb-player-row__badges">{getPlayerBadges(p.player.id)}</span>
            </div>
        ));
    };

    const renderSquadList = (squadPlayers) => {
        if (!squadPlayers || squadPlayers.length === 0) {
            return <div className="lb-squad-empty">Squad roster unavailable.</div>;
        }
        return squadPlayers.map(p => {
            const isInjured = injuries.some(inj => inj.player?.id === p.id);
            return (
                <div key={p.id} className={`lb-squad-player ${isInjured ? 'lb-squad-player--injured' : 'lb-squad-player--available'}`}>
                    <span>{p.name} {p.number ? `(#${p.number})` : ''}</span>
                    {isInjured
                        ? <span title="Injured/Missing" style={{ color: 'var(--color-danger-500)' }}>🔴</span>
                        : <span title="Available" style={{ color: 'var(--color-success-500)' }}></span>
                    }
                </div>
            );
        });
    };

    const renderFormBadges = (form) => {
        if (!form) return <span className="lb-no-data">No data</span>;
        return form.slice(-5).split('').map((char, i) => (
            <span key={`form-${i}`} className={getFormBadgeClass(char)}>
                {char}
            </span>
        ));
    };

    return (
        <div className="lb-match-details animate-fade-in">
            <div className="lb-header-actions">
                <button className="lb-back-btn" onClick={() => navigate(-1)}>
                    ← Back to Dashboard
                </button>
                <div className="lb-header-actions__btn-group">
                    <button
                        className={`lb-save-btn-large lb-save-btn-large--depth ${saveState}`}
                        onClick={async () => {
                            setSaveState('saving');
                            try {
                                await api.ingestDepthOdds(id);
                                setSaveState('saved');
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
                    >
                        {saveState === 'idle' && '⚡ Depth Sync (Multi-Market)'}
                        {saveState === 'saving' && 'Syncing...'}
                        {saveState === 'saved' && 'Deep Data Synced ✅'}
                        {saveState === 'error' && 'Error ❌'}
                    </button>
                    <button
                        className={`lb-save-btn-large lb-save-btn-large--basic ${saveState}`}
                        onClick={handleSaveOdds}
                        disabled={saveState === 'saving'}
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
                    <img src={league.logo} alt="" className="lb-league-logo-med" />
                    <div className="lb-league-name-lg">{league.name}</div>
                    <div className="lb-match-time">
                        {new Date(matchInfo.date).toLocaleString()} • {matchInfo.venue.name}
                    </div>

                    {/* Narrative Badges (US_153) */}
                    {data.narrative && (
                        <div className="lb-narrative-badges">
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

                <div className="lb-score-board">
                    <div className="lb-team-lg">
                        <img src={teams.home.logo} alt={teams.home.name} className="lb-team-lg__logo" />
                        <div className="lb-team-lg__name">{teams.home.name}</div>
                    </div>

                    <div className="lb-score-display">
                        {goals.home ?? '-'} : {goals.away ?? '-'}
                    </div>

                    <div className="lb-team-lg">
                        <img src={teams.away.logo} alt={teams.away.name} className="lb-team-lg__logo" />
                        <div className="lb-team-lg__name">{teams.away.name}</div>
                    </div>
                </div>
            </div>

            {/* ML Context Header (US_019 AC 3) */}
            <div className="lb-ml-context-header">

                {/* US_172: Intelligence Cockpit (Enhanced) */}
                <div className="lb-context-card cockpit-main">
                    <div className="lb-cockpit__header">
                        <div>
                            <h3 className="lb-cockpit__title">🔬 Intelligence Cockpit</h3>
                            <p className="lb-cockpit__subtitle">Advanced Probability Overlay & Market Inconsistency Detection</p>
                        </div>
                        <div className="lb-explainer-trigger lb-cockpit__explainer-btn">
                            View Core Logic
                            <div className="lb-logic-explainer lb-cockpit__explainer-tooltip">
                                <div className="lb-logic-title">Institutional Model Alpha</div>
                                <div className="lb-logic-item">
                                    <span className="lb-logic-item-label">Backtested Confidence:</span>
                                    <span className="lb-logic-item-val">{data.investment_value?.confidence || 72}%</span>
                                </div>
                                <div className="lb-logic-item">
                                    <span className="lb-logic-item-label">Market Efficiency:</span>
                                    <span className="lb-logic-item-val" style={{ color: 'var(--color-accent-500)' }}>Moderate</span>
                                </div>
                                <div className="lb-logic-item">
                                    <span className="lb-logic-item-label">Edge Delta:</span>
                                    <span className="lb-logic-item-val">{data.investment_value?.edge || 0}%</span>
                                </div>
                                <div className="lb-cockpit__disclaimer">
                                    * Model weights adjusted for recent form and squad availability.
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="lb-cockpit__grid">
                        <div className="lb-prob-bar-matrix">
                            {/* Home */}
                            <div className="lb-prob-row">
                                <span className="lb-prob-label lb-prob-label--lg">1</span>
                                <div className="lb-prob-track lb-prob-track--lg">
                                    <div className="lb-prob-fill home" style={{ width: prediction?.predictions?.percent?.home || '33%' }}></div>
                                </div>
                                <span className="lb-prob-val lb-prob-val--lg">{prediction?.predictions?.percent?.home || '33%'}</span>
                            </div>
                            {/* Draw */}
                            <div className="lb-prob-row">
                                <span className="lb-prob-label lb-prob-label--lg">X</span>
                                <div className="lb-prob-track lb-prob-track--lg">
                                    <div className="lb-prob-fill draw" style={{ width: prediction?.predictions?.percent?.draw || '33%' }}></div>
                                </div>
                                <span className="lb-prob-val lb-prob-val--lg">{prediction?.predictions?.percent?.draw || '33%'}</span>
                            </div>
                            {/* Away */}
                            <div className="lb-prob-row">
                                <span className="lb-prob-label lb-prob-label--lg">2</span>
                                <div className="lb-prob-track lb-prob-track--lg">
                                    <div className="lb-prob-fill away" style={{ width: prediction?.predictions?.percent?.away || '33%' }}></div>
                                </div>
                                <span className="lb-prob-val lb-prob-val--lg">{prediction?.predictions?.percent?.away || '33%'}</span>
                            </div>
                        </div>

                        <div className="lb-cockpit__advice-col">
                            <div className="lb-advice-card">
                                <div className="lb-advice-card__label">Alpha Advice</div>
                                <div className="lb-advice-card__value">{prediction?.predictions?.advice || 'Monitor for In-Play Entry'}</div>
                            </div>
                            <div className="lb-cockpit__metrics-grid">
                                <div className="lb-cockpit__metric lb-cockpit__metric--edge">
                                    <div className="lb-cockpit__metric-label lb-cockpit__metric-label--edge">EDGE</div>
                                    <div className="lb-cockpit__metric-value lb-cockpit__metric-value--lg">+{data.investment_value?.edge || 0}%</div>
                                </div>
                                <div className="lb-cockpit__metric lb-cockpit__metric--risk">
                                    <div className="lb-cockpit__metric-label lb-cockpit__metric-label--risk">RISK</div>
                                    <div className="lb-cockpit__metric-value lb-cockpit__metric-value--sm">{data.investment_value?.risk_level || 'CONSIDERABLE'}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* H2H Mini Block */}
                {h2h && h2h.length > 0 && (
                    <div className="lb-context-card lb-context-card--surface">
                        <h3 className="lb-context-card__title lb-context-card__title--muted">
                            ⚔️ Recent Head-to-Head
                        </h3>
                        <div className="lb-context-card__list">
                            {h2h.slice(0, 3).map(match => (
                                <div key={match.fixture.id} className="lb-h2h-row">
                                    <span className="lb-h2h-row__date">{new Date(match.fixture.date).toLocaleDateString()}</span>
                                    <span className="lb-h2h-row__score">
                                        {match.goals.home} - {match.goals.away}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Match Statistics (If finished and available) */}
                {isFinished && matchStats.length >= 2 && (
                    <div className="lb-context-card lb-context-card--surface">
                        <h3 className="lb-context-card__title lb-context-card__title--cyan">
                            📊 Match Statistics
                        </h3>
                        <div className="lb-context-card__list lb-context-card__list--sm">
                            {['Ball Possession', 'Shots on Goal', 'Corner Kicks', 'Total passes'].map(statName => {
                                const homeStat = matchStats[0]?.statistics?.find(s => s.type === statName)?.value || '-';
                                const awayStat = matchStats[1]?.statistics?.find(s => s.type === statName)?.value || '-';

                                return (
                                    <div key={statName} className="lb-stat-row">
                                        <span className="lb-stat-row__value lb-stat-row__value--left">{homeStat}</span>
                                        <span className="lb-stat-row__label">{statName.replaceAll('Ball ', '').replaceAll('Total ', '')}</span>
                                        <span className="lb-stat-row__value lb-stat-row__value--right">{awayStat}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Detailed Odds Top Summary */}
                {odds && odds.length > 0 && (
                    <div className="lb-context-card lb-context-card--surface">
                        <h3 className="lb-context-card__title lb-context-card__title--amber">
                            💰 Key Markets
                        </h3>
                        <div className="lb-context-card__list">
                            {odds.slice(0, 3).map(market => {
                                const fairObj = probabilities[market.id];
                                return (
                                    <div key={market.id}>
                                        <div className="lb-market-header">
                                            <div className="lb-market-name">{market.name}</div>
                                            {fairObj && (
                                                <div className="lb-market-margin">
                                                    Margin: {(fairObj.margin * 100).toFixed(1)}%
                                                </div>
                                            )}
                                        </div>
                                        <div className="lb-market-values">
                                            {market.values.slice(0, 3).map((v) => {
                                                const fairProb = fairObj?.probabilities?.[v.value];
                                                return (
                                                    <div key={v.value} className="lb-market-value-cell">
                                                        <div className="lb-market-value-cell__label">{v.value}</div>
                                                        <div className="lb-market-value-cell__odd">{v.odd}</div>
                                                        {fairProb && (
                                                            <div className="lb-market-value-cell__prob">
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
                    <div className="lb-context-card lb-context-card--investment">
                        <h3 className="lb-context-card__title lb-context-card__title--emerald">
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
                        <div className="lb-investment__grid">
                            <div className="lb-investment__metric">
                                <div className="lb-investment__metric-label">Calculated Edge</div>
                                <div className="lb-investment__metric-value">
                                    {data.investment_value.edge > 0 ? '+' : ''}{data.investment_value.edge}%
                                </div>
                            </div>
                            <div className="lb-investment__metric">
                                <div className="lb-investment__metric-label">Confidence</div>
                                <div className="lb-investment__metric-value">
                                    {data.investment_value.confidence}%
                                </div>
                            </div>
                            <div className="lb-investment__metric">
                                <div className="lb-investment__metric-label">Kelly Stake</div>
                                <div className="lb-investment__metric-value lb-investment__metric-value--green">
                                    {data.investment_value.kelly_suggested}%
                                </div>
                            </div>
                        </div>
                        <div className="lb-investment__summary">
                            <div className="lb-investment__summary-row">
                                <span className="lb-investment__summary-label">Target Outcome:</span>
                                <span className="lb-investment__summary-value">{data.investment_value.best_pick}</span>
                            </div>
                            <div className="lb-investment__summary-row">
                                <span className="lb-investment__summary-label">Expected Value (EV):</span>
                                <span className={`lb-investment__summary-value ${data.investment_value.ev > 0 ? 'lb-investment__summary-value--positive' : 'lb-investment__summary-value--negative'}`}>
                                    {(data.investment_value.ev * 100).toFixed(2)}%
                                </span>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Side-by-Side Teams Layout (US_019 AC 1) */}
            <div className="lb-sbs-container">

                {/* --- HOME TEAM COLUMN --- */}
                <div className="lb-team-side">

                    {/* Home Form */}
                    <div className="lb-sbs-card lb-sbs-card--home">
                        <div className="lb-sbs-card__team-title">
                            {teams.home.name} <span className="lb-sbs-card__team-tag--home">(Home)</span>
                        </div>
                        <div className="lb-sbs-card__form-label">Recent Form</div>
                        <div className="lb-form-badges">
                            {renderFormBadges(prediction?.teams?.home?.league?.form)}
                        </div>
                    </div>

                    {/* Home Lineup & Squad */}
                    <div className="lb-sbs-card">
                        <div className="lb-lineup-title">
                            {isOfficial ? '✅ Match XI' : '⚠️ Probable XI'}
                        </div>
                        <div className="lb-lineup-list">
                            {renderLineupList(homeLineup)}
                        </div>

                        {/* Home Full Squad & Injuries */}
                        <div className="lb-squad-header">
                            Full Squad Availability
                        </div>
                        <div className="lb-squad-list">
                            {renderSquadList(squads.home)}
                        </div>
                    </div>
                </div>

                {/* --- AWAY TEAM COLUMN --- */}
                <div className="lb-team-side">

                    {/* Away Form */}
                    <div className="lb-sbs-card lb-sbs-card--away">
                        <div className="lb-sbs-card__team-title">
                            {teams.away.name} <span className="lb-sbs-card__team-tag--away">(Away)</span>
                        </div>
                        <div className="lb-sbs-card__form-label">Recent Form</div>
                        <div className="lb-form-badges">
                            {renderFormBadges(prediction?.teams?.away?.league?.form)}
                        </div>
                    </div>

                    {/* Away Lineup & Squad */}
                    <div className="lb-sbs-card">
                        <div className="lb-lineup-title">
                            {isOfficial ? '✅ Match XI' : '⚠️ Probable XI'}
                        </div>
                        <div className="lb-lineup-list">
                            {renderLineupList(awayLineup)}
                        </div>

                        {/* Away Full Squad & Injuries */}
                        <div className="lb-squad-header">
                            Full Squad Availability
                        </div>
                        <div className="lb-squad-list">
                            {renderSquadList(squads.away)}
                        </div>
                    </div>
                </div>
            </div>

        </div>
    );
};

export default LiveBetMatchDetails;
