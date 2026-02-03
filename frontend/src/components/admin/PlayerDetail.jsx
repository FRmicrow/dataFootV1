import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import './Admin.css'; // Re-using existing CSS

const PlayerDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [playerData, setPlayerData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchPlayerDetails = async () => {
            try {
                const response = await axios.get(`/api/v2/players/${id}`);
                setPlayerData(response.data);
                setLoading(false);
            } catch (err) {
                console.error("Error fetching player details:", err);
                setError('Failed to load player details.');
                setLoading(false);
            }
        };

        if (id) {
            fetchPlayerDetails();
        }
    }, [id]);

    if (loading) return <div className="loading-spinner">Loading...</div>;
    if (error) return <div className="error-message">{error}</div>;
    if (!playerData) return <div>Player not found.</div>;

    const { player, statistics } = playerData;

    return (
        <div className="player-detail-container">
            <button className="back-button" onClick={() => navigate(-1)}>
                &larr; Back to List
            </button>

            <div className="player-header-card">
                <div className="player-image-container">
                    <img
                        src={player.photo_url}
                        alt={`${player.first_name} ${player.last_name}`}
                        className="player-photo"
                        onError={(e) => e.target.src = 'https://via.placeholder.com/150'}
                    />
                </div>
                <div className="player-info-main">
                    <h1>{player.first_name} {player.last_name}</h1>
                    <div className="player-meta-grid">
                        <div className="meta-item">
                            <span className="label">Nationality:</span>
                            <span className="value flex-align">
                                {player.nationality_flag && <img src={player.nationality_flag} alt="" className="tiny-flag" />}
                                {player.nationality}
                            </span>
                        </div>
                        <div className="meta-item">
                            <span className="label">Position:</span>
                            <span className="value">{player.position || 'Unknown'}</span>
                        </div>
                        <div className="meta-item">
                            <span className="label">Date of Birth:</span>
                            <span className="value">{player.date_of_birth || 'Unknown'}</span>
                        </div>
                        <div className="meta-item">
                            <span className="label">Height/Weight:</span>
                            <span className="value">
                                {player.height_cm ? `${player.height_cm} cm` : '-'} / {' '}
                                {player.weight_kg ? `${player.weight_kg} kg` : '-'}
                            </span>
                        </div>
                        <div className="meta-item">
                            <span className="label">Birth Place:</span>
                            <span className="value">
                                {player.birth_place ? `${player.birth_place}, ` : ''}
                                {player.birth_country || ''}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="player-stats-section">
                <h2>Career Statistics</h2>
                <div className="table-container">
                    <table className="stats-table">
                        <thead>
                            <tr>
                                <th>Season</th>
                                <th>Club</th>
                                <th>Competition</th>
                                <th>Matches</th>
                                <th>Goals</th>
                                <th>Assists</th>
                                <th>Cards</th>
                                <th>Pens</th>
                            </tr>
                        </thead>
                        <tbody>
                            {statistics.map((stat, index) => (
                                <tr key={index}>
                                    <td className="center-text">
                                        <span className="season-badge">{stat.season}</span>
                                    </td>
                                    <td>
                                        <div className="club-cell">
                                            {stat.club_logo_url && <img src={stat.club_logo_url} alt="" className="club-logo-mini" />}
                                            {stat.club_name}
                                        </div>
                                    </td>
                                    <td>{stat.competition_name || 'Unknown'}</td>
                                    <td className="center-text">{stat.matches_played}</td>
                                    <td className="center-text highlight-stat">{stat.goals}</td>
                                    <td className="center-text">{stat.assists || 0}</td>
                                    <td className="center-text">
                                        {stat.yellow_cards > 0 && <span className="yellow-card-count">{stat.yellow_cards}</span>}
                                        {stat.red_cards > 0 && <span className="red-card-count">{stat.red_cards}</span>}
                                        {stat.yellow_cards === 0 && stat.red_cards === 0 && '-'}
                                    </td>
                                    <td className="center-text">
                                        {stat.penalty_goals} / {stat.penalty_goals + stat.penalty_misses}
                                    </td>
                                </tr>
                            ))}
                            {statistics.length === 0 && (
                                <tr>
                                    <td colSpan="8" className="no-data">No career statistics available.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default PlayerDetail;
