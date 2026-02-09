import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import './ClubDetailPage.css';

const ClubDetailPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    const [club, setClub] = useState(null);
    const [activeTab, setActiveTab] = useState('squad');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Squad State
    const [selectedSeason, setSelectedSeason] = useState('');
    const [availableSeasons, setAvailableSeasons] = useState([]);
    const [squad, setSquad] = useState([]);
    const [squadLoading, setSquadLoading] = useState(false);

    // History State
    const [history, setHistory] = useState([]);
    const [historyLoading, setHistoryLoading] = useState(false);

    // Trophies State
    const [trophies, setTrophies] = useState([]);
    const [trophiesLoading, setTrophiesLoading] = useState(false);

    useEffect(() => {
        const fetchInitialData = async () => {
            setLoading(true);
            try {
                const res = await axios.get(`/api/clubs/${id}`);
                setClub(res.data);

                // Fetch seasons to initialize squad view
                const playersRes = await axios.get(`/api/teams/${id}/players`);
                if (playersRes.data.seasons && playersRes.data.seasons.length > 0) {
                    setAvailableSeasons(playersRes.data.seasons);
                    setSelectedSeason(playersRes.data.seasons[0]);
                }

                setError(null);
            } catch (err) {
                console.error("Error fetching club data:", err);
                setError(err.response?.data?.error || "Failed to load club details.");
            } finally {
                setLoading(false);
            }
        };

        fetchInitialData();
    }, [id]);

    // Load Tab Data
    useEffect(() => {
        if (activeTab === 'squad' && selectedSeason) {
            loadSquad(selectedSeason);
        } else if (activeTab === 'history') {
            loadHistory();
        } else if (activeTab === 'trophies') {
            loadTrophies();
        }
    }, [activeTab, selectedSeason, id]);

    const loadSquad = async (season) => {
        setSquadLoading(true);
        try {
            const res = await axios.get(`/api/team/${id}/season/${season}`);
            setSquad(res.data.stats || []);
        } catch (err) {
            console.error("Error loading squad:", err);
        } finally {
            setSquadLoading(false);
        }
    };

    const loadHistory = async () => {
        setHistoryLoading(true);
        try {
            const res = await axios.get(`/api/clubs/${id}/history`);
            setHistory(res.data || []);
        } catch (err) {
            console.error("Error loading history:", err);
        } finally {
            setHistoryLoading(false);
        }
    };

    const loadTrophies = async () => {
        setTrophiesLoading(true);
        try {
            const res = await axios.get(`/api/clubs/${id}/trophies`);
            setTrophies(res.data || []);
        } catch (err) {
            console.error("Error loading trophies:", err);
        } finally {
            setTrophiesLoading(false);
        }
    };

    if (loading) return <div className="club-portal-loading"><div className="portal-spinner"></div><p>Activating Command Center...</p></div>;
    if (error) return <div className="portal-error"><h2>⚠️ Error</h2><p>{error}</p><Link to="/football-data" className="btn-back">Back to Discovery</Link></div>;
    if (!club) return null;

    return (
        <div className="club-command-center">
            {/* Back Button */}
            <div className="portal-nav-top">
                <button onClick={() => navigate(-1)} className="btn-icon-back">← League Hub</button>
            </div>

            {/* HERO SECTION - Identity Card */}
            <header className="club-hero">
                <div className="hero-glass-card">
                    <div className="hero-main">
                        <div className="club-logo-outer">
                            <img src={club.club_logo_url} alt={club.club_name} className="club-hero-logo" />
                        </div>
                        <div className="club-identity">
                            <h1 className="club-name-giant">{club.club_name}</h1>
                            <div className="club-badges">
                                <span className="badge-item">
                                    <img src={club.country_flag} alt="" className="tiny-flag" />
                                    {club.country_name}
                                </span>
                                {club.founded_year && <span className="badge-item">EST. {club.founded_year}</span>}
                            </div>
                        </div>
                    </div>

                    <div className="hero-stats-grid">
                        <div className="id-stat">
                            <span className="id-label">STADIUM</span>
                            <span className="id-value">{club.stadium_name || 'Unknown'}</span>
                        </div>
                        <div className="id-stat">
                            <span className="id-label">CITY</span>
                            <span className="id-value">{club.city || 'Unknown'}</span>
                        </div>
                        <div className="id-stat">
                            <span className="id-label">CAPACITY</span>
                            <span className="id-value">{club.stadium_capacity ? club.stadium_capacity.toLocaleString() : 'N/A'}</span>
                        </div>
                    </div>
                </div>
            </header>

            {/* TAB SYSTEM */}
            <nav className="portal-tabs">
                <button
                    className={`nav-tab ${activeTab === 'squad' ? 'active' : ''}`}
                    onClick={() => setActiveTab('squad')}
                >
                    🛡️ SQUAD SESSIONS
                </button>
                <button
                    className={`nav-tab ${activeTab === 'history' ? 'active' : ''}`}
                    onClick={() => setActiveTab('history')}
                >
                    📈 PERFORMANCE HISTORY
                </button>
                <button
                    className={`nav-tab ${activeTab === 'trophies' ? 'active' : ''}`}
                    onClick={() => setActiveTab('trophies')}
                >
                    🏆 TROPHY ROOM
                </button>
            </nav>

            {/* CONTENT AREA */}
            <main className="tab-content-area">
                {activeTab === 'squad' && (
                    <div className="squad-tab-view animate-fadeIn">
                        <div className="view-controls">
                            <h3>Current Roster</h3>
                            <div className="season-picker">
                                <label>Season:</label>
                                <select value={selectedSeason} onChange={(e) => setSelectedSeason(e.target.value)}>
                                    {availableSeasons.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </div>
                        </div>

                        {squadLoading ? (
                            <div className="tab-loading">Loading Roster...</div>
                        ) : (
                            <SquadGrid squad={squad} />
                        )}
                    </div>
                )}

                {activeTab === 'history' && (
                    <div className="history-tab-view animate-fadeIn">
                        <h2 className="section-title">Competition Timeline</h2>
                        {historyLoading ? (
                            <div className="tab-loading">Loading timeline...</div>
                        ) : (
                            <div className="history-list">
                                {history.length > 0 ? history.map((item, idx) => (
                                    <div key={idx} className="history-entry-card">
                                        <div className="history-year">{item.season}</div>
                                        <div className="history-info">
                                            <Link to={`/competition/${item.competition_id}`} className="history-comp">
                                                {item.competition_name || 'Generic Competition'}
                                            </Link>
                                            <div className="history-stats">
                                                <span>👥 {item.squad_size} Players</span>
                                                <span>🥅 {item.total_goals} Goals</span>
                                                <span>🅰️ {item.total_assists} Assists</span>
                                            </div>
                                        </div>
                                    </div>
                                )) : <p className="no-data">No history found.</p>}
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'trophies' && (
                    <div className="trophy-tab-view animate-fadeIn">
                        <h2 className="section-title">Trophy Cabinet</h2>
                        {trophiesLoading ? (
                            <div className="tab-loading">Unlocking cabinet...</div>
                        ) : (
                            <div className="trophy-grid">
                                {trophies.length > 0 ? trophies.map((trophy, idx) => (
                                    <div key={idx} className="trophy-card">
                                        <div className="trophy-icon">
                                            {trophy.competition_logo_url ? (
                                                <img src={trophy.competition_logo_url} alt="" />
                                            ) : (
                                                <span className="trophy-emoji">🏆</span>
                                            )}
                                        </div>
                                        <div className="trophy-details">
                                            <div className="trophy-name">{trophy.competition_name}</div>
                                            <div className="trophy-year">{trophy.season}</div>
                                            {trophy.is_runner_up ? (
                                                <span className="status-runnerup">Finalist</span>
                                            ) : (
                                                <span className="status-winner">Winner</span>
                                            )}
                                        </div>
                                    </div>
                                )) : (
                                    <div className="empty-cabinet">
                                        <div className="empty-icon">🏛️</div>
                                        <p>This cabinet is awaiting its first major honors.</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </main>
        </div>
    );
};

const SquadGrid = ({ squad }) => {
    // Categorize by position
    const categorized = {
        'Goalkeeper': squad.filter(p => p.position === 'Goalkeeper'),
        'Defender': squad.filter(p => p.position === 'Defender' || p.position?.includes('Back')),
        'Midfielder': squad.filter(p => p.position === 'Midfielder'),
        'Forward': squad.filter(p => p.position === 'Forward' || p.position === 'Attacker' || p.position?.includes('Striker') || p.position?.includes('Winger'))
    };

    // Any others
    const others = squad.filter(p => !Object.values(categorized).flat().map(x => x.player_id).includes(p.player_id));
    if (others.length > 0) categorized['Others'] = others;

    return (
        <div className="squad-explorer">
            {Object.entries(categorized).map(([pos, players]) => (
                players.length > 0 && (
                    <div key={pos} className="position-section">
                        <h4 className="pos-header">{pos}s</h4>
                        <div className="squad-cards-grid">
                            {players.map(player => (
                                <Link to={`/player/${player.player_id}`} key={player.player_id} className="mini-player-card">
                                    <div className="mp-header">
                                        <div className="mp-photo-wrap">
                                            <img src={player.photo_url || '/placeholder-player.png'} alt="" className="mp-photo" />
                                        </div>
                                        <div className="mp-info">
                                            <div className="mp-name">{player.first_name} {player.last_name}</div>
                                            <div className="mp-pos">{player.position}</div>
                                        </div>
                                    </div>
                                    <div className="mp-stats">
                                        <div className="m-stat">
                                            <span className="ms-val">{player.matches_played}</span>
                                            <span className="ms-lbl">MP</span>
                                        </div>
                                        <div className="m-stat">
                                            <span className="ms-val">{player.goals}</span>
                                            <span className="ms-lbl">G</span>
                                        </div>
                                        <div className="m-stat">
                                            <span className="ms-val">{player.assists}</span>
                                            <span className="ms-lbl">A</span>
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>
                )
            ))}
        </div>
    );
};

export default ClubDetailPage;
