
import React, { useState, useEffect } from 'react';
import api from '../services/api';
import './PalmaresPage.css';

const PalmaresPage = () => {
    const [hierarchy, setHierarchy] = useState(null);
    const [countryPriority, setCountryPriority] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({
        team: '',
        country: '',
        competition: '',
        yearStart: '',
        yearEnd: ''
    });

    const [expanded, setExpanded] = useState({
        europe: true,
        countries: {}
    });

    const [historyCache, setHistoryCache] = useState({});
    const [historyLoading, setHistoryLoading] = useState({});

    useEffect(() => {
        loadHierarchy();
    }, []);

    const loadHierarchy = async () => {
        try {
            const data = await api.getPalmaresHierarchy();
            setHierarchy(data.hierarchy);
            setCountryPriority(data.countryPriority);
            setLoading(false);
        } catch (error) {
            console.error(error);
            setLoading(false);
        }
    };

    const toggleCountry = (country) => {
        setExpanded(prev => ({
            ...prev,
            countries: {
                ...prev.countries,
                [country]: !prev.countries[country]
            }
        }));
    };

    const loadHistory = async (trophyId) => {
        if (historyCache[trophyId]) return;

        setHistoryLoading(prev => ({ ...prev, [trophyId]: true }));
        try {
            const data = await api.getTrophyHistory(trophyId, {
                yearStart: filters.yearStart,
                yearEnd: filters.yearEnd
            });
            setHistoryCache(prev => ({ ...prev, [trophyId]: data }));
        } catch (err) {
            console.error(err);
        } finally {
            setHistoryLoading(prev => ({ ...prev, [trophyId]: false }));
        }
    };

    const handleFilterChange = (e) => {
        setFilters({ ...filters, [e.target.name]: e.target.value });
        setHistoryCache({});
    };

    if (loading) return <div className="loading">Loading Palmares...</div>;

    const groupByType = (trophies) => {
        const groups = {
            'National League': [],
            'National Cup': [],
            'League Cup / Other': [],
            'Super Cup': []
        };

        trophies.forEach(t => {
            const name = t.name.toLowerCase();
            if (name.includes('super') || name.includes('shield')) {
                groups['Super Cup'].push(t);
            } else if (name.includes('league cup') || name.includes('coupe de la ligue')) {
                groups['League Cup / Other'].push(t);
            } else if (name.includes('cup') || name.includes('pokal') || name.includes('copa') || name.includes('coupe') || name.includes('coppa') || name.includes('taca')) {
                groups['National Cup'].push(t);
            } else {
                groups['National League'].push(t);
            }
        });
        return groups;
    };

    return (
        <div className="palmares-container">
            <div className="palmares-header">
                <h1 className="palmares-title">🏆 Palmares Management</h1>
            </div>

            {/* Filter Form */}
            <div className="filters-form">
                <div className="filter-group">
                    <label className="filter-label">Team</label>
                    <input
                        name="team"
                        value={filters.team}
                        onChange={handleFilterChange}
                        className="filter-input"
                        placeholder="Filter by Team..."
                    />
                </div>
                <div className="filter-group">
                    <label className="filter-label">Country</label>
                    <select
                        name="country"
                        value={filters.country}
                        onChange={handleFilterChange}
                        className="filter-input"
                    >
                        <option value="">All Countries</option>
                        {countryPriority.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                </div>
                <div className="filter-group">
                    <label className="filter-label">Year Start</label>
                    <input
                        type="number"
                        name="yearStart"
                        value={filters.yearStart}
                        onChange={handleFilterChange}
                        className="filter-input"
                        placeholder="1900"
                    />
                </div>
                <div className="filter-group">
                    <label className="filter-label">Year End</label>
                    <input
                        type="number"
                        name="yearEnd"
                        value={filters.yearEnd}
                        onChange={handleFilterChange}
                        className="filter-input"
                        placeholder="2025"
                    />
                </div>
            </div>

            {/* Accordions */}
            <div className="accordions-list">

                {/* Level 1: European Competitions */}
                <div className="accordion-item">
                    <button
                        onClick={() => setExpanded(prev => ({ ...prev, europe: !prev.europe }))}
                        className="accordion-header"
                    >
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            🌍 European Competitions
                        </span>
                        <span className={`accordion-icon ${expanded.europe ? 'open' : ''}`}>▼</span>
                    </button>

                    {expanded.europe && (
                        <div className="accordion-content">
                            <div className="grid-2">
                                {hierarchy.Europe.map(trophy => (
                                    <CompetitionTable
                                        key={trophy.id}
                                        trophy={trophy}
                                        history={historyCache[trophy.id]}
                                        loading={historyLoading[trophy.id]}
                                        onLoad={() => loadHistory(trophy.id)}
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Level 2: By Country */}
                {Object.keys(hierarchy.Countries)
                    .sort((a, b) => {
                        const idxA = countryPriority.indexOf(a);
                        const idxB = countryPriority.indexOf(b);
                        if (idxA !== -1 && idxB !== -1) return idxA - idxB;
                        if (idxA !== -1) return -1;
                        if (idxB !== -1) return 1;
                        return a.localeCompare(b);
                    })
                    .filter(c => !filters.country || c === filters.country)
                    .map(country => {
                        const trophyGroups = groupByType(hierarchy.Countries[country]);
                        const isExpanded = expanded.countries[country];

                        return (
                            <div key={country} className="accordion-item">
                                <button
                                    onClick={() => toggleCountry(country)}
                                    className="accordion-header"
                                >
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        🏳️ {country}
                                    </span>
                                    <span className={`accordion-icon ${isExpanded ? 'open' : ''}`}>▼</span>
                                </button>

                                {isExpanded && (
                                    <div className="accordion-content">
                                        {Object.entries(trophyGroups).map(([groupName, trophies]) => (
                                            trophies.length > 0 && (
                                                <div key={groupName} style={{ marginBottom: '1.5rem' }}>
                                                    <h3 className="category-title">{groupName}</h3>
                                                    <div className="grid-2">
                                                        {trophies.map(trophy => (
                                                            <CompetitionTable
                                                                key={trophy.id}
                                                                trophy={trophy}
                                                                history={historyCache[trophy.id]}
                                                                loading={historyLoading[trophy.id]}
                                                                onLoad={() => loadHistory(trophy.id)}
                                                            />
                                                        ))}
                                                    </div>
                                                </div>
                                            )
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    })
                }

            </div>
        </div>
    );
};

// Sub-component for individual tables
const CompetitionTable = ({ trophy, history, loading, onLoad }) => {
    const [editMode, setEditMode] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [editingSeason, setEditingSeason] = useState(null);
    const [suggestions, setSuggestions] = useState([]);

    useEffect(() => {
        onLoad();
    }, []);

    const handleEdit = (seasonId) => {
        setEditingSeason(seasonId);
        const currentRec = history.find(h => h.seasonId === seasonId);
        setSearchTerm(currentRec?.winner?.club_name || '');
    };

    const handleSave = async (seasonId, clubName, clubId = null) => {
        try {
            await api.updateTrophyWinner(trophy.id, seasonId, { clubName, clubId });
            setEditingSeason(null);
            onLoad();
        } catch (err) {
            alert("Failed to save: " + err.message);
        }
    };

    const searchClubs = async (term) => {
        setSearchTerm(term);
        if (term.length < 2) { setSuggestions([]); return; }

        try {
            const res = await api.searchTeams(term);
            setSuggestions(res.teams || []);
        } catch (e) { console.error(e); }
    };

    if (loading) return <div className="comp-card" style={{ height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>Loading...</div>;
    if (!history) return null;

    return (
        <div className="comp-card">
            <div className="comp-header">
                <h4 className="comp-title">{trophy.name}</h4>
                <button
                    onClick={() => setEditMode(!editMode)}
                    className={`edit-btn ${editMode ? 'active' : 'inactive'}`}
                >
                    {editMode ? 'Done' : 'Edit'}
                </button>
            </div>

            <div className="comp-body">
                <table className="palmares-table">
                    <thead>
                        <tr>
                            <th style={{ width: '80px' }}>Year</th>
                            <th>Winner</th>
                        </tr>
                    </thead>
                    <tbody>
                        {history.map(row => (
                            <tr key={row.seasonId}>
                                <td className="year-cell">{row.year}</td>
                                <td>
                                    {editMode && editingSeason === row.seasonId ? (
                                        <div className="winner-input-wrapper">
                                            <input
                                                autoFocus
                                                value={searchTerm}
                                                onChange={(e) => searchClubs(e.target.value)}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') handleSave(row.seasonId, searchTerm);
                                                    if (e.key === 'Escape') setEditingSeason(null);
                                                }}
                                                className="winner-input"
                                            />
                                            {suggestions.length > 0 && (
                                                <ul className="suggestions-list">
                                                    {suggestions.map(s => (
                                                        <li
                                                            key={s.id}
                                                            className="suggestion-item"
                                                            onClick={() => handleSave(row.seasonId, s.name, s.id)}
                                                        >
                                                            {s.logo_url && <img src={s.logo_url} className="logo-small" alt="" />}
                                                            {s.name}
                                                        </li>
                                                    ))}
                                                </ul>
                                            )}
                                        </div>
                                    ) : (
                                        <div
                                            onClick={() => editMode && handleEdit(row.seasonId)}
                                            className="winner-cell"
                                            style={editMode ? { cursor: 'pointer', border: '1px dashed #475569', padding: '2px 4px', borderRadius: '4px' } : {}}
                                        >
                                            {row.winner ? (
                                                <>
                                                    {row.winner.logo_url && <img src={row.winner.logo_url} className="logo-small" alt="" />}
                                                    <span style={{ fontWeight: 500 }}>{row.winner.club_name}</span>
                                                </>
                                            ) : (
                                                <span className="empty-dash">-</span>
                                            )}
                                        </div>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default PalmaresPage;
