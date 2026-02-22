import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import './V3LeaguesList.css';

const V3LeaguesList = () => {
    const [leagues, setLeagues] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('all'); // 'all', 'continents', 'countries'
    const navigate = useNavigate();

    const CONTINENTS = ['World', 'Europe', 'Asia', 'Africa', 'Oceania', 'Americas', 'South America', 'North America'];

    useEffect(() => {
        const fetchImportedLeagues = async () => {
            try {
                const res = await axios.get('/api/leagues/imported');
                setLeagues(res.data);
            } catch (error) {
                console.error("Failed to load imported leagues", error);
            } finally {
                setLoading(false);
            }
        };

        fetchImportedLeagues();
    }, []);

    // Featured IDs (Big 5 + Major Europe)
    const FEATURED_IDS = [2, 3, 39, 140, 78, 135, 61];

    // Split leagues into featured
    const featuredLeagues = leagues.filter(l => FEATURED_IDS.includes(l.api_id));

    // Group leagues by country
    const groupedLeagues = leagues.reduce((acc, league) => {
        const country = league.country_name;

        // Filter logic based on tab
        const isContinent = CONTINENTS.includes(country);
        if (activeTab === 'continents' && !isContinent) return acc;
        if (activeTab === 'countries' && isContinent) return acc;

        if (!acc[country]) {
            acc[country] = {
                name: country,
                flag: league.flag_url,
                rank: league.country_rank,
                items: []
            };
        }
        acc[country].items.push(league);
        return acc;
    }, {});

    // Sort groups by rank
    const sortedGroups = Object.values(groupedLeagues).sort((a, b) => a.rank - b.rank);

    const handleCardClick = (league) => {
        const latestSeason = league.years_imported[0];
        navigate(`/league/${league.league_id}/season/${latestSeason}`);
    };

    if (loading) return (
        <div className="v3-leagues-page loading">
            <div className="spinner"></div>
            <p>Scanning V3 Vault...</p>
        </div>
    );

    return (
        <div className="v3-leagues-page">
            <header className="v3-header">
                <h1>V3 Competition Data</h1>
                <p>Browse competitions successfully migrated to the new schema.</p>
                <div className="legend-bar">
                    <span className="legend-item"><span className="type-badge badge-league">🏆 League</span></span>
                    <span className="legend-item"><span className="type-badge badge-cup">🥇 Cup</span></span>
                    <span className="legend-info">{leagues.length} competitions imported</span>
                </div>
            </header>

            {leagues.length === 0 ? (
                <div className="empty-state">
                    <span className="icon">📂</span>
                    <h3>No V3 Data Found</h3>
                    <p>It seems no leagues have been imported using the V3 tool yet.</p>
                    <Link to="/import" className="btn-v3-primary">Open Import Tool</Link>
                </div>
            ) : (
                <div className="leagues-container">
                    {/* Featured Section */}
                    {featuredLeagues.length > 0 && (
                        <div className="featured-section">
                            <h2 className="section-title">
                                <span className="icon">⭐</span>
                                Top Competitions
                            </h2>
                            <div className="leagues-grid featured-grid">
                                {featuredLeagues.map((league) => (
                                    <div
                                        key={league.league_id}
                                        className="v3-league-card featured-card clickable-card"
                                        onClick={() => handleCardClick(league)}
                                    >
                                        <div className={`type-badge ${league.league_type === 'Cup' ? 'badge-cup' : 'badge-league'}`}>
                                            {league.league_type === 'Cup' ? '🥇 Cup' : '🏆 League'}
                                        </div>
                                        <div className="v3-league-logo-wrap">
                                            <img src={league.logo_url} alt={league.name} className="v3-league-logo" />
                                            <div className="v3-season-badge">{league.years_imported.length} Seasons</div>
                                        </div>
                                        <div className="v3-league-info">
                                            <h3>{league.name}</h3>
                                            <p className="country-hint">{league.country_name}</p>
                                            <div className="card-footer">
                                                <span className="explore-hint">Explore Archive →</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Filter Navigation */}
                    <div className="v3-filter-nav">
                        <button
                            className={`filter-btn ${activeTab === 'all' ? 'active' : ''}`}
                            onClick={() => setActiveTab('all')}
                        >
                            🌍 All Data
                        </button>
                        <button
                            className={`filter-btn ${activeTab === 'continents' ? 'active' : ''}`}
                            onClick={() => setActiveTab('continents')}
                        >
                            🏆 Continents & Int'l
                        </button>
                        <button
                            className={`filter-btn ${activeTab === 'countries' ? 'active' : ''}`}
                            onClick={() => setActiveTab('countries')}
                        >
                            🏴󠁡󠁦󠁬󠁧󠁿 Countries
                        </button>
                    </div>

                    {sortedGroups.map((group) => (
                        <div key={group.name} className="country-section">
                            <h2 className="country-title">
                                {group.flag && <img src={group.flag} alt="" className="country-flag" />}
                                {group.name}
                                <span className="country-rank-badge">#{group.rank}</span>
                            </h2>
                            <div className="leagues-grid">
                                {group.items.map((league) => (
                                    <div
                                        key={league.league_id}
                                        className="v3-league-card clickable-card"
                                        onClick={() => handleCardClick(league)}
                                        role="button"
                                        tabIndex={0}
                                        onKeyDown={(e) => e.key === 'Enter' && handleCardClick(league)}
                                    >
                                        {/* Type Badge */}
                                        <div className={`type-badge ${league.league_type === 'Cup' ? 'badge-cup' : 'badge-league'}`}>
                                            {league.league_type === 'Cup' ? '🥇 Cup' : '🏆 League'}
                                        </div>

                                        <div className="v3-league-logo-wrap">
                                            <img src={league.logo_url} alt={league.name} className="v3-league-logo" />
                                            <div className="v3-season-badge">{league.years_imported.length} Seasons</div>
                                        </div>
                                        <div className="v3-league-info">
                                            <h3>{league.name}</h3>
                                            <p className="season-list-hint">
                                                {league.years_imported.slice(0, 4).join(', ')}
                                                {league.years_imported.length > 4 && ` +${league.years_imported.length - 4} more`}
                                            </p>
                                            <div className="card-footer">
                                                <span className="explore-hint">Explore Archive →</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default V3LeaguesList;
