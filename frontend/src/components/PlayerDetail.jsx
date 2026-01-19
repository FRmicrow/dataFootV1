import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../services/api';

const PlayerDetail = () => {
    const { id } = useParams();
    const [playerData, setPlayerData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeTab, setActiveTab] = useState('championship');

    useEffect(() => {
        loadPlayer();
    }, [id]);

    const loadPlayer = async () => {
        setLoading(true);
        setError(null);

        try {
            const data = await api.getPlayer(id);
            setPlayerData(data);
        } catch (err) {
            setError('Failed to load player data');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const sortSeasonsDesc = (a, b) => {
        const yearA = parseInt(a.season.split('/')[0]) || parseInt(a.season);
        const yearB = parseInt(b.season.split('/')[0]) || parseInt(b.season);
        return yearB - yearA;
    };

    const [syncing, setSyncing] = useState(false);

    const handleRefresh = async () => {
        setSyncing(true);
        try {
            await api.syncPlayer(id);
            await loadPlayer(); // Reload data after sync
            alert('Player data refreshed successfully!');
        } catch (err) {
            console.error('Sync failed:', err);
            alert('Failed to refresh player data. Please try again.');
        } finally {
            setSyncing(false);
        }
    };

    if (loading) {
        return (
            <div className="container">
                <div className="loading">Loading player data...</div>
            </div>
        );
    }

    if (error || !playerData) {
        return (
            <div className="container">
                <div className="card">
                    <div className="error">{error || 'Player not found'}</div>
                    <Link to="/database">
                        <button className="btn btn-primary">Back to Database</button>
                    </Link>
                </div>
            </div>
        );
    }

    const { player, clubs, nationalTeams, trophies } = playerData;

    // Aggregate Career Recap by Club
    const clubSummaries = clubs.map(club => {
        const years = club.seasons.map(s => parseInt(s.season.split('/')[0]) || parseInt(s.season));
        const firstYear = Math.min(...years);
        const lastYear = Math.max(...years);

        const totalMatches = club.seasons.reduce((acc, s) => acc + (s.matches || 0), 0);
        const totalGoals = club.seasons.reduce((acc, s) => acc + (s.goals || 0), 0);
        const totalAssists = club.seasons.reduce((acc, s) => acc + (s.assists || 0), 0);

        const clubTrophies = trophies.filter(t =>
            t.team_name?.toLowerCase() === club.name.toLowerCase() ||
            t.team_id === club.id
        ).length;

        return {
            name: club.name,
            logo: club.logo,
            period: firstYear === lastYear ? `${firstYear}` : `${firstYear} - ${lastYear}`,
            matches: totalMatches,
            goals: totalGoals,
            assists: totalAssists,
            trophies: clubTrophies
        };
    }).sort((a, b) => {
        const yearA = parseInt(a.period.split(' - ')[0]) || parseInt(a.period);
        const yearB = parseInt(b.period.split(' - ')[0]) || parseInt(b.period);
        return yearB - yearA;
    });

    // Process and categorize club stats based on backend classification
    const allStats = clubs.reduce((acc, club) => {
        club.seasons.forEach(season => {
            // Use backend classification, default to 'championship' if not classified
            const category = season.competition_type || 'championship';

            // Only include if we have a valid category
            if (acc[category]) {
                acc[category].push({
                    ...season,
                    clubName: club.name,
                    clubLogo: club.logo
                });
            }
        });
        return acc;
    }, { championship: [], cup: [], international: [] });

    // Sort all categories by season DESC
    allStats.championship.sort(sortSeasonsDesc);
    allStats.cup.sort(sortSeasonsDesc);
    allStats.international.sort(sortSeasonsDesc);

    const renderStatTable = (stats) => (
        <table className="table" style={{ fontSize: '0.9rem' }}>
            <thead>
                <tr>
                    <th>Year</th>
                    <th>Team</th>
                    <th>Competition</th>
                    <th>Matches</th>
                    <th>Goals</th>
                    <th>Assists</th>
                </tr>
            </thead>
            <tbody>
                {stats.length === 0 ? (
                    <tr><td colSpan="6" className="text-center">No data available</td></tr>
                ) : (
                    stats.map((stat, idx) => (
                        <tr key={idx}>
                            <td><strong>{stat.season}</strong></td>
                            <td style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <img src={stat.clubLogo} alt={stat.clubName} style={{ width: '20px', height: '20px' }} />
                                {stat.clubName}
                            </td>
                            <td>{stat.league}</td>
                            <td>{stat.matches}</td>
                            <td>{stat.goals}</td>
                            <td>{stat.assists}</td>
                        </tr>
                    ))
                )}
            </tbody>
        </table>
    );

    return (
        <div className="container">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <Link to="/database" className="back-button" style={{ marginBottom: 0 }}>
                    ← Back to Database
                </Link>
                <button
                    className={`btn ${syncing ? 'btn-secondary' : 'btn-primary'}`}
                    onClick={handleRefresh}
                    disabled={syncing}
                >
                    {syncing ? 'Refreshing...' : '🔄 Refresh Data'}
                </button>
            </div>

            <div className="card">
                <div style={{ display: 'flex', alignItems: 'center', gap: '2rem', marginBottom: '2rem' }}>
                    <img
                        src={player.photo_url}
                        alt={`${player.first_name} ${player.last_name}`}
                        style={{
                            width: '120px',
                            height: '120px',
                            borderRadius: '50%',
                            border: '4px solid #667eea'
                        }}
                    />
                    <div>
                        <h1 style={{ fontSize: '2.5rem', marginBottom: '0.5rem', color: '#2d3748' }}>
                            {player.first_name} {player.last_name}
                        </h1>
                        <p style={{ fontSize: '1.125rem', color: '#718096' }}>
                            {player.age} years • {player.nationality}
                        </p>
                    </div>
                </div>

                {/* Career Recap by Club */}
                <div style={{ marginBottom: '2rem', padding: '1rem', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    <h3 style={{ marginBottom: '1rem', color: '#4a5568', fontSize: '1.1rem' }}>📊 Career Recap by Club</h3>
                    <table className="table" style={{ fontSize: '0.9rem' }}>
                        <thead>
                            <tr>
                                <th>Period</th>
                                <th>Club</th>
                                <th>Matches</th>
                                <th>Goals</th>
                                <th>Assists</th>
                                <th>🏆</th>
                            </tr>
                        </thead>
                        <tbody>
                            {clubSummaries.map((summary, idx) => (
                                <tr key={idx}>
                                    <td><strong>{summary.period}</strong></td>
                                    <td style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <img src={summary.logo} alt={summary.name} style={{ width: '18px', height: '18px' }} />
                                        {summary.name}
                                    </td>
                                    <td>{summary.matches}</td>
                                    <td>{summary.goals}</td>
                                    <td>{summary.assists}</td>
                                    <td><strong>{summary.trophies}</strong></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="tabs">
                    <button
                        className={`tab ${activeTab === 'championship' ? 'active' : ''}`}
                        onClick={() => setActiveTab('championship')}
                    >
                        Championship
                    </button>
                    <button
                        className={`tab ${activeTab === 'cup' ? 'active' : ''}`}
                        onClick={() => setActiveTab('cup')}
                    >
                        National Cup
                    </button>
                    <button
                        className={`tab ${activeTab === 'international' ? 'active' : ''}`}
                        onClick={() => setActiveTab('international')}
                    >
                        International Cup
                    </button>
                    <button
                        className={`tab ${activeTab === 'national' ? 'active' : ''}`}
                        onClick={() => setActiveTab('national')}
                    >
                        National Team
                    </button>
                    <button
                        className={`tab ${activeTab === 'trophies' ? 'active' : ''}`}
                        onClick={() => setActiveTab('trophies')}
                    >
                        Trophies
                    </button>
                </div>

                {/* Content Sections */}
                {activeTab === 'championship' && renderStatTable(allStats.championship)}
                {activeTab === 'cup' && renderStatTable(allStats.cup)}
                {activeTab === 'international' && renderStatTable(allStats.international)}

                {/* National Team Tab */}
                {activeTab === 'national' && (
                    <div>
                        {nationalTeams.length === 0 ? (
                            <div className="empty-state">
                                <p>No national team statistics available</p>
                            </div>
                        ) : (
                            nationalTeams.map((team) => (
                                <div key={team.id} className="club-section">
                                    <div className="club-header">
                                        <h2 className="club-name">{team.name}</h2>
                                    </div>

                                    <table className="table" style={{ fontSize: '0.9rem' }}>
                                        <thead>
                                            <tr>
                                                <th>Season</th>
                                                <th>Competition</th>
                                                <th>Matches</th>
                                                <th>Goals</th>
                                                <th>Assists</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {team.seasons.sort(sortSeasonsDesc).map((season, idx) => (
                                                <tr key={idx}>
                                                    <td><strong>{season.season}</strong></td>
                                                    <td>{season.league}</td>
                                                    <td>{season.matches}</td>
                                                    <td>{season.goals}</td>
                                                    <td>{season.assists}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ))
                        )}
                    </div>
                )}

                {/* Trophies Tab */}
                {activeTab === 'trophies' && (
                    <div>
                        {trophies.length === 0 ? (
                            <div className="empty-state">
                                <p>No trophies recorded</p>
                            </div>
                        ) : (
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th>Season</th>
                                        <th>Trophy</th>
                                        <th>Team</th>
                                        <th>Type</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {trophies.sort((a, b) => (parseInt(b.season) || 0) - (parseInt(a.season) || 0)).map((trophy, idx) => (
                                        <tr key={idx}>
                                            <td><strong>{trophy.season}</strong></td>
                                            <td>{trophy.trophy_name}</td>
                                            <td>{trophy.team_name || 'N/A'}</td>
                                            <td>{trophy.trophy_type || 'N/A'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default PlayerDetail;
