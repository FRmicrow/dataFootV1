import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../services/api';

const PlayerDetail = () => {
    const { id } = useParams();
    const [player, setPlayer] = useState(null);
    const [categorizedStats, setCategorizedStats] = useState(null);
    const [clubSummaries, setClubSummaries] = useState([]);
    const [trophies, setTrophies] = useState([]);
    const [awards, setAwards] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeTab, setActiveTab] = useState('leagues');

    useEffect(() => {
        const fetchPlayer = async () => {
            try {
                setLoading(true);
                const data = await api.getPlayer(id);
                setPlayer(data.player);
                setCategorizedStats(data.stats);
                setTrophies(data.trophies || []);
                setAwards(data.awards || []);

                // Process Club Summaries from the restored grouped 'clubs' array
                if (data.clubs) {
                    const summaries = data.clubs.reduce((acc, clubSeason) => {
                        const clubId = clubSeason.club_id;
                        if (!acc[clubId]) {
                            acc[clubId] = {
                                name: clubSeason.club_name,
                                logo: clubSeason.club_logo,
                                years: [],
                                matches: 0,
                                goals: 0,
                                assists: 0
                            };
                        }

                        const summary = acc[clubId];
                        const year = parseInt(clubSeason.season);
                        if (!isNaN(year)) summary.years.push(year);

                        clubSeason.competitions.forEach(comp => {
                            summary.matches += (comp.matches || 0);
                            summary.goals += (comp.goals || 0);
                            summary.assists += (comp.assists || 0);
                        });

                        return acc;
                    }, {});

                    const sortedSummaries = Object.values(summaries).map(s => {
                        const sortedYears = s.years.sort((a, b) => a - b);
                        const period = sortedYears.length > 0
                            ? (sortedYears[0] === sortedYears[sortedYears.length - 1] ? `${sortedYears[0]}` : `${sortedYears[0]} - ${sortedYears[sortedYears.length - 1]}`)
                            : 'N/A';

                        return {
                            ...s,
                            period,
                            lastYear: sortedYears[sortedYears.length - 1] || 0,
                            trophies: (data.trophies || []).filter(t => t.club_name === s.name).length
                        };
                    }).sort((a, b) => b.lastYear - a.lastYear);

                    setClubSummaries(sortedSummaries);
                }

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

    const renderStatTable = (statsList) => {
        if (!statsList || statsList.length === 0) {
            return (
                <div className="glass-panel" style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
                    No statistics available for this category
                </div>
            );
        }

        return (
            <div className="glass-panel" style={{ marginBottom: '2rem', padding: '1.5rem' }}>
                <table className="table" style={{ fontSize: '0.9rem' }}>
                    <thead>
                        <tr>
                            <th>Season</th>
                            <th>Competition</th>
                            <th>Club</th>
                            <th style={{ textAlign: 'center' }}>Matches</th>
                            <th style={{ textAlign: 'center' }}>Goals</th>
                            <th style={{ textAlign: 'center' }}>Assists</th>
                            <th style={{ textAlign: 'center' }}>Cards</th>
                        </tr>
                    </thead>
                    <tbody>
                        {statsList.map((stat, idx) => (
                            <tr key={idx}>
                                <td><strong>{stat.season}</strong></td>
                                <td>{stat.competition_name}</td>
                                <td style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    {stat.club_logo_url && <img src={stat.club_logo_url} alt={stat.club_name} style={{ width: '20px', height: '20px', objectFit: 'contain' }} />}
                                    {stat.club_name}
                                </td>
                                <td style={{ textAlign: 'center' }}>{stat.matches_played}</td>
                                <td style={{ textAlign: 'center' }}>{stat.goals}</td>
                                <td style={{ textAlign: 'center' }}>{stat.assists}</td>
                                <td style={{ textAlign: 'center' }}>
                                    {(stat.yellow_cards > 0 || stat.red_cards > 0) ? (
                                        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem' }}>
                                            {stat.yellow_cards > 0 && <span>🟨 {stat.yellow_cards}</span>}
                                            {stat.red_cards > 0 && <span>🟥 {stat.red_cards}</span>}
                                        </div>
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
        <div className="container" style={{ padding: '2rem' }}>
            <div className="error">Player not found</div>
            <Link to="/database" className="btn btn-secondary">Return to Database</Link>
        </div>
    );

    return (
        <div className="container" style={{ paddingBottom: '4rem' }}>
            <div style={{ margin: '1rem 0' }}>
                <Link to="/database" className="btn" style={{ background: 'rgba(255,255,255,0.1)', color: 'white' }}>
                    ← Back to Database
                </Link>
            </div>

            <div className="card" style={{ padding: '2rem' }}>
                {/* Header Section */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '2.5rem', marginBottom: '2.5rem' }}>
                    <div style={{ position: 'relative' }}>
                        <img
                            src={player.photo_url}
                            alt={`${player.first_name} ${player.last_name}`}
                            style={{
                                width: '130px',
                                height: '130px',
                                borderRadius: '50%',
                                border: '4px solid #6366f1',
                                boxShadow: '0 8px 16px rgba(0,0,0,0.2)',
                                objectFit: 'cover'
                            }}
                        />
                    </div>
                    <div>
                        <h1 style={{ fontSize: '2.8rem', fontWeight: '800', marginBottom: '0.5rem', letterSpacing: '-0.025em' }}>
                            {player.first_name} {player.last_name}
                        </h1>
                        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', color: '#94a3b8', fontSize: '1.1rem' }}>
                            <span>{player.position}</span>
                            <span>•</span>
                            <span>{player.nationality}</span>
                            {player.date_of_birth && (
                                <>
                                    <span>•</span>
                                    <span>Born {new Date(player.date_of_birth).getFullYear()}</span>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                {/* Career Summary Table */}
                <div className="glass-panel" style={{ marginBottom: '2.5rem', padding: '1.5rem' }}>
                    <h3 style={{ marginBottom: '1.25rem', fontSize: '1.1rem', color: '#818cf8', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        📊 Career Summary by Club
                    </h3>
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Period</th>
                                <th>Club</th>
                                <th style={{ textAlign: 'center' }}>Matches</th>
                                <th style={{ textAlign: 'center' }}>Goals</th>
                                <th style={{ textAlign: 'center' }}>Assists</th>
                                <th style={{ textAlign: 'center' }}>🏆</th>
                            </tr>
                        </thead>
                        <tbody>
                            {clubSummaries.map((s, idx) => (
                                <tr key={idx}>
                                    <td><strong>{s.period}</strong></td>
                                    <td style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                        <img src={s.logo} alt={s.name} style={{ width: '22px', height: '22px', objectFit: 'contain' }} />
                                        {s.name}
                                    </td>
                                    <td style={{ textAlign: 'center' }}>{s.matches}</td>
                                    <td style={{ textAlign: 'center', fontWeight: '600' }}>{s.goals}</td>
                                    <td style={{ textAlign: 'center' }}>{s.assists}</td>
                                    <td style={{ textAlign: 'center', color: '#fbbf24', fontWeight: 'bold' }}>{s.trophies || '-'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Navigation Tabs */}
                <div className="tabs" style={{ marginBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                    <button className={`tab ${activeTab === 'leagues' ? 'active' : ''}`} onClick={() => setActiveTab('leagues')}>League</button>
                    <button className={`tab ${activeTab === 'national_cups' ? 'active' : ''}`} onClick={() => setActiveTab('national_cups')}>National Cup</button>
                    <button className={`tab ${activeTab === 'international_cups' ? 'active' : ''}`} onClick={() => setActiveTab('international_cups')}>International Cup</button>
                    <button className={`tab ${activeTab === 'national_team' ? 'active' : ''}`} onClick={() => setActiveTab('national_team')}>National Team</button>
                    {categorizedStats?.under_23?.length > 0 && (
                        <button className={`tab ${activeTab === 'under_23' ? 'active' : ''}`} onClick={() => setActiveTab('under_23')}>Under 23</button>
                    )}
                    <button className={`tab ${activeTab === 'trophies' ? 'active' : ''}`} onClick={() => setActiveTab('trophies')}>Trophies</button>
                </div>

                {/* Tab Content */}
                {activeTab !== 'trophies' && categorizedStats && renderStatTable(categorizedStats[activeTab])}

                {/* Trophies View */}
                {activeTab === 'trophies' && (() => {
                    const clubTr = trophies.filter(t => ![2, 4, 6].includes(t.trophy_type_id));
                    const ntTr = trophies.filter(t => [2, 4, 6].includes(t.trophy_type_id));

                    return (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                            {trophies.length === 0 ? (
                                <div className="glass-panel" style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>No recorded trophies</div>
                            ) : (
                                <>
                                    {clubTr.length > 0 && (
                                        <div className="glass-panel" style={{ padding: '1.5rem' }}>
                                            <h3 style={{ marginBottom: '1rem', color: '#fbbf24' }}>🏆 Club Honors</h3>
                                            <table className="table">
                                                <thead>
                                                    <tr><th>Season</th><th>Trophy</th><th>Team</th></tr>
                                                </thead>
                                                <tbody>
                                                    {clubTr.map((t, idx) => (
                                                        <tr key={idx}>
                                                            <td><strong>{t.season}</strong></td>
                                                            <td>{t.trophy_name}</td>
                                                            <td>{t.club_name || 'N/A'}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                    {ntTr.length > 0 && (
                                        <div className="glass-panel" style={{ padding: '1.5rem' }}>
                                            <h3 style={{ marginBottom: '1rem', color: '#60a5fa' }}>🌍 National Team Honors</h3>
                                            <table className="table">
                                                <thead>
                                                    <tr><th>Season</th><th>Trophy</th></tr>
                                                </thead>
                                                <tbody>
                                                    {ntTr.map((t, idx) => (
                                                        <tr key={idx}>
                                                            <td><strong>{t.season}</strong></td>
                                                            <td>{t.trophy_name}</td>
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
