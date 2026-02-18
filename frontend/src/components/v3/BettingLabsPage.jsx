import React, { useState, useEffect } from 'react';
import axios from 'axios';
import BettingLabsDetail from './BettingLabsDetail';
import './BettingLabsPage.css';

const BettingLabsPage = () => {
    const [view, setView] = useState('upcoming'); // 'upcoming', 'history'
    const [predictions, setPredictions] = useState([]);
    const [filteredPredictions, setFilteredPredictions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);
    const [stats, setStats] = useState(null); // Sync result stats

    // Filters
    const [selectedLeague, setSelectedLeague] = useState('all');
    const [leagues, setLeagues] = useState([]);

    // Detail Modal
    const [selectedPrediction, setSelectedPrediction] = useState(null);

    useEffect(() => {
        fetchPredictions();
    }, [view]);

    // Apply filters when predictions or selected league changes
    useEffect(() => {
        if (selectedLeague === 'all') {
            setFilteredPredictions(predictions);
        } else {
            setFilteredPredictions(predictions.filter(p => p.league_name === selectedLeague));
        }
    }, [selectedLeague, predictions]);

    const fetchPredictions = async () => {
        setLoading(true);
        try {
            const res = await axios.get('/api/predictions', { params: { status: view } });
            const data = res.data;
            setPredictions(data);

            // Extract unique leagues for filter
            const uniqueLeagues = [...new Set(data.map(p => p.league_name))].sort();
            setLeagues(uniqueLeagues);
            setSelectedLeague('all');

        } catch (error) {
            console.error("Failed to load predictions", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSync = async () => {
        setSyncing(true);
        setStats(null);
        try {
            const res = await axios.post('/api/predictions/sync');
            setStats(res.data);
            if (view === 'upcoming') fetchPredictions(); // Refresh if viewing upcoming
        } catch (error) {
            console.error("Sync failed", error);
            alert("Sync failed: " + error.message);
        } finally {
            setSyncing(false);
        }
    };

    const getConfidenceClass = (prob) => {
        const val = parseInt(prob.replace('%', ''));
        if (val >= 60) return 'confidence-high';
        if (val >= 45) return 'confidence-med';
        return 'confidence-low';
    };

    return (
        <div className="betting-labs-page fade-in">
            <header className="labs-header">
                <div className="labs-title">
                    <h1>🧠 Betting Labs</h1>
                    <p>AI-Powered Prediction Engine & Analysis</p>
                </div>
                <div className="labs-actions">
                    <button
                        className="btn-sync-labs"
                        onClick={handleSync}
                        disabled={syncing}
                    >
                        {syncing ? 'Analyzing Market...' : '🔄 Scan Upcoming Matches (Top 10 Leagues)'}
                    </button>
                </div>
            </header>

            {stats && (
                <div className="sync-status-card fade-in">
                    <h3>Analysis Complete</h3>
                    <p>Synced: <strong>{stats.synced}</strong> | Candidates: <strong>{stats.total_candidates}</strong></p>
                    {stats.errors > 0 && <span className="warning">Errors: {stats.errors}</span>}
                </div>
            )}

            <div className="labs-controls" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <div className="labs-tabs">
                    <button
                        className={`tab-btn ${view === 'upcoming' ? 'active' : ''}`}
                        onClick={() => setView('upcoming')}
                    >
                        🔮 Upcoming Tips
                    </button>
                    <button
                        className={`tab-btn ${view === 'history' ? 'active' : ''}`}
                        onClick={() => setView('history')}
                    >
                        📚 History & Results
                    </button>
                </div>

                <div className="labs-filter">
                    <select
                        value={selectedLeague}
                        onChange={(e) => setSelectedLeague(e.target.value)}
                        className="league-select"
                        style={{ padding: '8px', borderRadius: '6px', background: '#1e293b', color: '#fff', border: '1px solid #334155' }}
                    >
                        <option value="all">Check All Leagues</option>
                        {leagues.map(l => (
                            <option key={l} value={l}>{l}</option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="predictions-grid">
                {loading ? (
                    <div className="labs-loader">Thinking...</div>
                ) : filteredPredictions.length === 0 ? (
                    <div className="labs-empty">No predictions found for this view. Sync to find new opportunities.</div>
                ) : (
                    filteredPredictions.map(p => (
                        <div
                            key={p.id}
                            className="prediction-card clickable"
                            onClick={() => setSelectedPrediction(p)}
                            title="Click for full analysis"
                        >
                            <div className="pred-league">
                                <img src={p.country_flag} alt="" className="pred-flag" />
                                <span>{p.league_name}</span>
                                <span className="pred-date">{new Date(p.match_date).toLocaleDateString()}</span>
                            </div>

                            <div className="pred-match">
                                <div className="p-team">
                                    <img src={p.home_logo} alt={p.home_team} />
                                    <span>{p.home_team}</span>
                                </div>
                                <div className="vs">VS</div>
                                <div className="p-team">
                                    <img src={p.away_logo} alt={p.away_team} />
                                    <span>{p.away_team}</span>
                                </div>
                            </div>

                            <div className="pred-main">
                                <div className="pred-outcome">
                                    <span className="label">Full Time Prediction</span>
                                    <span className="value winner">{p.winner_name || 'Draw / Unknown'}</span>
                                    <span className="comment">"{p.winner_comment}"</span>
                                </div>
                            </div>

                            <div className="pred-probs">
                                <div className={`prob-box ${getConfidenceClass(p.prob_home)}`}>
                                    <span className="lbl">HOME</span>
                                    <span className="val">{p.prob_home}</span>
                                </div>
                                <div className={`prob-box ${getConfidenceClass(p.prob_draw)}`}>
                                    <span className="lbl">DRAW</span>
                                    <span className="val">{p.prob_draw}</span>
                                </div>
                                <div className={`prob-box ${getConfidenceClass(p.prob_away)}`}>
                                    <span className="lbl">AWAY</span>
                                    <span className="val">{p.prob_away}</span>
                                </div>
                            </div>

                            <div className="pred-advice">
                                <span className="icon">💡</span>
                                <span>{p.advice}</span>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Detail Modal */}
            {selectedPrediction && (
                <BettingLabsDetail
                    prediction={selectedPrediction}
                    onClose={() => setSelectedPrediction(null)}
                />
            )}

        </div>
    );
};

export default BettingLabsPage;
