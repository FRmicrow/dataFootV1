import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import api from '../../services/api';
import {
    Card, Stack, Grid, Badge, Button,
    Tabs, ProfileHeader
} from '../../design-system';
import './ClubProfilePageV3.css';

// Tab Components
import PerformanceTab from './ClubProfile/Tabs/PerformanceTab';
import SquadTab from './ClubProfile/Tabs/SquadTab';
import MatchesTab from './ClubProfile/Tabs/MatchesTab';
import StatsTab from './ClubProfile/Tabs/StatsTab';
import LineupTab from './ClubProfile/Tabs/LineupTab';

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
                const fetchedData = await api.getClub(id, selectedYear, selectedCompId !== 'all' ? selectedCompId : null);
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
        <div style={{ height: '80vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <div className="ds-button-spinner" style={{ marginBottom: '12px' }}></div>
            <p style={{ color: 'var(--color-text-dim)' }}>Gathering club intelligence...</p>
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
        { id: 'performance', label: 'Overview', icon: '💎' },
        { id: 'squad', label: 'Roster', icon: '👥' },
        { id: 'lineup', label: 'Strategy', icon: '📋', disabled: !hasLineups },
        { id: 'matches', label: 'Calendar', icon: '📅' },
        { id: 'stats', label: 'Analytics', icon: '📈', disabled: !hasStats }
    ];

    return (
        <div className="ds-club-page animate-fade-in">
            <ProfileHeader
                title={club.name}
                image={club.logo_url}
                coverImage={club.venue_image}
                accentColor={club.accent_color}
                subtitles={[club.country, club.venue_name, club.venue_city]}
                badges={[
                    { label: 'Verified Hub', variant: 'success', icon: '🛡️' },
                    { label: `Rank #${club.rank || 'N/A'}`, variant: 'primary' }
                ]}
                stats={[
                    { label: 'Founded', value: club.founded || 'N/A' },
                    { label: 'Manager', value: club.manager || 'N/A' },
                    { label: 'Capacity', value: club.venue_capacity?.toLocaleString() || 'N/A' }
                ]}
            />

            <div className="ds-club-control-bar">
                <Grid columns="1fr auto" gap="var(--spacing-lg)" align="center">
                    <Tabs
                        items={tabItems}
                        activeId={activeTab}
                        onChange={handleTabChange}
                    />

                    <Stack direction="row" gap="var(--spacing-md)">
                        <div className="ds-filter-box">
                            <label>Season</label>
                            <select value={selectedYear || ''} onChange={(e) => setSelectedYear(parseInt(e.target.value))}>
                                {availableYears.map(y => <option key={y} value={y}>{y}/{y + 1}</option>)}
                            </select>
                        </div>
                        <div className="ds-filter-box">
                            <label>Module</label>
                            <select value={selectedCompId} onChange={(e) => setSelectedCompId(e.target.value)}>
                                <option value="all">Global</option>
                                {competitionsForYear.map(c => <option key={c.league_id} value={c.league_id}>{c.league_name}</option>)}
                            </select>
                        </div>
                    </Stack>
                </Grid>
            </div>

            <main className="ds-club-content">
                {activeTab === 'performance' && (
                    <PerformanceTab clubId={id} year={selectedYear} competitionId={selectedCompId} summary={data.summary} seasons={competitionsForYear} />
                )}
                {activeTab === 'squad' && <SquadTab roster={data.roster} year={selectedYear} />}
                {activeTab === 'lineup' && <LineupTab clubId={id} year={selectedYear} competitionId={selectedCompId} roster={data.roster} />}
                {activeTab === 'matches' && <MatchesTab clubId={id} year={selectedYear} competitionId={selectedCompId} />}
                {activeTab === 'stats' && <StatsTab clubId={id} year={selectedYear} competitionId={selectedCompId} />}
            </main>
        </div>
    );
};

export default ClubProfilePageV3;
