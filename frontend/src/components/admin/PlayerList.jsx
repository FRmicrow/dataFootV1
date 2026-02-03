import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { NavLink } from 'react-router-dom';

const PlayerList = () => {
    // Filter State
    const [countries, setCountries] = useState([]);
    const [selectedCountry, setSelectedCountry] = useState('');
    const [clubs, setClubs] = useState([]);
    const [selectedClub, setSelectedClub] = useState('');
    const [year, setYear] = useState('2023');
    const [loading, setLoading] = useState(false);

    // Data State
    const [stats, setStats] = useState([]);
    const [activeTab, setActiveTab] = useState('league'); // league, domestic, international
    const [activeFilters, setActiveFilters] = useState([]);

    useEffect(() => {
        fetchCountries();
    }, []);

    useEffect(() => {
        setClubs([]);
        setSelectedClub('');
        if (selectedCountry) {
            fetchClubs(selectedCountry);
        }
    }, [selectedCountry]);

    const fetchCountries = async () => {
        try {
            const res = await axios.get('/api/admin/countries?region=Europe');
            setCountries(res.data);
        } catch (error) {
            console.error("Error fetching countries", error);
        }
    };

    const fetchClubs = async (countryName) => {
        try {
            const res = await axios.get(`/api/admin/clubs-by-country?country=${encodeURIComponent(countryName)}`);
            setClubs(res.data);
        } catch (error) {
            console.error("Error fetching clubs", error);
        }
    };

    const handleSearch = async () => {
        if (!selectedClub || !year) return;
        setLoading(true);
        setStats([]);
        try {
            const res = await axios.get('/api/admin/club-season-stats', {
                params: { clubId: selectedClub, season: year }
            });
            setStats(res.data);
            setActiveFilters([]);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    // --- Data Processing ---
    const categorize = (item) => {
        const typeId = item.trophy_type_id;
        if (typeId === 7) return 'league';
        if ([8, 9, 10].includes(typeId)) return 'domestic';
        if ([1, 3, 5].includes(typeId)) return 'international';
        return 'other';
    };

    const getTabStats = (tabName) => {
        return stats.filter(s => categorize(s) === tabName);
    };

    const currentTabStats = getTabStats(activeTab);

    const competitionsInTab = Array.from(new Set(currentTabStats.map(s => JSON.stringify({ id: s.competition_id, name: s.competition_name }))))
        .map(s => JSON.parse(s));

    const toggleFilter = (compId) => {
        if (activeFilters.includes(compId)) {
            setActiveFilters(activeFilters.filter(id => id !== compId));
        } else {
            setActiveFilters([...activeFilters, compId]);
        }
    };

    let displayStats = currentTabStats;
    if (activeFilters.length > 0) {
        displayStats = displayStats.filter(s => activeFilters.includes(s.competition_id));
    }

    displayStats.sort((a, b) => b.matches_played - a.matches_played);

    return (
        <div className="container" style={{ maxWidth: '1200px' }}>
            <h2 className="page-title" style={{ color: '#333', textAlign: 'left', marginBottom: '1.5rem', textShadow: 'none' }}>
                Player Statistics
            </h2>

            {/* --- Modern Filter Form --- */}
            <div className="modern-search-panel">
                <div className="modern-form-group">
                    <label>Country</label>
                    <select
                        className="modern-select"
                        value={selectedCountry}
                        onChange={e => setSelectedCountry(e.target.value)}
                    >
                        <option value="">-- Select Country --</option>
                        {countries.map(c => <option key={c.country_id} value={c.country_name}>{c.country_name}</option>)}
                    </select>
                </div>
                <div className="modern-form-group">
                    <label>Club</label>
                    <select
                        className="modern-select"
                        value={selectedClub}
                        disabled={!selectedCountry}
                        onChange={e => setSelectedClub(e.target.value)}
                    >
                        <option value="">-- Select Club --</option>
                        {clubs.map(c => <option key={c.club_id} value={c.club_id}>{c.club_name}</option>)}
                    </select>
                </div>
                <div className="modern-form-group">
                    <label>Year</label>
                    <input
                        type="number"
                        className="modern-input"
                        value={year}
                        onChange={e => setYear(e.target.value)}
                    />
                </div>
                <div className="modern-form-group">
                    <button
                        onClick={handleSearch}
                        disabled={!selectedClub || loading}
                        className="modern-button"
                    >
                        {loading ? 'Searching...' : 'Search'}
                    </button>
                </div>
            </div>

            {/* --- Results Section --- */}
            {stats.length > 0 && (
                <div className="modern-results">

                    {/* Header */}
                    <div className="modern-header">
                        <div className="modern-title">
                            {clubs.find(c => c.club_id == selectedClub)?.club_name}
                            <span style={{ fontWeight: '400', color: '#64748b', marginLeft: '0.5rem' }}>{year}</span>
                        </div>
                        <div style={{ fontSize: '0.875rem', color: '#64748b' }}>
                            {displayStats.length} Players
                        </div>
                    </div>

                    {/* Tabs */}
                    <div className="modern-tabs">
                        <button
                            className={`modern-tab ${activeTab === 'league' ? 'active' : ''}`}
                            onClick={() => { setActiveTab('league'); setActiveFilters([]); }}
                        >
                            League
                        </button>
                        <button
                            className={`modern-tab ${activeTab === 'domestic' ? 'active' : ''}`}
                            onClick={() => { setActiveTab('domestic'); setActiveFilters([]); }}
                        >
                            Domestic Cup
                        </button>
                        <button
                            className={`modern-tab ${activeTab === 'international' ? 'active' : ''}`}
                            onClick={() => { setActiveTab('international'); setActiveFilters([]); }}
                        >
                            International
                        </button>
                        <button
                            className={`modern-tab ${activeTab === 'other' ? 'active' : ''}`}
                            onClick={() => { setActiveTab('other'); setActiveFilters([]); }}
                        >
                            Other
                        </button>
                    </div>

                    <div style={{ padding: '1.5rem' }}>
                        {/* Sub-Filters */}
                        {competitionsInTab.length > 1 && (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1.5rem' }}>
                                <span style={{ fontSize: '0.875rem', fontWeight: '600', color: '#64748b', alignSelf: 'center', marginRight: '0.5rem' }}>
                                    Filter:
                                </span>
                                {competitionsInTab.map(comp => (
                                    <button
                                        key={comp.id || 'null'}
                                        onClick={() => toggleFilter(comp.id)}
                                        style={{
                                            padding: '0.25rem 0.75rem',
                                            borderRadius: '9999px',
                                            fontSize: '0.875rem',
                                            border: '1px solid',
                                            cursor: 'pointer',
                                            backgroundColor: activeFilters.includes(comp.id) ? '#4f46e5' : 'white',
                                            color: activeFilters.includes(comp.id) ? 'white' : '#475569',
                                            borderColor: activeFilters.includes(comp.id) ? '#4f46e5' : '#e2e8f0',
                                            transition: 'all 0.2s'
                                        }}
                                    >
                                        {comp.name || 'Unknown'}
                                    </button>
                                ))}
                                {activeFilters.length > 0 && (
                                    <button
                                        onClick={() => setActiveFilters([])}
                                        style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '0.875rem', cursor: 'pointer', textDecoration: 'underline' }}
                                    >
                                        Clear
                                    </button>
                                )}
                            </div>
                        )}

                        {/* Table */}
                        {currentTabStats.length === 0 ? (
                            <div className="empty-state">
                                <div className="empty-state-text">No statistics found in this category.</div>
                            </div>
                        ) : (
                            <div className="modern-table-container">
                                <table className="modern-table">
                                    <thead>
                                        <tr>
                                            <th>Player</th>
                                            <th>Competition</th>
                                            <th style={{ textAlign: 'center' }}>Matches</th>
                                            <th style={{ textAlign: 'center' }}>Goals</th>
                                            <th style={{ textAlign: 'center' }}>Assists</th>
                                            <th style={{ textAlign: 'center' }}>Cards</th>
                                            <th style={{ textAlign: 'right' }}>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {displayStats.length === 0 ? (
                                            <tr><td colSpan="7" style={{ textAlign: 'center', color: '#94a3b8' }}>No players match filter.</td></tr>
                                        ) : (
                                            displayStats.map((stat, idx) => (
                                                <tr key={idx}>
                                                    <td>
                                                        <div className="player-cell">
                                                            <img
                                                                src={stat.photo_url}
                                                                alt={stat.last_name}
                                                                className="player-avatar"
                                                                onError={(e) => e.target.src = 'https://media.api-sports.io/football/players/50.png'}
                                                            />
                                                            <div className="player-info">
                                                                <h4>{stat.first_name} {stat.last_name}</h4>
                                                                <span>{stat.position || 'N/A'}</span>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <div style={{ fontSize: '0.9rem', color: '#475569' }}>
                                                            {stat.competition_name || <span style={{ color: '#ef4444', fontStyle: 'italic' }}>Unknown</span>}
                                                        </div>
                                                    </td>
                                                    <td style={{ textAlign: 'center', fontWeight: 'bold' }}>{stat.matches_played}</td>
                                                    <td style={{ textAlign: 'center' }}>
                                                        {stat.goals > 0 ? <span className="stat-badge stat-goals">{stat.goals}</span> : <span style={{ color: '#cbd5e1' }}>-</span>}
                                                    </td>
                                                    <td style={{ textAlign: 'center' }}>
                                                        {stat.assists > 0 ? <span className="stat-badge stat-assists">{stat.assists}</span> : <span style={{ color: '#cbd5e1' }}>-</span>}
                                                    </td>
                                                    <td style={{ textAlign: 'center' }}>
                                                        <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                                                            {stat.yellow_cards > 0 && (
                                                                <span className="card-icon card-yellow" title={`${stat.yellow_cards} Yellow`}></span>
                                                            )}
                                                            {stat.red_cards > 0 && (
                                                                <span className="card-icon card-red" title={`${stat.red_cards} Red`}></span>
                                                            )}
                                                            {stat.yellow_cards === 0 && stat.red_cards === 0 && <span style={{ color: '#cbd5e1' }}>-</span>}
                                                        </div>
                                                    </td>
                                                    <td style={{ textAlign: 'right' }}>
                                                        <NavLink
                                                            to={`/admin/players/${stat.player_id}`}
                                                            className="action-link"
                                                        >
                                                            View
                                                        </NavLink>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default PlayerList;
