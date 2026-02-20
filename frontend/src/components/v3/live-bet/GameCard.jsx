import React from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../../services/api';
import './LiveBet.css';

const GameCard = ({ fixture, showOdds = true, preferences = { favorite_leagues: [], favorite_teams: [] }, onToggleFavorite = () => { } }) => {
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
        <div className="lb-game-card animate-fade-in" onClick={handleCardClick}>
            <div className="lb-card-header">
                <div className="lb-league-info">
                    {league.flag && <img src={league.flag} alt="" className="lb-league-flag" />}
                    <span className="lb-league-name">{league.name}</span>
                    <span
                        onClick={(e) => { e.stopPropagation(); onToggleFavorite('league', league.id); }}
                        style={{ cursor: 'pointer', marginLeft: '4px', fontSize: '1.2rem' }}
                        title="Toggle Favorite League"
                    >
                        {isFavLeague ? '⭐' : '☆'}
                    </span>
                    <span className="lb-country-code" style={{ marginLeft: '8px' }}>{league.country}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
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
                        >
                            {isFavAway ? '⭐' : '☆'}
                        </span>
                    </div>
                    <div className="lb-score">{goals.away ?? '-'}</div>
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
        </div>
    );
};

export default GameCard;
