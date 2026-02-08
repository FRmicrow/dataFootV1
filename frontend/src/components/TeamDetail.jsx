import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import './TeamDetail.css';

const TeamDetail = () => {
    const { id } = useParams();
    const [team, setTeam] = useState(null);
    const [activeTab, setActiveTab] = useState('players');
    const [players, setPlayers] = useState([]);
    const [seasons, setSeasons] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Filters
    const [selectedYear, setSelectedYear] = useState('');
    const [playerNameFilter, setPlayerNameFilter] = useState('');

    useEffect(() => {
        loadTeamData();
    }, [id]);

    useEffect(() => {
        if (activeTab === 'players') {
            loadPlayers();
        }
    }, [activeTab, selectedYear, playerNameFilter]);

    const loadTeamData = async () => {
        try {
            setLoading(true);
            const response = await axios.get(`http://localhost:3001/api/teams/${id}`);
            setTeam(response.data);
            setLoading(false);
        } catch (err) {
            console.error('Error loading team:', err);
            setError('Failed to load team data');
            setLoading(false);
        }
    };

    const loadPlayers = async () => {
        try {
            const params = {};
            if (selectedYear) params.year = selectedYear;
            if (playerNameFilter) params.name = playerNameFilter;

            const response = await axios.get(`http://localhost:3001/api/teams/${id}/players`, { params });
            setPlayers(response.data.players);
            setSeasons(response.data.seasons);

            // Set default year to most recent if not set
            if (!selectedYear && response.data.seasons.length > 0) {
                setSelectedYear(response.data.seasons[0]);
            }
        } catch (err) {
            console.error('Error loading players:', err);
        }
    };

    if (loading) {
        return <div className="team-detail-loading">Loading team data...</div>;
    }

    if (error || !team) {
        return <div className="team-detail-error">{error || 'Team not found'}</div>;
    }

    return (
        <div className="team-detail-container">
            <Link to="/database" className="back-link">← Back to Teams</Link>

            {/* Team Header */}
            <div className="team-header">
                {team.club_logo_url && (
                    <img src={team.club_logo_url} alt={team.club_name} className="team-logo-large" />
                )}
                <div className="team-header-info">
                    <h1>{team.club_name}</h1>
                    <div className="team-meta">
                        {team.country_flag && (
                            <img src={team.country_flag} alt={team.country_name} className="country-flag-small" />
                        )}
                        <span>{team.country_name}</span>
                    </div>
                    {team.stadium_name && (
                        <div className="team-stadium">
                            <strong>Stadium:</strong> {team.stadium_name}
                            {team.stadium_capacity && ` (${team.stadium_capacity.toLocaleString()} seats)`}
                        </div>
                    )}
                    {team.founded && (
                        <div className="team-founded">
                            <strong>Founded:</strong> {team.founded}
                        </div>
                    )}
                </div>
            </div>

            {/* Tabs */}
            <div className="team-tabs">
                <button
                    className={`team-tab ${activeTab === 'trophies' ? 'active' : ''}`}
                    onClick={() => setActiveTab('trophies')}
                >
                    Trophies
                </button>
                <button
                    className={`team-tab ${activeTab === 'players' ? 'active' : ''}`}
                    onClick={() => setActiveTab('players')}
                >
                    Players
                </button>
                <button
                    className={`team-tab ${activeTab === 'statistics' ? 'active' : ''}`}
                    onClick={() => setActiveTab('statistics')}
                >
                    Statistics
                </button>
            </div>

            {/* Tab Content */}
            <div className="team-tab-content">
                {activeTab === 'trophies' && (
                    <div className="trophies-placeholder">
                        <p>Trophies section coming soon...</p>
                    </div>
                )}

                {activeTab === 'players' && (
                    <div className="players-section">
                        {/* Filters */}
                        <div className="players-filters">
                            <div className="filter-group">
                                <label>Season:</label>
                                <select
                                    value={selectedYear}
                                    onChange={(e) => setSelectedYear(e.target.value)}
                                >
                                    <option value="">All Seasons</option>
                                    {seasons.map(season => (
                                        <option key={season} value={season}>{season}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="filter-group">
                                <label>Player Name:</label>
                                <input
                                    type="text"
                                    placeholder="Search by name..."
                                    value={playerNameFilter}
                                    onChange={(e) => setPlayerNameFilter(e.target.value)}
                                />
                            </div>
                        </div>

                        {/* Players Table */}
                        <div className="players-table-container">
                            {players.length === 0 ? (
                                <p className="no-players">No players found</p>
                            ) : (
                                <table className="players-table">
                                    <thead>
                                        <tr>
                                            <th>Player</th>
                                            <th>Nationality</th>
                                            <th>Position</th>
                                            <th>Season</th>
                                            <th className="center">Matches</th>
                                            <th className="center">Goals</th>
                                            <th className="center">Assists</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {players.map(player => (
                                            <tr key={player.player_id}>
                                                <td>
                                                    <Link to={`/player/${player.player_id}`} className="player-link">
                                                        <div className="player-cell">
                                                            {player.photo_url && (
                                                                <img
                                                                    src={player.photo_url}
                                                                    alt={`${player.first_name} ${player.last_name}`}
                                                                    className="player-photo-mini"
                                                                />
                                                            )}
                                                            <span>{player.first_name} {player.last_name}</span>
                                                        </div>
                                                    </Link>
                                                </td>
                                                <td>{player.nationality || '-'}</td>
                                                <td>{player.position || '-'}</td>
                                                <td><span className="season-badge">{player.season}</span></td>
                                                <td className="center">{player.matches_played || 0}</td>
                                                <td className="center">{player.goals || 0}</td>
                                                <td className="center">{player.assists || 0}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'statistics' && (
                    <div className="statistics-placeholder">
                        <p>Statistics section coming soon...</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default TeamDetail;
