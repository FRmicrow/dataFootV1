import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import './V3LeaguesList.css';

const V3LeaguesList = () => {
    const [structuredData, setStructuredData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('NATIONAL'); // Default to National
    const [expandedCountries, setExpandedCountries] = useState({});
    const navigate = useNavigate();

    // Featured API IDs (Premier League, La Liga, Serie A, etc.)
    const FEATURED_IDS = [2, 3, 39, 140, 78, 135, 61];

    useEffect(() => {
        const fetchStructuredLeagues = async () => {
            try {
                const data = await api.getStructuredLeagues();
                setStructuredData(data);
            } catch (error) {
                console.error("Failed to load structured leagues", error);
            } finally {
                setLoading(false);
            }
        };

        fetchStructuredLeagues();
    }, []);

    const toggleCountry = (countryName) => {
        setExpandedCountries(prev => ({
            ...prev,
            [countryName]: !prev[countryName]
        }));
    };

    const handleCardClick = (league) => {
        navigate(`/league/${league.id}`);
    };

    // Calculate total count
    const totalLeaguesCount = structuredData ? (
        structuredData.international.global.length +
        Object.values(structuredData.international.continental).reduce((acc, curr) => acc + curr.length, 0) +
        structuredData.national.reduce((acc, curr) => acc + curr.leagues.length, 0)
    ) : 0;

    // Extract featured leagues for the top section
    const getFeaturedLeagues = () => {
        if (!structuredData) return [];
        const all = [
            ...structuredData.international.global,
            ...Object.values(structuredData.international.continental).flat(),
            ...structuredData.national.flatMap(c => c.leagues)
        ];
        return all.filter(l => FEATURED_IDS.includes(l.api_id));
    };

    const featured = getFeaturedLeagues();

    if (loading) return (
        <div className="v3-leagues-page loading">
            <div className="spinner"></div>
            <p>Accessing Competition Vault...</p>
        </div>
    );

    if (!structuredData) return (
        <div className="v3-leagues-page">
            <div className="empty-state">
                <span className="icon">📂</span>
                <h3>No Verified Data Found</h3>
                <p>Run the import matrix to populate leagues.</p>
            </div>
        </div>
    );

    return (
        <div className="v3-leagues-page">
            <header className="v3-header">
                <div className="header-main">
                    <h1>Competitions</h1>
                    <span className="active-count">{totalLeaguesCount} Active Modules</span>
                </div>
            </header>

            {/* Top Featured Section */}
            {featured.length > 0 && (
                <section className="featured-section">
                    <h2 className="section-title">
                        <span className="icon">⭐</span>
                        Top Competitions
                    </h2>
                    <div className="leagues-grid featured-grid">
                        {featured.map(league => (
                            <LeagueCard key={league.id} league={league} onClick={() => handleCardClick(league)} />
                        ))}
                    </div>
                </section>
            )}

            <div className="v3-main-nav">
                <button
                    className={`nav-tab ${activeTab === 'NATIONAL' ? 'active' : ''}`}
                    onClick={() => setActiveTab('NATIONAL')}
                >
                    <span className="tab-icon">🏴󠁡󠁦󠁬󠁧󠁿</span>
                    National
                </button>
                <button
                    className={`nav-tab ${activeTab === 'INTERNATIONAL' ? 'active' : ''}`}
                    onClick={() => setActiveTab('INTERNATIONAL')}
                >
                    <span className="tab-icon">🌍</span>
                    International
                </button>
            </div>

            <div className="leagues-container">
                {activeTab === 'INTERNATIONAL' ? (
                    <div className="tab-content international-view">
                        {/* Global Section */}
                        {structuredData.international.global.length > 0 && (
                            <section className="international-section">
                                <h2 className="group-title">Global</h2>
                                <div className="leagues-grid">
                                    {structuredData.international.global.map(league => (
                                        <LeagueCard key={league.id} league={league} onClick={() => handleCardClick(league)} />
                                    ))}
                                </div>
                            </section>
                        )}

                        {/* Continental Groupings */}
                        {Object.entries(structuredData.international.continental).map(([continent, items]) => (
                            <section key={continent} className="international-section">
                                <h2 className="group-title">{continent}</h2>
                                <div className="leagues-grid">
                                    {items.map(league => (
                                        <LeagueCard key={league.id} league={league} onClick={() => handleCardClick(league)} />
                                    ))}
                                </div>
                            </section>
                        ))}
                    </div>
                ) : (
                    <div className="tab-content national-view">
                        {structuredData.national.map(country => {
                            const showTop = country.leagues.slice(0, 5);
                            const showOthers = country.leagues.slice(5);
                            const isExpanded = expandedCountries[country.name];

                            return (
                                <div key={country.name} className="country-group-card">
                                    <div className="country-header">
                                        <div className="country-identity">
                                            {country.flag && <img src={country.flag} alt="" className="country-flag" />}
                                            <h3>{country.name}</h3>
                                            <span className="country-rank">Tier {country.rank}</span>
                                        </div>
                                    </div>

                                    <div className="leagues-grid">
                                        {showTop.map(league => (
                                            <LeagueCard key={league.id} league={league} onClick={() => handleCardClick(league)} />
                                        ))}
                                    </div>

                                    {showOthers.length > 0 && (
                                        <div className={`others-accordion ${isExpanded ? 'active' : ''}`}>
                                            <button
                                                className="accordion-trigger"
                                                onClick={() => toggleCountry(country.name)}
                                            >
                                                {isExpanded ? 'Collapse List' : `+ ${showOthers.length} other competitions`}
                                                <span className={`chevron ${isExpanded ? 'up' : 'down'}`}>▼</span>
                                            </button>

                                            <div className={`others-content ${isExpanded ? 'expanded' : ''}`}>
                                                <div className="leagues-grid others-grid">
                                                    {showOthers.map(league => (
                                                        <LeagueCard key={league.id} league={league} onClick={() => handleCardClick(league)} />
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

const LeagueCard = ({ league, onClick }) => (
    <div className="v3-league-card clickable-card" onClick={onClick}>
        <div className={`league-type-badge ${league.is_cup ? 'cup' : 'league'}`}>
            {league.is_cup ? '🥇 Cup' : '🏆 League'}
        </div>
        <div className="league-logo-container">
            <img src={league.logo} alt={league.name} className="league-card-logo" />
            {league.seasons_count > 0 && (
                <div className="season-pill">{league.seasons_count} Seasons</div>
            )}
        </div>
        <div className="league-card-info">
            <h3 className="league-name">{league.name}</h3>
            <div className="league-footer">
                <span className="rank-indicator">#{league.rank} Rank</span>
                <span className="view-link">View Archive →</span>
            </div>
        </div>
    </div>
);

export default V3LeaguesList;
