import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { Card, Grid, Stack, Badge, Button } from '../../design-system';
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
            <div className="ds-button-spinner"></div>
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
        <div className="v3-leagues-content animate-fade-in">
            <header className="v3-header">
                <Stack direction="row" justify="space-between" align="baseline">
                    <h1 className="hub-title">Competitions</h1>
                    <Badge variant="primary" size="md">{totalLeaguesCount} Active Modules</Badge>
                </Stack>
            </header>

            {/* Top Featured Section */}
            {featured.length > 0 && (
                <section className="featured-section mb-xl">
                    <h2 className="section-title">
                        <span className="icon">⭐</span>
                        Top Competitions
                    </h2>
                    <Grid columns="repeat(auto-fill, minmax(280px, 1fr))" gap="var(--spacing-lg)">
                        {featured.map(league => (
                            <LeagueCard key={league.id} league={league} onClick={() => handleCardClick(league)} />
                        ))}
                    </Grid>
                </section>
            )}

            <Stack direction="row" gap="0" className="v3-main-nav mb-lg">
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
            </Stack>

            <div className="leagues-container">
                {activeTab === 'INTERNATIONAL' ? (
                    <div className="tab-content international-view">
                        {/* Global Section */}
                        {structuredData.international.global.length > 0 && (
                            <section className="international-section mb-xl">
                                <h3 className="group-title">Global</h3>
                                <Grid columns="repeat(auto-fill, minmax(240px, 1fr))" gap="var(--spacing-md)">
                                    {structuredData.international.global.map(league => (
                                        <LeagueCard key={league.id} league={league} onClick={() => handleCardClick(league)} />
                                    ))}
                                </Grid>
                            </section>
                        )}

                        {/* Continental Groupings */}
                        {Object.entries(structuredData.international.continental).map(([continent, items]) => (
                            <section key={continent} className="international-section mb-xl">
                                <h3 className="group-title">{continent}</h3>
                                <Grid columns="repeat(auto-fill, minmax(240px, 1fr))" gap="var(--spacing-md)">
                                    {items.map(league => (
                                        <LeagueCard key={league.id} league={league} onClick={() => handleCardClick(league)} />
                                    ))}
                                </Grid>
                            </section>
                        ))}
                    </div>
                ) : (
                    <div className="tab-content national-view">
                        <Stack gap="var(--spacing-lg)">
                            {structuredData.national.map(country => {
                                const showTop = country.leagues.slice(0, 5);
                                const showOthers = country.leagues.slice(5);
                                const isExpanded = expandedCountries[country.name];

                                return (
                                    <Card key={country.name} className="country-group-card">
                                        <div className="country-header mb-md">
                                            <Stack direction="row" align="center" gap="var(--spacing-md)">
                                                {country.flag && <img src={country.flag} alt="" className="country-flag" />}
                                                <h3 className="country-name">{country.name}</h3>
                                                <Badge variant="neutral">Tier {country.rank}</Badge>
                                            </Stack>
                                        </div>

                                        <Grid columns="repeat(auto-fill, minmax(220px, 1fr))" gap="var(--spacing-md)">
                                            {showTop.map(league => (
                                                <LeagueCard key={league.id} league={league} onClick={() => handleCardClick(league)} />
                                            ))}
                                        </Grid>

                                        {showOthers.length > 0 && (
                                            <div className={`others-accordion mt-md ${isExpanded ? 'active' : ''}`}>
                                                <button
                                                    className="accordion-trigger"
                                                    onClick={() => toggleCountry(country.name)}
                                                >
                                                    {isExpanded ? 'Collapse List' : `+ ${showOthers.length} other competitions`}
                                                    <span className={`chevron ${isExpanded ? 'up' : 'down'}`}>▼</span>
                                                </button>

                                                <div className={`others-content ${isExpanded ? 'expanded' : ''}`}>
                                                    <Grid columns="repeat(auto-fill, minmax(220px, 1fr))" gap="var(--spacing-md)" className="mt-md">
                                                        {showOthers.map(league => (
                                                            <LeagueCard key={league.id} league={league} onClick={() => handleCardClick(league)} />
                                                        ))}
                                                    </Grid>
                                                </div>
                                            </div>
                                        )}
                                    </Card>
                                );
                            })}
                        </Stack>
                    </div>
                )}
            </div>
        </div>
    );
};

const LeagueCard = ({ league, onClick }) => (
    <Card
        onClick={onClick}
        className="v3-league-card"
        extra={<Badge variant={league.is_cup ? 'warning' : 'primary'} size="sm">{league.is_cup ? 'Cup' : 'League'}</Badge>}
    >
        <Stack direction="row" gap="var(--spacing-md)" align="center">
            <div className="league-logo-container">
                <img src={league.logo} alt={league.name} className="league-card-logo" />
            </div>
            <div className="league-card-info">
                <h4 className="league-name">{league.name}</h4>
                <Stack direction="row" gap="var(--spacing-sm)" align="center">
                    <span className="rank-indicator">#{league.rank} Rank</span>
                    {league.seasons_count > 0 && (
                        <span className="season-count">{league.seasons_count} Seasons</span>
                    )}
                </Stack>
            </div>
        </Stack>
    </Card>
);

export default V3LeaguesList;
