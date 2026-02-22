import React, { useState, useEffect, useCallback, useRef } from 'react';
import api from '../../services/api';
import { useNavigate } from 'react-router-dom';
import './SearchPageV3.css';

const CountrySelector = ({ countries, selected, onSelect }) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef(null);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const selectedCountryData = countries.find(c => c.name === selected);
    const top10 = countries.filter(c => c.importance_rank <= 10);
    const others = countries.filter(c => c.importance_rank > 10);

    return (
        <div className="custom-dropdown" ref={containerRef}>
            <div
                className={`dropdown-trigger ${isOpen ? 'active' : ''}`}
                onClick={() => setIsOpen(!isOpen)}
            >
                {selected ? (
                    <div className="selected-val">
                        <img src={selectedCountryData?.flag_url} alt="" className="mini-flag" />
                        <span>{selected}</span>
                    </div>
                ) : (
                    <div className="selected-val">
                        <span className="globe">🌍</span>
                        <span>All Regions</span>
                    </div>
                )}
                <span className={`chevron ${isOpen ? 'up' : 'down'}`}>▼</span>
            </div>

            {isOpen && (
                <div className="dropdown-menu animate-fade-in-down">
                    <div className="menu-item all" onClick={() => { onSelect(''); setIsOpen(false); }}>
                        🌍 All Regions
                    </div>

                    {top10.length > 0 && (
                        <div className="menu-group">
                            <div className="group-label">Top 10 Nations</div>
                            {top10.map(c => (
                                <div
                                    key={c.name}
                                    className={`menu-item ${selected === c.name ? 'active' : ''}`}
                                    onClick={() => { onSelect(c.name); setIsOpen(false); }}
                                >
                                    <img src={c.flag_url} alt="" className="mini-flag" />
                                    <span>{c.name}</span>
                                    <span className="rank">#{c.importance_rank}</span>
                                </div>
                            ))}
                        </div>
                    )}

                    {others.length > 0 && (
                        <div className="menu-group">
                            <div className="group-label">Other Regions</div>
                            {others.map(c => (
                                <div
                                    key={c.name}
                                    className={`menu-item ${selected === c.name ? 'active' : ''}`}
                                    onClick={() => { onSelect(c.name); setIsOpen(false); }}
                                >
                                    <img src={c.flag_url} alt="" className="mini-flag" />
                                    <span>{c.name}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

const SearchPageV3 = () => {
    const [query, setQuery] = useState('');
    const [type, setType] = useState('all');
    const [country, setCountry] = useState('');
    const [countries, setCountries] = useState([]);
    const [results, setResults] = useState({ players: [], clubs: [] });
    const [loading, setLoading] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);
    const navigate = useNavigate();
    const debounceRef = useRef(null);
    const inputRef = useRef(null);

    // Fetch countries for filter dropdown
    useEffect(() => {
        api.getSearchCountries()
            .then(data => setCountries(data))
            .catch(err => console.error("Failed to fetch countries", err));
    }, []);

    // Debounced search
    const doSearch = useCallback(async (searchQuery, searchType, searchCountry) => {
        if (!searchQuery || searchQuery.length < 2) {
            setResults({ players: [], clubs: [] });
            setHasSearched(false);
            return;
        }

        setLoading(true);
        try {
            const params = { q: searchQuery, type: searchType };
            if (searchCountry) params.country = searchCountry;

            const data = await api.search(params);
            setResults(data);
            setHasSearched(true);
        } catch (error) {
            console.error("Search failed:", error);
        }
        setLoading(false);
    }, []);

    useEffect(() => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
            doSearch(query, type, country);
        }, 300);
        return () => clearTimeout(debounceRef.current);
    }, [query, type, country, doSearch]);

    const totalResults = (results.players?.length || 0) + (results.clubs?.length || 0);

    return (
        <div className="search-page-v3">
            <div className="search-hero-bg"></div>

            <div className="search-content-container">
                {/* Header Section (US_101 - Clean SaaS High-Density) */}
                <header className="search-header-premium">
                    <h1>Search Engine</h1>
                    <p className="search-subtitle">Accessing 50+ professional leagues & 320,000+ player statistical profiles</p>
                </header>

                {/* Search Box Box */}
                <div className="search-box-container">
                    <div className="search-input-glass">
                        <span className="search-icon-main">🔍</span>
                        <input
                            ref={inputRef}
                            type="text"
                            className="search-input-field"
                            placeholder="Search by player name or club brand..."
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            autoFocus
                        />
                        {query && (
                            <button className="search-clear-btn" onClick={() => { setQuery(''); inputRef.current?.focus(); }}>✕</button>
                        )}
                        <div className="search-focus-glow"></div>
                    </div>

                    <div className="search-filters-row">
                        <div className="type-selector-premium">
                            {['all', 'player', 'club'].map(t => (
                                <button
                                    key={t}
                                    className={`type-option ${type === t ? 'active' : ''}`}
                                    onClick={() => setType(t)}
                                >
                                    {t === 'all' && 'All'}
                                    {t === 'player' && 'Players'}
                                    {t === 'club' && 'Clubs'}
                                </button>
                            ))}
                        </div>

                        <div className="country-filter-wrap">
                            <CountrySelector
                                countries={countries}
                                selected={country}
                                onSelect={setCountry}
                            />
                        </div>
                    </div>
                </div>

                {/* Main Results Area */}
                <div className="results-viewport">
                    {loading && (
                        <div className="search-loading-overlay">
                            <div className="loading-spinner-v3"></div>
                            <p>Querying V3 Data...</p>
                        </div>
                    )}

                    {!loading && hasSearched && (
                        <div className="results-layout">
                            {/* Summary Bar */}
                            <div className="results-summary">
                                <span>Showing <strong>{totalResults}</strong> matches for <span className="query-highlight">"{query}"</span></span>
                                <div className="sort-indicator">Sorted by Relevance & Prestige</div>
                            </div>

                            <div className="results-grid-container">
                                {/* Clubs Column/Grid */}
                                {results.clubs?.length > 0 && (type === 'all' || type === 'club') && (
                                    <section className="results-section-v3">
                                        <div className="section-head">
                                            <span className="icon">🏟️</span>
                                            <h2>Clubs</h2>
                                            <span className="count-badge">{results.clubs.length}</span>
                                        </div>
                                        <div className="rich-results-list">
                                            {results.clubs.map(c => (
                                                <div
                                                    key={c.team_id}
                                                    className="rich-card club-result"
                                                    onClick={() => navigate(`/club/${c.team_id}`)}
                                                >
                                                    <div className="card-logo-box">
                                                        <img
                                                            src={c.logo_url || ''}
                                                            alt=""
                                                            onError={(e) => { e.target.src = 'https://media.api-sports.io/football/teams/0.png'; }}
                                                        />
                                                    </div>
                                                    <div className="card-main">
                                                        <h3 className="card-title">{c.name}</h3>
                                                        <div className="card-sub">
                                                            {c.country_flag && <img src={c.country_flag} alt="" className="mini-flag" />}
                                                            <span>{c.country}</span>
                                                            {c.founded && <span className="dot">•</span>}
                                                            {c.founded && <span>Est. {c.founded}</span>}
                                                        </div>
                                                    </div>
                                                    <div className="card-action">
                                                        <span>View</span>
                                                        <span className="arrow">→</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </section>
                                )}

                                {/* Players Column/Grid */}
                                {results.players?.length > 0 && (type === 'all' || type === 'player') && (
                                    <section className="results-section-v3">
                                        <div className="section-head">
                                            <span className="icon">👤</span>
                                            <h2>Players</h2>
                                            <span className="count-badge">{results.players.length}</span>
                                        </div>
                                        <div className="rich-results-list">
                                            {results.players.map(p => (
                                                <div
                                                    key={p.player_id}
                                                    className="rich-card player-result"
                                                    onClick={() => navigate(`/player/${p.player_id}`)}
                                                >
                                                    <div className="card-photo-box">
                                                        <img
                                                            src={p.photo_url || ''}
                                                            alt=""
                                                            className="player-photo-sm"
                                                            onError={(e) => { e.target.src = 'https://media.api-sports.io/football/players/0.png'; }}
                                                        />
                                                    </div>
                                                    <div className="card-main">
                                                        <h3 className="card-title">{p.name}</h3>
                                                        <div className="card-sub">
                                                            {p.nationality_flag && <img src={p.nationality_flag} alt="" className="mini-flag" />}
                                                            <span>{p.nationality}</span>
                                                            {p.age && <span className="dot">•</span>}
                                                            {p.age && <span>{p.age} years</span>}
                                                        </div>
                                                    </div>
                                                    <div className="card-action">
                                                        <span>Profile</span>
                                                        <span className="arrow">→</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </section>
                                )}
                            </div>

                            {/* Empty Result Message */}
                            {totalResults === 0 && (
                                <div className="no-results-premium">
                                    <div className="empty-state-icon">🔎</div>
                                    <h3>No Data Found</h3>
                                    <p>We couldn't find any clubs or players matching "{query}".</p>
                                    <button className="primary-btn-v3" onClick={() => navigate('/import')}>Import More Leagues</button>
                                </div>
                            )}
                        </div>
                    )}

                    {!loading && !hasSearched && (
                        <div className="search-empty-state-v3">
                            <div className="exploration-mesh"></div>
                            <div className="empty-content">
                                <div className="empty-icon-box">⚽</div>
                                <h2>Scout Engine Ready</h2>
                                <p>Query deep statistical profiles and historical milestones across 50+ global leagues.</p>
                                <div className="quick-info">
                                    <div className="q-item"><span>🏆</span> Top Leagues First</div>
                                    <div className="q-item"><span>📊</span> Deep Player Stats</div>
                                    <div className="q-item"><span>🏟️</span> Club History</div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SearchPageV3;
