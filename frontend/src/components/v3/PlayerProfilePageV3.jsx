import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import './PlayerProfilePageV3.css';

const PlayerProfilePageV3 = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchPlayerProfile = async () => {
            setLoading(true);
            try {
                const res = await axios.get(`/api/v3/player/${id}`);
                setData(res.data);
            } catch (err) {
                console.error("Error fetching player profile:", err);
                setError(err.response?.data?.error || "Failed to load player profile.");
            } finally {
                setLoading(false);
            }
        };

        if (id) {
            fetchPlayerProfile();
        }
    }, [id]);

    const [careerView, setCareerView] = useState('year'); // 'year', 'club', 'country'

    if (loading) return (
        <div className="v3-player-profile loading-state">
            <div className="spinner"></div>
            <p>Scanning V3 Biological Data...</p>
        </div>
    );

    if (error) return (
        <div className="v3-player-profile error-state">
            <h2>⚠️ Data Link Lost</h2>
            <p>{error}</p>
            <button onClick={() => navigate(-1)} className="btn-v3">Return</button>
        </div>
    );

    if (!data) return null;

    const { player, career, clubTotals } = data;
    const careerList = Array.isArray(career) ? career : [];

    // View Logic (US-010)
    let groupedCareer = {};
    let sortedKeys = [];

    if (careerView === 'year') {
        groupedCareer = careerList.reduce((acc, curr) => {
            const key = curr.season_year;
            if (!acc[key]) acc[key] = [];
            acc[key].push(curr);
            return acc;
        }, {});
        sortedKeys = Object.keys(groupedCareer).sort((a, b) => b - a);
    } else if (careerView === 'club') {
        groupedCareer = careerList.reduce((acc, curr) => {
            const key = curr.team_name;
            if (!acc[key]) acc[key] = { rows: [], logo: curr.team_logo, id: curr.team_id, latest: 0 };
            acc[key].rows.push(curr);
            if (curr.season_year > acc[key].latest) acc[key].latest = curr.season_year;
            return acc;
        }, {});
        sortedKeys = Object.keys(groupedCareer).sort((a, b) => groupedCareer[b].latest - groupedCareer[a].latest);
    } else if (careerView === 'country') {
        groupedCareer = careerList.reduce((acc, curr) => {
            const key = curr.country_name || 'International';
            if (!acc[key]) acc[key] = { rows: [], flag: curr.country_flag, latest: 0 };
            acc[key].rows.push(curr);
            if (curr.season_year > acc[key].latest) acc[key].latest = curr.season_year;
            return acc;
        }, {});
        sortedKeys = Object.keys(groupedCareer).sort((a, b) => groupedCareer[b].latest - groupedCareer[a].latest);
    }

    return (
        <div className="v3-player-profile animate-fade-in">
            {/* Premium Hero Section */}
            <header className="player-hero">
                <div className="hero-content">
                    <div className="player-photo-container">
                        <img src={player.photo_url} alt={player.name} className="hero-photo" />
                        <div className="photo-glow"></div>
                    </div>

                    <div className="player-main-info">
                        <div className="v3-badge">V3 PLAYER PROFILE</div>
                        <h1 className="player-name">{player.name}</h1>
                        <div className="player-meta-badges">
                            <span className="meta-badge">
                                <span className="label">Nationality</span>
                                <span className="value nationality-val">
                                    {player.nationality_flag && <img src={player.nationality_flag} alt="" className="mini-flag" />}
                                    {player.nationality}
                                </span>
                            </span>
                            <span className="meta-badge">
                                <span className="label">Age</span>
                                <span className="value">{player.age}</span>
                            </span>
                            <span className="meta-badge">
                                <span className="label">Height</span>
                                <span className="value">{player.height || 'N/A'}</span>
                            </span>
                            <span className="meta-badge">
                                <span className="label">Weight</span>
                                <span className="value">{player.weight || 'N/A'}</span>
                            </span>
                            <span className="meta-badge">
                                <span className="label">Foot</span>
                                <span className="value foot-val">{player.preferred_foot || 'N/A'}</span>
                            </span>
                        </div>
                    </div>
                </div>

                <div className="hero-stats-overview">
                    <div className="overview-stat">
                        <span className="val">{careerList.reduce((sum, s) => sum + (s.games_appearences || 0), 0)}</span>
                        <span className="lbl">Appearances</span>
                    </div>
                    <div className="overview-stat">
                        <span className="val">{careerList.reduce((sum, s) => sum + (s.goals_total || 0), 0)}</span>
                        <span className="lbl">Total Goals</span>
                    </div>
                    <div className="overview-stat highlight">
                        <span className="val">{(careerList.reduce((sum, s) => sum + (parseFloat(s.games_rating) || 0), 0) / (careerList.filter(s => s.games_rating).length || 1)).toFixed(2)}</span>
                        <span className="lbl">Avg Rating</span>
                    </div>
                </div>
            </header>

            <div className="profile-grid">
                {/* Career History Table */}
                <main className="career-history">
                    {/* Club Totals Section (US-010) */}
                    <div className="dash-card club-totals-card animate-slide-up">
                        <div className="card-title">🛡️ Club Career Totals</div>
                        <table className="club-totals-table">
                            <thead>
                                <tr>
                                    <th>Club</th>
                                    <th className="center">Matches</th>
                                    <th className="center">Goals</th>
                                    <th className="center">Assists</th>
                                    <th className="center">Avg Rating</th>
                                </tr>
                            </thead>
                            <tbody>
                                {clubTotals.sort((a, b) => b.total_matches - a.total_matches).map(club => (
                                    <tr key={club.team_id}>
                                        <td className="team-cell">
                                            <img src={club.team_logo} alt="" className="mini-logo" />
                                            <span>{club.team_name}</span>
                                        </td>
                                        <td className="center">{club.total_matches}</td>
                                        <td className="center highlight-goals">{club.total_goals}</td>
                                        <td className="center">{club.total_assists}</td>
                                        <td className="center">
                                            <span className="rating-badge-mini">{club.avg_rating}</span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="section-header-flex">
                        <div className="section-title">
                            <span className="icon">🏟️</span>
                            <h2>Career History</h2>
                        </div>
                        <div className="view-switcher">
                            <button className={careerView === 'year' ? 'active' : ''} onClick={() => setCareerView('year')}>By Year</button>
                            <button className={careerView === 'club' ? 'active' : ''} onClick={() => setCareerView('club')}>By Club</button>
                            <button className={careerView === 'country' ? 'active' : ''} onClick={() => setCareerView('country')}>By Country</button>
                        </div>
                    </div>

                    {sortedKeys.map(key => {
                        const content = groupedCareer[key];
                        const rows = Array.isArray(content) ? content : content.rows;

                        return (
                            <div key={key} className="career-group-block">
                                <div className="group-header">
                                    {careerView === 'year' && <span className="key-val">{key} / {parseInt(key) + 1}</span>}
                                    {careerView === 'club' && (
                                        <div className="club-key">
                                            <img src={content.logo} alt="" className="key-img" />
                                            <span className="key-val">{key}</span>
                                        </div>
                                    )}
                                    {careerView === 'country' && (
                                        <div className="country-key">
                                            {content.flag && <img src={content.flag} alt="" className="key-img-flag" />}
                                            <span className="key-val">{key}</span>
                                        </div>
                                    )}
                                </div>

                                <div className="career-table-container">
                                    <table className="career-table">
                                        <thead>
                                            <tr>
                                                {careerView !== 'club' && <th>Team</th>}
                                                <th>Competition</th>
                                                {careerView !== 'year' && <th>Season</th>}
                                                <th className="center">Apps</th>
                                                <th className="center">G</th>
                                                <th className="center">A</th>
                                                <th className="center">Rating</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {rows.sort((a, b) => b.season_year - a.season_year).map((row, idx) => (
                                                <tr key={`${key}-${idx}`}>
                                                    {careerView !== 'club' && (
                                                        <td className="team-cell">
                                                            <img src={row.team_logo} alt="" className="mini-logo" />
                                                            <span>{row.team_name}</span>
                                                        </td>
                                                    )}
                                                    <td className="league-cell">
                                                        <Link to={`/v3/league/${row.league_id}/season/${row.season_year}`} className="league-link">
                                                            {row.league_name}
                                                        </Link>
                                                    </td>
                                                    {careerView !== 'year' && <td className="season-cell">{row.season_year}</td>}
                                                    <td className="center stat-important">{row.games_appearences}</td>
                                                    <td className="center stat-important goals">{row.goals_total}</td>
                                                    <td className="center">{row.goals_assists}</td>
                                                    <td className="center">
                                                        <span className="rating-badge" style={{
                                                            background: parseFloat(row.games_rating) > 7.5 ? 'rgba(16, 185, 129, 0.2)' :
                                                                parseFloat(row.games_rating) > 6.8 ? 'rgba(59, 130, 246, 0.2)' : 'rgba(100, 116, 139, 0.2)',
                                                            color: parseFloat(row.games_rating) > 7.5 ? '#10b981' :
                                                                parseFloat(row.games_rating) > 6.8 ? '#3b82f6' : '#94a3b8'
                                                        }}>
                                                            {row.games_rating || 'N/A'}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        );
                    })}
                </main>

                {/* Sidebar Info */}
                <aside className="player-sidebar">
                    <div className="dash-card">
                        <div className="card-title">Bio Details</div>
                        <div className="bio-list">
                            <div className="bio-item">
                                <span className="lbl">Birth Date</span>
                                <span className="val">{player.birth_date || 'Unknown'}</span>
                            </div>
                            <div className="bio-item">
                                <span className="lbl">Birth Place</span>
                                <span className="val">{player.birth_place ? `${player.birth_place}, ${player.birth_country}` : 'Unknown'}</span>
                            </div>
                            <div className="bio-item">
                                <span className="lbl">Nationality</span>
                                <span className="val">{player.nationality}</span>
                            </div>
                            <div className="bio-item">
                                <span className="lbl">Height</span>
                                <span className="val">{player.height}</span>
                            </div>
                            <div className="bio-item">
                                <span className="lbl">Weight</span>
                                <span className="val">{player.weight}</span>
                            </div>
                            <div className="bio-item">
                                <span className="lbl">Preferred Foot</span>
                                <span className="val">{player.preferred_foot || 'N/A'}</span>
                            </div>
                        </div>
                    </div>
                </aside>
            </div>
        </div>
    );
};

export default PlayerProfilePageV3;
