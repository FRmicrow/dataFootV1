import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../../../services/api';
import {
    Grid, Stack, Badge, Button,
    Tabs, LeagueCard, Accordion,
    Skeleton, CardSkeleton
} from '../../../../design-system';
import { PageLayout, PageHeader, PageContent } from '../../layouts';
import './V3LeaguesList.css';

const V3LeaguesList = () => {
    const [structuredData, setStructuredData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('NATIONAL');
    const [expandedCountries, setExpandedCountries] = useState(null);
    const [visibleCount, setVisibleCount] = useState(10);
    const sentinelRef = useRef(null);
    const navigate = useNavigate();

    const BATCH_SIZE = 8;

    const FEATURED_IDS = new Set([2, 3, 39, 140, 78, 135, 61]);

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


    const handleCardClick = (league) => {
        navigate(`/league/${league.id}`);
    };

    const intl = structuredData?.international ?? {};
    const clubMap = intl.club ?? {};
    const nationalTeamMap = intl.national_team ?? {};

    const totalLeaguesCount = structuredData ? (
        Object.values(clubMap).reduce((acc, arr) => acc + arr.length, 0) +
        Object.values(nationalTeamMap).reduce((acc, arr) => acc + arr.length, 0) +
        structuredData.national.reduce((acc, curr) => acc + curr.leagues.length, 0)
    ) : 0;

    const getFeaturedLeagues = () => {
        if (!structuredData) return [];
        const all = [
            ...Object.values(clubMap).flat(),
            ...Object.values(nationalTeamMap).flat(),
            ...structuredData.national.flatMap(c => c.leagues)
        ];
        return all.filter(l => FEATURED_IDS.has(l.api_id));
    };

    const featured = getFeaturedLeagues();

    const handleSentinel = useCallback((entries) => {
        if (entries[0].isIntersecting && structuredData) {
            setVisibleCount(prev => Math.min(prev + BATCH_SIZE, structuredData.national.length));
        }
    }, [structuredData]);

    useEffect(() => {
        const sentinel = sentinelRef.current;
        if (!sentinel) return;
        const observer = new IntersectionObserver(handleSentinel, { rootMargin: '120px' });
        observer.observe(sentinel);
        return () => observer.disconnect();
    }, [handleSentinel]);

    if (loading) return (
        <PageLayout className="v3-leagues-content">
            {/* Page header skeleton */}
            <div style={{ padding: 'var(--spacing-xl)' }}>
                <Skeleton width="240px" height="32px" style={{ marginBottom: 'var(--spacing-sm)' }} />
                <Skeleton width="360px" height="16px" />
            </div>
            <PageContent>
                {/* Featured leagues skeleton */}
                <section style={{ marginBottom: 'var(--spacing-3xl)' }}>
                    <Skeleton width="180px" height="18px" style={{ marginBottom: 'var(--spacing-md)' }} />
                    <Grid columns="repeat(auto-fill, minmax(280px, 1fr))" gap="var(--spacing-md)">
                        {[1, 2, 3, 4, 5, 6, 7].map(i => (
                            <CardSkeleton key={i} />
                        ))}
                    </Grid>
                </section>
                {/* Tabs skeleton */}
                <div style={{ display: 'flex', gap: 'var(--spacing-md)', marginBottom: 'var(--spacing-xl)' }}>
                    <Skeleton width="130px" height="36px" />
                    <Skeleton width="80px" height="36px" />
                    <Skeleton width="200px" height="36px" />
                </div>
                {/* Country accordion skeletons */}
                <Stack gap="var(--spacing-md)">
                    {[1, 2, 3, 4, 5].map(i => (
                        <div key={i} style={{ padding: 'var(--spacing-md)', borderRadius: 'var(--radius-md)', background: 'var(--color-surface-elevated)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)' }}>
                                <Skeleton width="32px" height="32px" circle />
                                <div>
                                    <Skeleton width="140px" height="16px" style={{ marginBottom: '4px' }} />
                                    <Skeleton width="90px" height="10px" />
                                </div>
                                <Skeleton width="60px" height="20px" style={{ marginLeft: 'auto' }} />
                            </div>
                        </div>
                    ))}
                </Stack>
            </PageContent>
        </PageLayout>
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
                extra={<div className="sf-badge sf-badge--neutral">{totalLeaguesCount} Active Modules</div>}
                style={{ marginBottom: 0 }}
            />

            <PageContent>

                {featured.length > 0 && (
                    <section style={{ marginBottom: 'var(--spacing-3xl)' }}>
                        <h3 className="ds-section-subtitle">⭐ Top Tier Intelligence</h3>
                        <Grid columns="repeat(auto-fill, minmax(280px, 1fr))" gap="var(--spacing-md)">
                            {featured.map(league => (
                                <LeagueCard
                                    key={league.id}
                                    id={league.id}
                                    name={league.name}
                                    logo={league.logo}
                                    isCup={league.is_cup}
                                    countryName={league.country_name}
                                    countryFlag={league.country_flag}
                                    leaderName={league.leader_name}
                                    leaderLogo={league.leader_logo}
                                    currentMatchday={league.current_matchday}
                                    currentRound={league.current_round}
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
                        { id: 'CLUB', label: 'Club Competitions' },
                        { id: 'NATIONAL_TEAM', label: 'National Teams' }
                    ]}
                    activeId={activeTab}
                    onChange={(id) => { setActiveTab(id); setVisibleCount(10); }}
                    className="mb-lg"
                />

                <div className="leagues-container">
                    {activeTab === 'CLUB' && (
                        <Stack gap="var(--spacing-2xl)">
                            {Object.entries(clubMap).map(([zone, items]) => (
                                <section key={zone}>
                                    <h3 className="ds-section-subtitle">{zone}</h3>
                                    <Grid columns="repeat(auto-fill, minmax(240px, 1fr))" gap="var(--spacing-md)">
                                        {items.map(league => (
                                            <LeagueCard
                                                key={league.id}
                                                name={league.name}
                                                logo={league.logo}
                                                isCup={league.is_cup}
                                                leaderName={league.leader_name}
                                                leaderLogo={league.leader_logo}
                                                currentMatchday={league.current_matchday}
                                                currentRound={league.current_round}
                                                onClick={() => handleCardClick(league)}
                                            />
                                        ))}
                                    </Grid>
                                </section>
                            ))}
                            {Object.keys(clubMap).length === 0 && (
                                <div className="ds-empty-state" style={{ padding: 'var(--spacing-3xl)', textAlign: 'center', opacity: 0.5 }}>
                                    <span style={{ fontSize: '48px' }}>🏆</span>
                                    <p>No club competitions synced yet.</p>
                                </div>
                            )}
                        </Stack>
                    )}

                    {activeTab === 'NATIONAL_TEAM' && (
                        <Stack gap="var(--spacing-2xl)">
                            {Object.entries(nationalTeamMap).map(([zone, items]) => (
                                <section key={zone}>
                                    <h3 className="ds-section-subtitle">{zone}</h3>
                                    <Grid columns="repeat(auto-fill, minmax(240px, 1fr))" gap="var(--spacing-md)">
                                        {items.map(league => (
                                            <LeagueCard
                                                key={league.id}
                                                name={league.name}
                                                logo={league.logo}
                                                isCup={league.is_cup}
                                                leaderName={league.leader_name}
                                                leaderLogo={league.leader_logo}
                                                currentMatchday={league.current_matchday}
                                                currentRound={league.current_round}
                                                onClick={() => handleCardClick(league)}
                                            />
                                        ))}
                                    </Grid>
                                </section>
                            ))}
                            {Object.keys(nationalTeamMap).length === 0 && (
                                <div className="ds-empty-state" style={{ padding: 'var(--spacing-3xl)', textAlign: 'center', opacity: 0.5 }}>
                                    <span style={{ fontSize: '48px' }}>🌍</span>
                                    <p>Run the migration script to classify competitions.</p>
                                </div>
                            )}
                        </Stack>
                    )}

                    {activeTab === 'NATIONAL' && (
                        <>
                            <Stack gap="var(--spacing-md)">
                                {structuredData.national.slice(0, visibleCount).map(country => (
                                    <Accordion
                                        key={country.name}
                                        title={
                                            <Stack direction="row" align="center" gap="var(--spacing-md)">
                                                <div className="v3-flag-circle">
                                                    {country.flag ? <img src={country.flag} alt="" /> : '🏳️'}
                                                </div>
                                                <div>
                                                    <h3 style={{ margin: 0, fontSize: 'var(--font-size-lg)' }}>{country.name}</h3>
                                                    <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-dim)' }}>
                                                        {country.leagues.length} {country.leagues.length > 1 ? 'Competitions' : 'Competition'}
                                                    </span>
                                                </div>
                                            </Stack>
                                        }
                                        headerRight={<Badge variant="neutral" size="sm">Tier {country.rank}</Badge>}
                                        defaultExpanded={expandedCountries?.includes(country.name)}
                                    >
                                        <div className="v3-country-body animate-slide-down">
                                            <Grid columns="repeat(auto-fill, minmax(240px, 1fr))" gap="var(--spacing-md)">
                                                {country.leagues.map(league => (
                                                    <LeagueCard
                                                        key={league.id}
                                                        id={league.id}
                                                        name={league.name}
                                                        logo={league.logo}
                                                        isCup={league.is_cup}
                                                        countryName={league.country_name}
                                                        countryFlag={country.flag}
                                                        leaderName={league.leader_name}
                                                        leaderLogo={league.leader_logo}
                                                        currentMatchday={league.current_matchday}
                                                        currentRound={league.current_round}
                                                        onClick={() => handleCardClick(league)}
                                                    />
                                                ))}
                                            </Grid>
                                        </div>
                                    </Accordion>
                                ))}
                            </Stack>

                            {visibleCount < structuredData.national.length && (
                                <Stack gap="var(--spacing-md)" style={{ marginTop: 'var(--spacing-md)' }}>
                                    {[1, 2, 3].map(i => (
                                        <div key={i} style={{ padding: 'var(--spacing-md)', borderRadius: 'var(--radius-md)', background: 'var(--color-surface-elevated)', display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)' }}>
                                            <Skeleton width="36px" height="36px" circle />
                                            <div>
                                                <Skeleton width="140px" height="14px" style={{ marginBottom: '6px' }} />
                                                <Skeleton width="80px" height="10px" />
                                            </div>
                                            <Skeleton width="52px" height="20px" style={{ marginLeft: 'auto' }} />
                                        </div>
                                    ))}
                                </Stack>
                            )}

                            <div ref={sentinelRef} style={{ height: '1px' }} />
                        </>
                    )}
                </div>
            </PageContent>
        </PageLayout>
    );
};

export default V3LeaguesList;
