import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import MatchDetailLineups from './MatchDetailLineups';
import MatchDetailEvents from './MatchDetailEvents';
import MatchDetailTactical from './MatchDetailTactical';
import MatchDetailPlayerVisuals from './MatchDetailPlayerVisuals';
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
            const res = await api.getFixture(id);
            setFixture(res);
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
        goals_home, goals_away, status_short, date,
        league_name, league_logo
    } = fixture;

    const dateStr = date ? new Date(date).toLocaleString() : '';

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
                    Events
                </button>
                <button
                    className={`tab-btn ${activeTab === 'tactical' ? 'active' : ''}`}
                    onClick={() => setActiveTab('tactical')}
                >
                    Team Stats
                </button>
                <button
                    className={`tab-btn ${activeTab === 'player_intel' ? 'active' : ''}`}
                    onClick={() => setActiveTab('player_intel')}
                >
                    Player Intel
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
                {activeTab === 'tactical' && (
                    <MatchDetailTactical fixtureId={id} />
                )}
                {activeTab === 'player_intel' && (
                    <MatchDetailPlayerVisuals fixtureId={id} />
                )}
            </div>
        </div>
    );
};

export default MatchDetailPage;
