import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import {
    Card, Stack, Button,
    Tabs, LeagueHeader, ControlBar
} from '../../design-system';

// Components
import LeagueOverview from './league/LeagueOverview';
import StandingsTable from './league/StandingsTable';
import FixturesList from './league/FixturesList';
import SquadExplorer from './league/SquadExplorer';
import SquadList from './league/SquadList';

const SeasonOverviewPage = () => {
    const { id, year } = useParams();
    const navigate = useNavigate();

    const [activeTab, setActiveTab] = useState('overview');
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

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                let targetYear = year;
                if (!year) {
                    const res = await api.getLeagueSeasons(id);
                    const seasonsList = res.seasons || [];
                    const imported = seasonsList.filter(s => s.imported_players === 1);
                    if (imported.length > 0) {
                        targetYear = imported[0].season_year;
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
        <div style={{ height: '80vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <div className="ds-button-spinner" style={{ marginBottom: '12px' }}></div>
            <p style={{ color: 'var(--color-text-dim)' }}>Mining league intelligence...</p>
        </div>
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

    const { league, topScorers, topAssists, topRated, availableYears, isFinished, hallOfFame } = data;

    const tabItems = [
        { id: 'overview', label: 'Surveillance', icon: '🔭' },
        { id: 'standings', label: 'Standings', icon: '📊', hidden: league.type === 'Cup' },
        { id: 'fixtures', label: 'Results', icon: '📅' },
        { id: 'squads', label: 'Squads', icon: '👥' }
    ];

    return (
        <div className="animate-fade-in" style={{
            padding: '0 var(--spacing-sm)',
            maxWidth: '1400px',
            margin: '0 auto',
            height: '100vh',
            maxHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
        }}>
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

            <ControlBar
                left={
                    <Tabs
                        items={tabItems}
                        activeId={activeTab}
                        onChange={setActiveTab}
                    />
                }
                right={
                    <div className="ds-filter-box">
                        <label>Season Edition</label>
                        <select
                            value={year}
                            onChange={handleSeasonChange}
                        >
                            {(availableYears || [year]).map(y => (
                                <option key={y} value={y}>{y}/{parseInt(y) + 1}</option>
                            ))}
                        </select>
                    </div>
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
            </main>
        </div>
    );
};

export default SeasonOverviewPage;
