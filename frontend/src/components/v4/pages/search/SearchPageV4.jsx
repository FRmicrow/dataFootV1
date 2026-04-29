import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../../../services/api';
import { 
    Stack, Grid, Badge, Skeleton, CardSkeleton 
} from '../../../../design-system';
import PageLayoutV4 from '../../layouts/PageLayoutV4';
import PageContentV4 from '../../layouts/PageContentV4';
import './SearchPageV4.css';

const SearchPageV4 = () => {
    const [query, setQuery] = useState('');
    const [type, setType] = useState('all');
    const [results, setResults] = useState({ competitions: [], teams: [], people: [] });
    const [loading, setLoading] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);
    const navigate = useNavigate();
    const debounceRef = useRef(null);
    const inputRef = useRef(null);

    const doSearch = useCallback(async (searchQuery, searchType) => {
        if (!searchQuery || searchQuery.length < 2) {
            setResults({ competitions: [], teams: [], people: [] });
            setHasSearched(false);
            return;
        }

        setLoading(true);
        try {
            const data = await api.searchV4({ q: searchQuery, type: searchType });
            setResults(data);
            setHasSearched(true);
        } catch (error) {
            console.error("V4 Search failed:", error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
            doSearch(query, type);
        }, 400); // Slightly longer debounce for V4 deep search
        return () => clearTimeout(debounceRef.current);
    }, [query, type, doSearch]);

    const totalResults = (results.competitions?.length || 0) + 
                         (results.teams?.length || 0) + 
                         (results.people?.length || 0);

    const handleResultClick = (result, resultType) => {
        if (resultType === 'competition') {
            navigate(`/leagues/${encodeURIComponent(result.name)}/season/${result.latest_season || '2023-2024'}`);
        } else if (resultType === 'team') {
            navigate(`/club/${result.id}`);
        } else if (resultType === 'person') {
            navigate(`/player/${result.id}`);
        }
    };

    return (
        <PageLayoutV4 className="v4-search-page animate-fade-in">
            <div className="v4-search-hero">
                <div className="v4-search-container">
                    <Stack gap="var(--spacing-md)">
                        <h1 style={{ color: 'white', marginBottom: 'var(--spacing-xs)', fontWeight: 700 }}>Search Engine</h1>
                        <p style={{ color: 'var(--color-text-dim)', marginBottom: 'var(--spacing-lg)' }}>
                            Accessing unified Transfermarkt & Flashscore historical datasets
                        </p>
                        
                        <div className="v4-search-input-wrapper">
                            <span className="v4-search-icon">🔍</span>
                            <input
                                ref={inputRef}
                                type="text"
                                placeholder="Search teams, players or competitions..."
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                autoFocus
                            />
                            {query && (
                                <button 
                                    className="v4-clear-btn" 
                                    onClick={() => { setQuery(''); inputRef.current?.focus(); }}
                                >✕</button>
                            )}
                        </div>

                        <div className="v4-search-filters">
                            {[
                                { id: 'all', label: 'All' },
                                { id: 'player', label: 'People' },
                                { id: 'team', label: 'Teams' },
                                { id: 'competition', label: 'Leagues' }
                            ].map(t => (
                                <button
                                    key={t.id}
                                    className={`v4-filter-tab ${type === t.id ? 'active' : ''}`}
                                    onClick={() => setType(t.id)}
                                >
                                    {t.label}
                                </button>
                            ))}
                        </div>
                    </Stack>
                </div>
            </div>

            <PageContentV4>
                <div className="v4-search-main">
                    {loading && (
                        <Grid columns="repeat(auto-fill, minmax(280px, 1fr))" gap="var(--spacing-lg)">
                            {[1, 2, 3, 4, 5, 6].map(i => <CardSkeleton key={i} />)}
                        </Grid>
                    )}

                    {!loading && hasSearched && (
                        <Stack gap="var(--spacing-xl)">
                            {/* Summary */}
                            <div style={{ color: 'var(--color-text-dim)', fontSize: 'var(--font-size-sm)' }}>
                                Found <strong>{totalResults}</strong> results for <span style={{ color: 'var(--color-primary)' }}>"{query}"</span>
                            </div>

                            {/* Competitions Section */}
                            {(type === 'all' || type === 'competition') && results.competitions?.length > 0 && (
                                <div className="v4-search-results-section animate-slide-up">
                                    <div className="v4-section-header">
                                        <div className="v4-section-title">🏆 Competitions</div>
                                        <Badge variant="neutral">{results.competitions.length}</Badge>
                                    </div>
                                    <Grid columns="repeat(auto-fill, minmax(280px, 1fr))" gap="var(--spacing-md)">
                                        {results.competitions.map(c => (
                                            <button key={c.id} className="v4-result-card" onClick={() => handleResultClick(c, 'competition')}>
                                                <div className="v4-result-avatar">
                                                    <img src={c.logo_url} alt="" onError={(e) => { e.target.src = 'https://tmssl.akamaized.net//images/logo/normal/tm.png'; }} />
                                                </div>
                                                <div className="v4-result-name">{c.name}</div>
                                                <div className="v4-result-meta">
                                                    {c.country_flag && <img src={c.country_flag} alt="" className="v4-flag-icon" />}
                                                    {c.country_name} • {c.type}
                                                </div>
                                            </button>
                                        ))}
                                    </Grid>
                                </div>
                            )}

                            {/* Teams Section */}
                            {(type === 'all' || type === 'team') && results.teams?.length > 0 && (
                                <div className="v4-search-results-section animate-slide-up" style={{ animationDelay: '0.1s' }}>
                                    <div className="v4-section-header">
                                        <div className="v4-section-title">🛡️ Teams</div>
                                        <Badge variant="neutral">{results.teams.length}</Badge>
                                    </div>
                                    <Grid columns="repeat(auto-fill, minmax(280px, 1fr))" gap="var(--spacing-md)">
                                        {results.teams.map(t => (
                                            <button key={t.id} className="v4-result-card" onClick={() => handleResultClick(t, 'team')}>
                                                <div className="v4-result-avatar">
                                                    <img src={t.logo_url} alt="" onError={(e) => { e.target.src = 'https://media.api-sports.io/football/teams/0.png'; }} />
                                                </div>
                                                <div className="v4-result-name">{t.name}</div>
                                                <div className="v4-result-meta">
                                                    {t.country_flag && <img src={t.country_flag} alt="" className="v4-flag-icon" />}
                                                    {t.country_name}
                                                </div>
                                            </button>
                                        ))}
                                    </Grid>
                                </div>
                            )}

                            {/* People Section */}
                            {(type === 'all' || type === 'player' || type === 'person') && results.people?.length > 0 && (
                                <div className="v4-search-results-section animate-slide-up" style={{ animationDelay: '0.2s' }}>
                                    <div className="v4-section-header">
                                        <div className="v4-section-title">👤 People</div>
                                        <Badge variant="neutral">{results.people.length}</Badge>
                                    </div>
                                    <Grid columns="repeat(auto-fill, minmax(280px, 1fr))" gap="var(--spacing-md)">
                                        {results.people.map(p => (
                                            <button key={p.id} className="v4-result-card" onClick={() => handleResultClick(p, 'person')}>
                                                <div className="v4-result-avatar round">
                                                    <img src={p.photo_url} alt="" onError={(e) => { e.target.src = 'https://media.api-sports.io/football/players/0.png'; }} />
                                                </div>
                                                <div className="v4-result-name">{p.name}</div>
                                                <div className="v4-result-meta">
                                                    {p.nationality_flag && <img src={p.nationality_flag} alt="" className="v4-flag-icon" />}
                                                    {p.current_team_name || 'Free Agent'}
                                                </div>
                                            </button>
                                        ))}
                                    </Grid>
                                </div>
                            )}

                            {totalResults === 0 && (
                                <div className="v4-empty-state">
                                    <div className="v4-empty-icon">🔍</div>
                                    <h2 className="v4-empty-title">No matching records</h2>
                                    <p className="v4-empty-description">
                                        Try adjusting your search query or filters. Ensure names are spelled correctly.
                                    </p>
                                </div>
                            )}
                        </Stack>
                    )}

                    {!loading && !hasSearched && (
                        <div className="v4-empty-state">
                            <div className="v4-empty-icon">⚽</div>
                            <h2 className="v4-empty-title">Search Engine Ready</h2>
                            <p className="v4-empty-description">
                                Explore deep historical data across leagues, clubs and players worldwide.
                            </p>
                        </div>
                    )}
                </div>
            </PageContentV4>
        </PageLayoutV4>
    );
};

export default SearchPageV4;
