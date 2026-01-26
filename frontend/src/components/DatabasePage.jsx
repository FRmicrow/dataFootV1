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
    const [selectedSeason, setSelectedSeason] = useState(2024); // For year dropdown

    // Filter states
    const [filterNationality, setFilterNationality] = useState('');
    const [filterClub, setFilterClub] = useState('');
    const [filterName, setFilterName] = useState('');

    // Team filter states
    const [filterTeamName, setFilterTeamName] = useState('');
    const [filterTeamCountry, setFilterTeamCountry] = useState('');
    const [showAllTeams, setShowAllTeams] = useState(false); // By default, show only main countries

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
            console.log('📡 Fetching team base data...');
            const baseData = await api.getTeam(teamId, season);

            console.log('📡 Fetching separate statistics...');
            try {
                const statsData = await api.getTeamStatistics(teamId, season);
                if (statsData && statsData.statistics) {
                    console.log('✅ Statistics received separately');
                    baseData.statistics = statsData.statistics;
                }
            } catch (statErr) {
                console.warn('⚠️ Failed to fetch separate statistics:', statErr);
            }

            console.log('📡 Fetching separate trophies...');
            try {
                const trophiesData = await api.getTeamTrophies(teamId);
                if (trophiesData && trophiesData.trophies) {
                    console.log('✅ Trophies received separately');
                    baseData.trophies = trophiesData.trophies;
                }
            } catch (trophyErr) {
                console.warn('⚠️ Failed to fetch separate trophies:', trophyErr);
            }

            console.log('✅ Final Combined Team Data:', baseData);
            setSelectedTeam(baseData);
            setSelectedSeason(season);
        } catch (err) {
            console.error('❌ Failed to load team details', err);
            alert('Failed to load team details: ' + err.message);
        } finally {
            setTeamLoading(false);
        }
    };

    const handleSeasonChange = async (newSeason) => {
        if (selectedTeam) {
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
        const matchesName = !filterName ||
            `${player.first_name} ${player.last_name}`.toLowerCase().includes(filterName.toLowerCase());
        return matchesNationality && matchesClub && matchesName;
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

    // NEW TEAM DETAIL MODAL WITH 3 SECTIONS
    const renderTeamDetail = () => {
        if (!selectedTeam) return null;
        const { team, statistics, teamDetails, trophies, leagueId } = selectedTeam;

        // Generate year options (2010 to 2024)
        const yearOptions = [];
        for (let year = 2024; year >= 2010; year--) {
            yearOptions.push(year);
        }

        return (
            <div className="modal-overlay" onClick={() => setSelectedTeam(null)}>
                <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '1100px', width: '95%' }}>
                    {/* HEADER */}
                    <div className="modal-header">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <img src={team.logo_url} alt={team.name} style={{ width: '60px', height: '60px', objectFit: 'contain' }} />
                            <div>
                                <h2 style={{ margin: 0 }}>{team.name}</h2>
                                {team.country && <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.9rem', color: '#718096' }}>{team.country}</p>}
                            </div>
                        </div>
                        <button className="btn btn-primary btn-small" onClick={() => setSelectedTeam(null)}>Close</button>
                    </div>

                    <div className="modal-body" style={{ maxHeight: '75vh', overflowY: 'auto', padding: '1.5rem' }}>

                        {/* SECTION 1: CLUB DESCRIPTION */}
                        <div style={{ marginBottom: '2rem', padding: '1.5rem', background: '#f7fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                            <h3 style={{ margin: '0 0 1rem', fontSize: '1.3rem', color: '#2d3748', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                ℹ️ Club Information
                            </h3>
                            {teamDetails && teamDetails.venue ? (
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                                    {teamDetails.team?.founded && (
                                        <div>
                                            <strong style={{ color: '#4a5568', fontSize: '0.9rem' }}>Founded:</strong>
                                            <p style={{ margin: '0.25rem 0 0', fontSize: '1.1rem', color: '#2d3748' }}>{teamDetails.team.founded}</p>
                                        </div>
                                    )}
                                    {teamDetails.venue?.name && (
                                        <div>
                                            <strong style={{ color: '#4a5568', fontSize: '0.9rem' }}>Stadium:</strong>
                                            <p style={{ margin: '0.25rem 0 0', fontSize: '1.1rem', color: '#2d3748' }}>{teamDetails.venue.name}</p>
                                        </div>
                                    )}
                                    {teamDetails.venue?.capacity && (
                                        <div>
                                            <strong style={{ color: '#4a5568', fontSize: '0.9rem' }}>Capacity:</strong>
                                            <p style={{ margin: '0.25rem 0 0', fontSize: '1.1rem', color: '#2d3748' }}>{teamDetails.venue.capacity.toLocaleString()}</p>
                                        </div>
                                    )}
                                    {teamDetails.venue?.city && (
                                        <div>
                                            <strong style={{ color: '#4a5568', fontSize: '0.9rem' }}>Location:</strong>
                                            <p style={{ margin: '0.25rem 0 0', fontSize: '1.1rem', color: '#2d3748' }}>{teamDetails.venue.city}, {team.country}</p>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <p style={{ color: '#718096', fontStyle: 'italic', margin: 0 }}>Club information not available</p>
                            )}
                        </div>

                        {/* SECTION 2: SEASON STATISTICS */}
                        <div style={{ marginBottom: '2rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                <h3 style={{ margin: 0, fontSize: '1.3rem', color: '#2d3748', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    📊 Season Statistics
                                </h3>
                                <select
                                    value={selectedSeason}
                                    onChange={(e) => handleSeasonChange(parseInt(e.target.value))}
                                    style={{
                                        padding: '0.5rem 1rem',
                                        fontSize: '1rem',
                                        borderRadius: '8px',
                                        border: '2px solid #e2e8f0',
                                        background: 'white',
                                        cursor: 'pointer',
                                        fontWeight: 'bold',
                                        color: '#2d3748'
                                    }}
                                >
                                    {yearOptions.map(year => (
                                        <option key={year} value={year}>{year - 1}/{year}</option>
                                    ))}
                                </select>
                            </div>

                            {statistics && statistics.fixtures ? (
                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                                    gap: '1rem',
                                    padding: '1.5rem',
                                    background: '#ffffff',
                                    borderRadius: '12px',
                                    border: '1px solid #e2e8f0'
                                }}>
                                    {/* Fixtures */}
                                    <div style={{ padding: '1rem', background: '#f7fafc', borderRadius: '8px', textAlign: 'center' }}>
                                        <h5 style={{ margin: '0 0 0.75rem', color: '#4a5568', fontSize: '0.9rem', textTransform: 'uppercase' }}>Matches Played</h5>
                                        <p style={{ fontSize: '2rem', fontWeight: 'bold', margin: 0, color: '#2d3748' }}>
                                            {statistics.fixtures?.played?.total || 0}
                                        </p>
                                    </div>

                                    {/* Wins */}
                                    <div style={{ padding: '1rem', background: '#f0fdf4', borderRadius: '8px', textAlign: 'center' }}>
                                        <h5 style={{ margin: '0 0 0.75rem', color: '#15803d', fontSize: '0.9rem', textTransform: 'uppercase' }}>Wins</h5>
                                        <p style={{ fontSize: '2rem', fontWeight: 'bold', margin: 0, color: '#15803d' }}>
                                            {statistics.fixtures?.wins?.total || 0}
                                        </p>
                                    </div>

                                    {/* Draws */}
                                    <div style={{ padding: '1rem', background: '#fffbeb', borderRadius: '8px', textAlign: 'center' }}>
                                        <h5 style={{ margin: '0 0 0.75rem', color: '#b45309', fontSize: '0.9rem', textTransform: 'uppercase' }}>Draws</h5>
                                        <p style={{ fontSize: '2rem', fontWeight: 'bold', margin: 0, color: '#b45309' }}>
                                            {statistics.fixtures?.draws?.total || 0}
                                        </p>
                                    </div>

                                    {/* Losses */}
                                    <div style={{ padding: '1rem', background: '#fef2f2', borderRadius: '8px', textAlign: 'center' }}>
                                        <h5 style={{ margin: '0 0 0.75rem', color: '#dc2626', fontSize: '0.9rem', textTransform: 'uppercase' }}>Losses</h5>
                                        <p style={{ fontSize: '2rem', fontWeight: 'bold', margin: 0, color: '#dc2626' }}>
                                            {statistics.fixtures?.loses?.total || 0}
                                        </p>
                                    </div>

                                    {/* Goals For */}
                                    <div style={{ padding: '1rem', background: '#eff6ff', borderRadius: '8px', textAlign: 'center' }}>
                                        <h5 style={{ margin: '0 0 0.75rem', color: '#1e40af', fontSize: '0.9rem', textTransform: 'uppercase' }}>Goals Scored</h5>
                                        <p style={{ fontSize: '2rem', fontWeight: 'bold', margin: 0, color: '#1e40af' }}>
                                            {statistics.goals?.for?.total?.total || 0}
                                        </p>
                                    </div>

                                    {/* Goals Against */}
                                    <div style={{ padding: '1rem', background: '#fef2f2', borderRadius: '8px', textAlign: 'center' }}>
                                        <h5 style={{ margin: '0 0 0.75rem', color: '#dc2626', fontSize: '0.9rem', textTransform: 'uppercase' }}>Goals Conceded</h5>
                                        <p style={{ fontSize: '2rem', fontWeight: 'bold', margin: 0, color: '#dc2626' }}>
                                            {statistics.goals?.against?.total?.total || 0}
                                        </p>
                                    </div>

                                    {/* Clean Sheets */}
                                    <div style={{ padding: '1rem', background: '#f0f9ff', borderRadius: '8px', textAlign: 'center' }}>
                                        <h5 style={{ margin: '0 0 0.75rem', color: '#0369a1', fontSize: '0.9rem', textTransform: 'uppercase' }}>Clean Sheets</h5>
                                        <p style={{ fontSize: '2rem', fontWeight: 'bold', margin: 0, color: '#0369a1' }}>
                                            {statistics.clean_sheet?.total || 0}
                                        </p>
                                    </div>

                                    {/* Form */}
                                    {statistics.form && (
                                        <div style={{ padding: '1rem', background: '#f5f3ff', borderRadius: '8px', textAlign: 'center' }}>
                                            <h5 style={{ margin: '0 0 0.75rem', color: '#6d28d9', fontSize: '0.9rem', textTransform: 'uppercase' }}>Recent Form</h5>
                                            <p style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: 0, color: '#6d28d9', letterSpacing: '0.1em' }}>
                                                {statistics.form}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div style={{ padding: '2rem', textAlign: 'center', background: '#f7fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                                    <p style={{ color: '#718096', fontStyle: 'italic', margin: 0 }}>
                                        No statistics available for the {selectedSeason - 1}/{selectedSeason} season
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* SECTION 3: TROPHY CABINET */}
                        <div style={{ marginBottom: '1rem' }}>
                            <h3 style={{ margin: '0 0 1rem', fontSize: '1.3rem', color: '#2d3748', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                🏆 Trophy Cabinet
                            </h3>

                            {!trophies || trophies.length === 0 ? (
                                <div style={{ padding: '2rem', textAlign: 'center', background: '#f7fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                                    <p style={{ color: '#718096', fontStyle: 'italic', margin: 0 }}>
                                        No trophies recorded in database.
                                    </p>
                                </div>
                            ) : (
                                <div>
                                    {/* Group trophies by type */}
                                    {(() => {
                                        // Group by type
                                        const grouped = {};
                                        trophies.forEach(trophy => {
                                            const type = trophy.type || 'Other';
                                            if (!grouped[type]) grouped[type] = [];
                                            grouped[type].push(trophy);
                                        });

                                        // Get category display name
                                        const getCategoryName = (type) => {
                                            if (type === 'championship') return '🏆 Championships';
                                            if (type === 'national_cup') return '🥇 National Cups';
                                            if (type === 'international_cup') return '🌍 International Cups';
                                            return `🏆 ${type}`;
                                        };

                                        return Object.entries(grouped).map(([type, typeTrophies]) => (
                                            <div key={type} style={{ marginBottom: '2rem' }}>
                                                <h4 style={{ margin: '0 0 1rem', color: '#2d3748', fontSize: '1.1rem', borderBottom: '2px solid #e2e8f0', paddingBottom: '0.5rem' }}>
                                                    {getCategoryName(type)}
                                                </h4>

                                                <div style={{
                                                    display: 'grid',
                                                    gap: '1rem',
                                                    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))'
                                                }}>
                                                    {typeTrophies.map((trophy, idx) => (
                                                        <div key={idx} style={{
                                                            padding: '1.25rem',
                                                            background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                                                            borderRadius: '12px',
                                                            border: '2px solid #e2e8f0',
                                                            boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                                                            transition: 'all 0.2s',
                                                            cursor: 'default'
                                                        }}
                                                            onMouseEnter={(e) => {
                                                                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
                                                                e.currentTarget.style.transform = 'translateY(-2px)';
                                                            }}
                                                            onMouseLeave={(e) => {
                                                                e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.05)';
                                                                e.currentTarget.style.transform = 'translateY(0)';
                                                            }}>
                                                            {/* Competition name and title count */}
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                                                                <strong style={{ fontSize: '1rem', color: '#1a202c', flex: 1 }}>
                                                                    {trophy.competition}
                                                                </strong>
                                                                {trophy.titles > 0 && (
                                                                    <span style={{
                                                                        background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                                                                        color: 'white',
                                                                        padding: '0.35rem 0.85rem',
                                                                        borderRadius: '16px',
                                                                        fontSize: '0.9rem',
                                                                        fontWeight: 'bold',
                                                                        boxShadow: '0 2px 4px rgba(245, 158, 11, 0.3)'
                                                                    }}>
                                                                        🏆 {trophy.titles}×
                                                                    </span>
                                                                )}
                                                            </div>

                                                            {/* Winning years */}
                                                            {trophy.titles > 0 && (
                                                                <div style={{ marginBottom: '0.75rem' }}>
                                                                    <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '600', marginBottom: '0.35rem' }}>
                                                                        🏆 Winner:
                                                                    </div>
                                                                    <div style={{
                                                                        fontSize: '0.85rem',
                                                                        color: '#0f172a',
                                                                        lineHeight: '1.6',
                                                                        padding: '0.5rem',
                                                                        background: '#fef3c7',
                                                                        borderRadius: '6px',
                                                                        border: '1px solid #fde68a'
                                                                    }}>
                                                                        {trophy.years.join(', ')}
                                                                    </div>
                                                                </div>
                                                            )}

                                                            {/* Runner-up years */}
                                                            {trophy.runnersUp > 0 && (
                                                                <div style={{ marginBottom: '0.75rem' }}>
                                                                    <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '600', marginBottom: '0.35rem' }}>
                                                                        🥈 Runner-up ({trophy.runnersUp}×):
                                                                    </div>
                                                                    <div style={{
                                                                        fontSize: '0.85rem',
                                                                        color: '#475569',
                                                                        lineHeight: '1.6',
                                                                        padding: '0.5rem',
                                                                        background: '#e0e7ff',
                                                                        borderRadius: '6px',
                                                                        border: '1px solid #c7d2fe'
                                                                    }}>
                                                                        {trophy.runnersUpYears.join(', ')}
                                                                    </div>
                                                                </div>
                                                            )}

                                                            {/* Third place years */}
                                                            {trophy.third > 0 && (
                                                                <div>
                                                                    <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '600', marginBottom: '0.35rem' }}>
                                                                        🥉 Third Place ({trophy.third}×):
                                                                    </div>
                                                                    <div style={{
                                                                        fontSize: '0.85rem',
                                                                        color: '#475569',
                                                                        lineHeight: '1.6',
                                                                        padding: '0.5rem',
                                                                        background: '#fed7aa',
                                                                        borderRadius: '6px',
                                                                        border: '1px solid #fdba74'
                                                                    }}>
                                                                        {trophy.thirdYears.join(', ')}
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ));
                                    })()}

                                    {/* Total trophy count */}
                                    <div style={{
                                        marginTop: '2rem',
                                        padding: '1.25rem',
                                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                        borderRadius: '12px',
                                        textAlign: 'center',
                                        boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)'
                                    }}>
                                        <div style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.9)', marginBottom: '0.25rem' }}>
                                            Total Championships Won
                                        </div>
                                        <strong style={{ fontSize: '2rem', color: 'white', fontWeight: 'bold' }}>
                                            {trophies.reduce((sum, t) => sum + (t.titles || 0), 0)}
                                        </strong>
                                    </div>
                                </div>
                            )}
                        </div>
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
                            <label style={{ display: 'block', fontSize: '0.8rem', color: '#718096', marginBottom: '0.25rem' }}>Filter by Name</label>
                            <input
                                type="text"
                                className="search-input"
                                placeholder="e.g. Cristiano Ronaldo"
                                value={filterName}
                                onChange={(e) => setFilterName(e.target.value)}
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
                        {(filterNationality || filterClub || filterName) && (
                            <button
                                className="btn btn-secondary btn-small"
                                onClick={() => { setFilterNationality(''); setFilterClub(''); setFilterName(''); }}
                                style={{ alignSelf: 'flex-end' }}
                            >
                                Clear Filters
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
