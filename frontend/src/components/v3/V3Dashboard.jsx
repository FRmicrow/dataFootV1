import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { Link } from 'react-router-dom';
import './V3Dashboard.css';

const V3Dashboard = () => {
    const [stats, setStats] = useState({ leagues: 0, players: 0, teams: 0, importedSeasons: 0 });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const data = await api.getStats();
                setStats(data);
            } catch (error) {
                console.error("Failed to load V3 stats", error);
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
    }, []);

    return (
        <div className="v3-dashboard-page">
            <header className="v3-header">
                <h1>V3 Infrastructure Overview</h1>
                <p>Status of the new schema migration.</p>
            </header>

            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-label">Leagues</div>
                    <div className="stat-value">{stats.leagues}</div>
                </div>
                <div className="stat-card">
                    <div className="stat-label">Teams</div>
                    <div className="stat-value">{stats.teams}</div>
                </div>
                <div className="stat-card">
                    <div className="stat-label">Player Profiles</div>
                    <div className="stat-value">{stats.players.toLocaleString()}</div>
                </div>
                <div className="stat-card highlight">
                    <div className="stat-label">Fully Imported Seasons</div>
                    <div className="stat-value">{stats.importedSeasons}</div>
                </div>
            </div>

            <div className="actions-section">
                <h3>Quick Actions</h3>
                <div className="actions-grid">
                    <Link to="/import" className="action-card import">
                        <span className="icon">📥</span>
                        <div className="action-details">
                            <h4>Import Data</h4>
                            <p>Launch the new multi-threaded importer.</p>
                        </div>
                    </Link>
                    <Link to="/leagues" className="action-card explore">
                        <span className="icon">🏆</span>
                        <div className="action-details">
                            <h4>Explore Leagues</h4>
                            <p>Browse imported competition data.</p>
                        </div>
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default V3Dashboard;
