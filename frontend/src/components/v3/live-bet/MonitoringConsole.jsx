import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './MonitoringConsole.css';

const MonitoringConsole = () => {
    const [leagues, setLeagues] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [updatingIds, setUpdatingIds] = useState(new Set());
    const [mlStatus, setMlStatus] = useState({ is_training: false, last_trained: null });

    useEffect(() => {
        fetchLeagues();
        fetchMlStatus();

        const statusInterval = setInterval(fetchMlStatus, 5000); // Check ML status every 5s
        return () => clearInterval(statusInterval);
    }, []);

    const fetchLeagues = async () => {
        try {
            const res = await axios.get('/api/live-bet/leagues/monitoring');
            setLeagues(res.data);
            setLoading(false);
        } catch (error) {
            console.error("Failed to fetch monitoring leagues:", error);
            setLoading(false);
        }
    };

    const fetchMlStatus = async () => {
        try {
            const res = await axios.get('/api/ml/status');
            if (res.data.success) {
                setMlStatus(res.data.data);
            }
        } catch (error) {
            console.error("Failed to fetch ML status:", error);
        }
    };

    const handleRetrain = async () => {
        if (window.confirm("Trigger Global ML Model Retraining? This will refresh all feature vectors and optimize model weights.")) {
            try {
                await axios.post('/api/ml/train');
                fetchMlStatus();
            } catch (error) {
                alert("Failed to trigger retraining: " + error.message);
            }
        }
    };

    const handleToggle = async (leagueId, currentStatus) => {
        setUpdatingIds(prev => new Set(prev).add(leagueId));
        try {
            await axios.put(`/api/live-bet/leagues/${leagueId}/monitoring`, {
                enabled: !currentStatus
            });

            setLeagues(prev => prev.map(l =>
                l.league_id === leagueId
                    ? { ...l, is_live_enabled: !currentStatus }
                    : l
            ));
        } catch (error) {
            console.error("Failed to toggle monitoring:", error);
        } finally {
            setUpdatingIds(prev => {
                const next = new Set(prev);
                next.delete(leagueId);
                return next;
            });
        }
    };

    const handleEliteEnable = async () => {
        const eliteIds = [39, 140, 78, 61, 135];
        for (const id of eliteIds) {
            const league = leagues.find(l => l.api_id === id);
            if (league && !league.is_live_enabled) {
                await handleToggle(league.league_id, false);
            }
        }
    };

    const filteredLeagues = leagues.filter(l =>
        l.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        l.country.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="monitoring-console animate-fade-in">
            <header className="monitoring-header">
                <button onClick={() => window.history.back()} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', textAlign: 'left', fontSize: '1rem', marginBottom: '10px' }}>
                    ← Back to Hub
                </button>
                <span className="badge">Intelligence Infrastructure</span>
                <h1>Active Analysis Matrix</h1>
                <p>Granular control over real-time match monitoring and odds synchronization.</p>
            </header>

            <div className="ml-status-bar" style={{
                background: 'rgba(30, 41, 59, 0.7)',
                padding: '20px',
                borderRadius: '16px',
                marginBottom: '20px',
                border: '1px solid rgba(255,255,255,0.05)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                    <div className={`status-indicator-big ${mlStatus.is_training ? 'pulse' : ''}`} style={{
                        width: '50px',
                        height: '50px',
                        borderRadius: '12px',
                        background: mlStatus.is_training ? '#6366f1' : '#10b981',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: mlStatus.is_training ? '0 0 20px rgba(99, 102, 241, 0.4)' : 'none'
                    }}>
                        {mlStatus.is_training ? '⏳' : '🧠'}
                    </div>
                    <div>
                        <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#fff' }}>
                            {mlStatus.is_training ? 'Model Retraining in Progress...' : 'ML Environment: Stable'}
                        </h3>
                        <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: '#94a3b8' }}>
                            Last Optimized: {mlStatus.last_trained ? new Date(mlStatus.last_trained).toLocaleString() : 'Never'}
                        </p>
                    </div>
                </div>
                <button
                    className={`btn-retrain ${mlStatus.is_training ? 'disabled' : ''}`}
                    onClick={handleRetrain}
                    disabled={mlStatus.is_training}
                    style={{
                        padding: '10px 20px',
                        borderRadius: '8px',
                        background: mlStatus.is_training ? '#475569' : '#6366f1',
                        color: '#fff',
                        fontWeight: 'bold',
                        border: 'none',
                        cursor: mlStatus.is_training ? 'not-allowed' : 'pointer'
                    }}
                >
                    {mlStatus.is_training ? 'Processing...' : '⚡ Retrain Model'}
                </button>
            </div>

            <div className="monitoring-controls">
                <div className="search-box-v3">
                    <input
                        type="text"
                        placeholder="Filter by league or territory..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <div className="bulk-actions">
                    <button className="btn-monitoring elite" onClick={handleEliteEnable}>
                        Enable Elite Protocols
                    </button>
                    <button className="btn-monitoring disable" onClick={() => setLeagues(prev => prev.map(l => ({ ...l, is_live_enabled: 0 })))}>
                        Global Deactivation
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="flex items-center justify-center p-20">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
                </div>
            ) : (
                <div className="monitoring-grid">
                    {filteredLeagues.length === 0 ? (
                        <div className="empty-monitoring">
                            <h3>No matches found in this sector.</h3>
                            <p>Try adjusting your search parameters.</p>
                        </div>
                    ) : (
                        filteredLeagues.map(league => (
                            <div
                                key={league.league_id}
                                className={`league-monitor-card ${league.is_live_enabled ? 'active' : ''}`}
                            >
                                <div className="card-top">
                                    <img
                                        src={league.logo_url}
                                        alt={league.name}
                                        className="league-logo-v3"
                                        onError={(e) => e.target.src = '/placeholder-league.png'}
                                    />
                                    <div className="league-info-v3">
                                        <span className="league-country-v3">{league.country}</span>
                                        <h3>{league.name}</h3>
                                    </div>
                                </div>

                                <div className="monitor-toggle">
                                    <span className="toggle-label">
                                        {league.is_live_enabled ? 'LIVE MONITORING ACTIVE' : 'MONITORING STANDBY'}
                                    </span>
                                    <label className="switch">
                                        <input
                                            type="checkbox"
                                            checked={!!league.is_live_enabled}
                                            onChange={() => handleToggle(league.league_id, !!league.is_live_enabled)}
                                            disabled={updatingIds.has(league.league_id)}
                                        />
                                        <span className="slider"></span>
                                    </label>
                                </div>

                                <div className="card-stats">
                                    <div className="stat-box">
                                        <span className="stat-lbl">Analysis Priority</span>
                                        <span className="stat-val" style={{ color: league.is_live_enabled ? '#818cf8' : '#475569' }}>
                                            {league.is_live_enabled ? 'HIGH' : 'LOW'}
                                        </span>
                                    </div>
                                    <div className="stat-box">
                                        <span className="stat-lbl">Live Now</span>
                                        <span className={`stat-val ${league.live_now > 0 ? 'live' : ''}`}>
                                            {league.live_now > 0 && <div className="live-dot"></div>}
                                            {league.live_now} Fixtures
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
};

export default MonitoringConsole;
