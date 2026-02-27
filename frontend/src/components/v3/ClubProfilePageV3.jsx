import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import api from '../../services/api';
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

    // US_V14: Dynamic Branding - Multi-color gradient from logo palette
    const headerStyle = useMemo(() => {
        const c1 = club?.accent_color || '#6366f1';
        const c2 = club?.secondary_color || c1;
        const c3 = club?.tertiary_color || '#0f172a';

        return {
            '--club-accent': c1,
            '--club-secondary': c2,
            '--club-tertiary': c3,
            '--header-bg': `linear-gradient(165deg, ${c1}44 0%, ${c2}22 40%, ${c3}11 80%, transparent 100%)`,
            '--header-border': `linear-gradient(90deg, ${c1}66, ${c2}33, transparent)`
        };
    }, [club]);

    if (loading) return (
        <div className="club-profile-premium loading-state">
            <div className="spinner-v3"></div>
            <p>Gathering club data...</p>
        </div>
    );

    if (!data || !club) return (
        <div className="club-profile-premium error-state">
            <h2>Club Not Found</h2>
            <Link to="/search" className="back-link">← Return to Universe</Link>
        </div>
    );

    const activeSeasons = selectedCompId === 'all'
        ? seasons.filter(s => s.season_year === selectedYear)
        : seasons.filter(s => s.season_year === selectedYear && s.league_id == selectedCompId);

    const hasLineups = activeSeasons.some(s => s.imported_lineups === 1);
    const hasStats = activeSeasons.some(s => s.imported_fixture_stats === 1);

    const tabs = [
        { id: 'performance', label: 'Overview' },
        { id: 'squad', label: 'Roster' },
        { id: 'lineup', label: 'Strategy', disabled: !hasLineups },
        { id: 'matches', label: 'Calendar' },
        { id: 'stats', label: 'Analytics', disabled: !hasStats }
    ];

    return (
        <div className="club-profile-v4-root">
            {/* HEADER */}
            <header className="club-header-v4" style={headerStyle}>
                <div className="header-left">
                    <div className="club-logo-outer">
                        <div className="logo-glow" style={{ '--glow-color': club.secondary_color || club.accent_color || '#6366f1' }}></div>
                        <img src={club.logo_url} alt={club.name} className="club-logo-v4" />
                    </div>
                    <div className="club-info-v4">
                        <h1 className="club-name-v4">{club.name}</h1>
                        <div className="club-meta-v4">
                            <span>{club.country}</span>
                            {club.founded && (
                                <>
                                    <span className="dot"></span>
                                    <span>Founded {club.founded}</span>
                                </>
                            )}
                            <span className="dot"></span>
                            <span dangerouslySetInnerHTML={{ __html: club.venue_city }}></span>
                        </div>
                        <div className="club-chips-row">
                            <span className="info-chip">Season {selectedYear}</span>
                            {competitionsForYear.find(c => c.league_id == selectedCompId)?.league_name && (
                                <span className="info-chip accent">
                                    {competitionsForYear.find(c => c.league_id == selectedCompId)?.league_name}
                                </span>
                            )}
                            {club.manager && <span className="info-chip">Manager: {club.manager}</span>}
                            <span className="info-chip timestamp">
                                <span className="dot pulse"></span>
                                Live data
                            </span>
                        </div>
                    </div>
                </div>

                <div className="header-right">
                    <div className="venue-card-v4" title="Open venue details">
                        <img src={club.venue_image} alt={club.venue_name} className="venue-img-v4" />
                        <div className="venue-info-overlay">
                            <span className="venue-name" dangerouslySetInnerHTML={{ __html: club.venue_name }}></span>
                            <span className="venue-cap">
                                {club.venue_capacity ? `${club.venue_capacity.toLocaleString()} capacity` : 'Capacity —'}
                            </span>
                        </div>
                    </div>
                </div>
            </header>

            {/* STICKY CONTROL BAR */}
            <div className="global-control-bar">
                <nav className="v4-tabs">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            className={`v4-tab-btn ${activeTab === tab.id ? 'active' : ''} ${tab.disabled ? 'disabled' : ''}`}
                            onClick={() => !tab.disabled && handleTabChange(tab.id)}
                            title={tab.disabled ? "No data for this season" : ""}
                        >
                            <span className="t-label">{tab.label}</span>
                        </button>
                    ))}
                </nav>

                <div className="filter-wrapper">
                    <div className="filter-box">
                        <label>Season</label>
                        <select
                            className="v4-select"
                            value={selectedYear || ''}
                            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                        >
                            {availableYears.map(y => (
                                <option key={y} value={y}>{y} / {(y + 1).toString().slice(2)}</option>
                            ))}
                        </select>
                    </div>

                    <div className="filter-box">
                        <label>Competition</label>
                        <select
                            className="v4-select"
                            value={selectedCompId}
                            onChange={(e) => setSelectedCompId(e.target.value)}
                        >
                            <option value="all">All Competitions</option>
                            {competitionsForYear.map(c => (
                                <option key={c.league_id} value={c.league_id}>{c.league_name}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* TAB CONTENT */}
            <main className="tab-content-area-v4">
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
