import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../../../services/api';
import MatchDetailLineups from '../../modules/match/MatchDetailLineups';
import MatchDetailEvents from '../../modules/match/MatchDetailEvents';
import MatchDetailTactical from '../../modules/match/MatchDetailTactical';
import MatchDetailPlayerVisuals from '../../modules/match/MatchDetailPlayerVisuals';
import { PageLayout, PageHeader, PageContent } from '../../layouts';
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

    const breadcrumbs = [
        { label: 'Universe', path: '/leagues' },
        { label: league_name, path: `/league/${fixture.league_id}` },
        { label: `${home_name} vs ${away_name}`, active: true }
    ];

    return (
        <PageLayout className="match-detail-page fade-in">
            <PageHeader
                title={`${home_name} vs ${away_name}`}
                subtitle={`${league_name} • ${dateStr}`}
                breadcrumbs={breadcrumbs}
                extra={
                    <div className="match-header-card">
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
                }
            />

            <PageContent>

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
            </PageContent>
        </PageLayout>
    );
};

export default MatchDetailPage;
