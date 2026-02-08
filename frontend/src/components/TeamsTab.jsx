import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import './TeamsTab.css';

const TeamsTab = () => {
    const [leagues, setLeagues] = useState([]);
    const [leagueTeams, setLeagueTeams] = useState({}); // Store teams by competition_id
    const [searchResults, setSearchResults] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searching, setSearching] = useState(false);
    const [loadingLeagues, setLoadingLeagues] = useState(new Set());
    const [openAccordions, setOpenAccordions] = useState(new Set());

    // Search filters
    const [searchName, setSearchName] = useState('');
    const [searchCountry, setSearchCountry] = useState('');
    const [countries, setCountries] = useState([]);

    useEffect(() => {
        loadLeaguesMetadata();
        loadCountries();
    }, []);

    const loadLeaguesMetadata = async () => {
        try {
            setLoading(true);
            const response = await axios.get('http://localhost:3001/api/teams/leagues-metadata', {
                params: { minRank: 25 } // Top 25 countries for more leagues
            });

            const allLeagues = response.data;
            setLeagues(allLeagues);

            // Top 5 leagues by importance
            const top5 = allLeagues.slice(0, 5);
            const top5Ids = top5.map(l => l.competition_id);

            // Open top 5 by default
            setOpenAccordions(new Set(top5Ids));

            // Load teams for top 5 immediately
            top5.forEach(league => loadTeamsForLeague(league.competition_id));

            setLoading(false);
        } catch (error) {
            console.error('Error loading leagues:', error);
            setLoading(false);
        }
    };

    const loadTeamsForLeague = async (competitionId) => {
        // Don't reload if already loaded
        if (leagueTeams[competitionId]) return;

        try {
            setLoadingLeagues(prev => new Set([...prev, competitionId]));
            const response = await axios.get(`http://localhost:3001/api/teams/competition/${competitionId}`);

            setLeagueTeams(prev => ({
                ...prev,
                [competitionId]: response.data
            }));

            setLoadingLeagues(prev => {
                const newSet = new Set(prev);
                newSet.delete(competitionId);
                return newSet;
            });
        } catch (error) {
            console.error('Error loading teams for league:', error);
            setLoadingLeagues(prev => {
                const newSet = new Set(prev);
                newSet.delete(competitionId);
                return newSet;
            });
        }
    };

    const loadCountries = async () => {
        try {
            const response = await axios.get('http://localhost:3001/api/teams/countries');
            setCountries(response.data);
        } catch (error) {
            console.error('Error loading countries:', error);
        }
    };

    const handleSearch = async () => {
        if (!searchName && !searchCountry) {
            setSearchResults([]);
            return;
        }

        try {
            setSearching(true);
            const response = await axios.get('http://localhost:3001/api/teams/search', {
                params: {
                    name: searchName,
                    country: searchCountry
                }
            });
            setSearchResults(response.data.teams);
            setSearching(false);
        } catch (error) {
            console.error('Error searching teams:', error);
            setSearching(false);
        }
    };

    const toggleAccordion = (competitionId) => {
        const newOpen = new Set(openAccordions);
        if (newOpen.has(competitionId)) {
            newOpen.delete(competitionId);
        } else {
            newOpen.add(competitionId);
            // Load teams when opening accordion
            loadTeamsForLeague(competitionId);
        }
        setOpenAccordions(newOpen);
    };

    const filteredCountries = countries.filter(c =>
        c.country_name.toLowerCase().includes(searchCountry.toLowerCase())
    );

    if (loading) {
        return <div className="teams-loading">Loading leagues...</div>;
    }

    // Show search results if searching
    if (searchResults.length > 0 || searchName || searchCountry) {
        return (
            <div className="teams-tab">
                {/* Search Form */}
                <div className="teams-search-form">
                    <h3>Search Teams</h3>
                    <div className="search-form-grid">
                        <div className="form-group">
                            <label>Team Name</label>
                            <input
                                type="text"
                                placeholder="e.g. Liverpool"
                                value={searchName}
                                onChange={(e) => setSearchName(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                            />
                        </div>
                        <div className="form-group">
                            <label>Country</label>
                            <input
                                type="text"
                                placeholder="e.g. England"
                                value={searchCountry}
                                onChange={(e) => setSearchCountry(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                                list="countries-list"
                            />
                            <datalist id="countries-list">
                                {filteredCountries.slice(0, 10).map(country => (
                                    <option key={country.country_id} value={country.country_name} />
                                ))}
                            </datalist>
                        </div>
                        <div className="form-actions">
                            <button onClick={handleSearch} className="btn-search" disabled={searching}>
                                {searching ? 'Searching...' : 'Search'}
                            </button>
                            <button
                                onClick={() => {
                                    setSearchName('');
                                    setSearchCountry('');
                                    setSearchResults([]);
                                }}
                                className="btn-clear"
                            >
                                Clear
                            </button>
                        </div>
                    </div>
                </div>

                {/* Search Results */}
                <div className="search-results">
                    <h3>Search Results ({searchResults.length})</h3>
                    {searchResults.length === 0 ? (
                        <p className="no-results">No teams found</p>
                    ) : (
                        <div className="teams-grid">
                            {searchResults.map(team => (
                                <Link
                                    key={team.club_id}
                                    to={`/team/${team.club_id}`}
                                    className="team-card"
                                >
                                    <img src={team.club_logo_url} alt={team.club_name} className="team-logo" />
                                    <div className="team-name">{team.club_name}</div>
                                    <div className="team-country">{team.country_name}</div>
                                    <div className="team-players">{team.player_count} players</div>
                                </Link>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // Show leagues grouped by accordion
    const top5Leagues = leagues.slice(0, 5);
    const otherLeagues = leagues.slice(5, 25); // Show up to 20 more

    const renderLeagueAccordion = (league) => {
        const isOpen = openAccordions.has(league.competition_id);
        const teams = leagueTeams[league.competition_id] || [];
        const isLoading = loadingLeagues.has(league.competition_id);

        return (
            <div key={league.competition_id} className="league-accordion">
                <div
                    className="accordion-header"
                    onClick={() => toggleAccordion(league.competition_id)}
                >
                    <span className="league-name">
                        {league.competition_name} - {league.country_name} ({league.team_count} teams)
                    </span>
                    <span className="accordion-icon">
                        {isOpen ? '▼' : '▶'}
                    </span>
                </div>
                {isOpen && (
                    <div className="accordion-content">
                        {isLoading ? (
                            <div className="loading-teams">Loading teams...</div>
                        ) : (
                            <div className="teams-grid">
                                {teams.map(team => (
                                    <Link
                                        key={team.club_id}
                                        to={`/team/${team.club_id}`}
                                        className="team-card"
                                    >
                                        <img src={team.club_logo_url} alt={team.club_name} className="team-logo" />
                                        <div className="team-name">{team.club_name}</div>
                                        <div className="team-players">{team.player_count} players</div>
                                    </Link>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="teams-tab">
            {/* Search Form */}
            <div className="teams-search-form">
                <h3>Search Teams</h3>
                <div className="search-form-grid">
                    <div className="form-group">
                        <label>Team Name</label>
                        <input
                            type="text"
                            placeholder="e.g. Liverpool"
                            value={searchName}
                            onChange={(e) => setSearchName(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                        />
                    </div>
                    <div className="form-group">
                        <label>Country</label>
                        <input
                            type="text"
                            placeholder="e.g. England"
                            value={searchCountry}
                            onChange={(e) => setSearchCountry(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                            list="countries-list"
                        />
                        <datalist id="countries-list">
                            {filteredCountries.slice(0, 10).map(country => (
                                <option key={country.country_id} value={country.country_name} />
                            ))}
                        </datalist>
                    </div>
                    <div className="form-actions">
                        <button onClick={handleSearch} className="btn-search">
                            Search
                        </button>
                    </div>
                </div>
            </div>

            {/* Top 5 Leagues */}
            <div className="leagues-section">
                <h3>Top 5 Leagues</h3>
                {top5Leagues.map(league => renderLeagueAccordion(league))}
            </div>

            {/* Other Leagues */}
            {otherLeagues.length > 0 && (
                <div className="leagues-section">
                    <h3>Other Leagues</h3>
                    {otherLeagues.map(league => renderLeagueAccordion(league))}
                </div>
            )}
        </div>
    );
};

export default TeamsTab;
