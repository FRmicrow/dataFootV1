import React, { useState, useEffect, useCallback, useRef } from 'react';
import PropTypes from 'prop-types';

import api from '../../../../services/api';
import { useNavigate } from 'react-router-dom';
import { Card, Stack, Grid, Badge, Skeleton, CardSkeleton } from '../../../../design-system';
import { PageLayout, PageHeader, PageContent } from '../../layouts';
import './SearchPageV3.css';

const CountrySelector = ({ countries, selected, onSelect }) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef(null);

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
        <div className="ds-country-selector" ref={containerRef}>
            <button
                className={`ds-selector-trigger ${isOpen ? 'active' : ''}`}
                onClick={() => setIsOpen(!isOpen)}
                type="button"
                aria-haspopup="listbox"
                aria-expanded={isOpen}
            >
                {selected ? (
                    <Stack direction="row" align="center" gap="8px">
                        <img src={selectedCountryData?.flag_url} alt="" style={{ width: '16px' }} />
                        <span>{selected}</span>
                    </Stack>
                ) : (
                    <Stack direction="row" align="center" gap="8px">
                        <span>🌍</span>
                        <span>All Regions</span>
                    </Stack>
                )}
                <span style={{ fontSize: '10px' }}>{isOpen ? '▲' : '▼'}</span>
            </button>

            {isOpen && (
                <div className="ds-selector-menu">
                    <button className="ds-menu-item" onClick={() => { onSelect(''); setIsOpen(false); }} type="button">
                        🌍 All Regions
                    </button>

                    {top10.length > 0 && (
                        <div className="ds-menu-group">
                            <div className="ds-group-label">Top Nations</div>
                            {top10.map(c => (
                                <button
                                    key={c.name}
                                    className={`ds-menu-item ${selected === c.name ? 'active' : ''}`}
                                    onClick={() => { onSelect(c.name); setIsOpen(false); }}
                                    type="button"
                                >
                                    <Stack direction="row" align="center" gap="8px" justify="space-between" style={{ width: '100%' }}>
                                        <Stack direction="row" align="center" gap="8px">
                                            <img src={c.flag_url} alt="" style={{ width: '16px' }} />
                                            <span>{c.name}</span>
                                        </Stack>
                                        <span style={{ fontSize: '10px', color: 'var(--color-text-muted)' }}>#{c.importance_rank}</span>
                                    </Stack>
                                </button>
                            ))}
                        </div>
                    )}

                    {others.length > 0 && (
                        <div className="ds-menu-group">
                            <div className="ds-group-label">Others</div>
                            {others.map(c => (
                                <button
                                    key={c.name}
                                    className={`ds-menu-item ${selected === c.name ? 'active' : ''}`}
                                    onClick={() => { onSelect(c.name); setIsOpen(false); }}
                                    type="button"
                                >
                                    <Stack direction="row" align="center" gap="8px">
                                        <img src={c.flag_url} alt="" style={{ width: '16px' }} />
                                        <span>{c.name}</span>
                                    </Stack>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

CountrySelector.propTypes = {
    countries: PropTypes.arrayOf(PropTypes.shape({
        name: PropTypes.string.isRequired,
        flag_url: PropTypes.string,
        importance_rank: PropTypes.number
    })).isRequired,
    selected: PropTypes.string,
    onSelect: PropTypes.func.isRequired
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

    useEffect(() => {
        api.getSearchCountries()
            .then(data => setCountries(data))
            .catch(err => console.error("Failed to fetch countries", err));
    }, []);

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
        <PageLayout className="ds-search-page animate-fade-in">
            <PageHeader
                title="Scout Engine"
                subtitle="Accessing 50+ professional leagues & 320,000+ player statistical profiles"
            />

            <PageContent>
                <div className="ds-search-hero">
                    <div className="ds-search-container">
                        <Stack gap="var(--spacing-lg)">
                            <div className="ds-search-input-wrapper">
                                <span className="ds-search-icon">🔍</span>
                                <input
                                    ref={inputRef}
                                    type="text"
                                    placeholder="Search by player name or club brand..."
                                    value={query}
                                    onChange={(e) => setQuery(e.target.value)}
                                    autoFocus
                                />
                                {query && (
                                    <button className="ds-clear-btn" onClick={() => { setQuery(''); inputRef.current?.focus(); }}>✕</button>
                                )}
                            </div>

                            <Stack direction="row" justify="space-between" align="center" wrap>
                                <Stack direction="row" gap="var(--spacing-sm)" className="ds-filter-tabs">
                                    {['all', 'player', 'club'].map(t => (
                                        <button
                                            key={t}
                                            className={`ds-filter-tab ${type === t ? 'active' : ''}`}
                                            onClick={() => setType(t)}
                                        >
                                            {(() => {
                                                if (t === 'all') return 'All';
                                                if (t === 'player') return 'Players';
                                                return 'Clubs';
                                            })()}
                                        </button>
                                    ))}
                                </Stack>

                                <CountrySelector
                                    countries={countries}
                                    selected={country}
                                    onSelect={setCountry}
                                />
                            </Stack>
                        </Stack>
                    </div>
                </div>

                <main className="ds-search-main">
                    {loading && (
                        <Stack gap="var(--spacing-xl)" style={{ padding: 'var(--spacing-xl) 0' }}>
                            <div style={{ padding: '0 var(--spacing-md)' }}>
                                <Skeleton width="200px" height="14px" />
                            </div>
                            <Grid columns="1fr 1fr" gap="var(--spacing-xl)">
                                <CardSkeleton />
                                <CardSkeleton />
                            </Grid>
                        </Stack>
                    )}

                    {!loading && hasSearched && (
                        <Stack gap="var(--spacing-xl)">
                            <div style={{ padding: '0 var(--spacing-md)', fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)' }}>
                                Showing <strong>{totalResults}</strong> matches for <span style={{ color: 'var(--color-primary-400)' }}>"{query}"</span>
                            </div>

                            <Grid columns="1fr 1fr" gap="var(--spacing-xl)">
                                {/* Clubs */}
                                {(type === 'all' || type === 'club') && (
                                    <Card title="Clubs" extra={<Badge variant="primary">{results.clubs?.length || 0}</Badge>}>
                                        <Stack gap="var(--spacing-xs)">
                                            {results.clubs?.map(c => (
                                                <button
                                                    key={c.team_id}
                                                    type="button"
                                                    className="ds-result-row"
                                                    onClick={() => navigate(`/club/${c.team_id}`)}
                                                    aria-label={`View ${c.name} profile`}
                                                >
                                                    <Stack direction="row" align="center" gap="var(--spacing-md)">
                                                        <div className="ds-result-image">
                                                            <img src={c.logo_url} alt="" onError={(e) => { e.target.src = 'https://media.api-sports.io/football/teams/0.png'; }} />
                                                        </div>
                                                        <div>
                                                            <div style={{ fontWeight: 'bold', fontSize: 'var(--font-size-sm)' }}>{c.name}</div>
                                                            <Stack direction="row" align="center" gap="4px">
                                                                {c.country_flag && <img src={c.country_flag} alt="" style={{ width: '12px' }} />}
                                                                <span style={{ fontSize: '10px', color: 'var(--color-text-muted)' }}>{c.country}</span>
                                                            </Stack>
                                                        </div>
                                                    </Stack>
                                                    <span className="ds-arrow">→</span>
                                                </button>
                                            ))}
                                            {results.clubs?.length === 0 && <div className="ds-empty-msg">No clubs found</div>}
                                        </Stack>
                                    </Card>
                                )}

                                {/* Players */}
                                {(type === 'all' || type === 'player') && (
                                    <Card title="Players" extra={<Badge variant="primary">{results.players?.length || 0}</Badge>}>
                                        <Stack gap="var(--spacing-xs)">
                                            {results.players?.map(p => (
                                                <button
                                                    key={p.player_id}
                                                    type="button"
                                                    className="ds-result-row"
                                                    onClick={() => navigate(`/player/${p.player_id}`)}
                                                    aria-label={`View ${p.name} profile`}
                                                >
                                                    <Stack direction="row" align="center" gap="var(--spacing-md)">
                                                        <div className="ds-result-image ds-round">
                                                            <img src={p.photo_url} alt="" onError={(e) => { e.target.src = 'https://media.api-sports.io/football/players/0.png'; }} />
                                                        </div>
                                                        <div>
                                                            <div style={{ fontWeight: 'bold', fontSize: 'var(--font-size-sm)' }}>{p.name}</div>
                                                            <Stack direction="row" align="center" gap="4px">
                                                                {p.nationality_flag && <img src={p.nationality_flag} alt="" style={{ width: '12px' }} />}
                                                                <span style={{ fontSize: '10px', color: 'var(--color-text-muted)' }}>{p.nationality} • {p.age}y</span>
                                                            </Stack>
                                                        </div>
                                                    </Stack>
                                                    <span className="ds-arrow">→</span>
                                                </button>
                                            ))}
                                            {results.players?.length === 0 && <div className="ds-empty-msg">No players found</div>}
                                        </Stack>
                                    </Card>
                                )}
                            </Grid>
                        </Stack>
                    )}

                    {!loading && !hasSearched && (
                        <Stack align="center" justify="center" gap="var(--spacing-lg)" style={{ padding: '120px 0' }}>
                            <div style={{ fontSize: '64px', opacity: 0.5 }}>⚽</div>
                            <h2 style={{ fontSize: 'var(--font-size-2xl)', margin: 0 }}>Scout Engine Ready</h2>
                            <p style={{ color: 'var(--color-text-muted)', textAlign: 'center', maxWidth: '400px' }}>
                                Query deep statistical profiles and historical milestones across 50+ global leagues.
                            </p>
                        </Stack>
                    )}
                </main>
            </PageContent>
        </PageLayout>
    );
};

export default SearchPageV3;
