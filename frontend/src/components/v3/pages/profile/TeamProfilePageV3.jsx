import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import api from '../../../../services/api';
import {
    Card, Stack, Button,
    Tabs, ProfileHeader, ControlBar, Select, TableSkeleton, Skeleton
} from '../../../../design-system';


import { PageLayout, PageContent } from '../../layouts';
import './TeamProfilePageV3.css';

// Tab Components
import PerformanceTab from '../../modules/TeamProfile/Tabs/PerformanceTab';
import SquadTab from '../../modules/TeamProfile/Tabs/SquadTab';
import MatchesTab from '../../modules/TeamProfile/Tabs/MatchesTab';
import StatsTab from '../../modules/TeamProfile/Tabs/StatsTab';
import LineupTab from '../../modules/TeamProfile/Tabs/LineupTab';

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
    'south africa': '🇿🇦', 'nigeria': '🇳🇬', 'senegal': '🇸🇳', 'china': '🇨🇳',
    'south korea': '🇰🇷', 'saudi arabia': '🇸🇦', 'world': '🌍',
};
const countryFlag = (country) => FLAG_MAP[country?.toLowerCase()] || '🌐';

const TeamProfilePageV3 = () => {
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
        const hash = location.hash.replaceAll('#', '');
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
        const fetchTeamProfile = async () => {
            setLoading(true);
            try {
                const fetchedData = await api.getTeam(id, selectedYear, selectedCompId === 'all' ? null : selectedCompId);
                setData(fetchedData);
                if (!selectedYear && fetchedData.rosterYear) {
                    setSelectedYear(fetchedData.rosterYear);
                }
            } catch (error) {
                console.error("Failed to load team profile:", error);
            }
            setLoading(false);
        };
        if (id) fetchTeamProfile();
    }, [id, selectedYear, selectedCompId]);

    const team = data?.team;
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
        <div className="ds-team-page">
            <Skeleton height="300px" style={{ marginBottom: 'var(--spacing-lg)' }} />
            <ControlBar
                left={<Skeleton width="400px" height="40px" />}
                right={<Skeleton width="200px" height="40px" />}
            />
            <main className="ds-team-content">
                <TableSkeleton rows={10} />
            </main>
        </div>
    );

    if (!team && !loading) return (
        <div style={{ padding: '80px', textAlign: 'center' }}>
            <Card style={{ maxWidth: '400px', margin: '0 auto' }}>
                <span style={{ fontSize: '48px' }}>⚠️</span>
                <h2 style={{ margin: '24px 0 12px' }}>Team Not Found</h2>
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
        <PageLayout className="ds-team-page animate-fade-in">
            <ProfileHeader
                title={team.name}
                image={team.logo_url}
                coverImage={team.venue_image}
                accentColor={team.accent_color}
                secondaryColor={team.secondary_color}
                tertiaryColor={team.tertiary_color}
                subtitles={[
                    team.country ? `${countryFlag(team.country)} ${team.country}` : null,
                    team.venue_name,
                    team.venue_city
                ].filter(Boolean)}
                badges={team.rank ? [{ label: `Rank #${team.rank}`, variant: 'primary' }] : []}
                stats={[
                    { label: 'Founded', value: team.founded || '—' },
                    { label: 'Coach', value: team.coach || '—' },
                    { label: 'Capacity', value: team.venue_capacity?.toLocaleString() || '—' }
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
                                <label htmlFor="season-select-id">Season</label>
                                <Select
                                    inputId="season-select-id"
                                    options={availableYears.map(y => ({ value: y, label: `${y}/${Number.parseInt(y) + 1}` }))}
                                    value={{ value: selectedYear, label: `${selectedYear}/${Number.parseInt(selectedYear) + 1}` }}
                                    onChange={(opt) => setSelectedYear(opt.value)}
                                />
                            </div>
                            <div className="ds-filter-box">
                                <label htmlFor="module-select-id">Module</label>
                                <Select
                                    inputId="module-select-id"
                                    options={[{ value: 'all', label: 'Global' }, ...competitionsForYear.map(c => ({ value: c.league_id, label: c.league_name }))]}
                                    value={selectedCompId === 'all' ? { value: 'all', label: 'Global' } : { value: selectedCompId, label: competitionsForYear.find(c => c.league_id == selectedCompId)?.league_name }}
                                    onChange={(opt) => setSelectedCompId(opt.value)}
                                />
                            </div>
                        </Stack>
                    }
                />

                <main className="ds-team-content">
                    {activeTab === 'performance' && (
                        <PerformanceTab teamId={id} year={selectedYear} competitionId={selectedCompId} summary={data.summary} seasons={competitionsForYear} />
                    )}
                    {activeTab === 'squad' && <SquadTab roster={data.roster} year={selectedYear} />}
                    {activeTab === 'lineup' && <LineupTab teamId={id} year={selectedYear} competitionId={selectedCompId} roster={data.roster} />}
                    {activeTab === 'matches' && <MatchesTab teamId={id} year={selectedYear} competitionId={selectedCompId} teamName={team.name} />}
                    {activeTab === 'stats' && <StatsTab teamId={id} year={selectedYear} competitionId={selectedCompId} />}
                </main>
            </PageContent>
        </PageLayout>
    );
};

export default TeamProfilePageV3;
