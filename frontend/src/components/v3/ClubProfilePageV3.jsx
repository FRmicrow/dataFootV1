import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams, useNavigate, Link } from 'react-router-dom';
import './ClubProfilePageV3.css';

const ClubProfilePageV3 = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [selectedYear, setSelectedYear] = useState(null);
    const [roster, setRoster] = useState([]);

    useEffect(() => {
        const fetchClubProfile = async () => {
            setLoading(true);
            try {
                const res = await axios.get(`/api/club/${id}`);
                setData(res.data);
                setRoster(res.data.roster);
                setSelectedYear(res.data.rosterYear);
            } catch (error) {
                console.error("Failed to load club profile:", error);
            }
            setLoading(false);
        };
        fetchClubProfile();
    }, [id]);

    const handleYearChange = async (year) => {
        setSelectedYear(year);
        try {
            const res = await axios.get(`/api/club/${id}?year=${year}`);
            setRoster(res.data.roster);
        } catch (error) {
            console.error("Failed to load roster:", error);
        }
    };

    // Group roster by position
    const rosterByPosition = roster.reduce((acc, player) => {
        const pos = player.position || 'Unknown';
        if (!acc[pos]) acc[pos] = [];
        acc[pos].push(player);
        return acc;
    }, {});

    const positionOrder = ['Goalkeeper', 'Defender', 'Midfielder', 'Attacker', 'Unknown'];
    const sortedPositions = positionOrder.filter(p => rosterByPosition[p]?.length > 0);

    if (loading) return (
        <div className="club-profile-premium loading-state">
            <div className="spinner-v3"></div>
            <p>Gathering club data...</p>
        </div>
    );

    if (!data || !data.club) return (
        <div className="club-profile-premium error-state">
            <h2>Club Not Found</h2>
            <Link to="/search" className="back-link">← Return to Universe</Link>
        </div>
    );

    const { club, seasons, availableYears } = data;

    return (
        <div className="club-profile-premium">
            {/* Ultra Hero Section */}
            <section className="club-ultra-hero">
                <div className="hero-background-fx">
                    <div className="fx-circle"></div>
                    <div className="fx-mesh"></div>
                </div>

                <div className="hero-content">
                    <div className="hero-top">
                        <Link to="/search" className="hero-back-hint">Discovery / Clubs / {club.name}</Link>
                    </div>

                    <div className="hero-main">
                        <div className="club-identifier">
                            <div className="club-crest-container">
                                <div className="crest-glow"></div>
                                <img
                                    src={club.logo_url}
                                    alt={club.name}
                                    className="club-crest-large"
                                    onError={(e) => { e.target.src = 'https://media.api-sports.io/football/teams/0.png'; }}
                                />
                            </div>
                            <div className="club-identity-info">
                                <div className="club-tag-row">
                                    <span className="club-country-tag">🇪🇸 {club.country}</span>
                                    {club.founded && <span className="club-year-tag">Est. {club.founded}</span>}
                                </div>
                                <h1 className="club-title-big">{club.name}</h1>
                                <div className="club-venue-row">
                                    <span className="icon">🏛️</span>
                                    <span>{club.venue_name}</span>
                                    {club.venue_city && <span className="dot">•</span>}
                                    <span>{club.venue_city}</span>
                                </div>
                            </div>
                        </div>

                        <div className="hero-stats-panel">
                            <div className="h-stat-card">
                                <span className="h-val">{seasons.length}</span>
                                <span className="h-label">Tournaments</span>
                            </div>
                            <div className="h-stat-card">
                                <span className="h-val">{availableYears.length}</span>
                                <span className="h-label">Active Years</span>
                            </div>
                            <div className="h-stat-card">
                                <span className="h-val">{roster.length}</span>
                                <span className="h-label">Squad Size</span>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <div className="profile-grid">
                {/* Left Column: Seasons History */}
                <div className="profile-main-column">
                    <section className="profile-panel-v3">
                        <div className="panel-header">
                            <span className="p-icon">📊</span>
                            <h2>Season Performance</h2>
                        </div>
                        <div className="premium-table-container">
                            <table className="premium-compact-table">
                                <thead>
                                    <tr>
                                        <th>Season</th>
                                        <th>Competition</th>
                                        <th className="center">Apps</th>
                                        <th className="center">Goals</th>
                                        <th className="center">AST</th>
                                        <th className="center">Rating</th>
                                        <th></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {seasons.map((s, i) => (
                                        <tr key={i}>
                                            <td className="year-cell">{s.season_year}</td>
                                            <td className="league-cell-premium">
                                                <div className="l-box">
                                                    {s.league_logo && <img src={s.league_logo} alt="" />}
                                                    <span>{s.league_name}</span>
                                                </div>
                                            </td>
                                            <td className="center stat-num">{s.total_appearances || 0}</td>
                                            <td className="center stat-num high">{s.total_goals || 0}</td>
                                            <td className="center stat-num">{s.total_assists || 0}</td>
                                            <td className="center">
                                                <span className={`rating-pill-v3 ${parseFloat(s.avg_rating) >= 7 ? 'gold' : ''}`}>
                                                    {s.avg_rating || '-'}
                                                </span>
                                            </td>
                                            <td className="right">
                                                <Link to={`/league/${s.league_id}/season/${s.season_year}`} className="btn-view-sm">
                                                    Analyze →
                                                </Link>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </section>
                </div>

                {/* Right Column: Venue & Squad Mini Map */}
                <div className="profile-side-column">
                    <section className="profile-panel-v3 venue-panel">
                        <div className="panel-header">
                            <span className="p-icon">🏟️</span>
                            <h2>Venue Details</h2>
                        </div>
                        {club.venue_image && (
                            <div className="venue-img-wrap">
                                <img src={club.venue_image} alt="" className="venue-img-full" />
                                <div className="img-overlay"></div>
                            </div>
                        )}
                        <div className="venue-info-list">
                            <div className="v-info-item">
                                <span className="v-label">Name</span>
                                <span className="v-value">{club.venue_name}</span>
                            </div>
                            <div className="v-info-item">
                                <span className="v-label">Capacity</span>
                                <span className="v-value">{club.venue_capacity?.toLocaleString()} seats</span>
                            </div>
                            <div className="v-info-item">
                                <span className="v-label">Surface</span>
                                <span className="v-value">{club.venue_surface}</span>
                            </div>
                        </div>
                    </section>

                    <section className="profile-panel-v3 squad-selector-panel">
                        <div className="panel-header">
                            <span className="p-icon">👥</span>
                            <h2>Squad Selection</h2>
                            <select
                                className="premium-select-v3"
                                value={selectedYear || ''}
                                onChange={(e) => handleYearChange(parseInt(e.target.value))}
                            >
                                {availableYears.map(y => (
                                    <option key={y} value={y}>{y} / {y + 1}</option>
                                ))}
                            </select>
                        </div>
                        <p className="squad-info-p">Viewing roster and stats for the {selectedYear} / {selectedYear + 1} campaign.</p>
                    </section>
                </div>
            </div>

            {/* Roster Full Width Section */}
            <section className="profile-panel-v3 roster-full-section">
                <div className="panel-header">
                    <span className="p-icon">🏃</span>
                    <h2>Active Roster ({selectedYear})</h2>
                </div>

                <div className="premium-roster-layout">
                    {sortedPositions.map(position => (
                        <div key={position} className="pos-group-v3">
                            <div className="pos-group-header">
                                <span className={`pos-indicator ${position.toLowerCase()}`}></span>
                                <h3>{position}s</h3>
                                <span className="pos-count">{rosterByPosition[position].length}</span>
                            </div>
                            <div className="pos-grid-v3">
                                {rosterByPosition[position].map(player => (
                                    <div
                                        key={`${player.player_id}-${player.league_name}`}
                                        className="premium-player-card"
                                        onClick={() => navigate(`/player/${player.player_id}`)}
                                    >
                                        <div className="p-photo-v3">
                                            <img
                                                src={player.photo_url || ''}
                                                alt=""
                                                onError={(e) => { e.target.src = 'https://media.api-sports.io/football/players/0.png'; }}
                                            />
                                        </div>
                                        <div className="p-data-v3">
                                            <div className="p-name">{player.name}</div>
                                            <div className="p-meta">{player.nationality}</div>
                                            <div className="p-stats-row">
                                                <div className="p-stat"><strong>{player.appearances || 0}</strong> APP</div>
                                                <div className="p-stat high"><strong>{player.goals || 0}</strong> GLS</div>
                                                <div className="p-stat"><strong>{player.assists || 0}</strong> AST</div>
                                                {player.rating && (
                                                    <div className="p-stat rating">
                                                        <span className={parseFloat(player.rating) >= 7 ? 'good' : ''}>
                                                            {parseFloat(player.rating).toFixed(1)}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </section>
        </div>
    );
};

export default ClubProfilePageV3;
