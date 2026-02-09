import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import './FootballDataPage.css';

const FootballDataPage = () => {
    const [activeTab, setActiveTab] = useState('players');

    // Players state
    const [playerFilters, setPlayerFilters] = useState({
        name: '',
        nationality_id: '',
        club_id: '',
        year_from: '',
        year_to: ''
    });
    const [players, setPlayers] = useState([]);
    const [playersPagination, setPlayersPagination] = useState(null);
    const [playersLoading, setPlayersLoading] = useState(false);
    const [playersError, setPlayersError] = useState('');

    // Clubs state
    const [clubFilters, setClubFilters] = useState({
        name: '',
        country_id: ''
    });
    const [clubs, setClubs] = useState([]);
    const [clubsPagination, setClubsPagination] = useState(null);
    const [clubsLoading, setClubsLoading] = useState(false);
    const [clubsError, setClubsError] = useState('');

    // Dropdown data
    const [countries, setCountries] = useState([]);
    const [clubsList, setClubsList] = useState([]);
    const [clubsSearchTerm, setClubsSearchTerm] = useState('');

    useEffect(() => {
        loadCountries();
        loadClubsList();
    }, []);

    useEffect(() => {
        const timer = setTimeout(() => {
            if (clubsSearchTerm) {
                loadClubsList(clubsSearchTerm);
            }
        }, 300);
        return () => clearTimeout(timer);
    }, [clubsSearchTerm]);

    const loadCountries = async () => {
        try {
            const response = await axios.get('http://localhost:3001/api/football-data/countries');
            setCountries(response.data);
        } catch (error) {
            console.error('Error loading countries:', error);
        }
    };

    const loadClubsList = async (search = '') => {
        try {
            const response = await axios.get('http://localhost:3001/api/football-data/clubs', {
                params: { search }
            });
            setClubsList(response.data);
        } catch (error) {
            console.error('Error loading clubs:', error);
        }
    };

    const searchPlayers = async (page = 1) => {
        // Validation
        const { name, nationality_id, club_id, year_from, year_to } = playerFilters;
        if (!name && !nationality_id && !club_id && !year_from && !year_to) {
            setPlayersError('Please fill in at least one search field');
            return;
        }

        try {
            setPlayersLoading(true);
            setPlayersError('');

            const response = await axios.get('http://localhost:3001/api/football-data/players/search', {
                params: {
                    ...playerFilters,
                    page,
                    limit: 20
                }
            });

            setPlayers(response.data.players);
            setPlayersPagination(response.data.pagination);
            setPlayersLoading(false);
        } catch (error) {
            console.error('Error searching players:', error);
            setPlayersError(error.response?.data?.error || 'Failed to search players');
            setPlayersLoading(false);
        }
    };

    const searchClubs = async (page = 1) => {
        try {
            setClubsLoading(true);
            setClubsError('');

            const response = await axios.get('http://localhost:3001/api/football-data/clubs/search', {
                params: {
                    ...clubFilters,
                    page,
                    limit: 20
                }
            });

            setClubs(response.data.clubs);
            setClubsPagination(response.data.pagination);
            setClubsLoading(false);
        } catch (error) {
            console.error('Error searching clubs:', error);
            setClubsError(error.response?.data?.error || 'Failed to search clubs');
            setClubsLoading(false);
        }
    };

    const handlePlayerFilterChange = (field, value) => {
        setPlayerFilters(prev => ({ ...prev, [field]: value }));
        setPlayersError('');
    };

    const handleClubFilterChange = (field, value) => {
        setClubFilters(prev => ({ ...prev, [field]: value }));
        setClubsError('');
    };

    const clearPlayerFilters = () => {
        setPlayerFilters({
            name: '',
            nationality_id: '',
            club_id: '',
            year_from: '',
            year_to: ''
        });
        setPlayers([]);
        setPlayersPagination(null);
        setPlayersError('');
    };

    const clearClubFilters = () => {
        setClubFilters({
            name: '',
            country_id: ''
        });
        setClubs([]);
        setClubsPagination(null);
        setClubsError('');
    };

    const renderPagination = (pagination, onPageChange) => {
        if (!pagination || pagination.totalPages <= 1) return null;

        const pages = [];
        const maxPagesToShow = 5;
        let startPage = Math.max(1, pagination.page - Math.floor(maxPagesToShow / 2));
        let endPage = Math.min(pagination.totalPages, startPage + maxPagesToShow - 1);

        if (endPage - startPage < maxPagesToShow - 1) {
            startPage = Math.max(1, endPage - maxPagesToShow + 1);
        }

        for (let i = startPage; i <= endPage; i++) {
            pages.push(i);
        }

        return (
            <div className="pagination">
                <button
                    onClick={() => onPageChange(pagination.page - 1)}
                    disabled={pagination.page === 1}
                    className="pagination-btn"
                >
                    Previous
                </button>

                {startPage > 1 && (
                    <>
                        <button onClick={() => onPageChange(1)} className="pagination-btn">1</button>
                        {startPage > 2 && <span className="pagination-ellipsis">...</span>}
                    </>
                )}

                {pages.map(page => (
                    <button
                        key={page}
                        onClick={() => onPageChange(page)}
                        className={`pagination-btn ${page === pagination.page ? 'active' : ''}`}
                    >
                        {page}
                    </button>
                ))}

                {endPage < pagination.totalPages && (
                    <>
                        {endPage < pagination.totalPages - 1 && <span className="pagination-ellipsis">...</span>}
                        <button onClick={() => onPageChange(pagination.totalPages)} className="pagination-btn">
                            {pagination.totalPages}
                        </button>
                    </>
                )}

                <button
                    onClick={() => onPageChange(pagination.page + 1)}
                    disabled={pagination.page === pagination.totalPages}
                    className="pagination-btn"
                >
                    Next
                </button>
            </div>
        );
    };

    return (
        <div className="football-data-page">
            <h1 className="page-title">Football Data</h1>

            {/* Tabs */}
            <div className="tabs">
                <button
                    className={`tab ${activeTab === 'players' ? 'active' : ''}`}
                    onClick={() => setActiveTab('players')}
                >
                    Players
                </button>
                <button
                    className={`tab ${activeTab === 'clubs' ? 'active' : ''}`}
                    onClick={() => setActiveTab('clubs')}
                >
                    Clubs
                </button>
                <button
                    className={`tab ${activeTab === 'competitions' ? 'active' : ''}`}
                    onClick={() => setActiveTab('competitions')}
                >
                    Competitions
                </button>
            </div>

            {/* Players Tab */}
            {activeTab === 'players' && (
                <div className="tab-content">
                    {/* Search Form */}
                    <div className="search-form">
                        <h3>Search Players</h3>
                        <div className="form-grid">
                            <div className="form-group">
                                <label>Name (First Name - Last Name)</label>
                                <input
                                    type="text"
                                    placeholder="Enter player name..."
                                    value={playerFilters.name}
                                    onChange={(e) => handlePlayerFilterChange('name', e.target.value)}
                                    onKeyPress={(e) => e.key === 'Enter' && searchPlayers()}
                                />
                            </div>

                            <div className="form-group">
                                <label>Nationality</label>
                                <select
                                    value={playerFilters.nationality_id}
                                    onChange={(e) => handlePlayerFilterChange('nationality_id', e.target.value)}
                                >
                                    <option value="">All Nationalities</option>
                                    {countries.map(country => (
                                        <option key={country.country_id} value={country.country_id}>
                                            {country.country_name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-group">
                                <label>Club</label>
                                <select
                                    value={playerFilters.club_id}
                                    onChange={(e) => handlePlayerFilterChange('club_id', e.target.value)}
                                    onFocus={() => setClubsSearchTerm('')}
                                >
                                    <option value="">All Clubs</option>
                                    {clubsList.map(club => (
                                        <option key={club.club_id} value={club.club_id}>
                                            {club.club_name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-group">
                                <label>Year From</label>
                                <input
                                    type="number"
                                    placeholder="e.g., 2020"
                                    value={playerFilters.year_from}
                                    onChange={(e) => handlePlayerFilterChange('year_from', e.target.value)}
                                    min="1900"
                                    max="2100"
                                />
                            </div>

                            <div className="form-group">
                                <label>Year To</label>
                                <input
                                    type="number"
                                    placeholder="e.g., 2025"
                                    value={playerFilters.year_to}
                                    onChange={(e) => handlePlayerFilterChange('year_to', e.target.value)}
                                    min="1900"
                                    max="2100"
                                />
                            </div>
                        </div>

                        {playersError && <div className="error-message">{playersError}</div>}

                        <div className="form-actions">
                            <button onClick={() => searchPlayers(1)} className="btn-search" disabled={playersLoading}>
                                {playersLoading ? 'Searching...' : 'Search Players'}
                            </button>
                            <button onClick={clearPlayerFilters} className="btn-clear">
                                Clear
                            </button>
                        </div>
                    </div>

                    {/* Results */}
                    {playersLoading && <div className="loading">Loading players...</div>}

                    {!playersLoading && players.length > 0 && (
                        <>
                            <div className="results-info">
                                Found {playersPagination.total} player{playersPagination.total !== 1 ? 's' : ''}
                            </div>
                            <div className="cards-grid">
                                {players.map(player => (
                                    <Link
                                        key={player.player_id}
                                        to={`/player/${player.player_id}`}
                                        className="player-card"
                                    >
                                        {player.photo_url && (
                                            <img
                                                src={player.photo_url}
                                                alt={`${player.first_name} ${player.last_name}`}
                                                className="player-photo"
                                            />
                                        )}
                                        {!player.photo_url && <div className="player-photo-placeholder"></div>}
                                        <div className="card-content">
                                            <h3 className="player-name">{player.first_name} {player.last_name}</h3>
                                            <p className="player-nationality">{player.nationality || 'Unknown'}</p>
                                            <p className="player-club">{player.current_club || 'No club'}</p>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                            {renderPagination(playersPagination, searchPlayers)}
                        </>
                    )}

                    {!playersLoading && players.length === 0 && playersPagination && (
                        <div className="no-results">No players found matching your criteria</div>
                    )}
                </div>
            )}

            {/* Clubs Tab */}
            {activeTab === 'clubs' && (
                <div className="tab-content">
                    {/* Search Form */}
                    <div className="search-form">
                        <h3>Search Clubs</h3>
                        <div className="form-grid-clubs">
                            <div className="form-group">
                                <label>Club Name</label>
                                <input
                                    type="text"
                                    placeholder="Enter club name..."
                                    value={clubFilters.name}
                                    onChange={(e) => handleClubFilterChange('name', e.target.value)}
                                    onKeyPress={(e) => e.key === 'Enter' && searchClubs()}
                                />
                            </div>

                            <div className="form-group">
                                <label>Country</label>
                                <select
                                    value={clubFilters.country_id}
                                    onChange={(e) => handleClubFilterChange('country_id', e.target.value)}
                                >
                                    <option value="">All Countries</option>
                                    {countries.map(country => (
                                        <option key={country.country_id} value={country.country_id}>
                                            {country.country_name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {clubsError && <div className="error-message">{clubsError}</div>}

                        <div className="form-actions">
                            <button onClick={() => searchClubs(1)} className="btn-search" disabled={clubsLoading}>
                                {clubsLoading ? 'Searching...' : 'Search Clubs'}
                            </button>
                            <button onClick={clearClubFilters} className="btn-clear">
                                Clear
                            </button>
                        </div>
                    </div>

                    {/* Results */}
                    {clubsLoading && <div className="loading">Loading clubs...</div>}

                    {!clubsLoading && clubs.length > 0 && (
                        <>
                            <div className="results-info">
                                Found {clubsPagination.total} club{clubsPagination.total !== 1 ? 's' : ''}
                            </div>
                            <div className="cards-grid">
                                {clubs.map(club => (
                                    <Link
                                        key={club.club_id}
                                        to={`/club/${club.club_id}`}
                                        className="club-card"
                                    >
                                        {club.club_logo_url && (
                                            <img
                                                src={club.club_logo_url}
                                                alt={club.club_name}
                                                className="club-logo"
                                            />
                                        )}
                                        {!club.club_logo_url && <div className="club-logo-placeholder"></div>}
                                        <div className="card-content">
                                            <h3 className="club-name">{club.club_name}</h3>
                                            <p className="club-country">{club.country_name || 'Unknown'}</p>
                                            <p className="club-league">{club.current_league || 'No league data'}</p>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                            {renderPagination(clubsPagination, searchClubs)}
                        </>
                    )}

                    {!clubsLoading && clubs.length === 0 && clubsPagination && (
                        <div className="no-results">No clubs found matching your criteria</div>
                    )}
                </div>
            )}

            {/* Competitions Tab */}
            {activeTab === 'competitions' && (
                <div className="tab-content">
                    <CompetitionList />
                </div>
            )}
        </div>
    );
};

const CompetitionList = () => {
    const [competitions, setCompetitions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        const fetchCompetitions = async () => {
            try {
                const res = await axios.get('http://localhost:3001/api/teams/leagues-metadata');
                setCompetitions(res.data);
            } catch (err) {
                console.error("Error fetching competitions:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchCompetitions();
    }, []);

    const filtered = competitions.filter(c =>
        c.competition_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.country_name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) return <div className="loading">Loading competitions...</div>;

    return (
        <div className="competition-list-container">
            <div className="search-form">
                <input
                    type="text"
                    placeholder="Search competitions or countries..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #334155', background: '#0f172a', color: 'white' }}
                />
            </div>

            <div className="cards-grid">
                {filtered.map(comp => (
                    <Link key={comp.competition_id} to={`/competition/${comp.competition_id}`} className="club-card competition-card">
                        <div className="card-content">
                            <h3 className="club-name">{comp.competition_name}</h3>
                            <p className="club-country">{comp.country_name}</p>
                            <div className="stats-row" style={{ marginTop: '10px', fontSize: '0.8rem', color: '#94a3b8' }}>
                                <span>Level: {comp.league_level}</span> • <span>{comp.team_count} Teams</span>
                            </div>
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    );
};

export default FootballDataPage;

