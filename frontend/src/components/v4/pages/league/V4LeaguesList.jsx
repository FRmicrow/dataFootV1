import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../../../services/api';
import {
    Grid, Stack, Badge, Accordion,
    LeagueCard, Skeleton, CardSkeleton
} from '../../../../design-system';
import PageLayoutV4 from '../../layouts/PageLayoutV4';
import PageContentV4 from '../../layouts/PageContentV4';
import './V4LeaguesList.css';

const V4LeaguesList = () => {
    const [leagues, setLeagues] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchLeagues = async () => {
            try {
                const data = await api.getLeaguesV4();
                setLeagues(data);
            } catch (err) {
                setError(err.message || 'Failed to load V4 leagues');
            } finally {
                setLoading(false);
            }
        };
        fetchLeagues();
    }, []);

    const handleLeagueClick = (league) => {
        navigate(`/leagues/${encodeURIComponent(league.name)}/season/${league.latest_season}`);
    };

    // --- Loading state ---
    if (loading) {
        return (
            <PageLayoutV4>
                <div style={{ padding: 'var(--spacing-xl)' }}>
                    <Skeleton width="280px" height="32px" style={{ marginBottom: 'var(--spacing-sm)' }} />
                    <Skeleton width="400px" height="16px" />
                </div>
                <PageContentV4>
                    <Stack gap="var(--spacing-md)">
                        {[1, 2, 3, 4, 5].map(i => (
                            <div key={i} style={{
                                padding: 'var(--spacing-md)',
                                borderRadius: 'var(--radius-md)',
                                background: 'var(--color-surface-elevated)'
                            }}>
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
                </PageContentV4>
            </PageLayoutV4>
        );
    }

    // --- Error state ---
    if (error) {
        return (
            <PageLayoutV4>
                <PageContentV4>
                    <div className="v4-leagues-empty">
                        <span style={{ fontSize: '48px' }}>⚠️</span>
                        <h3>Failed to Load V4 Leagues</h3>
                        <p style={{ color: 'var(--color-text-muted)' }}>{error}</p>
                    </div>
                </PageContentV4>
            </PageLayoutV4>
        );
    }

    // --- Empty state ---
    if (!leagues || leagues.length === 0) {
        return (
            <PageLayoutV4>
                <PageContentV4>
                    <div className="v4-leagues-empty">
                        <span style={{ fontSize: '48px' }}>📂</span>
                        <h3>No V4 Leagues Found</h3>
                        <p style={{ color: 'var(--color-text-muted)' }}>
                            Run the Transfermarkt import to populate V4 leagues.
                        </p>
                    </div>
                </PageContentV4>
            </PageLayoutV4>
        );
    }

    // --- Compute totals ---
    const totalLeagues = leagues.reduce((sum, c) => sum + c.leagues.length, 0);
    const totalSeasons = leagues.reduce(
        (sum, c) => sum + c.leagues.reduce((s, l) => s + l.seasons_count, 0), 0
    );

    // --- Data state ---
    return (
        <PageLayoutV4 className="v4-leagues-content animate-fade-in">
            {/* Header */}
            <div className="v4-leagues-header">
                <div>
                    <h1 className="v4-leagues-title">Historical Leagues</h1>
                    <p className="v4-leagues-subtitle">
                        Transfermarkt historical data · V4 Engine
                    </p>
                </div>
                <Badge variant="primary" size="sm">{totalLeagues} Leagues</Badge>
            </div>

            {/* Stats */}
            <div className="v4-leagues-stats">
                <div className="v4-leagues-stat">
                    <span className="v4-leagues-stat-value">{totalLeagues}</span>
                    <span className="v4-leagues-stat-label">competitions</span>
                </div>
                <div className="v4-leagues-stat">
                    <span className="v4-leagues-stat-value">{totalSeasons}</span>
                    <span className="v4-leagues-stat-label">seasons indexed</span>
                </div>
                <div className="v4-leagues-stat">
                    <span className="v4-leagues-stat-value">{leagues.length}</span>
                    <span className="v4-leagues-stat-label">countries</span>
                </div>
            </div>

            <PageContentV4>
                <Stack gap="var(--spacing-md)">
                    {leagues.map(country => (
                        <Accordion
                            key={country.country_name}
                            title={
                                <Stack direction="row" align="center" gap="var(--spacing-md)">
                                    {country.country_flag
                                        ? (
                                            <div className="v4-flag-circle">
                                                <img src={country.country_flag} alt="" />
                                            </div>
                                        )
                                        : <div className="v4-zone-badge">{country.country_name}</div>
                                    }
                                    <div>
                                        <h3 style={{ margin: 0, fontSize: 'var(--font-size-lg)' }}>
                                            {country.country_name}
                                        </h3>
                                        <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-dim)' }}>
                                            {country.leagues.length} {country.leagues.length > 1 ? 'Competitions' : 'Competition'}
                                        </span>
                                    </div>
                                </Stack>
                            }
                            headerRight={
                                <Badge variant="neutral" size="sm">
                                    {country.leagues.reduce((sum, l) => sum + l.seasons_count, 0)} seasons
                                </Badge>
                            }
                            defaultExpanded
                        >
                            <div className="v4-country-body animate-slide-down">
                                <Grid columns="repeat(auto-fill, minmax(260px, 1fr))" gap="var(--spacing-md)">
                                    {country.leagues.map(league => (
                                        <LeagueCard
                                            key={league.league_id}
                                            id={league.league_id}
                                            name={league.name}
                                            logo={league.logo_url || 'https://tmssl.akamaized.net//images/logo/normal/tm.png'}
                                            countryName={country.country_name}
                                            countryFlag={country.country_flag}
                                            onClick={() => handleLeagueClick(league)}
                                        />
                                    ))}
                                </Grid>
                            </div>
                        </Accordion>
                    ))}
                </Stack>
            </PageContentV4>
        </PageLayoutV4>
    );
};

export default V4LeaguesList;
