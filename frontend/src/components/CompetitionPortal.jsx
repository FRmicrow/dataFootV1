import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import './CompetitionPortal.css';

const CompetitionPortal = () => {
    const { id, year } = useParams();
    const navigate = useNavigate();

    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedYear, setSelectedYear] = useState(year);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                // If no year in URL, we'll get it from basic info first
                let currentYear = year;
                if (!currentYear) {
                    const basicRes = await axios.get(`/api/competitions/${id}`);
                    if (basicRes.data.seasons && basicRes.data.seasons.length > 0) {
                        currentYear = basicRes.data.seasons[0];
                        navigate(`/competition/${id}/${currentYear}`, { replace: true });
                        return; // Let the next effect handle it
                    } else {
                        throw new Error("No seasons found for this competition.");
                    }
                }

                const res = await axios.get(`/api/competitions/${id}/season/${currentYear}`);
                setData(res.data);
                setSelectedYear(currentYear);
                setError(null);
            } catch (err) {
                console.error("Error fetching competition data:", err);
                setError(err.response?.data?.error || "Failed to load competition data.");
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [id, year]);

    const handleYearChange = (e) => {
        const newYear = e.target.value;
        navigate(`/competition/${id}/${newYear}`);
    };

    if (loading) return <div className="portal-loading">
        <div className="portal-spinner"></div>
        <p>Loading Competition Data...</p>
    </div>;

    if (error) return <div className="portal-error">
        <h2>⚠️ Error</h2>
        <p>{error}</p>
        <Link to="/" className="btn-back">Back to Home</Link>
    </div>;

    if (!data) return null;

    const { info = {}, standings = [], leaders = {}, seasons = [] } = data || {};

    return (
        <div className="competition-portal">
            {/* Header Section */}
            <header className="portal-header">
                <div className="portal-title-area">
                    <h1 className="competition-name">
                        {info?.competition_name || "Unknown Competition"}
                        <span className="country-tag">{info?.country_name || "Unknown"}</span>
                    </h1>
                </div>

                <div className="season-selector-wrapper">
                    <label>Season</label>
                    <select value={selectedYear} onChange={handleYearChange} className="season-selector">
                        {seasons.map(s => (
                            <option key={s} value={s}>{s}</option>
                        ))}
                    </select>
                </div>
            </header>

            {/* Leaders Section */}
            <section className="leaders-grid">
                <LeaderCard
                    title="GOLDEN BOOT"
                    player={leaders.topScorer}
                    statLabel="Goals"
                    statValue={leaders.topScorer?.goals}
                    type="scorer"
                />
                <LeaderCard
                    title="TOP PLAYMAKER"
                    player={leaders.topPlaymaker}
                    statLabel="Assists"
                    statValue={leaders.topPlaymaker?.assists}
                    type="playmaker"
                />
                <LeaderCard
                    title="GOLDEN GLOVE"
                    player={leaders.topGoalkeeper}
                    statLabel="Clean Sheets"
                    statValue={leaders.topGoalkeeper?.clean_sheets}
                    type="goalkeeper"
                />
            </section>

            {/* Standings Table */}
            <section className="portal-main-content">
                <div className="card-glass">
                    <h2 className="section-title">📊 Statistical Standings</h2>
                    <p className="section-subtitle">Aggregated from player performance data for {selectedYear}</p>

                    <div className="table-responsive">
                        <table className="standings-table">
                            <thead>
                                <tr>
                                    <th>Pos</th>
                                    <th>Club</th>
                                    <th className="text-center">Matches*</th>
                                    <th className="text-center">Goals</th>
                                    <th className="text-center">Assists</th>
                                    <th className="text-center">CS</th>
                                </tr>
                            </thead>
                            <tbody>
                                {standings.map((club, index) => (
                                    <tr key={club.club_id}>
                                        <td className="pos-cell">{index + 1}</td>
                                        <td className="club-cell">
                                            <Link to={`/club/${club.club_id}`} className="club-link">
                                                <img src={club.club_logo_url} alt="" className="club-mini-logo" />
                                                {club.club_name}
                                            </Link>
                                        </td>
                                        <td className="text-center">{club.max_matches}</td>
                                        <td className="text-center neon-text">{club.total_goals}</td>
                                        <td className="text-center">{club.total_assists}</td>
                                        <td className="text-center">{club.total_clean_sheets}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </section>
        </div>
    );
};

const LeaderCard = ({ title, player, statLabel, statValue, type }) => {
    if (!player) return null;

    return (
        <div className={`leader-card ${type}`}>
            <div className="card-badge">{title}</div>
            <div className="player-info">
                <div className="player-photo-wrapper">
                    <img src={player.photo_url} alt="" className="player-photo" />
                </div>
                <div className="player-details">
                    <Link to={`/player/${player.player_id}`} className="player-name">
                        {player.first_name} {player.last_name}
                    </Link>
                    <div className="player-club">
                        <img src={player.club_logo_url} alt="" className="club-tiny-logo" />
                        {player.club_name}
                    </div>
                </div>
            </div>
            <div className="stat-highlight">
                <span className="stat-value">{statValue}</span>
                <span className="stat-label">{statLabel}</span>
            </div>
        </div>
    );
};

export default CompetitionPortal;
