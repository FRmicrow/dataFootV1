import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import './SeasonOverviewPage.css';

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

    // UI State
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                // Determine which year to fetch (latest if not provided)
                let targetYear = year;

                if (!year) {
                    const res = await axios.get(`/api/v3/leagues/${id}/seasons`);
                    const imported = res.data.filter(s => s.imported_players === 1);
                    if (imported.length > 0) {
                        targetYear = imported[0].season_year;
                        navigate(`/v3/league/${id}/season/${targetYear}`, { replace: true });
                        return; // Let the next cycle handle it
                    } else {
                        throw new Error("No imported seasons found for this league.");
                    }
                }

                // 1. Fetch Overview (Leaders & Simulated Table + Available Years)
                const res = await axios.get(`/api/v3/league/${id}/season/${targetYear}`);
                setData(res.data);

                // 2. Fetch Real Standings
                const stRes = await axios.get(`/api/v3/league/${id}/standings?year=${targetYear}`);
                setStandings(stRes.data);

                // 3. Fetch Fixtures
                const fixRes = await axios.get(`/api/v3/league/${id}/fixtures?year=${targetYear}`);
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
                const res = await axios.get(`/api/v3/league/${id}/season/${year}/team/${selectedTeamId}/squad`);
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
        navigate(`/v3/league/${id}/season/${newYear}`);
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
            <button onClick={() => navigate('/v3/import')} className="btn-v3-primary">Try Import Tool</button>
        </div>
    );

    if (!data) return null;

    const { league, standings: simulatedStandings, topScorers, topAssists, availableYears } = data;

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
                    <div className="dash-grid animate-slide-up">
                        <div className="dash-card card-standings">
                            <div className="card-title">
                                <span>Simulated Performance</span>
                                <span className="subtitle">Proxy data from player stats</span>
                            </div>
                            <table className="standings-table">
                                <thead>
                                    <tr>
                                        <th className="col-rank">#</th>
                                        <th>Team</th>
                                        <th>Goals</th>
                                        <th>Assists</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {simulatedStandings.slice(0, 10).map((team, index) => (
                                        <tr key={team.team_id}>
                                            <td className="col-rank">{index + 1}</td>
                                            <td className="col-team">
                                                <img src={team.team_logo} alt="" className="team-mini-logo" />
                                                {team.team_name}
                                            </td>
                                            <td className="stat-val stat-primary">{team.total_goals}</td>
                                            <td className="stat-val">{team.total_assists}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            <div className="view-more-hint">Showing top 10 teams by goals. Use Standings tab for official ranking.</div>
                        </div>

                        <aside className="top-performers">
                            {/* Golden Boot */}
                            <div className="dash-card performer-card">
                                <div className="card-title">🥇 Golden Boot</div>
                                <div className="player-list">
                                    {topScorers.map((player, idx) => (
                                        <Link to={`/v3/player/${player.player_id}`} key={player.player_id} className="player-row-mini">
                                            <div className="p-rank">{idx + 1}</div>
                                            <img src={player.photo_url} alt="" className="p-photo" />
                                            <div className="p-info">
                                                <div className="p-name">{player.player_name}</div>
                                                <div className="p-team">{player.team_name}</div>
                                            </div>
                                            <div className="p-stat">
                                                <span className="p-val">{player.goals_total}</span>
                                                <span className="p-lbl">G</span>
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            </div>

                            {/* Top Assists */}
                            <div className="dash-card performer-card">
                                <div className="card-title">🅰️ Top Assists</div>
                                <div className="player-list">
                                    {topAssists.map((player, idx) => (
                                        <Link to={`/v3/player/${player.player_id}`} key={player.player_id} className="player-row-mini">
                                            <div className="p-rank">{idx + 1}</div>
                                            <img src={player.photo_url} alt="" className="p-photo" />
                                            <div className="p-info">
                                                <div className="p-name">{player.player_name}</div>
                                                <div className="p-team">{player.team_name}</div>
                                            </div>
                                            <div className="p-stat">
                                                <span className="p-val">{player.goals_assists}</span>
                                                <span className="p-lbl">A</span>
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        </aside>
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
                            Object.entries(groupMap).map(([groupName, teams]) => (
                                <div key={groupName} className="dash-card standing-group">
                                    <h3 className="group-title">{groupName}</h3>
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
                                                        <Link to={`/v3/team/${t.team_id}`} className="team-link">
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
                                    <div key={f.fixture_id} className="match-row">
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
                                ))
                            )}
                        </div>
                    </div>
                )}
                {/* 4. SQUADS TAB */}
                {activeTab === 'squads' && (
                    <div className="squads-container animate-slide-up">
                        <div className="squads-layout">
                            <aside className="team-sidebar">
                                <h3>Participating Teams</h3>
                                <div className="team-list-nav">
                                    {simulatedStandings.map(team => (
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
                                        <p>Select a team to view their roster</p>
                                    </div>
                                ) : squadLoading ? (
                                    <div className="squad-loading">
                                        <div className="spinner-mini"></div>
                                        <p>Loading roster...</p>
                                    </div>
                                ) : (
                                    <div className="roster-view">
                                        <div className="roster-header">
                                            <h2>{simulatedStandings.find(t => t.team_id === selectedTeamId)?.team_name} Roster</h2>
                                            <span className="squad-count">{teamSquad.length} Players</span>
                                        </div>
                                        <div className="roster-grid">
                                            {teamSquad.map(player => (
                                                <Link to={`/player/${player.player_id}`} key={player.player_id} className="player-card-v3">
                                                    <div className="p-photo-wrap">
                                                        <img src={player.photo_url} alt={player.name} />
                                                        <div className="p-pos-badge">{player.position}</div>
                                                    </div>
                                                    <div className="p-main-info">
                                                        <div className="p-name">{player.name}</div>
                                                        <div className="p-details">Age: {player.age}</div>
                                                    </div>
                                                    <div className="p-stats-row">
                                                        <div className="p-stat">
                                                            <span className="val">{player.appearances}</span>
                                                            <span className="lbl">Apps</span>
                                                        </div>
                                                        <div className="p-stat">
                                                            <span className="val">{player.goals}</span>
                                                            <span className="lbl">Goals</span>
                                                        </div>
                                                    </div>
                                                </Link>
                                            ))}
                                        </div>
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
