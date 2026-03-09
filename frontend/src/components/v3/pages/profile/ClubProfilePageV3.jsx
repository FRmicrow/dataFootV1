import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import api from '../../../../services/api';
import {
    Card, Stack, Button,
    Tabs, ProfileHeader, ControlBar, Select, TableSkeleton, Skeleton
} from '../../../../design-system';


import { PageLayout, PageContent } from '../../layouts';
import './ClubProfilePageV3.css';

// Tab Components
import PerformanceTab from '../../modules/ClubProfile/Tabs/PerformanceTab';
import SquadTab from '../../modules/ClubProfile/Tabs/SquadTab';
import MatchesTab from '../../modules/ClubProfile/Tabs/MatchesTab';
import StatsTab from '../../modules/ClubProfile/Tabs/StatsTab';
import LineupTab from '../../modules/ClubProfile/Tabs/LineupTab';

const ClubProfilePageV3 = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();

    // UI State
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('performance');

    // Global Filters State
    const [selectedYear, setSelectedYear] = useState(null);
    const [selectedCompId, setSelectedCompId] = useState('all');

    useEffect(() => {
        const hash = location.hash.replace('#', '');
        const validTabs = ['performance', 'squad', 'lineup', 'matches', 'stats'];
        if (hash && validTabs.includes(hash)) {
            setActiveTab(hash);
        } else {
            setActiveTab('performance');
        }
    }, [location.hash]);

    const handleTabChange = (tabId) => {
        setActiveTab(tabId);
        navigate(`#${tabId}`, { replace: true });
    };

    useEffect(() => {
        const fetchClubProfile = async () => {
            setLoading(true);
            try {
                const fetchedData = await api.getClub(id, selectedYear, selectedCompId === 'all' ? null : selectedCompId);
                setData(fetchedData);
                if (!selectedYear && fetchedData.rosterYear) {
                    setSelectedYear(fetchedData.rosterYear);
                }
            } catch (error) {
                console.error("Failed to load club profile:", error);
            }
            setLoading(false);
        };
        if (id) fetchClubProfile();
    }, [id, selectedYear, selectedCompId]);

    const club = data?.club;
    const seasons = data?.seasons || [];
    const availableYears = data?.availableYears || [];

    const competitionsForYear = useMemo(() => {
        if (!selectedYear) return [];
        return seasons.filter(s => s.season_year === selectedYear);
    }, [seasons, selectedYear]);

    useEffect(() => {
        if (selectedCompId !== 'all' && !competitionsForYear.find(c => c.league_id == selectedCompId)) {
            setSelectedCompId('all');
        }
    }, [selectedYear, competitionsForYear]);

    if (loading && !data) return (
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

    if (!club && !loading) return (
        <div style={{ padding: '80px', textAlign: 'center' }}>
            <Card style={{ maxWidth: '400px', margin: '0 auto' }}>
                <span style={{ fontSize: '48px' }}>⚠️</span>
                <h2 style={{ margin: '24px 0 12px' }}>Club Not Found</h2>
                <Button variant="primary" onClick={() => navigate('/search')}>Return to Universe</Button>
            </Card>
        </div>
    );

    const activeSeasons = selectedCompId === 'all'
        ? seasons.filter(s => s.season_year === selectedYear)
        : seasons.filter(s => s.season_year === selectedYear && s.league_id == selectedCompId);

    const hasLineups = activeSeasons.some(s => s.imported_lineups === 1);
    const hasStats = activeSeasons.some(s => s.imported_fixture_stats === 1);

    const tabItems = [
        { id: 'performance', label: 'Overview' },
        { id: 'squad', label: 'Roster' },
        { id: 'lineup', label: 'Strategy', disabled: !hasLineups },
        { id: 'matches', label: 'Calendar' },
        { id: 'stats', label: 'Analytics', disabled: !hasStats }
    ];

    return (
        <PageLayout className="ds-club-page animate-fade-in">
            <ProfileHeader
                title={club.name}
                image={club.logo_url}
                coverImage={club.venue_image}
                accentColor={club.accent_color}
                secondaryColor={club.secondary_color}
                tertiaryColor={club.tertiary_color}
                subtitles={[club.country, club.venue_name, club.venue_city]}
                badges={[
                    { label: 'Verified Hub', variant: 'success' },
                    { label: `Rank #${club.rank || 'N/A'}`, variant: 'primary' }
                ]}
                stats={[
                    { label: 'Founded', value: club.founded || 'N/A' },
                    { label: 'Manager', value: club.manager || 'N/A' },
                    { label: 'Capacity', value: club.venue_capacity?.toLocaleString() || 'N/A' }
                ]}
            />

            <PageContent>
                <ControlBar
                    left={
                        <Tabs
                            items={tabItems}
                            activeId={activeTab}
                            onChange={handleTabChange}
                        />
                    }
                    right={
                        <Stack direction="row" gap="var(--spacing-md)">
                            <div className="ds-filter-box">
                                <label>Season</label>
                                <Select
                                    options={availableYears.map(y => ({ value: y, label: `${y}/${Number.parseInt(y) + 1}` }))}
                                    value={{ value: selectedYear, label: `${selectedYear}/${Number.parseInt(selectedYear) + 1}` }}
                                    onChange={(opt) => setSelectedYear(opt.value)}
                                />
                            </div>
                            <div className="ds-filter-box">
                                <label>Module</label>
                                <Select
                                    options={[{ value: 'all', label: 'Global' }, ...competitionsForYear.map(c => ({ value: c.league_id, label: c.league_name }))]}
                                    value={selectedCompId === 'all' ? { value: 'all', label: 'Global' } : { value: selectedCompId, label: competitionsForYear.find(c => c.league_id == selectedCompId)?.league_name }}
                                    onChange={(opt) => setSelectedCompId(opt.value)}
                                />
                            </div>
                        </Stack>
                    }
                />

                <main className="ds-club-content">
                    {activeTab === 'performance' && (
                        <PerformanceTab clubId={id} year={selectedYear} competitionId={selectedCompId} summary={data.summary} seasons={competitionsForYear} />
                    )}
                    {activeTab === 'squad' && <SquadTab roster={data.roster} year={selectedYear} />}
                    {activeTab === 'lineup' && <LineupTab clubId={id} year={selectedYear} competitionId={selectedCompId} roster={data.roster} />}
                    {activeTab === 'matches' && <MatchesTab clubId={id} year={selectedYear} competitionId={selectedCompId} clubName={club.name} />}
                    {activeTab === 'stats' && <StatsTab clubId={id} year={selectedYear} competitionId={selectedCompId} />}
                </main>
            </PageContent>
        </PageLayout>
    );
};

export default ClubProfilePageV3;
