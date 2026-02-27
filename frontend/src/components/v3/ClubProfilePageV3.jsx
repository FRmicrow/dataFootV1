import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import api from '../../services/api';
import { Card, Stack, Grid, Badge, Button } from '../../design-system';
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
    const [selectedCompId, setSelectedCompId] = useState('all'); // 'all' or specific league_id

    // sync tab with URL hash
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

    const headerStyle = useMemo(() => {
        const c1 = club?.accent_color || '#6366f1';
        const c2 = club?.secondary_color || c1;
        const c3 = club?.tertiary_color || 'transparent';

        return {
            '--club-accent': c1,
            '--club-secondary': c2,
            backgroundImage: `linear-gradient(135deg, ${c1}33 0%, ${c2}22 50%, transparent 100%)`,
            borderBottom: `2px solid ${c1}44`
        };
    }, [club]);

    if (loading && !data) return (
        <div className="v3-dashboard-page loading">
            <div className="ds-button-spinner"></div>
            <p>Gathering club data...</p>
        </div>
    );

    if (!club && !loading) return (
        <div style={{ padding: '80px', textAlign: 'center' }}>
            <Card style={{ maxWidth: '400px', margin: '0 auto' }}>
                <span style={{ fontSize: '48px' }}>⚠️</span>
                <h2 style={{ margin: '24px 0 12px' }}>Club Not Found</h2>
                <Button onClick={() => navigate('/search')}>Return to Universe</Button>
            </Card>
        </div>
    );

    const activeSeasons = selectedCompId === 'all'
        ? seasons.filter(s => s.season_year === selectedYear)
        : seasons.filter(s => s.season_year === selectedYear && s.league_id == selectedCompId);

    const hasLineups = activeSeasons.some(s => s.imported_lineups === 1);
    const hasStats = activeSeasons.some(s => s.imported_fixture_stats === 1);

    const tabs = [
        { id: 'performance', label: 'Overview', icon: '📊' },
        { id: 'squad', label: 'Roster', icon: '👥' },
        { id: 'lineup', label: 'Strategy', icon: '📋', disabled: !hasLineups },
        { id: 'matches', label: 'Calendar', icon: '📅' },
        { id: 'stats', label: 'Analytics', icon: '📈', disabled: !hasStats }
    ];

    return (
        <div className="ds-club-page animate-fade-in">
            {/* Header Section */}
            <div className="ds-club-header" style={headerStyle}>
                <div className="ds-header-inner">
                    <Stack direction="row" gap="var(--spacing-2xl)" align="center">
                        <div className="ds-club-logo-wrap">
                            <img src={club.logo_url} alt={club.name} />
                        </div>
                        <div style={{ flex: 1 }}>
                            <Stack gap="var(--spacing-xs)">
                                <Stack direction="row" align="center" gap="var(--spacing-sm)">
                                    <Badge variant="primary">{club.country}</Badge>
                                    {club.founded && <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>Est. {club.founded}</span>}
                                </Stack>
                                <h1 style={{ fontSize: 'var(--font-size-4xl)', margin: 0 }}>{club.name}</h1>
                                <div style={{ fontSize: 'var(--font-size-sm)', opacity: 0.8 }} dangerouslySetInnerHTML={{ __html: `${club.venue_name} • ${club.venue_city}` }}></div>
                                <Stack direction="row" gap="var(--spacing-sm)" className="mt-sm">
                                    <Badge variant="success" size="sm">Live Data Enabled</Badge>
                                    {club.manager && <Badge variant="neutral" size="sm">Mgr: {club.manager}</Badge>}
                                </Stack>
                            </Stack>
                        </div>

                        {club.venue_image && (
                            <div className="ds-venue-preview">
                                <img src={club.venue_image} alt="" />
                                <div className="ds-venue-info">
                                    <div style={{ fontWeight: 'bold' }}>{club.venue_capacity?.toLocaleString()}</div>
                                    <div style={{ fontSize: '10px', textTransform: 'uppercase' }}>Capacity</div>
                                </div>
                            </div>
                        )}
                    </Stack>
                </div>
            </div>

            {/* Sticky Control Bar */}
            <div className="ds-control-bar">
                <div className="ds-control-inner">
                    <Stack direction="row" justify="space-between" align="center">
                        <nav className="ds-tab-nav">
                            {tabs.map(tab => (
                                <button
                                    key={tab.id}
                                    className={`ds-nav-tab ${activeTab === tab.id ? 'active' : ''} ${tab.disabled ? 'disabled' : ''}`}
                                    onClick={() => !tab.disabled && handleTabChange(tab.id)}
                                >
                                    <span style={{ marginRight: '8px' }}>{tab.icon}</span>
                                    {tab.label}
                                </button>
                            ))}
                        </nav>

                        <Stack direction="row" gap="var(--spacing-md)">
                            <div className="ds-filter-group">
                                <label>Season</label>
                                <select
                                    value={selectedYear || ''}
                                    onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                                >
                                    {availableYears.map(y => (
                                        <option key={y} value={y}>{y} / {(y + 1).toString().slice(2)}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="ds-filter-group">
                                <label>Competition</label>
                                <select
                                    value={selectedCompId}
                                    onChange={(e) => setSelectedCompId(e.target.value)}
                                >
                                    <option value="all">Global (All)</option>
                                    {competitionsForYear.map(c => (
                                        <option key={c.league_id} value={c.league_id}>{c.league_name}</option>
                                    ))}
                                </select>
                            </div>
                        </Stack>
                    </Stack>
                </div>
            </div>

            {/* Main Content */}
            <main className="ds-club-main">
                {activeTab === 'performance' && (
                    <PerformanceTab
                        clubId={id}
                        year={selectedYear}
                        competitionId={selectedCompId}
                        summary={data.summary}
                        seasons={competitionsForYear}
                    />
                )}
                {activeTab === 'squad' && (
                    <SquadTab
                        roster={data.roster}
                        year={selectedYear}
                    />
                )}
                {activeTab === 'lineup' && (
                    <LineupTab
                        clubId={id}
                        year={selectedYear}
                        competitionId={selectedCompId}
                        roster={data.roster}
                    />
                )}
                {activeTab === 'matches' && (
                    <MatchesTab
                        clubId={id}
                        year={selectedYear}
                        competitionId={selectedCompId}
                    />
                )}
                {activeTab === 'stats' && (
                    <StatsTab
                        clubId={id}
                        year={selectedYear}
                        competitionId={selectedCompId}
                    />
                )}
            </main>
        </div>
    );
};

export default ClubProfilePageV3;
