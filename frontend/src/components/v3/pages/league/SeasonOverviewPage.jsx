import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../../../services/api';
import { Card, Stack, Badge, Button, Table, Tabs, LeagueHeader, ControlBar, Select, Grid, Skeleton, CardSkeleton, TableSkeleton } from '../../../../design-system';
import { PageLayout, PageContent } from '../../layouts';

// Components
import LeagueOverview from '../../modules/league/LeagueOverview';
import StandingsTable from '../../modules/league/StandingsTable';
import FixturesList from '../../modules/league/FixturesList';
import SquadList from '../../modules/league/SquadList';
import LeagueXGTable from '../../modules/league/LeagueXGTable';
import LeagueLeaders from '../../modules/league/LeagueLeaders';

const SeasonOverviewPage = () => {
    const { id, year } = useParams();
    const navigate = useNavigate();

    const [activeTab, setActiveTab] = useState('standings');
    const [selectedTeamId, setSelectedTeamId] = useState(null);
    const [teamSquad, setTeamSquad] = useState([]);
    const [squadLoading, setSquadLoading] = useState(false);

    const [data, setData] = useState(null);
    const [standings, setStandings] = useState([]);
    const [fixturesData, setFixturesData] = useState({ fixtures: [], rounds: [] });
    const [selectedRound, setSelectedRound] = useState('');

    const [rangeStart, setRangeStart] = useState(1);
    const [rangeEnd, setRangeEnd] = useState(38);
    const [isDynamicMode, setIsDynamicMode] = useState(false);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [syncing, setSyncing] = useState(false);
    const [syncLogs, setSyncLogs] = useState([]);

    const fetchData = async () => {
        setLoading(true);
        try {
            let targetYear = year;
            if (!year) {
                const res = await api.getLeagueSeasons(id);
                const seasonsList = res.seasons || [];
                const imported = seasonsList.filter(s => s.imported_players === 1);
                if (imported.length > 0) {
                    // Prioritize the season marked as current
                    const currentSeason = imported.find(s => s.is_current === 1 || s.is_current === true);
                    targetYear = currentSeason ? currentSeason.season_year : imported[0].season_year;

                    navigate(`/league/${id}/season/${targetYear}`, { replace: true });
                    return;
                } else {
                    throw new Error("No imported seasons found for this league.");
                }
            }

            const [overviewRes, fixturesRes] = await Promise.all([
                api.getSeasonOverview(id, targetYear),
                api.getLeagueFixtures(id, targetYear)
            ]);

            setData(overviewRes);
            setStandings(overviewRes.standings || []);

            if (overviewRes.standings && overviewRes.standings.length > 0 && !isDynamicMode) {
                const maxPlayed = Math.max(...overviewRes.standings.map(t => t.played || 0));
                setRangeEnd(maxPlayed || 38);
            }

            setFixturesData(fixturesRes || { fixtures: [], rounds: [] });
            if (fixturesRes?.rounds?.length > 0) {
                const allFixtures = fixturesRes.fixtures || [];
                let current = fixturesRes.rounds[0];
                const firstUnplayed = allFixtures.find(f => f.status_short === 'NS' || f.status_short === 'TBD');
                if (firstUnplayed) {
                    current = firstUnplayed.round;
                } else if (allFixtures.length > 0) {
                    current = allFixtures[allFixtures.length - 1].round;
                }
                setSelectedRound(current);
            }

        } catch (err) {
            console.error("Error fetching season analytics:", err);
            setError(err.response?.data?.error || err.message || "Failed to load dashboard.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (id) fetchData();
    }, [id, year, navigate]);

    useEffect(() => {
        const fetchSquad = async () => {
            if (!selectedTeamId) return;
            if (activeTab !== 'squads' && activeTab !== 'overview') return;

            setSquadLoading(true);
            try {
                const res = await api.getTeamSquad(id, year, selectedTeamId);
                setTeamSquad(res);
            } catch (err) {
                console.error("Failed to fetch squad:", err);
            } finally {
                setSquadLoading(false);
            }
        };
        fetchSquad();
    }, [selectedTeamId, id, year, activeTab]);


    const handleSync = async () => {
        if (syncing) return;
        setSyncing(true);
        setSyncLogs([{ type: 'info', message: `🚀 Starting Sync for ${year}...` }]);

        try {
            const response = await fetch(`/api/league/${id}/season/${year}/sync`, {
                method: 'POST'
            });

            const reader = response.body.getReader();
            const decoder = new TextDecoder();

            while (true) {
                const { value, done } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value);
                const lines = chunk.split('\n');

                lines.forEach(line => {
                    if (line.startsWith('data: ')) {
                        try {
                            const data = JSON.parse(line.slice(6));
                            if (data.type === 'complete') {
                                setSyncLogs(prev => [...prev.slice(-4), { type: 'success', message: '✅ Sync Completed!' }]);
                                setTimeout(() => setSyncing(false), 3000);
                                fetchData();
                            } else {
                                setSyncLogs(prev => [...prev.slice(-4), data]); 
                            }
                        } catch (e) {
                            console.error("SSE Parse Error", e);
                        }
                    }
                });
            }
        } catch (err) {
            console.error("Sync failed", err);
            setSyncLogs(prev => [...prev, { type: 'error', message: `❌ Sync Failed: ${err.message}` }]);
            setTimeout(() => setSyncing(false), 3000);
        }
    };

    const handleSeasonChange = (e) => {
        const newYear = e.target.value;
        navigate(`/league/${id}/season/${newYear}`);
    };

    const handleRangeUpdate = async () => {
        setIsDynamicMode(true);
        setLoading(true);
        try {
            const res = await api.getDynamicStandings({
                league_id: id,
                season: year,
                from_round: rangeStart,
                to_round: rangeEnd
            });
            setStandings(res.map(t => ({ ...t, group_name: `Custom Range` })));
        } catch (err) {
            console.error("Dynamic fetch failed", err);
            setError("Failed to update standings.");
        } finally {
            setLoading(false);
        }
    };

    if (loading && !data) return (
        <PageLayout>
            {/* League header skeleton */}
            <div style={{ padding: 'var(--spacing-xl)', marginBottom: 'var(--spacing-lg)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)' }}>
                    <Skeleton width="64px" height="64px" />
                    <div>
                        <Skeleton width="220px" height="24px" style={{ marginBottom: 'var(--spacing-xs)' }} />
                        <Skeleton width="140px" height="14px" />
                    </div>
                </div>
            </div>
            <PageContent>
                {/* Tab bar skeleton */}
                <div style={{ display: 'flex', gap: 'var(--spacing-md)', marginBottom: 'var(--spacing-xl)' }}>
                    <Skeleton width="100px" height="36px" />
                    <Skeleton width="100px" height="36px" />
                    <Skeleton width="80px" height="36px" />
                    <Skeleton width="80px" height="36px" />
                </div>
                {/* Standings table skeleton */}
                <TableSkeleton rows={10} cols={8} />
            </PageContent>
        </PageLayout>
    );

    if (error) return (
        <div style={{ padding: '80px', textAlign: 'center' }}>
            <Card style={{ maxWidth: '400px', margin: '0 auto' }}>
                <span style={{ fontSize: '48px' }}>🚨</span>
                <h2 style={{ margin: '24px 0 12px' }}>Sync Error</h2>
                <p style={{ color: 'var(--color-text-muted)', marginBottom: '24px' }}>{error}</p>
                <Button variant="primary" onClick={() => navigate('/import')}>Initialize Modules</Button>
            </Card>
        </div>
    );

    if (!data) return null;

    const { league, topScorers, topAssists, topRated, availableYears, xgStats } = data;

    const isUEFACup = [1475, 1476, 1516].includes(Number.parseInt(id));
    const isModernUEFA = isUEFACup && Number.parseInt(year) >= 2024;

    const tabItems = [
        { id: 'overview', label: 'Player Insights', icon: '🔭' },
        {
            id: 'standings',
            label: (() => {
                if (isModernUEFA) return 'Phase de Ligue';
                if (isUEFACup) return 'Phase de Groupes';
                return 'Standings';
            })(),
            icon: '📊',
            hidden: league.type === 'Cup' && !isUEFACup
        },
        {
            id: 'fixtures',
            label: isUEFACup ? 'Phase à Élimination' : 'Results',
            icon: '📅'
        },
        { id: 'squads', label: 'Squads', icon: '👥' },
        { id: 'xg', label: 'xG', icon: '🎯' }
    ];

    return (
        <PageLayout className="animate-fade-in">
            <LeagueHeader
                league={{
                    id: id,
                    name: league.league_name,
                    logo: league.logo_url,
                    rank: league.rank,
                    country: { name: league.country_name },
                    type: league.type
                }}
                activeSeason={year}
                seasonsCount={availableYears?.length}
            />

            <PageContent>

                <ControlBar
                    left={
                        <Stack direction="row" gap="var(--spacing-lg)" align="center">
                            <Tabs
                                items={tabItems}
                                activeId={activeTab}
                                onChange={setActiveTab}
                            />
                            {syncing && (
                                <div className="sync-status-indicator animate-pulse" style={{ 
                                    display: 'flex', 
                                    gap: 'var(--spacing-sm)', 
                                    fontSize: 'var(--font-xs)',
                                    color: 'var(--color-primary-light)',
                                    background: 'rgba(var(--color-primary-rgb), 0.1)',
                                    padding: '4px 12px',
                                    borderRadius: '100px',
                                    border: '1px solid rgba(var(--color-primary-rgb), 0.2)'
                                }}>
                                    <span className="spinner-mini"></span>
                                    {syncLogs[syncLogs.length - 1]?.message || 'Syncing...'}
                                </div>
                            )}
                        </Stack>
                    }
                    right={
                        <Stack direction="row" gap="var(--spacing-md)" align="center">
                            <Button 
                                variant="secondary" 
                                size="sm" 
                                onClick={handleSync}
                                loading={syncing}
                                icon="🔄"
                            >
                                Sync {year}
                            </Button>

                            <div className="ds-filter-box">
                                <label htmlFor="season-edition-select">Season Edition</label>
                                <select
                                    id="season-edition-select"
                                    value={year}
                                    onChange={handleSeasonChange}
                                >
                                    {(availableYears || [year]).map(y => (
                                        <option key={y} value={y}>{y}/{Number.parseInt(y) + 1}</option>
                                    ))}
                                </select>
                            </div>
                        </Stack>
                    }
                />

                <main className="season-tab-content" style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
                    {activeTab === 'overview' && (
                        <LeagueOverview
                            leagueId={id}
                            season={year}
                            standings={standings}
                            topScorers={topScorers}
                            topAssists={topAssists}
                            topRated={topRated}
                        />
                    )}
                    {activeTab === 'standings' && (
                        <Stack gap="var(--spacing-xl)">
                            <StandingsTable
                                standings={standings}
                                rangeStart={rangeStart}
                                setRangeStart={setRangeStart}
                                rangeEnd={rangeEnd}
                                setRangeEnd={setRangeEnd}
                                handleRangeUpdate={handleRangeUpdate}
                                isDynamicMode={isDynamicMode}
                                loading={loading}
                            />
                            <LeagueLeaders 
                                topScorers={topScorers}
                                topAssists={topAssists}
                                topRated={topRated}
                            />
                        </Stack>
                    )}
                    {activeTab === 'fixtures' && (
                        <FixturesList
                            fixturesData={fixturesData}
                            selectedRound={selectedRound}
                            setSelectedRound={setSelectedRound}
                        />
                    )}
                    {activeTab === 'squads' && (
                        <SquadList
                            teams={standings}
                            selectedTeamId={selectedTeamId}
                            setSelectedTeamId={setSelectedTeamId}
                            squadLoading={squadLoading}
                            teamSquad={teamSquad}
                        />
                    )}
                    {activeTab === 'xg' && (
                        <LeagueXGTable xgStats={xgStats} />
                    )}
                </main>
            </PageContent>
        </PageLayout>
    );
};

export default SeasonOverviewPage;
