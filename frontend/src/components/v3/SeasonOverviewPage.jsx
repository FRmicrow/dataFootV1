import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { Card, Grid, Stack, Badge, Button } from '../../design-system';

// Components
import LeagueOverview from './league/LeagueOverview';
import StandingsTable from './league/StandingsTable';
import FixturesList from './league/FixturesList';
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
        <div style={{ padding: 'var(--spacing-xl)', textAlign: 'center' }}>
            <div className="ds-button-spinner" style={{ marginBottom: '12px' }}></div>
            <p style={{ color: 'var(--color-text-dim)' }}>Mining league intelligence...</p>
        </div>
    );

    if (error) return (
        <Card style={{ maxWidth: '400px', margin: '80px auto', textAlign: 'center' }}>
            <span style={{ fontSize: '48px' }}>🚨</span>
            <h2 className="mt-md">Sync Error</h2>
            <p style={{ color: 'var(--color-text-muted)', marginBottom: '24px' }}>{error}</p>
            <Button variant="primary" onClick={() => navigate('/import')}>Initialize Modules</Button>
        </Card>
    );

    if (!data) return null;

    const { league, topScorers, topAssists, topRated, availableYears, isFinished, hallOfFame } = data;

    return (
        <div className="animate-fade-in" style={{ padding: 'var(--spacing-sm)', maxWidth: '1400px', margin: '0 auto' }}>
            {/* Competition Header */}
            <header style={{ marginBottom: 'var(--spacing-lg)' }}>
                <Stack direction="row" justify="space-between" align="center" style={{ marginBottom: 'var(--spacing-md)' }}>
                    <Stack direction="row" gap="var(--spacing-md)" align="center">
                        <div style={{ width: '48px', height: '48px', background: 'white', borderRadius: 'var(--radius-sm)', padding: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <img src={league.logo_url} alt="" style={{ maxWidth: '100%', maxHeight: '100%' }} />
                        </div>
                        <div>
                            <Stack direction="row" gap="var(--spacing-xs)" align="center">
                                <Badge variant="neutral" size="sm">
                                    <img src={league.flag_url} alt="" style={{ width: '12px', marginRight: '4px' }} />
                                    {league.country_name}
                                </Badge>
                                <Badge variant={isFinished ? 'neutral' : 'success'} size="sm">
                                    {isFinished ? 'Finished' : 'Live'}
                                </Badge>
                            </Stack>
                            <h1 style={{ margin: '4px 0 0', fontSize: 'var(--font-size-2xl)' }}>{league.league_name}</h1>
                        </div>
                    </Stack>

                    <Stack direction="row" gap="var(--spacing-md)" align="center">
                        {isFinished && hallOfFame?.winner && (
                            <Badge variant="warning" style={{ padding: '8px 16px' }}>
                                🏆 CAMPION: {hallOfFame.winner.name}
                            </Badge>
                        )}
                        <select
                            value={year}
                            onChange={handleSeasonChange}
                            style={{ fontWeight: 'bold' }}
                        >
                            {(availableYears || [year]).map(y => (
                                <option key={y} value={y}>{y} Edition</option>
                            ))}
                        </select>
                    </Stack>
                </Stack>

                {/* Sub Navigation */}
                <Stack direction="row" gap="0" className="v3-main-nav">
                    {[
                        { id: 'overview', label: 'Surveillance' },
                        { id: 'standings', label: 'Standings', hidden: league.type === 'Cup' },
                        { id: 'fixtures', label: 'Results' },
                        { id: 'squads', label: 'Squads' }
                    ].filter(t => !t.hidden).map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`nav-tab ${activeTab === tab.id ? 'active' : ''}`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </Stack>
            </header>

            <main>
                {activeTab === 'overview' && (
                    <LeagueOverview
                        leagueId={id} season={year}
                        standings={standings} topScorers={topScorers}
                        topAssists={topAssists} topRated={topRated}
                    />
                )}
                {activeTab === 'standings' && (
                    <StandingsTable
                        standings={standings} rangeStart={rangeStart} setRangeStart={setRangeStart}
                        rangeEnd={rangeEnd} setRangeEnd={setRangeEnd}
                        handleRangeUpdate={handleRangeUpdate} isDynamicMode={isDynamicMode} loading={loading}
                    />
                )}
                {activeTab === 'fixtures' && (
                    <FixturesList
                        fixturesData={fixturesData} selectedRound={selectedRound}
                        setSelectedRound={setSelectedRound}
                    />
                )}
                {activeTab === 'squads' && (
                    <SquadList
                        teams={standings} selectedTeamId={selectedTeamId}
                        setSelectedTeamId={setSelectedTeamId} squadLoading={squadLoading}
                        teamSquad={teamSquad}
                    />
                )}
            </main>
        </div>
    );
};

export default SeasonOverviewPage;
