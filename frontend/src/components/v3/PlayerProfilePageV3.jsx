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

    const { player, career } = data;
    const careerList = Array.isArray(career) ? career : [];

    // Group career by season
    const careerBySeason = careerList.reduce((acc, curr) => {
        const season = curr.season_year;
        if (!acc[season]) acc[season] = [];
        acc[season].push(curr);
        return acc;
    }, {});

    const sortedSeasons = Object.keys(careerBySeason).sort((a, b) => b - a);

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
                        </div>
                    </div>
                </div>

                <div className="hero-stats-overview">
                    <div className="overview-stat">
                        <span className="val">{careerList.reduce((sum, s) => sum + (s.goals_total || 0), 0)}</span>
                        <span className="lbl">Total Goals</span>
                    </div>
                    <div className="overview-stat">
                        <span className="val">{careerList.reduce((sum, s) => sum + (s.games_appearences || 0), 0)}</span>
                        <span className="lbl">Appearances</span>
                    </div>
                </div>
            </header>

            <div className="profile-grid">
                {/* Career History Table */}
                <main className="career-history">
                    <div className="section-title">
                        <span className="icon">🏟️</span>
                        <h2>Career History</h2>
                    </div>

                    {sortedSeasons.map(season => {
                        const seasonStats = careerBySeason[season];
                        // Sub-group by category
                        const byCategory = seasonStats.reduce((acc, curr) => {
                            const cat = curr.league_type || 'Other';
                            if (!acc[cat]) acc[cat] = [];
                            acc[cat].push(curr);
                            return acc;
                        }, {});

                        return (
                            <div key={season} className="season-block">
                                <div className="season-header">
                                    <span className="year">{season} / {parseInt(season) + 1}</span>
                                </div>

                                {Object.entries(byCategory).map(([category, rows]) => (
                                    <div key={category} className="category-group">
                                        <div className="category-header">{category}</div>
                                        <div className="career-table-container">
                                            <table className="career-table">
                                                <thead>
                                                    <tr>
                                                        <th>Team</th>
                                                        <th>Competition</th>
                                                        <th className="center">Apps</th>
                                                        <th className="center">G</th>
                                                        <th className="center">A</th>
                                                        <th className="center">Yel</th>
                                                        <th className="center">Red</th>
                                                        <th className="center">Rating</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {rows.map((row, idx) => (
                                                        <tr key={`${season}-${category}-${idx}`}>
                                                            <td className="team-cell">
                                                                <img src={row.team_logo} alt="" className="mini-logo" />
                                                                <span className="name">{row.team_name}</span>
                                                            </td>
                                                            <td className="league-cell">
                                                                <span className="cat-label">
                                                                    {row.league_name}
                                                                </span>
                                                            </td>
                                                            <td className="center stat-important">{row.games_appearences}</td>
                                                            <td className="center stat-important goals">{row.goals_total}</td>
                                                            <td className="center">{row.goals_assists}</td>
                                                            <td className="center">
                                                                <span className="card yellow">{row.cards_yellow}</span>
                                                            </td>
                                                            <td className="center">
                                                                <span className="card red">{row.cards_red}</span>
                                                            </td>
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
                                ))}
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
                        </div>
                    </div>
                </aside>
            </div>
        </div>
    );
};

export default PlayerProfilePageV3;
