import React, { useState, useEffect, useMemo } from 'react';
import PropTypes from 'prop-types';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useClubProfile } from '../../../../hooks/useV4Queries';
import {
    Card, Stack, Button,
    Tabs, ProfileHeader, ControlBar, Select, TableSkeleton, Skeleton
} from '../../../../design-system';

import { PageLayout, PageContent } from '../../../v3/layouts';
import PerformanceTabV4 from '../../modules/ClubProfile/Tabs/PerformanceTabV4';
import SquadTabV4 from '../../modules/ClubProfile/Tabs/SquadTabV4';
import MatchesTabV4 from '../../modules/ClubProfile/Tabs/MatchesTabV4';
import LineupTabV4 from '../../modules/ClubProfile/Tabs/LineupTabV4';
import StatsTabV4 from '../../modules/ClubProfile/Tabs/StatsTabV4';

import './ClubProfilePageV4.css';

const FLAG_MAP = {
    'england': '🏴󠁧󠁢󠁥󠁮󠁧󠁿', 'france': '🇫🇷', 'spain': '🇪🇸', 'germany': '🇩🇪',
    'italy': '🇮🇹', 'portugal': '🇵🇹', 'netherlands': '🇳🇱', 'belgium': '🇧🇪',
    'brazil': '🇧🇷', 'argentina': '🇦🇷', 'usa': '🇺🇸', 'scotland': '🏴󠁧󠁢󠁳󠁣󠁴󠁿',
    'wales': '🏴󠁧󠁢󠁷󠁬󠁳󠁿', 'turkey': '🇹🇷', 'greece': '🇬🇷', 'mexico': '🇲🇽',
    'russia': '🇷🇺', 'japan': '🇯🇵', 'australia': '🇦🇺', 'ukraine': '🇺🇦',
    'austria': '🇦🇹', 'switzerland': '🇨🇭', 'croatia': '🇭🇷', 'denmark': '🇩🇰',
    'sweden': '🇸🇪', 'norway': '🇳🇴', 'poland': '🇵🇱', 'czech republic': '🇨🇿',
    'serbia': '🇷🇸', 'romania': '🇷🇴', 'hungary': '🇭🇺', 'slovakia': '🇸🇰',
    'colombia': '🇨🇴', 'chile': '🇨🇱', 'uruguay': '🇺🇾', 'morocco': '🇲🇦',
    'world': '🌍',
};
const countryFlag = (country) => FLAG_MAP[country?.toLowerCase()] || '🌐';

const ClubProfilePageV4 = () => {
    const { name: identifier } = useParams();
    const navigate = useNavigate();
    const location = useLocation();

    const [activeTab, setActiveTab] = useState('performance');
    const [selectedSeason, setSelectedSeason] = useState(null);
    const [selectedCompId, setSelectedCompId] = useState('all');

    // Fetch club profile with React Query (handles caching, loading, error)
    const { data, isLoading, error } = useClubProfile(identifier, selectedSeason, selectedCompId);

    // Auto-select the latest season on first load (only once)
    useEffect(() => {
        if (!selectedSeason && data?.availableYears?.length > 0) {
            const sortedYears = [...data.availableYears].sort((a, b) => b.localeCompare(a));
            setSelectedSeason(sortedYears[0]);
        }
    }, [data?.availableYears, selectedSeason]);

    // Reset comp filter when season changes to avoid stale selection
    useEffect(() => {
        if (selectedCompId !== 'all' && data?.seasons) {
            const found = data.seasons.find(
                s => s.season_label === selectedSeason && String(s.competition_id) === String(selectedCompId)
            );
            if (!found) setSelectedCompId('all');
        }
    }, [selectedSeason, data?.seasons]);

    // Sync tab with URL hash
    useEffect(() => {
        const hash = location.hash.replace('#', '');
        const validTabs = ['performance', 'squad', 'lineup', 'matches', 'stats'];
        if (hash && validTabs.includes(hash)) setActiveTab(hash);
        else setActiveTab('performance');
    }, [location.hash]);

    const handleTabChange = (tabId) => {
        setActiveTab(tabId);
        navigate(`#${tabId}`, { replace: true });
    };

    // ⚠️ All hooks MUST be declared before any conditional returns
    const seasons = data?.seasons ?? [];
    const competitionsForSeason = useMemo(() => {
        if (!selectedSeason) return [];
        return seasons.filter(s => s.season_label === selectedSeason);
    }, [seasons, selectedSeason]);

    const tabItems = [
        { id: 'performance', label: 'Overview' },
        { id: 'squad', label: 'Roster' },
        { id: 'lineup', label: 'Strategy' },
        { id: 'matches', label: 'Calendar' },
        { id: 'stats', label: 'Analytics' }
    ];

    // Loading skeleton (initial)
    if (isLoading && !data) return (
        <div className="ds-club-page">
            <Skeleton height="300px" style={{ marginBottom: 'var(--spacing-lg)' }} />
            <ControlBar
                left={<Skeleton width="400px" height="40px" />}
                right={<Skeleton width="200px" height="40px" />}
            />
            <main className="ds-club-content">
                <TableSkeleton rows={10} />
            </main>
        </div>
    );

    // Error / not found
    const errorMessage = error?.message || 'Club Not Found';
    if (error || (!isLoading && !data?.club)) return (
        <div style={{ padding: '80px', textAlign: 'center' }}>
            <Card style={{ maxWidth: '400px', margin: '0 auto' }}>
                <span style={{ fontSize: '48px' }}>⚠️</span>
                <h2 style={{ margin: '24px 0 12px' }}>{errorMessage}</h2>
                <Button variant="primary" onClick={() => navigate('/leagues')}>Back to Leagues</Button>
            </Card>
        </div>
    );

    const { club, availableYears, roster, summary } = data;

    return (
        <PageLayout className="ds-club-page-v4 animate-fade-in">
            <ProfileHeader
                title={club.name}
                image={club.logo_url}
                coverImage={club.venue_image}
                accentColor={club.accent_color}
                secondaryColor={club.secondary_color}
                tertiaryColor={club.tertiary_color}
                subtitles={[
                    club.country ? `${countryFlag(club.country)} ${club.country}` : null,
                    club.venue_name,
                    club.venue_city,
                ].filter(Boolean)}
                stats={[
                    { label: 'Founded', value: club.founded || '—' },
                    { label: 'Capacity', value: club.venue_capacity?.toLocaleString() || '—' },
                ]}
            />

            <PageContent>
                <ControlBar
                    left={<Tabs items={tabItems} activeId={activeTab} onChange={handleTabChange} />}
                    right={
                        <Stack direction="row" gap="var(--spacing-md)">
                            <div className="ds-filter-box">
                                <label htmlFor="season-select-v4">Season</label>
                                <Select
                                    inputId="season-select-v4"
                                    options={(availableYears || []).map(y => ({ value: y, label: y }))}
                                    value={{ value: selectedSeason, label: selectedSeason }}
                                    onChange={(opt) => setSelectedSeason(opt.value)}
                                />
                            </div>
                            <div className="ds-filter-box">
                                <label htmlFor="module-select-v4">Module</label>
                                <Select
                                    inputId="module-select-v4"
                                    options={[
                                        { value: 'all', label: 'Global' },
                                        ...competitionsForSeason.map(c => ({
                                            value: String(c.competition_id),
                                            label: c.competition_name,
                                        }))
                                    ]}
                                    value={
                                        selectedCompId === 'all'
                                            ? { value: 'all', label: 'Global' }
                                            : {
                                                value: selectedCompId,
                                                label: competitionsForSeason.find(c => String(c.competition_id) === String(selectedCompId))?.competition_name,
                                            }
                                    }
                                    onChange={(opt) => setSelectedCompId(opt.value)}
                                />
                            </div>
                        </Stack>
                    }
                />

                <main className="ds-club-content-v4">
                    {activeTab === 'performance' && (
                        <PerformanceTabV4
                            summary={summary}
                            season={selectedSeason}
                            seasons={competitionsForSeason}
                            competitionId={selectedCompId}
                        />
                    )}
                    {activeTab === 'squad' && (
                        <SquadTabV4
                            roster={roster}
                            season={selectedSeason}
                        />
                    )}
                    {activeTab === 'lineup' && (
                        <LineupTabV4
                            clubId={club.slug || club.id}
                            year={selectedSeason}
                            competitionId={selectedCompId === 'all' ? null : selectedCompId}
                            roster={roster}
                        />
                    )}
                    {activeTab === 'matches' && (
                        <MatchesTabV4
                            clubId={club.id}
                            season={selectedSeason}
                            competitionId={selectedCompId === 'all' ? null : selectedCompId}
                            clubName={club.name}
                        />
                    )}
                    {activeTab === 'stats' && (
                        <StatsTabV4
                            clubId={club.slug || club.id}
                            year={selectedSeason}
                            competitionId={selectedCompId === 'all' ? null : selectedCompId}
                        />
                    )}
                </main>
            </PageContent>
        </PageLayout>
    );
};

ClubProfilePageV4.propTypes = {};

export default ClubProfilePageV4;
