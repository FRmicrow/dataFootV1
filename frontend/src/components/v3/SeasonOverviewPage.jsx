import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import MatchDetailEvents from './MatchDetailEvents';
import InlineFixtureDetails from './InlineFixtureDetails';
import axios from 'axios';
import './SeasonOverviewPage.css';
import './SeasonOverviewPage_Events.css';

const SeasonOverviewPage = () => {
    const { id, year } = useParams();
    const navigate = useNavigate();

    const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'standings', 'fixtures'
    const [selectedTeamId, setSelectedTeamId] = useState(null);
    const [teamSquad, setTeamSquad] = useState([]);
    const [squadLoading, setSquadLoading] = useState(false);

    // Season Data State
    const [data, setData] = useState(null);
    const [standings, setStandings] = useState([]);
    const [fixturesData, setFixturesData] = useState({ fixtures: [], rounds: [] });
    const [selectedRound, setSelectedRound] = useState('');

    // Dynamic Standings State (US-40)
    const [rangeStart, setRangeStart] = useState(1);
    const [rangeEnd, setRangeEnd] = useState(38);
    const [isDynamicMode, setIsDynamicMode] = useState(false);

    // Fixture Events State (US-Feature request)
    const [expandedFixtureId, setExpandedFixtureId] = useState(null);
    const [fixtureEvents, setFixtureEvents] = useState({}); // Cache: { fixtureId: [events] }
    const [loadingEvents, setLoadingEvents] = useState({}); // { fixtureId: boolean }

    // UI State
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Squad Explorer State (US-008)
    const [explorerTeamId, setExplorerTeamId] = useState('');
    const [explorerPosition, setExplorerPosition] = useState('ALL');
    const [explorerPlayers, setExplorerPlayers] = useState([]);
    const [explorerLoading, setExplorerLoading] = useState(false);

    useEffect(() => {
        const fetchExplorerData = async () => {
            if (activeTab !== 'overview') return;
            setExplorerLoading(true);
            try {
                const res = await axios.get(`/api/league/${id}/season/${year}/players`, {
                    params: { teamId: explorerTeamId, position: explorerPosition }
                });
                setExplorerPlayers(res.data);
            } catch (err) {
                console.error("Failed to fetch explorer players:", err);
            } finally {
                setExplorerLoading(false);
            }
        };
        if (id && year) fetchExplorerData();
    }, [id, year, activeTab, explorerTeamId, explorerPosition]);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                // Determine which year to fetch (latest if not provided)
                let targetYear = year;

                if (!year) {
                    const res = await axios.get(`/api/leagues/${id}/seasons`);
                    const seasonsList = res.data.seasons || [];
                    const imported = seasonsList.filter(s => s.imported_players === 1);
                    if (imported.length > 0) {
                        targetYear = imported[0].season_year;
                        navigate(`/league/${id}/season/${targetYear}`, { replace: true });
                        return; // Let the next cycle handle it
                    } else {
                        throw new Error("No imported seasons found for this league.");
                    }
                }

                // 1. Fetch Overview (Leaders & Simulated Table + Available Years)
                const res = await axios.get(`/api/league/${id}/season/${targetYear}`);
                setData(res.data);

                // 2. Fetch Real Standings
                const stRes = await axios.get(`/api/league/${id}/standings?year=${targetYear}`);
                setStandings(stRes.data);

                // Auto-set max round based on data (US-40 Refinement)
                if (stRes.data && stRes.data.length > 0) {
                    const maxPlayed = Math.max(...stRes.data.map(t => t.played));
                    // Only set if user hasn't touched it (heuristic: if it's default 38 or very high)
                    // Or just always set it on fresh load if not dynamic mode
                    if (!isDynamicMode) {
                        setRangeEnd(maxPlayed || 38);
                    }
                }

                // 3. Fetch Fixtures
                const fixRes = await axios.get(`/api/league/${id}/fixtures?year=${targetYear}`);
                setFixturesData(fixRes.data || { fixtures: [], rounds: [] });
                if (fixRes.data?.rounds?.length > 0) {
                    setSelectedRound(fixRes.data.rounds[0]);
                }

            } catch (err) {
                console.error("Error fetching season analytics:", err);
                setError(err.response?.data?.error || err.message || "Failed to load dashboard.");
            } finally {
                setLoading(false);
            }
        };

        if (id) {
            fetchData();
        }
    }, [id, year, navigate]);

    useEffect(() => {
        const fetchSquad = async () => {
            if (!selectedTeamId || activeTab !== 'squads') return;
            setSquadLoading(true);
            try {
                const res = await axios.get(`/api/league/${id}/season/${year}/team/${selectedTeamId}/squad`);
                setTeamSquad(res.data);
            } catch (err) {
                console.error("Failed to fetch squad:", err);
            } finally {
                setSquadLoading(false);
            }
        };
        fetchSquad();
    }, [selectedTeamId, id, year, activeTab]);

    const handleSeasonChange = (e) => {
        const newYear = e.target.value;
        navigate(`/league/${id}/season/${newYear}`);
    };

    const handleFixtureToggle = async (fixtureId) => {
        if (expandedFixtureId === fixtureId) {
            setExpandedFixtureId(null);
            return;
        }

        setExpandedFixtureId(fixtureId);

        // Check cache
        if (fixtureEvents[fixtureId]) return;

        // Fetch events
        setLoadingEvents(prev => ({ ...prev, [fixtureId]: true }));
        try {
            const res = await axios.get(`/api/fixtures/${fixtureId}/events`);
            setFixtureEvents(prev => ({ ...prev, [fixtureId]: res.data }));
        } catch (err) {
            console.error(`Failed to fetch events for fixture ${fixtureId}`, err);
        } finally {
            setLoadingEvents(prev => ({ ...prev, [fixtureId]: false }));
        }
    };

    const handleRangeUpdate = async () => {
        setIsDynamicMode(true);
        setLoading(true);
        try {
            const res = await axios.get('/api/standings/dynamic', {
                params: {
                    league_id: id,
                    season: year,
                    from_round: rangeStart,
                    to_round: rangeEnd
                }
            });
            const dynamicData = res.data.map(t => ({
                ...t,
                group_name: `Custom Range (Rounds ${rangeStart}-${rangeEnd})`
            }));
            setStandings(dynamicData);
        } catch (err) {
            console.error("Dynamic fetch failed", err);
            setError("Failed to update standings.");
        } finally {
            setLoading(false);
        }
    };

    const renderEventIcon = (type, detail) => {
        if (type === 'Goal') return '⚽';
        if (type === 'Card') {
            if (detail === 'Yellow Card') return '🟨';
            if (detail === 'Red Card') return '🟥';
            return '🎴';
        }
        if (type === 'subst') return '⇄';
        if (type === 'Var') return '📺';
        return '•';
    };

    if (loading) return (
        <div className="v3-dashboard loading-state">
            <div className="spinner"></div>
            <p>Gathering V3 Intelligence...</p>
        </div>
    );

    if (error) return (
        <div className="v3-dashboard error-state">
            <h2>⚠️ Analytics Offline</h2>
            <p>{error}</p>
            <button onClick={() => navigate('/import')} className="btn-v3-primary">Try Import Tool</button>
        </div>
    );

    if (!data) return null;

    const { league, standings: simulatedStandings, topScorers, topAssists, topRated, availableYears } = data;

    // Group real standings by group_name
    const groupMap = standings.reduce((acc, curr) => {
        const group = curr.group_name || 'Standings';
        if (!acc[group]) acc[group] = [];
        acc[group].push(curr);
        return acc;
    }, {});

    const filteredFixtures = fixturesData.fixtures.filter(f => f.round === selectedRound);

    return (
        <div className="v3-dashboard animate-fade-in">
            {/* Header */}
            <header className="dash-header">
                <div className="league-identity">
                    <img src={league.logo_url} alt={league.league_name} className="league-logo-large" />
                    <div className="league-meta">
                        <div className="v3-badge-mini">V3 ANALYTICS</div>
                        <h1>{league.league_name}</h1>
                        <div className="country-badge">
                            <img src={league.flag_url} alt="" className="tiny-flag" width="20" />
                            {league.country_name}
                        </div>
                    </div>
                </div>

                <div className="season-selector">
                    <label>ARCHIVE EXPLORER</label>
                    <select value={year} onChange={handleSeasonChange}>
                        {(availableYears || [year]).map(y => (
                            <option key={y} value={y}>{y} / {parseInt(y) + 1}</option>
                        ))}
                    </select>
                </div>
            </header>

            {/* Navigation Tabs */}
            <nav className="dash-tabs">
                <button
                    className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
                    onClick={() => setActiveTab('overview')}
                >
                    💎 Overview
                </button>
                <button
                    className={`tab-btn ${activeTab === 'standings' ? 'active' : ''}`}
                    onClick={() => setActiveTab('standings')}
                >
                    📊 Standings
                </button>
                <button
                    className={`tab-btn ${activeTab === 'fixtures' ? 'active' : ''}`}
                    onClick={() => setActiveTab('fixtures')}
                >
                    📅 Results
                </button>
                <button
                    className={`tab-btn ${activeTab === 'squads' ? 'active' : ''}`}
                    onClick={() => setActiveTab('squads')}
                >
                    👥 Team Squads
                </button>
            </nav>

            <div className="dash-content">

                {/* 1. OVERVIEW TAB */}
                {activeTab === 'overview' && (
                    <div className="overview-tab-content animate-slide-up">

                        <div className="dash-grid">
                            {/* Squad Explorer (US-008) */}
                            <div className="dash-card squad-explorer">
                                <div className="card-header-flex">
                                    <div className="card-title">
                                        <span>🔍 Squad Explorer</span>
                                        <span className="subtitle">Filter and analyze player performance across the league</span>
                                    </div>
                                    <div className="explorer-filters">
                                        <select
                                            value={explorerTeamId}
                                            onChange={(e) => setExplorerTeamId(e.target.value)}
                                            className="v3-select-mini"
                                        >
                                            <option value="">All Teams</option>
                                            {standings.map(t => (
                                                <option key={t.team_id} value={t.team_id}>{t.team_name}</option>
                                            ))}
                                        </select>
                                        <select
                                            value={explorerPosition}
                                            onChange={(e) => setExplorerPosition(e.target.value)}
                                            className="v3-select-mini"
                                        >
                                            <option value="ALL">All Positions</option>
                                            <option value="Goalkeeper">Goalkeepers</option>
                                            <option value="Defender">Defenders</option>
                                            <option value="Midfielder">Midfielders</option>
                                            <option value="Attacker">Attackers</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="explorer-table-wrapper">
                                    {explorerLoading ? (
                                        <div className="table-loader">
                                            <div className="spinner-mini"></div>
                                            <p>Querying V3 Dataset...</p>
                                        </div>
                                    ) : (
                                        <table className="explorer-table">
                                            <thead>
                                                <tr>
                                                    <th>Player</th>
                                                    <th>Team</th>
                                                    <th className="center">Pos</th>
                                                    <th className="center">Apps</th>
                                                    <th className="center">Mins</th>
                                                    <th className="center">G</th>
                                                    <th className="center">A</th>
                                                    <th className="center">Y</th>
                                                    <th className="center">R</th>
                                                    <th className="center">Rating</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {explorerPlayers.slice(0, 15).map(player => (
                                                    <tr key={player.player_id}>
                                                        <td className="p-cell">
                                                            <Link to={`/player/${player.player_id}`} className="p-link">
                                                                <img src={player.photo_url} alt="" className="p-img-tiny" />
                                                                <span>{player.name}</span>
                                                            </Link>
                                                        </td>
                                                        <td className="t-cell">
                                                            <div className="t-info-mini">
                                                                <img src={player.team_logo} alt="" className="t-img-tiny" />
                                                                <span>{player.team_name}</span>
                                                            </div>
                                                        </td>
                                                        <td className="center pos-badge">{player.position?.substring(0, 3).toUpperCase()}</td>
                                                        <td className="center">{player.appearances}</td>
                                                        <td className="center">{player.minutes}'</td>
                                                        <td className="center highlight-goals">{player.goals}</td>
                                                        <td className="center">{player.assists}</td>
                                                        <td className="center">{player.yellow}</td>
                                                        <td className="center">{player.red}</td>
                                                        <td className="center">
                                                            <span className={`rating-chip ${parseFloat(player.rating) > 7.5 ? 'elite' : ''}`}>
                                                                {player.rating || 'N/A'}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    )}
                                    <div className="view-more-hint">Showing top 15 results. Refine filters for more specific data.</div>
                                </div>
                            </div>

                            <div className="leaders-column">
                                {/* Golden Boot Section */}
                                <div className="leaders-section">
                                    <h3 className="section-hdr">🥇 Golden Boot</h3>
                                    <div className="leader-cards-grid">
                                        {topScorers.slice(0, 3).map((player, idx) => (
                                            <Link to={`/player/${player.player_id}`} key={player.player_id} className={`leader-card rank-${idx + 1}`}>
                                                <div className="p-badge">#{idx + 1}</div>
                                                <div className="p-photo-container">
                                                    <img src={player.photo_url} alt="" className="p-photo" />
                                                </div>
                                                <div className="p-info">
                                                    <div className="p-name">{player.player_name}</div>
                                                    <div className="p-team">{player.team_name}</div>
                                                    <div className="p-micro-stats">{player.appearances} Apps</div>
                                                </div>
                                                <div className="p-stat-large">
                                                    <span className="val">{player.goals_total}</span>
                                                    <span className="lbl">Goals</span>
                                                </div>
                                            </Link>
                                        ))}
                                    </div>
                                </div>

                                {/* Top Assists Section */}
                                <div className="leaders-section">
                                    <h3 className="section-hdr">🅰️ Top Playmakers</h3>
                                    <div className="leader-cards-grid">
                                        {topAssists.slice(0, 3).map((player, idx) => (
                                            <Link to={`/player/${player.player_id}`} key={player.player_id} className={`leader-card rank-${idx + 1}`}>
                                                <div className="p-badge">#{idx + 1}</div>
                                                <div className="p-photo-container">
                                                    <img src={player.photo_url} alt="" className="p-photo" />
                                                </div>
                                                <div className="p-info">
                                                    <div className="p-name">{player.player_name}</div>
                                                    <div className="p-team">{player.team_name}</div>
                                                    <div className="p-micro-stats">{player.appearances} Apps</div>
                                                </div>
                                                <div className="p-stat-large">
                                                    <span className="val">{player.goals_assists}</span>
                                                    <span className="lbl">Assists</span>
                                                </div>
                                            </Link>
                                        ))}
                                    </div>
                                </div>
                                {/* Top Rated Section */}
                                <div className="leaders-section">
                                    <h3 className="section-hdr">✨ MVP Candidates</h3>
                                    <div className="leader-cards-grid">
                                        {(topRated || []).slice(0, 3).map((player, idx) => (
                                            <Link to={`/player/${player.player_id}`} key={player.player_id} className={`leader-card rank-${idx + 1}`}>
                                                <div className="p-badge">#{idx + 1}</div>
                                                <div className="p-photo-container">
                                                    <img src={player.photo_url} alt="" className="p-photo" />
                                                </div>
                                                <div className="p-info">
                                                    <div className="p-name">{player.player_name}</div>
                                                    <div className="p-team">{player.team_name}</div>
                                                    <div className="p-micro-stats">{player.appearances} Apps</div>
                                                </div>
                                                <div className="p-stat-large">
                                                    <span className="val">{player.games_rating}</span>
                                                    <span className="lbl">Rating</span>
                                                </div>
                                            </Link>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Squad Directory Section */}
                        <div className="squad-directory-section">
                            <div className="section-header-v3">
                                <span className="icon">👥</span>
                                <h2>Participating Squads Directory</h2>
                            </div>
                            <div className="squads-accordion-grid">
                                {simulatedStandings.map(team => (
                                    <div key={team.team_id} className={`squad-accordion-item ${selectedTeamId === team.team_id ? 'expanded' : ''}`}>
                                        <div
                                            className="team-accordion-header"
                                            onClick={() => setSelectedTeamId(selectedTeamId === team.team_id ? null : team.team_id)}
                                        >
                                            <div className="team-meta">
                                                <img src={team.team_logo} alt="" className="team-logo-acc" />
                                                <span className="team-name-acc">{team.team_name}</span>
                                                <span className="player-count-acc">{team.squad_size} Players</span>
                                            </div>
                                            <div className="accordion-toggle">
                                                {selectedTeamId === team.team_id ? '−' : '+'}
                                            </div>
                                        </div>

                                        {selectedTeamId === team.team_id && (
                                            <div className="squad-content-inline animate-slide-down">
                                                {squadLoading ? (
                                                    <div className="inline-loader">Initializing roster matrix...</div>
                                                ) : (
                                                    <div className="roster-inline-grid">
                                                        {teamSquad.map(player => (
                                                            <Link to={`/player/${player.player_id}`} key={player.player_id} className="roster-item-mini">
                                                                <img src={player.photo_url} alt="" className="mini-photo" />
                                                                <div className="mini-p-info">
                                                                    <div className="name">{player.name}</div>
                                                                    <div className="pos">{player.position}</div>
                                                                </div>
                                                                <div className="mini-p-stats">
                                                                    <span>{player.appearances} GP</span>
                                                                    <span className="primary">{player.goals} G</span>
                                                                </div>
                                                            </Link>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* 2. STANDINGS TAB */}
                {activeTab === 'standings' && (
                    <div className="standings-container animate-slide-up">

                        {Object.keys(groupMap).length === 0 ? (
                            <div className="empty-state">
                                <span className="icon">📊</span>
                                <h3>No Standing Data</h3>
                                <p>Ingest real standings from API-Football to see the official table.</p>
                            </div>
                        ) : (
                            Object.entries(groupMap).map(([groupName, teams], idx) => (
                                <div key={groupName} className="dash-card standing-group">
                                    <h3 className="group-title">{groupName}</h3>

                                    {/* Dynamic Controls (US-40) */}
                                    {idx === 0 && (
                                        <div className="standings-filters-bar">
                                            <div className="v3-input-group">
                                                <div className="input-label-addon">From</div>
                                                <input
                                                    type="number"
                                                    min="1"
                                                    max="50"
                                                    value={rangeStart}
                                                    onChange={e => setRangeStart(e.target.value)}
                                                    className="v3-input-control"
                                                />
                                            </div>

                                            <div className="v3-input-group">
                                                <div className="input-label-addon">To</div>
                                                <input
                                                    type="number"
                                                    min="1"
                                                    max="50"
                                                    value={rangeEnd}
                                                    onChange={e => setRangeEnd(e.target.value)}
                                                    className="v3-input-control"
                                                />
                                            </div>

                                            <button
                                                onClick={handleRangeUpdate}
                                                className="btn-v3-primary"
                                            >
                                                Apply
                                            </button>

                                            {isDynamicMode && (
                                                <button
                                                    onClick={() => window.location.reload()}
                                                    className="btn-v3-secondary"
                                                >
                                                    Reset
                                                </button>
                                            )}
                                        </div>
                                    )}
                                    <table className="v3-table standings-real">
                                        <thead>
                                            <tr>
                                                <th>R</th>
                                                <th>Team</th>
                                                <th>P</th>
                                                <th>W</th>
                                                <th>D</th>
                                                <th>L</th>
                                                <th>+/-</th>
                                                <th>Pts</th>
                                                <th className="hide-mobile">Form</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {teams.map(t => (
                                                <tr key={t.team_id} className={t.status ? `status-${t.status.toLowerCase().replace(/\s+/g, '-')}` : ''}>
                                                    <td className="rank-cell">
                                                        <span className={`rank-indicator ${t.rank <= 3 ? 'top' : ''}`}>{t.rank}</span>
                                                    </td>
                                                    <td className="team-cell">
                                                        <Link to={`/team/${t.team_id}`} className="team-link">
                                                            <img src={t.team_logo} alt="" className="team-mini-logo" />
                                                            <span className="team-name">{t.team_name}</span>
                                                        </Link>
                                                    </td>
                                                    <td className="stat-p">{t.played}</td>
                                                    <td className="stat-w">{t.win}</td>
                                                    <td className="stat-d">{t.draw}</td>
                                                    <td className="stat-l">{t.lose}</td>
                                                    <td className="stat-diff">{t.goals_diff > 0 ? `+${t.goals_diff}` : t.goals_diff}</td>
                                                    <td className="stat-pts">{t.points}</td>
                                                    <td className="hide-mobile">
                                                        <div className="form-dots">
                                                            {t.form?.split('').map((char, i) => (
                                                                <span key={i} className={`dot dot-${char.toLowerCase()}`}>{char}</span>
                                                            ))}
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ))
                        )}
                    </div>
                )}

                {/* 3. FIXTURES TAB */}
                {activeTab === 'fixtures' && (
                    <div className="fixtures-container animate-slide-up">
                        <div className="round-navigator">
                            <label>MATCH DAY</label>
                            <div className="round-scroller">
                                {fixturesData.rounds.map(round => (
                                    <button
                                        key={round}
                                        className={`round-btn ${selectedRound === round ? 'active' : ''}`}
                                        onClick={() => setSelectedRound(round)}
                                    >
                                        {round.replace('Regular Season - ', 'Day ')}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="match-list">
                            {filteredFixtures.length === 0 ? (
                                <div className="empty-state">No fixtures found for this round.</div>
                            ) : (
                                filteredFixtures.map(f => (
                                    <div key={f.fixture_id} className={`match-card ${expandedFixtureId === f.fixture_id ? 'expanded' : ''}`}>
                                        <div className="match-row" onClick={() => handleFixtureToggle(f.fixture_id)}>
                                            <div className="m-time">
                                                {new Date(f.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                                <br />
                                                <span className="m-hour">{new Date(f.date).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}</span>
                                            </div>
                                            <div className="m-team home">
                                                <span className="m-name">{f.home_team_name}</span>
                                                <img src={f.home_team_logo} alt="" />
                                            </div>
                                            <div className="m-score">
                                                {f.status_short === 'FT' || f.status_short === 'AET' || f.status_short === 'PEN' ? (
                                                    <div className="final-score">
                                                        <span className="score-val">{f.goals_home}</span>
                                                        <span className="score-sep">-</span>
                                                        <span className="score-val">{f.goals_away}</span>
                                                    </div>
                                                ) : (
                                                    <div className="live-status">
                                                        <span className="m-status">{f.status_short}</span>
                                                        {f.elapsed && <span className="m-elapsed">{f.elapsed}'</span>}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="m-team away">
                                                <img src={f.away_team_logo} alt="" />
                                                <span className="m-name">{f.away_team_name}</span>
                                            </div>
                                            <div className="m-venue-info hide-mobile">
                                                <span className="v-name">{f.venue_name}</span>
                                                <span className="v-city">{f.venue_city}</span>
                                            </div>
                                        </div>

                                        {/* Expanded Events Panel */}
                                        {expandedFixtureId === f.fixture_id && (
                                            <div className="match-events-panel">
                                                <InlineFixtureDetails
                                                    fixtureId={f.fixture_id}
                                                    homeTeamId={f.home_team_id}
                                                    awayTeamId={f.away_team_id}
                                                />
                                            </div>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}

                {/* 4. SQUADS TAB (Keeping for legacy/direct access if needed, but Consolidated on Overview now) */}
                {activeTab === 'squads' && (
                    <div className="squads-container animate-slide-up">
                        <div className="squads-layout">
                            <aside className="team-sidebar">
                                <h3>Participating Teams</h3>
                                <div className="team-list-nav">
                                    {(standings || []).map(team => (
                                        <button
                                            key={team.team_id}
                                            className={`team-nav-btn ${selectedTeamId === team.team_id ? 'active' : ''}`}
                                            onClick={() => setSelectedTeamId(team.team_id)}
                                        >
                                            <img src={team.team_logo} alt="" />
                                            <span>{team.team_name}</span>
                                        </button>
                                    ))}
                                </div>
                            </aside>

                            <main className="squad-detail">
                                {!selectedTeamId ? (
                                    <div className="empty-squad-state">
                                        <span className="icon">👥</span>
                                        <p>Select a team to view their detailed roster</p>
                                    </div>
                                ) : squadLoading ? (
                                    <div className="squad-loading">
                                        <div className="spinner-mini"></div>
                                        <p>Assembling squad data...</p>
                                    </div>
                                ) : (
                                    <div className="roster-view">
                                        <div className="roster-header">
                                            <div className="team-brand">
                                                <img src={standings.find(t => t.team_id === selectedTeamId)?.team_logo} alt="" className="team-logo-main" />
                                                <h2>{standings.find(t => t.team_id === selectedTeamId)?.team_name} Roster</h2>
                                            </div>
                                            <span className="squad-count-badge">{teamSquad.length} Players</span>
                                        </div>

                                        {['Goalkeeper', 'Defender', 'Midfielder', 'Attacker'].map(pos => {
                                            const filtered = teamSquad.filter(p => p.position === pos).sort((a, b) => b.appearances - a.appearances);
                                            if (filtered.length === 0) return null;

                                            return (
                                                <div key={pos} className="position-section">
                                                    <h3 className="pos-group-title">{pos}s</h3>
                                                    <div className="mini-card-grid">
                                                        {filtered.map(player => (
                                                            <Link to={`/player/${player.player_id}`} key={player.player_id} className="player-mini-card">
                                                                <div className="p-avatar-wrap">
                                                                    <img src={player.photo_url} alt="" className="p-avatar" />
                                                                    {player.rating && <div className="p-rating-tag">{player.rating}</div>}
                                                                </div>
                                                                <div className="p-info">
                                                                    <div className="p-name">{player.name}</div>
                                                                    <div className="p-activity">
                                                                        <div className="activity-bar">
                                                                            <div className="bar-fill" style={{ width: `${Math.min((player.minutes / 3420) * 100, 100)}%` }}></div>
                                                                        </div>
                                                                        <span className="activity-text">{player.appearances} Apps</span>
                                                                    </div>
                                                                    <div className="p-key-stats">
                                                                        {pos === 'Attacker' ? (
                                                                            <>
                                                                                <span className="stat">{player.goals} ⚽</span>
                                                                                <span className="stat">{player.assists} 🅰️</span>
                                                                            </>
                                                                        ) : pos === 'Goalkeeper' ? (
                                                                            <>
                                                                                <span className="stat">Clean Sheets: TBD</span>
                                                                            </>
                                                                        ) : (
                                                                            <>
                                                                                <span className="stat">{player.minutes}' Mins</span>
                                                                            </>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </Link>
                                                        ))}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </main>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
};

export default SeasonOverviewPage;
