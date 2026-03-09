import React from 'react';
import PropTypes from 'prop-types';

import { useNavigate } from 'react-router-dom';
import api from '../../../../../services/api';
import './LiveBet.css';

const GameCard = ({ fixture, showOdds = true, preferences = { favorite_leagues: [], favorite_teams: [] }, onToggleFavorite = () => { }, isFeatured = false }) => {
    const navigate = useNavigate();
    const { fixture: matchInfo, league, teams, goals, live_odds } = fixture;

    const isFavLeague = preferences.favorite_leagues?.includes(league.id);
    const isFavHome = preferences.favorite_teams?.includes(teams.home.id);
    const isFavAway = preferences.favorite_teams?.includes(teams.away.id);
    const [saveState, setSaveState] = React.useState('idle'); // idle, saving, saved, error

    const matchTime = new Date(matchInfo.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const isLive = matchInfo.status.short === '1H' || matchInfo.status.short === '2H' || matchInfo.status.short === 'HT';
    const isFinished = ['FT', 'AET', 'PEN'].includes(matchInfo.status.short);

    // Settlement Logic (US_020)
    const homeGoals = goals.home ?? 0;
    const awayGoals = goals.away ?? 0;
    const totalGoals = homeGoals + awayGoals;

    let winner1N2 = null;
    let winnerOU = null;
    if (isFinished) {
        if (homeGoals > awayGoals) winner1N2 = 'home';
        else if (awayGoals > homeGoals) winner1N2 = 'away';
        else winner1N2 = 'draw';
        winnerOU = totalGoals > 2.5 ? 'over' : 'under';
    }

    const getOddClass = (market, outcome, baseClass = 'lb-odd-btn') => {
        if (!isFinished) return baseClass;
        if (market === '1N2') {
            return winner1N2 === outcome ? `${baseClass} winner` : `${baseClass} loser`;
        }
        if (market === 'OU') {
            return winnerOU === outcome ? `${baseClass} winner` : `${baseClass} loser`;
        }
        return baseClass;
    };

    const handleCardClick = () => {
        navigate(`/live-bet/match/${matchInfo.id}`);
    };

    const handleSaveOdds = async (e) => {
        e.stopPropagation();
        setSaveState('saving');
        try {
            await api.saveMatchOdds(matchInfo.id);
            setSaveState('saved');
            setTimeout(() => setSaveState('idle'), 2000);
        } catch (err) {
            console.error(err);
            setSaveState('error');
            setTimeout(() => setSaveState('idle'), 2000);
        }
    };

    return (
        <div
            className={`lb-game-card animate-fade-in ${isFeatured ? 'featured' : ''}`}
            onClick={handleCardClick}
            role="button"
            tabIndex="0"
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleCardClick();
                }
            }}
        >
            <div className="lb-card-header">
                <div className="lb-league-info">
                    {league.flag && <img src={league.flag} alt="" className="lb-league-flag" />}
                    <span className="lb-league-name">{league.name}</span>
                    <span
                        onClick={(e) => { e.stopPropagation(); onToggleFavorite('league', league.id); }}
                        style={{ cursor: 'pointer', marginLeft: '4px', fontSize: '1.2rem' }}
                        title="Toggle Favorite League"
                        role="button"
                        tabIndex="0"
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                e.stopPropagation();
                                onToggleFavorite('league', league.id);
                            }
                        }}
                    >
                        {isFavLeague ? '⭐' : '☆'}
                    </span>
                    <span className="lb-country-code" style={{ marginLeft: '8px' }}>{league.country}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {fixture.ai_prediction && (
                        <div className="lb-ai-badge" title={`Confidence: ${fixture.ai_prediction.confidence}%`}>
                            <span className="edge">+{fixture.ai_prediction.edge}% EDGE</span>
                            <span className={`risk ${fixture.ai_prediction.risk.toLowerCase()}`}>
                                {fixture.ai_prediction.risk}
                            </span>
                        </div>
                    )}
                    <button
                        className={`lb-save-btn ${saveState}`}
                        onClick={handleSaveOdds}
                        title="Save Odds to Database"
                        disabled={saveState === 'saving' || !live_odds}
                    >
                        {saveState === 'idle' && '💾'}
                        {saveState === 'saving' && '...'}
                        {saveState === 'saved' && '✅'}
                        {saveState === 'error' && '❌'}
                    </button>
                    <div className={`lb-match-status ${isLive ? 'live' : ''}`}>
                        {isLive ? (
                            <>
                                <span className="lb-live-dot"></span>
                                {matchInfo.status.elapsed}'
                            </>
                        ) : (
                            matchTime
                        )}
                    </div>
                </div>
            </div>

            <div className="lb-teams-container">
                {/* Home Team */}
                <div className="lb-team-row">
                    <div className="lb-team-info">
                        <img src={teams.home.logo} alt={teams.home.name} className="lb-team-logo" />
                        <span className="lb-team-name">{teams.home.name}</span>
                        <span
                            onClick={(e) => { e.stopPropagation(); onToggleFavorite('team', teams.home.id); }}
                            style={{ cursor: 'pointer', marginLeft: '4px' }}
                            title="Toggle Favorite Team"
                            role="button"
                            tabIndex="0"
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    onToggleFavorite('team', teams.home.id);
                                }
                            }}
                        >
                            {isFavHome ? '⭐' : '☆'}
                        </span>
                    </div>
                    <div className="lb-score">{goals.home ?? '-'}</div>
                </div>

                {/* Away Team */}
                <div className="lb-team-row">
                    <div className="lb-team-info">
                        <img src={teams.away.logo} alt={teams.away.name} className="lb-team-logo" />
                        <span className="lb-team-name">{teams.away.name}</span>
                        <span
                            onClick={(e) => { e.stopPropagation(); onToggleFavorite('team', teams.away.id); }}
                            style={{ cursor: 'pointer', marginLeft: '4px' }}
                            title="Toggle Favorite Team"
                            role="button"
                            tabIndex="0"
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    onToggleFavorite('team', teams.away.id);
                                }
                            }}
                        >
                            {isFavAway ? '⭐' : '☆'}
                        </span>
                    </div>
                    <div className="lb-score">{goals.away ?? '-'}</div>
                </div>
            </div>

            <div className="lb-cockpit-stats">
                <div className="lb-prob-bar-matrix">
                    {/* Home Probability */}
                    <div className="lb-prob-row">
                        <span className="lb-prob-label">1</span>
                        <div className="lb-prob-track">
                            <div
                                className="lb-prob-fill home"
                                style={{ width: `${(fixture.ai_prediction?.probabilities?.home || fixture.implied_probabilities?.home || 0.333) * 100}%` }}
                            ></div>
                        </div>
                        <span className="lb-prob-val">{((fixture.ai_prediction?.probabilities?.home || fixture.implied_probabilities?.home || 0.333) * 100).toFixed(1)}%</span>
                    </div>
                    {/* Draw Probability */}
                    <div className="lb-prob-row">
                        <span className="lb-prob-label">X</span>
                        <div className="lb-prob-track">
                            <div
                                className="lb-prob-fill draw"
                                style={{ width: `${(fixture.ai_prediction?.probabilities?.draw || fixture.implied_probabilities?.draw || 0.333) * 100}%` }}
                            ></div>
                        </div>
                        <span className="lb-prob-val">{((fixture.ai_prediction?.probabilities?.draw || fixture.implied_probabilities?.draw || 0.333) * 100).toFixed(1)}%</span>
                    </div>
                    {/* Away Probability */}
                    <div className="lb-prob-row">
                        <span className="lb-prob-label">2</span>
                        <div className="lb-prob-track">
                            <div
                                className="lb-prob-fill away"
                                style={{ width: `${(fixture.ai_prediction?.probabilities?.away || fixture.implied_probabilities?.away || 0.333) * 100}%` }}
                            ></div>
                        </div>
                        <span className="lb-prob-val">{((fixture.ai_prediction?.probabilities?.away || fixture.implied_probabilities?.away || 0.333) * 100).toFixed(1)}%</span>
                    </div>
                </div>

                <div className="lb-cockpit-meta">
                    <div className={`lb-edge-indicator ${fixture.ai_prediction?.edge > 5 ? 'high-value' : ''}`}>
                        🧠 Edge: {fixture.ai_prediction?.edge ? `+${fixture.ai_prediction.edge}%` : 'Standard'}
                    </div>
                    <div className="lb-explainer-trigger">
                        Why?
                        <div className="lb-logic-explainer">
                            <div className="lb-logic-title">Insight Logic</div>
                            <div className="lb-logic-item">
                                <span className="lb-logic-item-label">Confidence:</span>
                                <span className="lb-logic-item-val">{fixture.ai_prediction?.confidence || 65}%</span>
                            </div>
                            <div className="lb-logic-item">
                                <span className="lb-logic-item-label">Volatility:</span>
                                <span className="lb-logic-item-val" style={{ color: '#f59e0b' }}>Low</span>
                            </div>
                            <div className="lb-logic-item" style={{ borderTop: '1px solid rgba(255,255,255,0.05)', marginTop: '4px', paddingTop: '4px' }}>
                                <span className="lb-logic-item-label">Primary Factor:</span>
                                <span className="lb-logic-item-val" style={{ color: '#818cf8' }}>Form</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Odds Section (US_011) */}
            {showOdds && live_odds && (
                <div className="lb-odds-section">
                    {/* 1N2 Market */}
                    <div className="lb-odds-market">
                        <div className="lb-market-label">1N2</div>
                        <div className="lb-odds-grid-3">
                            <div className={getOddClass('1N2', 'home')}>
                                <span className="lb-odd-val">{live_odds.match_winner?.home || '-'}</span>
                                <span className="lb-odd-label">1</span>
                            </div>
                            <div className={getOddClass('1N2', 'draw')}>
                                <span className="lb-odd-val">{live_odds.match_winner?.draw || '-'}</span>
                                <span className="lb-odd-label">N</span>
                            </div>
                            <div className={getOddClass('1N2', 'away')}>
                                <span className="lb-odd-val">{live_odds.match_winner?.away || '-'}</span>
                                <span className="lb-odd-label">2</span>
                            </div>
                        </div>
                    </div>

                    {/* Over/Under 2.5 Market */}
                    <div className="lb-odds-market">
                        <div className="lb-market-label">Goals 2.5</div>
                        <div className="lb-odds-grid-2">
                            <div className={getOddClass('OU', 'over', 'lb-odd-btn small')}>
                                <span className="lb-odd-label">Over</span>
                                <span className="lb-odd-val">{live_odds.goals_ou25?.over || '-'}</span>
                            </div>
                            <div className={getOddClass('OU', 'under', 'lb-odd-btn small')}>
                                <span className="lb-odd-label">Under</span>
                                <span className="lb-odd-val">{live_odds.goals_ou25?.under || '-'}</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="lb-transparency-layer">
                <div className="lb-disclaimer-bar">
                    Predictions are ML-generated. Responsible analytics only.
                </div>
            </div>
        </div>
    );
};

GameCard.propTypes = {
    fixture: PropTypes.shape({
        fixture: PropTypes.object.isRequired,
        league: PropTypes.object.isRequired,
        teams: PropTypes.object.isRequired,
        goals: PropTypes.object.isRequired,
        live_odds: PropTypes.object,
        ai_prediction: PropTypes.object,
        implied_probabilities: PropTypes.object
    }).isRequired,
    showOdds: PropTypes.bool,
    preferences: PropTypes.shape({
        favorite_leagues: PropTypes.array,
        favorite_teams: PropTypes.array
    }),
    onToggleFavorite: PropTypes.func,
    isFeatured: PropTypes.bool
};

export default GameCard;

