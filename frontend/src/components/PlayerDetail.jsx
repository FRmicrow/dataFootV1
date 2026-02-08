import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../services/api';

const PlayerDetail = () => {
    const { id } = useParams();
    const [player, setPlayer] = useState(null);
    const [clubs, setClubs] = useState([]);
    const [trophies, setTrophies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeTab, setActiveTab] = useState('championship');

    useEffect(() => {
        const fetchPlayer = async () => {
            try {
                setLoading(true);
                const data = await api.getPlayer(id);
                setPlayer(data.player);
                setClubs(data.clubs || []);
                setTrophies(data.trophies || []);
                setLoading(false);
            } catch (err) {
                console.error('Failed to fetch player details', err);
                setError('Failed to load player data');
                setLoading(false);
            }
        };

        if (id) {
            fetchPlayer();
        }
    }, [id]);

    // Helper to sort seasons descending
    const sortSeasonsDesc = (a, b) => {
        const sa = String(a.season || a.period || "0").split('-')[0];
        const sb = String(b.season || b.period || "0").split('-')[0];
        return parseInt(sb) - parseInt(sa);
    };

    // Process data for view
    const clubSummariesArray = [];
    const allStats = { championship: [], cup: [], international: [], national: [] };
    const nationalTeams = [];

    if (!loading && player) {
        // Group individual season stats into club summaries
        const clubMap = {};

        clubs.forEach(clubSeason => {
            if (!clubMap[clubSeason.club_id]) {
                clubMap[clubSeason.club_id] = {
                    name: clubSeason.club_name,
                    logo: clubSeason.club_logo,
                    seasons: [],
                    matches: 0,
                    goals: 0,
                    assists: 0,
                    trophies: 0
                };
            }

            const summary = clubMap[clubSeason.club_id];
            summary.seasons.push(clubSeason.season);

            // Aggregate stats from all competitions in this season
            clubSeason.competitions.forEach(comp => {
                summary.matches += (comp.matches || 0);
                summary.goals += (comp.goals || 0);
                summary.assists += (comp.assists || 0);

                // Flatten into allStats
                const statEntry = {
                    season: clubSeason.season,
                    competition_name: comp.competition_name,
                    club_name: clubSeason.club_name,
                    club_logo: clubSeason.club_logo,
                    matches: comp.matches,
                    goals: comp.goals,
                    assists: comp.assists,
                    yellow_cards: comp.yellow_cards,
                    red_cards: comp.red_cards
                };

                // Simple heuristic for categorization
                const name = comp.competition_name.toLowerCase();
                if (name.includes('cup') || name.includes('pokal') || name.includes('trophy') || name.includes('shield')) {
                    allStats.cup.push(statEntry);
                } else if (name.includes('champions league') || name.includes('europa') || name.includes('conference') || name.includes('libertadores') || name.includes('world')) {
                    allStats.international.push(statEntry);
                } else {
                    allStats.championship.push(statEntry);
                }
            });
        });

        // Finalize summary array
        Object.values(clubMap).forEach(c => {
            const sortedSeasons = c.seasons.sort((a, b) => parseInt(a) - parseInt(b));
            const distinctSeasons = [...new Set(sortedSeasons)];
            let period = '';
            if (distinctSeasons.length > 0) {
                const start = distinctSeasons[0];
                const end = distinctSeasons[distinctSeasons.length - 1];
                period = start === end ? `${start}` : `${start} - ${end}`;
            }

            clubSummariesArray.push({
                period: period,
                logo: c.logo,
                name: c.name,
                matches: c.matches,
                goals: c.goals,
                assists: c.assists,
                trophies: trophies.filter(t => t.club_name === c.name).length
            });
        });

        // Sort summaries by most recent period
        clubSummariesArray.sort((a, b) => {
            const endA = parseInt(a.period.split('-').pop());
            const endB = parseInt(b.period.split('-').pop());
            return endB - endA;
        });

        // Sort all stats
        allStats.championship.sort(sortSeasonsDesc);
        allStats.cup.sort(sortSeasonsDesc);
        allStats.international.sort(sortSeasonsDesc);
    }

    const renderStatTable = (statsList) => {
        if (!statsList || statsList.length === 0) {
            return (
                <div className="glass-panel" style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
                    No statistics available for this category
                </div>
            );
        }

        return (
            <div className="glass-panel" style={{ marginBottom: '2rem', padding: '1rem' }}>
                <table className="table" style={{ fontSize: '0.9rem' }}>
                    <thead>
                        <tr>
                            <th>Season</th>
                            <th>Competition</th>
                            <th>Club</th>
                            <th>Matches</th>
                            <th>Goals</th>
                            <th>Assists</th>
                            <th>Cards</th>
                        </tr>
                    </thead>
                    <tbody>
                        {statsList.map((stat, idx) => (
                            <tr key={idx}>
                                <td><strong>{stat.season}</strong></td>
                                <td>{stat.competition_name}</td>
                                <td style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    {stat.club_logo && <img src={stat.club_logo} alt={stat.club_name} style={{ width: '20px', height: '20px', objectFit: 'contain' }} />}
                                    {stat.club_name}
                                </td>
                                <td>{stat.matches}</td>
                                <td>{stat.goals}</td>
                                <td>{stat.assists}</td>
                                <td>
                                    {(stat.yellow_cards > 0 || stat.red_cards > 0) ? (
                                        <span>
                                            {stat.yellow_cards > 0 && <span style={{ marginRight: '0.5rem' }}>🟨 {stat.yellow_cards}</span>}
                                            {stat.red_cards > 0 && <span>🟥 {stat.red_cards}</span>}
                                        </span>
                                    ) : '-'}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    };

    if (loading) return (
        <div className="container" style={{ display: 'flex', justifyContent: 'center', paddingTop: '4rem' }}>
            <div className="loading">Loading player details...</div>
        </div>
    );

    if (error) return (
        <div className="container">
            <div className="error">{error}</div>
            <Link to="/database" className="btn btn-secondary" style={{ marginTop: '1rem' }}>Return to Database</Link>
        </div>
    );

    if (!player) return (
        <div className="container">
            <div className="error">Player not found</div>
            <Link to="/database" className="btn btn-secondary" style={{ marginTop: '1rem' }}>Return to Database</Link>
        </div>
    );

    return (
        <div className="container">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <Link to="/database" className="btn" style={{ background: 'rgba(255,255,255,0.1)', color: 'white' }}>
                    ← Back to Database
                </Link>
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
                            border: '4px solid #667eea',
                            objectFit: 'cover'
                        }}
                    />
                    <div>
                        <h1 style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>
                            {player.first_name} {player.last_name}
                        </h1>
                        <p className="text-secondary" style={{ fontSize: '1.125rem' }}>
                            {player.age ? `${player.age} years • ` : ''}{player.nationality}
                        </p>
                    </div>
                </div>

                {/* Career Recap by Club */}
                <div className="glass-panel" style={{ marginBottom: '2rem', padding: '1rem' }}>
                    <h3 className="text-secondary" style={{ marginBottom: '1rem', fontSize: '1.1rem' }}>📊 Career Recap by Club</h3>
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
                            {clubSummariesArray.map((summary, idx) => (
                                <tr key={idx}>
                                    <td><strong>{summary.period}</strong></td>
                                    <td style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <img src={summary.logo} alt={summary.name} style={{ width: '18px', height: '18px', objectFit: 'contain' }} />
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
                    <div className="glass-panel">
                        {nationalTeams.length === 0 ? (
                            <div className="empty-state" style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
                                <p>No national team statistics available</p>
                            </div>
                        ) : (
                            nationalTeams.map((team) => (
                                <div key={team.id} className="club-section">
                                    <div className="club-header">
                                        <h2 className="club-name">{team.name}</h2>
                                    </div>
                                    {/* Table logic for national teams if available */}
                                </div>
                            ))
                        )}
                    </div>
                )}

                {/* Trophies Tab */}
                {activeTab === 'trophies' && (() => {
                    // Group trophies by club/national team
                    const clubTrophies = trophies.filter(t => t.team_name && !String(t.team_name).toLowerCase().includes('portugal') && !String(t.team_name).toLowerCase().includes('national'));
                    const nationalTrophies = trophies.filter(t => !clubTrophies.includes(t));

                    // Sort by year (newest first)
                    const sortByYear = (a, b) => {
                        const yearA = parseInt(a.season_label || a.season || '0');
                        const yearB = parseInt(b.season_label || b.season || '0');
                        return yearB - yearA;
                    };

                    clubTrophies.sort(sortByYear);
                    nationalTrophies.sort(sortByYear);

                    return (
                        <div>
                            {trophies.length === 0 ? (
                                <div className="glass-panel" style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
                                    <p>No trophies recorded</p>
                                </div>
                            ) : (
                                <>
                                    {/* Club Trophies */}
                                    {clubTrophies.length > 0 && (
                                        <div className="glass-panel" style={{ marginBottom: '2rem' }}>
                                            <h3 className="text-secondary" style={{ marginBottom: '1rem', fontSize: '1.1rem' }}>🏆 Club Trophies</h3>
                                            <table className="table" style={{ fontSize: '0.9rem' }}>
                                                <thead>
                                                    <tr>
                                                        <th>Season</th>
                                                        <th>Trophy</th>
                                                        <th>Team</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {clubTrophies.map((trophy, idx) => (
                                                        <tr key={idx}>
                                                            <td><strong>{trophy.season_label || trophy.season}</strong></td>
                                                            <td>{trophy.trophy_name}</td>
                                                            <td>{trophy.team_name || 'N/A'}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}

                                    {/* National Team Trophies */}
                                    {nationalTrophies.length > 0 && (
                                        <div className="glass-panel">
                                            <h3 className="text-secondary" style={{ marginBottom: '1rem', fontSize: '1.1rem' }}>🌍 National Team Trophies</h3>
                                            <table className="table" style={{ fontSize: '0.9rem' }}>
                                                <thead>
                                                    <tr>
                                                        <th>Season</th>
                                                        <th>Trophy</th>
                                                        <th>Team</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {nationalTrophies.map((trophy, idx) => (
                                                        <tr key={idx}>
                                                            <td><strong>{trophy.season_label || trophy.season}</strong></td>
                                                            <td>{trophy.trophy_name}</td>
                                                            <td>{trophy.team_name || 'N/A'}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    );
                })()}
            </div>
        </div>
    );
};

export default PlayerDetail;
