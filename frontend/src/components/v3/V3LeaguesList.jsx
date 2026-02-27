import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import {
    Card, Grid, Stack, Badge, Button,
    Tabs
} from '../../design-system';
import './V3LeaguesList.css';

const V3LeaguesList = () => {
    const [structuredData, setStructuredData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('NATIONAL');
    const [expandedCountries, setExpandedCountries] = useState({});
    const navigate = useNavigate();

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
        setExpandedCountries(prev => ({ ...prev, [countryName]: !prev[countryName] }));
    };

    const handleCardClick = (league) => {
        navigate(`/league/${league.id}`);
    };

    const totalLeaguesCount = structuredData ? (
        structuredData.international.global.length +
        Object.values(structuredData.international.continental).reduce((acc, curr) => acc + curr.length, 0) +
        structuredData.national.reduce((acc, curr) => acc + curr.leagues.length, 0)
    ) : 0;

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
        <div style={{ height: '80vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <div className="ds-button-spinner" style={{ marginBottom: '12px' }}></div>
            <p style={{ color: 'var(--color-text-dim)' }}>Accessing Competition Vault...</p>
        </div>
    );

    if (!structuredData) return (
        <div style={{ padding: '80px', textAlign: 'center' }}>
            <Card style={{ maxWidth: '400px', margin: '0 auto' }}>
                <span style={{ fontSize: '48px' }}>📂</span>
                <h3>No Verified Data Found</h3>
                <p style={{ margin: '12px 0 24px', color: 'var(--color-text-muted)' }}>Run the import matrix to populate leagues.</p>
                <Button variant="primary" onClick={() => navigate('/import')}>Initialize Matrix</Button>
            </Card>
        </div>
    );

    return (
        <div className="v3-leagues-content animate-fade-in" style={{ padding: 'var(--spacing-sm)', maxWidth: '1400px', margin: '0 auto' }}>
            <header style={{ marginBottom: 'var(--spacing-xl)' }}>
                <Stack direction="row" justify="space-between" align="center">
                    <div>
                        <Badge variant="primary" style={{ marginBottom: '4px' }}>Competition Registry</Badge>
                        <h1 style={{ fontSize: 'var(--font-size-4xl)', fontWeight: 'var(--font-weight-black)' }}>Global Circuits</h1>
                    </div>
                    <Badge variant="neutral">{totalLeaguesCount} Active Modules</Badge>
                </Stack>
            </header>

            {featured.length > 0 && (
                <section style={{ marginBottom: 'var(--spacing-2xl)' }}>
                    <h3 style={{ fontSize: 'var(--font-size-sm)', textTransform: 'uppercase', color: 'var(--color-text-dim)', marginBottom: 'var(--spacing-md)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span>⭐</span> Top Tier Intelligence
                    </h3>
                    <Grid columns="repeat(auto-fill, minmax(280px, 1fr))" gap="var(--spacing-md)">
                        {featured.map(league => (
                            <LeagueCard key={league.id} league={league} onClick={() => handleCardClick(league)} />
                        ))}
                    </Grid>
                </section>
            )}

            <Tabs
                items={[
                    { id: 'NATIONAL', label: 'National Systems', icon: '🏴' },
                    { id: 'INTERNATIONAL', label: 'International Circuits', icon: '🌍' }
                ]}
                activeId={activeTab}
                onChange={setActiveTab}
                className="mb-lg"
            />

            <div className="leagues-container">
                {activeTab === 'INTERNATIONAL' ? (
                    <Stack gap="var(--spacing-2xl)">
                        {structuredData.international.global.length > 0 && (
                            <section>
                                <h3 className="ds-section-subtitle">Global</h3>
                                <Grid columns="repeat(auto-fill, minmax(240px, 1fr))" gap="var(--spacing-md)">
                                    {structuredData.international.global.map(league => (
                                        <LeagueCard key={league.id} league={league} onClick={() => handleCardClick(league)} />
                                    ))}
                                </Grid>
                            </section>
                        )}

                        {Object.entries(structuredData.international.continental).map(([continent, items]) => (
                            <section key={continent}>
                                <h3 className="ds-section-subtitle">{continent}</h3>
                                <Grid columns="repeat(auto-fill, minmax(240px, 1fr))" gap="var(--spacing-md)">
                                    {items.map(league => (
                                        <LeagueCard key={league.id} league={league} onClick={() => handleCardClick(league)} />
                                    ))}
                                </Grid>
                            </section>
                        ))}
                    </Stack>
                ) : (
                    <Stack gap="var(--spacing-lg)">
                        {structuredData.national.map(country => {
                            const showTop = country.leagues.slice(0, 5);
                            const showOthers = country.leagues.slice(5);
                            const isExpanded = expandedCountries[country.name];

                            return (
                                <Card key={country.name} className="v3-country-group">
                                    <div style={{ marginBottom: 'var(--spacing-md)', paddingBottom: 'var(--spacing-xs)', borderBottom: '1px solid var(--color-border)' }}>
                                        <Stack direction="row" align="center" gap="var(--spacing-md)">
                                            {country.flag && <img src={country.flag} alt="" style={{ width: '20px' }} />}
                                            <h3 style={{ margin: 0, fontSize: 'var(--font-size-xl)' }}>{country.name}</h3>
                                            <Badge variant="neutral" size="sm">Tier {country.rank}</Badge>
                                        </Stack>
                                    </div>

                                    <Grid columns="repeat(auto-fill, minmax(220px, 1fr))" gap="var(--spacing-md)">
                                        {showTop.map(league => (
                                            <LeagueCard key={league.id} league={league} onClick={() => handleCardClick(league)} />
                                        ))}
                                    </Grid>

                                    {showOthers.length > 0 && (
                                        <div className={`v3-others-wrap ${isExpanded ? 'active' : ''}`}>
                                            <button className="v3-toggle" onClick={() => toggleCountry(country.name)}>
                                                {isExpanded ? 'Show Less' : `+ ${showOthers.length} other competitions`}
                                            </button>
                                            {isExpanded && (
                                                <Grid columns="repeat(auto-fill, minmax(220px, 1fr))" gap="var(--spacing-md)" style={{ marginTop: 'var(--spacing-md)' }}>
                                                    {showOthers.map(league => (
                                                        <LeagueCard key={league.id} league={league} onClick={() => handleCardClick(league)} />
                                                    ))}
                                                </Grid>
                                            )}
                                        </div>
                                    )}
                                </Card>
                            );
                        })}
                    </Stack>
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
        interactive
    >
        <Stack direction="row" gap="var(--spacing-md)" align="center">
            <div className="v3-logo-wrap">
                <img src={league.logo} alt={league.name} />
            </div>
            <div>
                <h4 style={{ margin: 0, fontSize: 'var(--font-size-sm)' }}>{league.name}</h4>
                <div style={{ fontSize: '10px', color: 'var(--color-text-dim)', marginTop: '4px' }}>
                    Rank #{league.rank} • {league.seasons_count} Seasons
                </div>
            </div>
        </Stack>
    </Card>
);

export default V3LeaguesList;
