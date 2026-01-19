import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';

const DatabasePage = () => {
    const [players, setPlayers] = useState([]);
    const [teams, setTeams] = useState([]);
    const [activeTab, setActiveTab] = useState('players');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedTeam, setSelectedTeam] = useState(null);
    const [teamLoading, setTeamLoading] = useState(false);

    // Filter states
    const [filterNationality, setFilterNationality] = useState('');
    const [filterClub, setFilterClub] = useState('');

    // Mass verify states
    const [verifying, setVerifying] = useState(false);
    const [verifyStatus, setVerifyStatus] = useState(null);

    useEffect(() => {
        if (activeTab === 'players') {
            loadPlayers();
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
                        loadPlayers(); // Refresh list after completion
                    }
                } catch (err) {
                    console.error('Failed to get verify status', err);
                }
            }, 2000);
        }
        return () => clearInterval(interval);
    }, [verifying]);

    const loadPlayers = async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await api.getAllPlayers();
            setPlayers(data.players || []);
        } catch (err) {
            setError('Failed to load players');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const loadTeams = async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await api.getAllTeams();
            setTeams(data.teams || []);
        } catch (err) {
            setError('Failed to load teams');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleViewTeam = async (teamId) => {
        setTeamLoading(true);
        try {
            const data = await api.getTeam(teamId);
            setSelectedTeam(data);
        } catch (err) {
            console.error('Failed to load team details', err);
            alert('Failed to load team details');
        } finally {
            setTeamLoading(false);
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

    if (loading && !selectedTeam) {
        return (
            <div className="container">
                <div className="loading">Loading database...</div>
            </div>
        );
    }

    // Derived filtering logic
    const uniqueNationalities = [...new Set(players.map(p => p.nationality))].filter(Boolean).sort();
    const allClubs = players.reduce((acc, p) => {
        if (p.teams) {
            p.teams.split(',').forEach(t => acc.add(t.trim()));
        }
        return acc;
    }, new Set());
    const uniqueClubs = [...allClubs].sort();

    const filteredPlayers = players.filter(player => {
        const matchesNationality = !filterNationality || player.nationality === filterNationality;
        const matchesClub = !filterClub || (player.teams && player.teams.toLowerCase().includes(filterClub.toLowerCase()));
        return matchesNationality && matchesClub;
    });

    const renderPlayerGrid = () => (
        <div className="player-grid">
            {filteredPlayers.length === 0 ? (
                <div className="empty-state">No players found matching your filters.</div>
            ) : (
                filteredPlayers.map((player) => (
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
                        {player.teams && (
                            <div className="player-card-teams" style={{ fontSize: '0.7rem', color: '#718096', marginTop: '0.25rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {player.teams}
                            </div>
                        )}
                    </Link>
                ))
            )}
        </div>
    );

    const renderTeamList = () => (
        <div className="player-grid">
            {teams.length === 0 ? (
                <div className="empty-state">No teams found. Go to Import to add some.</div>
            ) : (
                teams.map((team) => (
                    <div key={team.id} className="player-card" onClick={() => handleViewTeam(team.id)} style={{ cursor: 'pointer' }}>
                        <img src={team.logo_url} alt={team.name} className="player-card-photo" style={{ objectFit: 'contain', padding: '1rem' }} />
                        <div className="player-card-name">{team.name}</div>
                        <div className="player-card-info">Click to view details</div>
                    </div>
                ))
            )}
        </div>
    );

    const renderTeamDetail = () => {
        if (!selectedTeam) return null;
        const { team, standings, trophies, statistics } = selectedTeam;
        return (
            <div className="modal-overlay" onClick={() => setSelectedTeam(null)}>
                <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '900px', width: '95%' }}>
                    <div className="modal-header">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <img src={team.logo_url} alt={team.name} style={{ width: '50px' }} />
                            <h2>{team.name}</h2>
                        </div>
                        <button className="btn btn-primary btn-small" onClick={() => setSelectedTeam(null)}>Close</button>
                    </div>
                    <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>

                        <h3 style={{ margin: '1.5rem 0 1rem' }}>🏆 Trophies</h3>
                        {trophies.length === 0 ? <p>No trophies records found.</p> : (
                            <table className="table">
                                <thead><tr><th>Season</th><th>Trophy</th><th>Place</th></tr></thead>
                                <tbody>
                                    {trophies.map((t, idx) => (
                                        <tr key={idx}><td>{t.season_label}</td><td>{t.trophy_name}</td><td>{t.place}</td></tr>
                                    ))}
                                </tbody>
                            </table>
                        )}

                        <h3 style={{ margin: '1.5rem 0 1rem' }}>📊 Standings</h3>
                        {standings.length === 0 ? <p>No standings found.</p> : (
                            <table className="table">
                                <thead><tr><th>Season</th><th>League</th><th>Rank</th><th>Points</th><th>Form</th></tr></thead>
                                <tbody>
                                    {standings.map((s, idx) => (
                                        <tr key={idx}><td>{s.season_label}</td><td>{s.league_name}</td><td><strong>#{s.rank}</strong></td><td>{s.points}</td><td>{s.form}</td></tr>
                                    ))}
                                </tbody>
                            </table>
                        )}

                        <h3 style={{ margin: '1.5rem 0 1rem' }}>📈 Statistics</h3>
                        {statistics.length === 0 ? <p>No statistics found.</p> : (
                            <table className="table" style={{ fontSize: '0.85rem' }}>
                                <thead>
                                    <tr>
                                        <th>Season</th><th>League</th><th>P</th><th>W</th><th>D</th><th>L</th><th>GF</th><th>GA</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {statistics.map((s, idx) => (
                                        <tr key={idx}>
                                            <td>{s.season_label}</td><td>{s.league_name}</td>
                                            <td>{s.played}</td><td>{s.wins}</td><td>{s.draws}</td><td>{s.losses}</td>
                                            <td>{s.goals_for}</td><td>{s.goals_against}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
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
                            <label style={{ display: 'block', fontSize: '0.8rem', color: '#718096', marginBottom: '0.25rem' }}>Filter by Nationality</label>
                            <select
                                className="search-input"
                                value={filterNationality}
                                onChange={(e) => setFilterNationality(e.target.value)}
                                style={{ width: '100%' }}
                            >
                                <option value="">All Nationalities</option>
                                {uniqueNationalities.map(n => <option key={n} value={n}>{n}</option>)}
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
                                style={{ width: '100%' }}
                            />
                        </div>
                        {(filterNationality || filterClub) && (
                            <button
                                className="btn btn-secondary btn-small"
                                onClick={() => { setFilterNationality(''); setFilterClub(''); }}
                                style={{ alignSelf: 'flex-end' }}
                            >
                                Clear Filters
                            </button>
                        )}
                    </div>
                </div>
            )}

            {activeTab === 'players' ? renderPlayerGrid() : renderTeamList()}

            {selectedTeam && renderTeamDetail()}

            {teamLoading && (
                <div className="modal-overlay">
                    <div className="loading">Loading details...</div>
                </div>
            )}
        </div>
    );
};

export default DatabasePage;
