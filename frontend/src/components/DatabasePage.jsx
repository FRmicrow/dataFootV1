
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import TeamDetailModal from './TeamDetailModal';
import TeamsTab from './TeamsTab';

const DatabasePage = () => {
    const [players, setPlayers] = useState([]);
    const [teams, setTeams] = useState([]);
    const [activeTab, setActiveTab] = useState('players');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [selectedTeam, setSelectedTeam] = useState(null);
    const [teamLoading, setTeamLoading] = useState(false);
    const [selectedSeason, setSelectedSeason] = useState(2024);
    const [searched, setSearched] = useState(false); // Track if search was performed

    // Filter states
    const [filterNationality, setFilterNationality] = useState('');
    const [filterClub, setFilterClub] = useState('');
    const [filterName, setFilterName] = useState('');

    // Nationalities from backend
    const [nationalities, setNationalities] = useState([]);

    // Team filter states
    const [filterTeamName, setFilterTeamName] = useState('');
    const [filterTeamCountry, setFilterTeamCountry] = useState('');
    const [showAllTeams, setShowAllTeams] = useState(false);

    // Mass verify states
    const [verifying, setVerifying] = useState(false);
    const [verifyStatus, setVerifyStatus] = useState(null);

    useEffect(() => {
        if (activeTab === 'players') {
            loadNationalities();
        } else {
            loadTeams();
        }
    }, [activeTab]);

    // Polling for verify status
    useEffect(() => {
        let interval;
        if (verifying) {
            interval = setInterval(async () => {
                try {
                    const status = await api.getVerifyStatus();
                    setVerifyStatus(status);
                    if (status.status === 'completed') {
                        setVerifying(false);
                        if (searched) {
                            searchPlayers(); // Refresh search after completion
                        }
                    }
                } catch (err) {
                    console.error('Failed to get verify status', err);
                }
            }, 2000);
        }
        return () => clearInterval(interval);
    }, [verifying, searched]);

    const loadNationalities = async () => {
        try {
            const data = await api.getNationalities();
            setNationalities(data.nationalities || []);
        } catch (err) {
            console.error('Failed to load nationalities', err);
        }
    };

    const searchPlayers = async () => {
        // Require at least one search criteria
        if (!filterName && !filterNationality && !filterClub) {
            setError('Please provide at least one search criteria (name, nationality, or club)');
            return;
        }

        setLoading(true);
        setError(null);
        setSearched(true);

        try {
            const params = {};
            if (filterName) params.name = filterName;
            if (filterNationality) params.nationality = filterNationality;
            if (filterClub) params.club = filterClub;

            const data = await api.searchPlayers(params);
            setPlayers(data.players || []);

            if (data.players && data.players.length === 0) {
                setError('No players found matching your criteria');
            }
        } catch (err) {
            setError('Failed to search players');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const loadTeams = async () => {
        console.log('🔄 Loading teams...');
        setLoading(true);
        setError(null);
        try {
            const data = await api.getAllTeams();
            console.log('✅ Teams loaded:', data.teams?.length || 0, 'teams');
            setTeams(data.teams || []);
        } catch (err) {
            setError('Failed to load teams');
            console.error('❌ Error loading teams:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleViewTeam = async (teamId, season = selectedSeason) => {
        console.log('🏟️ handleViewTeam called with teamId:', teamId, 'season:', season);
        setTeamLoading(true);
        try {
            // Backend now aggregates everything we need in one call
            const data = await api.getTeam(teamId, season);
            console.log('✅ Team Data Loaded:', data);

            setSelectedTeam(data);
            setSelectedSeason(season);
        } catch (err) {
            console.error('❌ Failed to load team details', err);
            alert('Failed to load team details: ' + (err.response?.data?.error || err.message));
        } finally {
            setTeamLoading(false);
        }
    };

    const handleSeasonChange = async (newSeason) => {
        if (selectedTeam) {
            // Need to pass the ID of the currently selected team
            // The team object structure is { team: {id: ...} ... }
            await handleViewTeam(selectedTeam.team.id, newSeason);
        }
    };

    const handleDeletePlayer = async (e, playerId, name) => {
        e.preventDefault();
        e.stopPropagation();
        if (window.confirm(`Are you sure you want to remove ${name} from the database?`)) {
            try {
                await api.deletePlayer(playerId);
                setPlayers(players.filter(p => p.id !== playerId));
            } catch (err) {
                console.error('Failed to delete player', err);
                alert('Failed to delete player');
            }
        }
    };

    const handleMassVerify = async () => {
        if (!window.confirm('This will scan all players for missing seasons and backfill them. Proceed?')) return;

        try {
            setVerifying(true);
            setVerifyStatus({ status: 'starting', current: 0, total: players.length, details: 'Starting...' });
            await api.massVerify();
        } catch (err) {
            console.error('Mass verify failed', err);
            setVerifying(false);
            alert('Failed to start mass verify');
        }
    };


    if (loading) {
        return (
            <div className="container">
                <div className="loading">Searching players...</div>
            </div>
        );
    }

    const renderPlayerGrid = () => (
        <div className="player-grid">
            {!searched ? (
                <div className="empty-state" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '3rem' }}>
                    <h3 style={{ marginBottom: '1rem', color: '#4a5568' }}>Search for Players</h3>
                    <p style={{ color: '#718096' }}>Enter at least one search criteria above to find players</p>
                </div>
            ) : players.length === 0 ? (
                <div className="empty-state" style={{ gridColumn: '1 / -1' }}>No players found matching your criteria.</div>
            ) : (
                players.map((player) => (
                    <Link key={player.id} to={`/player/${player.id}`} className="player-card">
                        <button
                            className="btn-delete"
                            onClick={(e) => handleDeletePlayer(e, player.id, `${player.first_name} ${player.last_name}`)}
                            title="Remove from database"
                        >
                            ×
                        </button>
                        <img src={player.photo_url} alt={player.first_name} className="player-card-photo" />
                        <div className="player-card-name">{player.first_name} {player.last_name}</div>
                        <div className="player-card-info">{player.nationality}</div>
                        {player.current_team && (
                            <div className="player-card-teams" style={{ fontSize: '0.7rem', color: '#718096', marginTop: '0.25rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {player.current_team}
                            </div>
                        )}
                    </Link>
                ))
            )}
        </div>
    );

    const renderTeamList = () => {
        // Apply filters
        const filteredTeams = teams.filter(team => {
            const matchesName = !filterTeamName || team.name.toLowerCase().includes(filterTeamName.toLowerCase());
            const matchesCountry = !filterTeamCountry || team.country === filterTeamCountry;

            // By default, show only teams in main leagues (Premier League, La Liga, Bundesliga, Serie A, Ligue 1)
            // unless filters are active or showAllTeams is true
            const shouldShow = showAllTeams || filterTeamName || filterTeamCountry || team.isMainLeague;

            return matchesName && matchesCountry && shouldShow;
        });

        console.log('🎨 Rendering team list:', {
            totalTeams: teams.length,
            filteredTeams: filteredTeams.length,
            showAllTeams,
            filterTeamName,
            filterTeamCountry
        });

        // Group teams by country
        const teamsByCountry = filteredTeams.reduce((acc, team) => {
            const country = team.country || 'Unknown';
            if (!acc[country]) acc[country] = [];
            acc[country].push(team);
            return acc;
        }, {});

        // Sort countries alphabetically
        const sortedCountries = Object.keys(teamsByCountry).sort();

        return (
            <div>
                {filteredTeams.length === 0 ? (
                    <div className="empty-state">
                        {teams.length === 0
                            ? 'No teams found. Teams are being populated...'
                            : 'No teams match your filters.'}
                    </div>
                ) : (
                    sortedCountries.map(country => (
                        <div key={country} style={{ marginBottom: '2rem' }}>
                            <h3 style={{
                                fontSize: '1.1rem',
                                color: '#4a5568',
                                marginBottom: '1rem',
                                paddingBottom: '0.5rem',
                                borderBottom: '2px solid #e2e8f0'
                            }}>
                                {country} ({teamsByCountry[country].length})
                            </h3>
                            <div className="player-grid">
                                {teamsByCountry[country].map((team) => (
                                    <div
                                        key={team.id}
                                        className="player-card"
                                        onClick={() => {
                                            console.log('🖱️ CLICK DETECTED on team:', team.name, 'ID:', team.id);
                                            handleViewTeam(team.id);
                                        }}
                                        style={{ cursor: 'pointer' }}
                                    >
                                        <img src={team.logo_url} alt={team.name} className="player-card-photo" style={{ objectFit: 'contain', padding: '1rem' }} />
                                        <div className="player-card-name">{team.name}</div>
                                        <div className="player-card-info">Click to view details</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))
                )}
            </div>
        );
    };

    return (
        <div className="container">
            <h1 className="page-title">Database</h1>

            <div className="tabs" style={{ marginBottom: '2rem' }}>
                <button className={`tab ${activeTab === 'players' ? 'active' : ''}`} onClick={() => setActiveTab('players')}>
                    Players ({players.length})
                </button>
                <button className={`tab ${activeTab === 'teams' ? 'active' : ''}`} onClick={() => setActiveTab('teams')}>
                    Club Info ({teams.length})
                </button>
            </div>

            {activeTab === 'players' && (
                <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'flex-end' }}>
                    <button
                        className={`btn ${verifying ? 'btn-secondary' : 'btn-primary'}`}
                        onClick={handleMassVerify}
                        disabled={verifying}
                    >
                        {verifying ? '🛠️ Verifying Data...' : '🔍 Mass Verify & Repair Data'}
                    </button>
                </div>
            )}

            {verifying && verifyStatus && (
                <div className="card" style={{ marginBottom: '2rem', padding: '1rem', border: '1px solid #667eea', background: '#f0f4ff' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                        <span style={{ fontWeight: 'bold', color: '#4c51bf' }}>Database Verification in Progress</span>
                        <span>{verifyStatus.current} / {verifyStatus.total} Players</span>
                    </div>
                    <div style={{ width: '100%', height: '8px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden', marginBottom: '0.5rem' }}>
                        <div style={{ width: `${(verifyStatus.current / verifyStatus.total) * 100}%`, height: '100%', background: '#667eea', transition: 'width 0.3s ease' }}></div>
                    </div>
                    <div style={{ fontSize: '0.85rem', color: '#4a5568' }}>{verifyStatus.details}</div>
                </div>
            )}

            {error && <div className="error">{error}</div>}

            {activeTab === 'players' && (
                <div className="card" style={{ marginBottom: '2rem', padding: '1rem' }}>
                    <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                        <div style={{ flex: 1, minWidth: '200px' }}>
                            <label style={{ display: 'block', fontSize: '0.8rem', color: '#718096', marginBottom: '0.25rem' }}>Filter by Name</label>
                            <input
                                type="text"
                                className="search-input"
                                placeholder="e.g. Cristiano Ronaldo"
                                value={filterName}
                                onChange={(e) => setFilterName(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && searchPlayers()}
                                style={{ width: '100%' }}
                            />
                        </div>
                        <div style={{ flex: 1, minWidth: '200px' }}>
                            <label style={{ display: 'block', fontSize: '0.8rem', color: '#718096', marginBottom: '0.25rem' }}>Filter by Nationality</label>
                            <select
                                className="search-input"
                                value={filterNationality}
                                onChange={(e) => setFilterNationality(e.target.value)}
                                style={{ width: '100%' }}
                            >
                                <option value="">All Nationalities</option>
                                {nationalities.map(n => <option key={n.id} value={n.id}>{n.name} ({n.player_count})</option>)}
                            </select>
                        </div>
                        <div style={{ flex: 1, minWidth: '200px' }}>
                            <label style={{ display: 'block', fontSize: '0.8rem', color: '#718096', marginBottom: '0.25rem' }}>Filter by Club Name</label>
                            <input
                                type="text"
                                className="search-input"
                                placeholder="e.g. Real Madrid"
                                value={filterClub}
                                onChange={(e) => setFilterClub(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && searchPlayers()}
                                style={{ width: '100%' }}
                            />
                        </div>
                        <button
                            className="btn btn-primary btn-small"
                            onClick={searchPlayers}
                            disabled={loading}
                            style={{ alignSelf: 'flex-end' }}
                        >
                            {loading ? 'Searching...' : 'Search Players'}
                        </button>
                        {(filterNationality || filterClub || filterName || searched) && (
                            <button
                                className="btn btn-secondary btn-small"
                                onClick={() => {
                                    setFilterNationality('');
                                    setFilterClub('');
                                    setFilterName('');
                                    setPlayers([]);
                                    setSearched(false);
                                    setError(null);
                                }}
                                style={{ alignSelf: 'flex-end' }}
                            >
                                Clear All
                            </button>
                        )}
                    </div>
                </div>
            )}

            {activeTab === 'teams' && (
                <div className="card" style={{ marginBottom: '2rem', padding: '1rem' }}>
                    <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                        <div style={{ flex: 1, minWidth: '200px' }}>
                            <label style={{ display: 'block', fontSize: '0.8rem', color: '#718096', marginBottom: '0.25rem' }}>Filter by Team Name</label>
                            <input
                                type="text"
                                className="search-input"
                                placeholder="e.g. Manchester United"
                                value={filterTeamName}
                                onChange={(e) => setFilterTeamName(e.target.value)}
                                style={{ width: '100%' }}
                            />
                        </div>
                        <div style={{ flex: 1, minWidth: '200px' }}>
                            <label style={{ display: 'block', fontSize: '0.8rem', color: '#718096', marginBottom: '0.25rem' }}>Filter by Country</label>
                            <select
                                className="search-input"
                                value={filterTeamCountry}
                                onChange={(e) => setFilterTeamCountry(e.target.value)}
                                style={{ width: '100%' }}
                            >
                                <option value="">All Countries</option>
                                {[...new Set(teams.map(t => t.country).filter(Boolean))].sort().map(c => (
                                    <option key={c} value={c}>{c}</option>
                                ))}
                            </select>
                        </div>
                        {(filterTeamName || filterTeamCountry) && (
                            <button
                                className="btn btn-secondary btn-small"
                                onClick={() => { setFilterTeamName(''); setFilterTeamCountry(''); }}
                                style={{ alignSelf: 'flex-end' }}
                            >
                                Clear Filters
                            </button>
                        )}
                        <button
                            className={`btn ${showAllTeams ? 'btn-secondary' : 'btn-primary'} btn-small`}
                            onClick={() => setShowAllTeams(!showAllTeams)}
                            style={{ alignSelf: 'flex-end' }}
                        >
                            {showAllTeams ? 'Show Main Leagues Only' : 'Show All Teams'}
                        </button>
                    </div>
                </div>
            )}

            {activeTab === 'players' ? renderPlayerGrid() : <TeamsTab />}

            {selectedTeam && (
                <TeamDetailModal
                    selectedTeam={selectedTeam}
                    setSelectedTeam={setSelectedTeam}
                    selectedSeason={selectedSeason}
                    handleSeasonChange={handleSeasonChange}
                />
            )}

            {teamLoading && (
                <div className="modal-overlay">
                    <div className="loading">Loading details...</div>
                </div>
            )}
        </div>
    );
};

export default DatabasePage;
