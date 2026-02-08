import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import './ClubDetailPage.css';

const ClubDetailPage = () => {
    const { id } = useParams();
    const [club, setClub] = useState(null);
    const [activeTab, setActiveTab] = useState('players');
    const [players, setPlayers] = useState([]);
    const [pagination, setPagination] = useState(null);
    const [loading, setLoading] = useState(true);
    const [expandedRows, setExpandedRows] = useState(new Set());
    const [playerDetails, setPlayerDetails] = useState({});
    const [loadingDetails, setLoadingDetails] = useState(new Set());
    const [sortBy, setSortBy] = useState('arrival_date');
    const [sortOrder, setSortOrder] = useState('ASC');

    useEffect(() => {
        loadClubDetails();
        loadPlayers();
    }, [id]);

    useEffect(() => {
        if (activeTab === 'players') {
            loadPlayers();
        }
    }, [sortBy, sortOrder]);

    const loadClubDetails = async () => {
        try {
            const response = await axios.get(`http://localhost:3001/api/clubs/${id}`);
            setClub(response.data);
        } catch (error) {
            console.error('Error loading club details:', error);
        }
    };

    const loadPlayers = async (page = 1) => {
        try {
            setLoading(true);
            const response = await axios.get(`http://localhost:3001/api/clubs/${id}/players`, {
                params: {
                    page,
                    limit: 20,
                    sort_by: sortBy,
                    sort_order: sortOrder
                }
            });
            setPlayers(response.data.players);
            setPagination(response.data.pagination);
            setLoading(false);
        } catch (error) {
            console.error('Error loading players:', error);
            setLoading(false);
        }
    };

    const loadPlayerDetails = async (playerId) => {
        if (playerDetails[playerId]) return; // Already loaded

        try {
            setLoadingDetails(prev => new Set([...prev, playerId]));
            const response = await axios.get(
                `http://localhost:3001/api/clubs/${id}/players/${playerId}/details`
            );
            setPlayerDetails(prev => ({
                ...prev,
                [playerId]: response.data
            }));
            setLoadingDetails(prev => {
                const newSet = new Set(prev);
                newSet.delete(playerId);
                return newSet;
            });
        } catch (error) {
            console.error('Error loading player details:', error);
            setLoadingDetails(prev => {
                const newSet = new Set(prev);
                newSet.delete(playerId);
                return newSet;
            });
        }
    };

    const toggleRow = (playerId) => {
        const newExpanded = new Set(expandedRows);
        if (newExpanded.has(playerId)) {
            newExpanded.delete(playerId);
        } else {
            newExpanded.add(playerId);
            loadPlayerDetails(playerId);
        }
        setExpandedRows(newExpanded);
    };

    const handleSort = (column) => {
        if (sortBy === column) {
            setSortOrder(sortOrder === 'ASC' ? 'DESC' : 'ASC');
        } else {
            setSortBy(column);
            setSortOrder('ASC');
        }
    };

    const renderSortIcon = (column) => {
        if (sortBy !== column) return <span className="sort-icon">⇅</span>;
        return sortOrder === 'ASC' ? <span className="sort-icon">▲</span> : <span className="sort-icon">▼</span>;
    };

    const renderPagination = () => {
        if (!pagination || pagination.totalPages <= 1) return null;

        const pages = [];
        const maxPages = 5;
        let startPage = Math.max(1, pagination.page - Math.floor(maxPages / 2));
        let endPage = Math.min(pagination.totalPages, startPage + maxPages - 1);

        if (endPage - startPage < maxPages - 1) {
            startPage = Math.max(1, endPage - maxPages + 1);
        }

        for (let i = startPage; i <= endPage; i++) {
            pages.push(i);
        }

        return (
            <div className="pagination">
                <button
                    onClick={() => loadPlayers(pagination.page - 1)}
                    disabled={pagination.page === 1}
                    className="pagination-btn"
                >
                    Previous
                </button>

                {startPage > 1 && (
                    <>
                        <button onClick={() => loadPlayers(1)} className="pagination-btn">1</button>
                        {startPage > 2 && <span className="pagination-ellipsis">...</span>}
                    </>
                )}

                {pages.map(page => (
                    <button
                        key={page}
                        onClick={() => loadPlayers(page)}
                        className={`pagination-btn ${page === pagination.page ? 'active' : ''}`}
                    >
                        {page}
                    </button>
                ))}

                {endPage < pagination.totalPages && (
                    <>
                        {endPage < pagination.totalPages - 1 && <span className="pagination-ellipsis">...</span>}
                        <button onClick={() => loadPlayers(pagination.totalPages)} className="pagination-btn">
                            {pagination.totalPages}
                        </button>
                    </>
                )}

                <button
                    onClick={() => loadPlayers(pagination.page + 1)}
                    disabled={pagination.page === pagination.totalPages}
                    className="pagination-btn"
                >
                    Next
                </button>
            </div>
        );
    };

    if (!club) {
        return <div className="club-detail-loading">Loading club details...</div>;
    }

    return (
        <div className="club-detail-page">
            <Link to="/football-data" className="back-link">← Back to Football Data</Link>

            {/* Club Header */}
            <div className="club-header">
                {club.club_logo_url && (
                    <img src={club.club_logo_url} alt={club.club_name} className="club-header-logo" />
                )}
                <div className="club-header-info">
                    <h1>{club.club_name}</h1>
                    <div className="club-meta">
                        {club.country_flag && (
                            <img src={club.country_flag} alt={club.country_name} className="country-flag" />
                        )}
                        <span>{club.country_name}</span>
                    </div>
                    {club.stadium_name && (
                        <div className="club-stadium">
                            <strong>Stadium:</strong> {club.stadium_name}
                            {club.stadium_capacity && ` (${club.stadium_capacity.toLocaleString()} seats)`}
                        </div>
                    )}
                    {club.founded_year && (
                        <div className="club-founded">
                            <strong>Founded:</strong> {club.founded_year}
                        </div>
                    )}
                </div>
            </div>

            {/* Tabs */}
            <div className="club-tabs">
                <button
                    className={`club-tab ${activeTab === 'players' ? 'active' : ''}`}
                    onClick={() => setActiveTab('players')}
                >
                    Players
                </button>
                <button
                    className={`club-tab ${activeTab === 'trophies' ? 'active' : ''}`}
                    onClick={() => setActiveTab('trophies')}
                >
                    Trophies
                </button>
                <button
                    className={`club-tab ${activeTab === 'datalab' ? 'active' : ''}`}
                    onClick={() => setActiveTab('datalab')}
                >
                    Data Lab
                </button>
            </div>

            {/* Tab Content */}
            <div className="club-tab-content">
                {activeTab === 'players' && (
                    <div className="players-tab">
                        {loading ? (
                            <div className="loading">Loading players...</div>
                        ) : (
                            <>
                                <div className="players-table-container">
                                    <table className="players-table">
                                        <thead>
                                            <tr>
                                                <th className="expand-col"></th>
                                                <th className="photo-col">Photo</th>
                                                <th
                                                    className="sortable"
                                                    onClick={() => handleSort('player_name')}
                                                >
                                                    Name {renderSortIcon('player_name')}
                                                </th>
                                                <th
                                                    className="sortable"
                                                    onClick={() => handleSort('arrival_date')}
                                                >
                                                    Arrival {renderSortIcon('arrival_date')}
                                                </th>
                                                <th
                                                    className="sortable"
                                                    onClick={() => handleSort('departure_date')}
                                                >
                                                    Departure {renderSortIcon('departure_date')}
                                                </th>
                                                <th
                                                    className="sortable stat-col"
                                                    onClick={() => handleSort('total_matches')}
                                                >
                                                    Matches {renderSortIcon('total_matches')}
                                                </th>
                                                <th
                                                    className="sortable stat-col"
                                                    onClick={() => handleSort('total_goals')}
                                                >
                                                    Goals {renderSortIcon('total_goals')}
                                                </th>
                                                <th
                                                    className="sortable stat-col"
                                                    onClick={() => handleSort('total_assists')}
                                                >
                                                    Assists {renderSortIcon('total_assists')}
                                                </th>
                                                <th className="stat-col">Cards (Y/R)</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {players.map(player => (
                                                <React.Fragment key={player.player_id}>
                                                    <tr
                                                        className={`player-row ${expandedRows.has(player.player_id) ? 'expanded' : ''}`}
                                                    >
                                                        <td className="expand-col">
                                                            <button
                                                                className="expand-btn"
                                                                onClick={() => toggleRow(player.player_id)}
                                                            >
                                                                {expandedRows.has(player.player_id) ? '▼' : '▶'}
                                                            </button>
                                                        </td>
                                                        <td className="photo-col">
                                                            <Link to={`/player/${player.player_id}`}>
                                                                {player.photo_url && (
                                                                    <img
                                                                        src={player.photo_url}
                                                                        alt={`${player.first_name} ${player.last_name}`}
                                                                        className="player-photo-thumb"
                                                                    />
                                                                )}
                                                            </Link>
                                                        </td>
                                                        <td>
                                                            <Link
                                                                to={`/player/${player.player_id}`}
                                                                className="player-name-link"
                                                            >
                                                                <strong>{player.first_name} {player.last_name}</strong>
                                                            </Link>
                                                        </td>
                                                        <td>{player.arrival_date || '-'}</td>
                                                        <td>{player.departure_date || 'Present'}</td>
                                                        <td className="stat-col">{player.total_matches || 0}</td>
                                                        <td className="stat-col">{player.total_goals || 0}</td>
                                                        <td className="stat-col">{player.total_assists || 0}</td>
                                                        <td className="stat-col">
                                                            {player.total_yellow_cards || 0} / {player.total_red_cards || 0}
                                                        </td>
                                                    </tr>
                                                    {expandedRows.has(player.player_id) && (
                                                        <tr className="detail-row">
                                                            <td colSpan="9">
                                                                <div className="detail-container">
                                                                    {loadingDetails.has(player.player_id) ? (
                                                                        <div className="loading-details">Loading details...</div>
                                                                    ) : playerDetails[player.player_id] && playerDetails[player.player_id].length > 0 ? (
                                                                        <table className="detail-table">
                                                                            <thead>
                                                                                <tr>
                                                                                    <th>Competition</th>
                                                                                    <th>Year</th>
                                                                                    <th>Matches</th>
                                                                                    <th>Goals</th>
                                                                                    <th>Assists</th>
                                                                                    <th>Cards (Y/R)</th>
                                                                                </tr>
                                                                            </thead>
                                                                            <tbody>
                                                                                {playerDetails[player.player_id].map(stat => (
                                                                                    <tr key={stat.stat_id}>
                                                                                        <td>{stat.competition_name || 'Unknown'}</td>
                                                                                        <td>{stat.year}</td>
                                                                                        <td>{stat.matches_played || 0}</td>
                                                                                        <td>{stat.goals || 0}</td>
                                                                                        <td>{stat.assists || 0}</td>
                                                                                        <td>
                                                                                            {stat.yellow_cards || 0} / {stat.red_cards || 0}
                                                                                        </td>
                                                                                    </tr>
                                                                                ))}
                                                                            </tbody>
                                                                        </table>
                                                                    ) : (
                                                                        <div className="no-details">No detailed stats available</div>
                                                                    )}
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    )}
                                                </React.Fragment>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                {renderPagination()}
                            </>
                        )}
                    </div>
                )}

                {activeTab === 'trophies' && (
                    <div className="placeholder-tab">
                        <h2>Trophies</h2>
                        <p>Coming soon...</p>
                    </div>
                )}

                {activeTab === 'datalab' && (
                    <div className="placeholder-tab">
                        <h2>Data Lab</h2>
                        <p>Coming soon...</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ClubDetailPage;
