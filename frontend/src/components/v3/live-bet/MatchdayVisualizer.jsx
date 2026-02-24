import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './MatchdayVisualizer.css';

const MatchdayVisualizer = () => {
    const [leagues, setLeagues] = useState([]);
    const [filters, setFilters] = useState({
        leagueId: '',
        date: new Date().toISOString().split('T')[0], // Default to today
    });
    const [matches, setMatches] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchLeagues();
        // Removed initial fetch to require explicit action or wait for date change if needed
    }, []);

    const fetchLeagues = async () => {
        try {
            const res = await axios.get('/api/live-bet/leagues/monitoring');
            setLeagues(res.data);
        } catch (err) {
            console.error("Failed to fetch leagues:", err);
        }
    };

    const handleFetchMatchday = async () => {
        setLoading(true);
        setError(null);
        try {
            // Reusing the backtest endpoint but filtering heavily
            const params = {
                leagueId: filters.leagueId || undefined,
                dateStart: `${filters.date} 00:00:00`,
                dateEnd: `${filters.date} 23:59:59`,
                minEdge: 0, // want to see everything
                minConfidence: 0
            };

            // To get full details, we would ideally have a specific endpoint.
            // But we can approximate with backtest results.
            const res = await axios.get('/api/intelligence/backtest', { params });
            if (res.data.success) {
                // The equity curve only contains those that had an edge based on backtest.
                // We'll need a dedicated endpoint to see *all* predictions for a day, 
                // but since we only have the backtest endpoint right now, we will display its results.
                setMatches(res.data.data.equity_curve || []);
            } else {
                setError(res.data.message);
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="matchday-visualizer animate-fade-in">
            <header className="mv-header">
                <button onClick={() => window.history.back()} className="back-link">
                    ← Back to Hub
                </button>
                <div className="header-content">
                    <span className="badge">Delta Analysis</span>
                    <h1>Matchday Visualizer</h1>
                    <p>Granular comparative view of ML predicted probabilities versus actual market outcomes.</p>
                </div>
            </header>

            <div className="mv-controls">
                <div className="control-group">
                    <label>Operational Sector</label>
                    <select
                        value={filters.leagueId}
                        onChange={(e) => setFilters({ ...filters, leagueId: e.target.value })}
                    >
                        <option value="">Global (All Leagues)</option>
                        {leagues.map(l => (
                            <option key={l.league_id} value={l.league_id}>{l.name}</option>
                        ))}
                    </select>
                </div>
                <div className="control-group">
                    <label>Matchday (Date)</label>
                    <input
                        type="date"
                        value={filters.date}
                        onChange={(e) => setFilters({ ...filters, date: e.target.value })}
                    />
                </div>
                <button className="btn-fetch" onClick={handleFetchMatchday} disabled={loading}>
                    {loading ? 'Scanning Data...' : 'Analyze Matchday'}
                </button>
            </div>

            <div className="mv-content">
                {error && <div className="error-msg">{error}</div>}
                {!loading && !error && matches.length === 0 && (
                    <div className="no-data">
                        No significant value signals logged for this date.
                    </div>
                )}

                {!loading && matches.length > 0 && (
                    <div className="matches-grid">
                        {matches.map((m, i) => (
                            <div key={i} className={`visualizer-card ${m.result === 'WON' ? 'won' : 'lost'}`}>
                                <div className="card-header">
                                    <span className="fixture-id">Ref: #{m.fixture_id}</span>
                                    <span className={`status-pill ${m.result.toLowerCase()}`}>
                                        {m.result === 'WON' ? 'Prediction Hit' : 'Prediction Miss'}
                                    </span>
                                </div>
                                <div className="card-body">
                                    <div className="info-row">
                                        <span className="lbl">Model Value Signal:</span>
                                        <span className="val">{m.result === 'WON' ? 'Accurate' : 'Deviation Detected'}</span>
                                    </div>
                                    <div className="info-row">
                                        <span className="lbl">Balance Delta:</span>
                                        <span className={`val delta ${m.result === 'WON' ? 'pos' : 'neg'}`}>
                                            {m.result === 'WON' ? '+' : '-'} {Math.abs(m.balance - (matches[i - 1]?.balance || 0)).toFixed(2)}u
                                        </span>
                                    </div>
                                </div>
                                <div className="card-footer">
                                    <div className="delta-bar">
                                        <div className="model-prog" style={{ width: '45%' }} title="Model Provability"></div>
                                        <div className="market-prog" style={{ width: '40%' }} title="Market Implied"></div>
                                    </div>
                                    <div className="delta-label">Example Delta Visualization</div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default MatchdayVisualizer;
