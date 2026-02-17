import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import MatchDetailLineups from './MatchDetailLineups';
import MatchDetailEvents from './MatchDetailEvents';
import './MatchDetailPage.css';

const MatchDetailPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    const [fixture, setFixture] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeTab, setActiveTab] = useState('lineups'); // Default to new feature

    useEffect(() => {
        fetchFixture();
    }, [id]);

    const fetchFixture = async () => {
        try {
            setLoading(true);
            const res = await axios.get(`/api/v3/fixtures/${id}`);
            setFixture(res.data);
        } catch (e) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="v3-loading">Loading Match Data...</div>;
    if (error) return <div className="v3-error">Error: {error}</div>;
    if (!fixture) return <div className="v3-error">Fixture not found.</div>;

    const {
        home_name, home_logo, away_name, away_logo,
        goals_home, goals_away, status_short, match_date,
        league_name, league_logo
    } = fixture;

    const dateStr = new Date(match_date).toLocaleString();

    return (
        <div className="match-detail-page fade-in">
            {/* Header Section */}
            <div className="match-header-card">
                <div className="league-info">
                    <img src={league_logo} alt={league_name} className="league-icon-sm" />
                    <span>{league_name}</span>
                    <span className="match-date">{dateStr}</span>
                </div>

                <div className="score-board">
                    <div className="team home">
                        <img src={home_logo} alt={home_name} className="team-logo-lg" />
                        <h2 className="team-name">{home_name}</h2>
                    </div>

                    <div className="score-display">
                        <span className="score">{goals_home ?? '-'}</span>
                        <span className="divider">:</span>
                        <span className="score">{goals_away ?? '-'}</span>
                        <div className="match-status">{status_short}</div>
                    </div>

                    <div className="team away">
                        <img src={away_logo} alt={away_name} className="team-logo-lg" />
                        <h2 className="team-name">{away_name}</h2>
                    </div>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="match-tabs">
                <button
                    className={`tab-btn ${activeTab === 'lineups' ? 'active' : ''}`}
                    onClick={() => setActiveTab('lineups')}
                >
                    Lineups
                </button>
                <button
                    className={`tab-btn ${activeTab === 'events' ? 'active' : ''}`}
                    onClick={() => setActiveTab('events')}
                >
                    Match Events
                </button>
                <button
                    className={`tab-btn ${activeTab === 'stats' ? 'active' : ''}`}
                    onClick={() => setActiveTab('stats')}
                >
                    Statistics
                </button>
            </div>

            {/* Content Area */}
            <div className="match-content">
                {activeTab === 'lineups' && (
                    <MatchDetailLineups fixtureId={id} />
                )}
                {activeTab === 'events' && (
                    <MatchDetailEvents fixtureId={id} />
                )}
                {activeTab === 'stats' && (
                    <div className="placeholder-tab">
                        <h3>Match Statistics</h3>
                        <p>Possession, Shots, etc.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default MatchDetailPage;
