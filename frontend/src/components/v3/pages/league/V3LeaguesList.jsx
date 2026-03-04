import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../../../services/api';
import {
    Grid, Stack, Badge, Button,
    Tabs, LeagueCard
} from '../../../../design-system';
import { PageLayout, PageHeader, PageContent } from '../../layouts';
import './V3LeaguesList.css';

const V3LeaguesList = () => {
    const [structuredData, setStructuredData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('NATIONAL');
    const [expandedCountries, setExpandedCountries] = useState(null); // Changed initial state to null
    const navigate = useNavigate();

    const FEATURED_IDS = [2, 3, 39, 140, 78, 135, 61];

    useEffect(() => {
        const fetchStructuredLeagues = async () => {
            try {
                const data = await api.getStructuredLeagues();
                setStructuredData(data);
                if (data && data.national) {
                    setExpandedCountries(data.national.map(c => c.name));
                }
            } catch (error) {
                console.error("Failed to load structured leagues", error);
            } finally {
                setLoading(false);
            }
        };
        fetchStructuredLeagues();
    }, []);

    const toggleCountry = (countryName) => {
        setExpandedCountries(prev => {
            const current = prev || [];
            return current.includes(countryName)
                ? current.filter(name => name !== countryName)
                : [...current, countryName];
        });
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
            <div className="ds-empty-state">
                <span style={{ fontSize: '48px' }}>📂</span>
                <h3 className="mt-md">No Verified Data Found</h3>
                <p style={{ margin: '12px 0 24px', color: 'var(--color-text-muted)' }}>Run the import matrix to populate leagues.</p>
                <Button variant="primary" onClick={() => navigate('/import')}>Initialize Matrix</Button>
            </div>
        </div>
    );

    return (
        <PageLayout className="v3-leagues-content animate-fade-in">
            <PageHeader
                title="Global Circuits"
                subtitle="Verified competition registry and discovery hub"
                badge={{ label: "Competition Registry", variant: "primary" }}
                extra={<Badge variant="neutral">{totalLeaguesCount} Active Modules</Badge>}
            />

            <PageContent>

                {featured.length > 0 && (
                    <section style={{ marginBottom: 'var(--spacing-3xl)' }}>
                        <h3 className="ds-section-subtitle">⭐ Top Tier Intelligence</h3>
                        <Grid columns="repeat(auto-fill, minmax(280px, 1fr))" gap="var(--spacing-md)">
                            {featured.map(league => (
                                <LeagueCard
                                    key={league.id}
                                    name={league.name}
                                    logo={league.logo}
                                    rank={league.rank}
                                    seasonsCount={league.seasons_count}
                                    isCup={league.is_cup}
                                    countryName={league.country_name}
                                    countryFlag={league.country_flag}
                                    featured
                                    onClick={() => handleCardClick(league)}
                                />
                            ))}
                        </Grid>
                    </section>
                )}

                <Tabs
                    items={[
                        { id: 'NATIONAL', label: 'National Systems' },
                        { id: 'INTERNATIONAL', label: 'International Circuits' }
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
                                            <LeagueCard
                                                key={league.id}
                                                name={league.name}
                                                logo={league.logo}
                                                rank={league.rank}
                                                seasonsCount={league.seasons_count}
                                                isCup={league.is_cup}
                                                countryFlag={league.country_flag}
                                                onClick={() => handleCardClick(league)}
                                            />
                                        ))}
                                    </Grid>
                                </section>
                            )}

                            {Object.entries(structuredData.international.continental).map(([continent, items]) => (
                                <section key={continent}>
                                    <h3 className="ds-section-subtitle">{continent}</h3>
                                    <Grid columns="repeat(auto-fill, minmax(240px, 1fr))" gap="var(--spacing-md)">
                                        {items.map(league => (
                                            <LeagueCard
                                                key={league.id}
                                                name={league.name}
                                                logo={league.logo}
                                                rank={league.rank}
                                                seasonsCount={league.seasons_count}
                                                isCup={league.is_cup}
                                                onClick={() => handleCardClick(league)}
                                            />
                                        ))}
                                    </Grid>
                                </section>
                            ))}
                        </Stack>
                    ) : (
                        <Stack gap="var(--spacing-md)">
                            {structuredData.national.map(country => {
                                const isExpanded = expandedCountries?.includes(country.name);

                                return (
                                    <div key={country.name} className={`v3-country-accordion ${isExpanded ? 'active' : ''}`}>
                                        <div className="v3-country-header" onClick={() => toggleCountry(country.name)}>
                                            <Stack direction="row" align="center" gap="var(--spacing-md)" style={{ flex: 1 }}>
                                                <div className="v3-flag-circle">
                                                    {country.flag ? <img src={country.flag} alt="" /> : '🏳️'}
                                                </div>
                                                <div style={{ flex: 1 }}>
                                                    <h3 style={{ margin: 0, fontSize: 'var(--font-size-lg)' }}>{country.name}</h3>
                                                    <span style={{ fontSize: '10px', color: 'var(--color-text-dim)' }}>
                                                        {country.leagues.length} {country.leagues.length > 1 ? 'Competitions' : 'Competition'}
                                                    </span>
                                                </div>
                                                <Badge variant="neutral" size="sm">Tier {country.rank}</Badge>
                                            </Stack>
                                            <span className={`v3-chevron ${isExpanded ? 'up' : 'down'}`}>▼</span>
                                        </div>

                                        {isExpanded && (
                                            <div className="v3-country-body animate-slide-down">
                                                <Grid columns="repeat(auto-fill, minmax(240px, 1fr))" gap="var(--spacing-md)">
                                                    {country.leagues.map(league => (
                                                        <LeagueCard
                                                            key={league.id}
                                                            name={league.name}
                                                            logo={league.logo}
                                                            rank={league.rank}
                                                            seasonsCount={league.seasons_count}
                                                            isCup={league.is_cup}
                                                            countryFlag={country.flag}
                                                            onClick={() => handleCardClick(league)}
                                                        />
                                                    ))}
                                                </Grid>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </Stack>
                    )}
                </div>
            </PageContent>
        </PageLayout>
    );
};

export default V3LeaguesList;
