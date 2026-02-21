import React, { useState, useEffect } from 'react';
import api from '../../../services/api';

const LeagueEmpowermentGrid = ({ onLog, selectedLeagues = [], onSelectLeague }) => {
    const [leagues, setLeagues] = useState([]);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState({}); // { leagueId: true/false }

    const fetchInventory = async () => {
        try {
            setLoading(true);
            const data = await api.getMlInventory();
            setLeagues(data);
        } catch (err) {
            console.error('Failed to fetch ML inventory:', err);
            if (onLog) onLog(`[Error] Failed to load league inventory: ${err.message}`, 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchInventory();
    }, []);

    const handleEmpower = async (leagueId, force = false) => {
        if (processing[leagueId]) return;

        try {
            setProcessing(prev => ({ ...prev, [leagueId]: true }));
            const res = await api.empowerLeague(leagueId, force);
            if (onLog) onLog(`[Info] Empowerment started for league ${leagueId}. Check logs for progress.`, 'info');

            // Poll for status update or just refresh after a second
            setTimeout(fetchInventory, 2000);
        } catch (err) {
            if (onLog) onLog(`[Error] Empowerment failed for league ${leagueId}: ${err.message}`, 'error');
        } finally {
            setProcessing(prev => ({ ...prev, [leagueId]: false }));
        }
    };

    if (loading && leagues.length === 0) {
        return <div className="loading-grid">Loading league intelligence status...</div>;
    }

    return (
        <div className="league-empowerment-grid">
            <div className="grid-header">
                <div style={{ width: '30px' }}></div>
                <div>League</div>
                <div>Country</div>
                <div>Status (Processed / Total)</div>
                <div>Progress</div>
                <div>Actions</div>
            </div>
            {leagues.map(league => (
                <div key={league.id} className="grid-row">
                    <div className="league-selection">
                        <input
                            type="checkbox"
                            checked={selectedLeagues.includes(league.id)}
                            onChange={() => onSelectLeague(league.id)}
                            title="Include in next training run"
                        />
                    </div>
                    <div className="league-identity">
                        {league.logo && <img src={league.logo} alt="" className="league-logo-small" />}
                        <span className="league-name">{league.name}</span>
                    </div>
                    <div className="league-country">{league.country}</div>
                    <div className="league-stats">
                        <span className="processed">{league.processed.toLocaleString()}</span>
                        <span className="divider">/</span>
                        <span className="total">{league.total.toLocaleString()}</span>
                    </div>
                    <div className="league-progress-container">
                        <div className="progress-bar-bg">
                            <div
                                className="progress-bar-fill"
                                style={{ width: `${league.percent}%`, backgroundColor: league.percent === 100 ? '#10b981' : '#6366f1' }}
                            ></div>
                        </div>
                        <span className="progress-text">{league.percent}%</span>
                    </div>
                    <div className="league-actions">
                        <button
                            className={`btn-action empower ${processing[league.id] ? 'loading' : ''}`}
                            onClick={() => handleEmpower(league.id)}
                            disabled={processing[league.id] || league.percent === 100}
                            title="Empower new matches (Delta logic)"
                        >
                            {processing[league.id] ? '...' : (league.percent === 100 ? '✅ Locked' : '⚡ Empower')}
                        </button>
                        <button
                            className="btn-action rebuild"
                            onClick={() => {
                                if (window.confirm(`Force rebuild for ${league.name}? This will clear ALL cached features for this league.`)) {
                                    handleEmpower(league.id, true);
                                }
                            }}
                            disabled={processing[league.id]}
                            title="Clear store and rebuild from scratch"
                        >
                            🔄
                        </button>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default LeagueEmpowermentGrid;
