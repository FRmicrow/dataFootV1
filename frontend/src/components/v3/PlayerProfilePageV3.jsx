import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../../services/api';
import { Card, Grid, Stack, Badge, Table, Button } from '../../design-system';
import './PlayerProfilePageV3.css';

const PlayerProfilePageV3 = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [syncStatus, setSyncStatus] = useState('idle'); // 'idle', 'syncing', 'complete', 'resolving'
    const [syncStats, setSyncStats] = useState({ updated: 0, new: 0 });
    const [syncProgress, setSyncProgress] = useState(0);
    const [unresolvedCompetitions, setUnresolvedCompetitions] = useState([]);
    const [allLeagues, setAllLeagues] = useState([]);
    const [syncLogs, setSyncLogs] = useState([]);
    const [trophies, setTrophies] = useState([]);
    const [expandedPanels, setExpandedPanels] = useState({});

    useEffect(() => {
        const fetchPlayerProfile = async () => {
            setLoading(true);
            try {
                const [playerData, leaguesData, trophiesData] = await Promise.all([
                    api.getPlayer(id),
                    api.getLeagues(),
                    api.getPlayerTrophies(id)
                ]);
                setData(playerData);
                setAllLeagues(leaguesData || []);
                setTrophies(trophiesData || []);
            } catch (err) {
                console.error("Error fetching player profile:", err);
                setError(err.response?.data?.error || "Failed to load player profile.");
            } finally {
                setLoading(false);
            }
        };

        if (id) {
            fetchPlayerProfile();
        }
    }, [id]);

    const handleDeepSync = async () => {
        setSyncStatus('syncing');
        setSyncLogs([]);
        setSyncStats({ updated: 0, new: 0 });
        setSyncProgress(0);
        setUnresolvedCompetitions([]);

        try {
            const response = await fetch(`/api/player/${id}/sync-career`, {
                method: 'POST',
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
                            const eventData = JSON.parse(line.slice(6));
                            setSyncLogs(prev => [...prev, eventData]);

                            if (eventData.type === 'stat_updated') {
                                setSyncStats(prev => ({ ...prev, updated: prev.updated + 1 }));
                            } else if (eventData.type === 'stat_new') {
                                setSyncStats(prev => ({ ...prev, new: prev.new + 1 }));
                            } else if (eventData.type === 'fetching') {
                                const pct = Math.round((eventData.current / eventData.total) * 100);
                                setSyncProgress(pct);
                            } else if (eventData.type === 'unresolved') {
                                setUnresolvedCompetitions(eventData.competitions || []);
                            } else if (eventData.type === 'complete') {
                                setSyncProgress(100);
                                if (eventData.unresolved?.length > 0) {
                                    setUnresolvedCompetitions(eventData.unresolved);
                                    setSyncStatus('resolving');
                                } else {
                                    setSyncStatus('complete');
                                    setTimeout(() => setSyncStatus('idle'), 5000);
                                }
                                api.getPlayer(id).then(data => setData(data));
                            }
                        } catch (e) {
                            console.error("SSE Parse Error", e);
                        }
                    }
                });
            }
        } catch (err) {
            console.error("Deep Sync Failed:", err);
            setSyncStatus('idle');
        }
    };

    const [careerView, setCareerView] = useState('year');

    const { clubCareer, internationalCareer } = React.useMemo(() => {
        const full = (data && Array.isArray(data.career)) ? data.career : [];
        return {
            clubCareer: full.filter(s => !s.is_national_team),
            internationalCareer: full.filter(s => !!s.is_national_team).sort((a, b) => {
                if (b.season_year !== a.season_year) return b.season_year - a.season_year;
                return (a.importance_rank || 999) - (b.importance_rank || 999);
            })
        };
    }, [data]);

    const { groupedCareer, sortedKeys } = React.useMemo(() => {
        let grouped = {};
        let keys = [];

        if (careerView === 'year') {
            grouped = clubCareer.reduce((acc, curr) => {
                const key = curr.season_year;
                if (!acc[key]) acc[key] = [];
                acc[key].push(curr);
                return acc;
            }, {});
            keys = Object.keys(grouped).sort((a, b) => b - a);
            keys.forEach(k => {
                grouped[k].sort((a, b) => (a.importance_rank || 999) - (b.importance_rank || 999));
            });
        } else if (careerView === 'club') {
            grouped = clubCareer.reduce((acc, curr) => {
                const key = curr.team_name;
                if (!acc[key]) acc[key] = { rows: [], logo: curr.team_logo, id: curr.team_id, latest: 0 };
                acc[key].rows.push(curr);
                if (curr.season_year > acc[key].latest) acc[key].latest = curr.season_year;
                return acc;
            }, {});
            keys = Object.keys(grouped).sort((a, b) => grouped[b].latest - grouped[a].latest);
            keys.forEach(k => {
                grouped[k].rows.sort((a, b) => {
                    if (b.season_year !== a.season_year) return b.season_year - a.season_year;
                    return (a.importance_rank || 999) - (b.importance_rank || 999);
                });
            });
        } else if (careerView === 'country') {
            grouped = clubCareer.reduce((acc, curr) => {
                const key = curr.team_country_name || 'International';
                if (!acc[key]) acc[key] = { rows: [], flag: curr.team_country_flag, latest: 0 };
                acc[key].rows.push(curr);
                if (curr.season_year > acc[key].latest) acc[key].latest = curr.season_year;
                return acc;
            }, {});
            keys = Object.keys(grouped).sort((a, b) => grouped[b].latest - grouped[a].latest);
            keys.forEach(k => {
                grouped[k].rows.sort((a, b) => {
                    if (b.season_year !== a.season_year) return b.season_year - a.season_year;
                    return (a.importance_rank || 999) - (b.importance_rank || 999);
                });
            });
        }
        return { groupedCareer: grouped, sortedKeys: keys };
    }, [careerView, clubCareer]);

    useEffect(() => {
        if (data && sortedKeys.length > 0) {
            const initial = {};
            sortedKeys.forEach(k => initial[k] = true);
            setExpandedPanels(initial);
        }
    }, [careerView, data, sortedKeys]);

    const togglePanel = (key) => {
        setExpandedPanels(prev => ({ ...prev, [key]: !prev[key] }));
    };

    if (loading) return (
        <div className="v3-dashboard-page loading">
            <div className="ds-button-spinner"></div>
            <p>Scanning Biological Data...</p>
        </div>
    );

    if (error) return (
        <div style={{ padding: '80px', textAlign: 'center' }}>
            <Card style={{ maxWidth: '400px', margin: '0 auto' }}>
                <span style={{ fontSize: '48px' }}>⚠️</span>
                <h2 style={{ margin: '24px 0 12px' }}>Data Link Lost</h2>
                <p style={{ color: 'var(--color-text-muted)', marginBottom: '24px' }}>{error}</p>
                <Button onClick={() => navigate(-1)}>Return</Button>
            </Card>
        </div>
    );

    if (!data) return null;
    const { player, career, careerTotals, currentContext } = data;
    const careerList = Array.isArray(career) ? career : [];

    const renderTrophies = () => {
        if (!trophies || trophies.length === 0) return null;

        const countryGroups = trophies.reduce((acc, t) => {
            const country = t.country || 'International';
            if (!acc[country]) {
                acc[country] = {
                    name: country,
                    flag: t.country_flag,
                    rank: (t.importance_rank !== undefined && t.importance_rank !== null) ? t.importance_rank : 999,
                    leagues: {}
                };
            }
            const leagueName = t.league_name || t.trophy;
            if (!acc[country].leagues[leagueName]) {
                acc[country].leagues[leagueName] = { name: leagueName, items: [] };
            }
            acc[country].leagues[leagueName].items.push(t);
            return acc;
        }, {});

        const sortedCountries = Object.values(countryGroups).sort((a, b) => a.rank - b.rank);

        const processedList = sortedCountries.map(country => {
            const leaguesList = Object.values(country.leagues).map(league => {
                const placeMap = league.items.reduce((pAcc, item) => {
                    const place = item.place || 'Winner';
                    if (!pAcc[place]) pAcc[place] = { place, seasons: [], count: 0 };
                    if (item.season && String(item.season).trim() !== '') {
                        pAcc[place].seasons.push(item.season);
                    }
                    pAcc[place].count++;
                    return pAcc;
                }, {});

                const getRank = (place) => {
                    const p = (place || '').toLowerCase();
                    if (p.includes('winner') || p.includes('1st') || p.includes('champion')) return 1;
                    if (p.includes('2nd') || p.includes('runner') || p.includes('finalist')) return 2;
                    if (p.includes('3rd')) return 3;
                    return 99;
                };

                const placeGroups = Object.values(placeMap).sort((a, b) => getRank(a.place) - getRank(b.place));
                return { name: league.name, placeGroups };
            });
            return { ...country, leagues: leaguesList };
        });

        return (
            <Card title="Honours">
                <Stack gap="var(--spacing-lg)">
                    {processedList.map((country) => (
                        <div key={country.name}>
                            <Stack direction="row" align="center" gap="var(--spacing-sm)" className="mb-sm">
                                {country.flag && <img src={country.flag} alt="" style={{ width: '16px' }} />}
                                <span style={{ fontSize: 'var(--font-size-xs)', fontWeight: 'bold', color: 'var(--color-text-muted)' }}>{country.name}</span>
                            </Stack>
                            <Stack gap="var(--spacing-md)">
                                {country.leagues.map((comp) => (
                                    <div key={comp.name}>
                                        <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'bold', marginBottom: '4px' }}>{comp.name}</div>
                                        {comp.placeGroups.map((pg) => (
                                            <Stack key={pg.place} direction="row" gap="var(--spacing-md)" align="baseline">
                                                <Badge variant={pg.place.toLowerCase().includes('winner') ? 'warning' : 'neutral'} size="sm">
                                                    {pg.count}x {pg.place}
                                                </Badge>
                                                <span style={{ fontSize: '10px', color: 'var(--color-text-muted)' }}>{pg.seasons.join(', ')}</span>
                                            </Stack>
                                        ))}
                                    </div>
                                ))}
                            </Stack>
                        </div>
                    ))}
                </Stack>
            </Card>
        );
    };

    const careerColumns = (view) => [
        ...(view !== 'club' ? [{
            title: 'Team',
            key: 'team',
            render: (_, row) => (
                <Stack direction="row" gap="var(--spacing-sm)" align="center">
                    <img src={row.team_logo} alt="" style={{ width: '20px' }} />
                    <span>{row.team_name}</span>
                </Stack>
            )
        }] : []),
        {
            title: 'Competition',
            key: 'league',
            render: (_, row) => (
                <Link to={`/league/${row.league_id}/season/${row.season_year}`} style={{ color: 'var(--color-primary-400)', fontWeight: 'bold' }}>
                    {row.league_name}
                    {(row.importance_rank || 999) <= 10 && <span style={{ marginLeft: '4px' }}>⭐</span>}
                </Link>
            )
        },
        ...(view !== 'year' ? [{ title: 'Season', dataIndex: 'season_year', key: 'season' }] : []),
        { title: 'Apps', dataIndex: 'games_appearences', key: 'apps', align: 'center' },
        { title: 'G', dataIndex: 'goals_total', key: 'goals', align: 'center', render: (val) => <strong style={{ color: 'var(--color-primary-400)' }}>{val}</strong> },
        { title: 'A', dataIndex: 'goals_assists', key: 'assists', align: 'center' },
        {
            title: 'Rating',
            dataIndex: 'games_rating',
            key: 'rating',
            align: 'center',
            render: (val) => (
                <Badge variant={parseFloat(val) > 7.5 ? 'success' : parseFloat(val) > 6.8 ? 'primary' : 'neutral'}>
                    {val || 'N/A'}
                </Badge>
            )
        }
    ];

    return (
        <div className="v3-player-content animate-fade-in">
            {/* Hero Header */}
            <Card className="mb-xl">
                <Stack direction="row" gap="var(--spacing-2xl)" align="center">
                    <div style={{ position: 'relative' }}>
                        <img src={player.photo_url} alt="" style={{ width: '120px', height: '120px', borderRadius: 'var(--radius-lg)', objectFit: 'cover', border: '2px solid var(--color-border)' }} />
                        <div style={{ position: 'absolute', inset: 0, boxShadow: 'inset 0 0 20px rgba(0,0,0,0.5)', borderRadius: 'var(--radius-lg)' }}></div>
                    </div>

                    <div style={{ flex: 1 }}>
                        <Stack direction="row" justify="space-between" align="flex-start">
                            <div>
                                <h1 style={{ fontSize: 'var(--font-size-3xl)', margin: '0 0 var(--spacing-sm) 0' }}>{player.name}</h1>
                                {currentContext?.team && (
                                    <Badge variant="primary">
                                        <img src={currentContext.team.logo} alt="" style={{ width: '12px', marginRight: '8px' }} />
                                        {currentContext.status === 'Active' ? 'Current' : 'Last'}: {currentContext.team.name}
                                    </Badge>
                                )}
                            </div>
                            <Stack direction="row" gap="var(--spacing-lg)">
                                <div style={{ textAlign: 'center' }}>
                                    <div style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'bold' }}>{careerList.reduce((sum, s) => sum + (s.games_appearences || 0), 0)}</div>
                                    <div style={{ fontSize: '10px', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Apps</div>
                                </div>
                                <div style={{ textAlign: 'center' }}>
                                    <div style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'bold', color: 'var(--color-primary-400)' }}>{careerList.reduce((sum, s) => sum + (s.goals_total || 0), 0)}</div>
                                    <div style={{ fontSize: '10px', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Goals</div>
                                </div>
                            </Stack>
                        </Stack>

                        <Grid columns="repeat(auto-fit, minmax(100px, 1fr))" gap="var(--spacing-md)" className="mt-lg">
                            <div className="bio-stat">
                                <span className="lbl">Nationality</span>
                                <span className="val">
                                    {player.nationality_flag && <img src={player.nationality_flag} alt="" style={{ width: '14px', marginRight: '4px' }} />}
                                    {player.nationality}
                                </span>
                            </div>
                            <div className="bio-stat">
                                <span className="lbl">Age</span>
                                <span className="val">{player.age}</span>
                            </div>
                            <div className="bio-stat">
                                <span className="lbl">Height</span>
                                <span className="val">{player.height || 'N/A'}</span>
                            </div>
                            <div className="bio-stat">
                                <span className="lbl">Foot</span>
                                <span className="val">{player.preferred_foot || 'N/A'}</span>
                            </div>
                        </Grid>
                    </div>
                </Stack>

                <div className="mt-xl">
                    {syncStatus === 'idle' && (
                        <Button variant="secondary" size="sm" onClick={handleDeepSync}>🔄 Deep Sync History</Button>
                    )}
                    {syncStatus === 'syncing' && (
                        <Stack gap="var(--spacing-sm)">
                            <Stack direction="row" justify="space-between">
                                <span style={{ fontSize: 'var(--font-size-xs)' }}>Synchronizing...</span>
                                <Badge variant="primary">{syncProgress}%</Badge>
                            </Stack>
                            <div style={{ height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', overflow: 'hidden' }}>
                                <div style={{ width: `${syncProgress}%`, height: '100%', background: 'var(--color-primary-500)' }}></div>
                            </div>
                        </Stack>
                    )}
                </div>
            </Card>

            <Grid columns="3fr 1fr" gap="var(--spacing-xl)">
                <Stack gap="var(--spacing-xl)">
                    {/* Performance Summary */}
                    <Card title="Performance Metrics" subtitle="Consolidated career statistics">
                        <Table
                            columns={[
                                {
                                    title: 'Team',
                                    key: 'team',
                                    render: (_, club) => (
                                        <Stack direction="row" gap="var(--spacing-sm)" align="center">
                                            <img src={club.team_logo} alt="" style={{ width: '20px' }} />
                                            <span>{club.team_name}</span>
                                            {club.is_national_team && <Badge variant="warning" size="sm">NT</Badge>}
                                        </Stack>
                                    )
                                },
                                { title: 'Apps', dataIndex: 'total_matches', key: 'apps', align: 'center' },
                                { title: 'Goals', dataIndex: 'total_goals', key: 'goals', align: 'center', render: (v) => <strong style={{ color: 'var(--color-primary-400)' }}>{v}</strong> },
                                { title: 'Assists', dataIndex: 'total_assists', key: 'assists', align: 'center' },
                                {
                                    title: 'Rating',
                                    dataIndex: 'avg_rating',
                                    key: 'rating',
                                    align: 'center',
                                    render: (v) => <Badge variant="primary">{v}</Badge>
                                }
                            ]}
                            data={careerTotals.sort((a, b) => b.total_matches - a.total_matches)}
                        />
                    </Card>

                    <Stack direction="row" justify="space-between" align="center">
                        <h2 style={{ fontSize: 'var(--font-size-xl)' }}>Performance History</h2>
                        <Stack direction="row" gap="var(--spacing-sm)">
                            <Button size="sm" variant={careerView === 'year' ? 'primary' : 'secondary'} onClick={() => setCareerView('year')}>By Year</Button>
                            <Button size="sm" variant={careerView === 'club' ? 'primary' : 'secondary'} onClick={() => setCareerView('club')}>By Club</Button>
                            <Button size="sm" variant={careerView === 'country' ? 'primary' : 'secondary'} onClick={() => setCareerView('country')}>By Country</Button>
                        </Stack>
                    </Stack>

                    {/* International Duty */}
                    {internationalCareer.length > 0 && (
                        <Card title="International Duty" subtitle="National team performances">
                            <Table columns={careerColumns('year')} data={internationalCareer} />
                        </Card>
                    )}

                    {/* Grouped Career History */}
                    <Stack gap="var(--spacing-lg)">
                        {sortedKeys.map(key => {
                            const content = groupedCareer[key];
                            const rows = Array.isArray(content) ? content : content.rows;
                            return (
                                <Card
                                    key={key}
                                    title={careerView === 'year' ? `${key} / ${parseInt(key) + 1}` : key}
                                >
                                    <Table
                                        columns={careerColumns(careerView)}
                                        data={rows}
                                    />
                                </Card>
                            );
                        })}
                    </Stack>
                </Stack>

                <aside>
                    <Stack gap="var(--spacing-xl)">
                        {renderTrophies()}
                        <Card title="Bio Details">
                            <Stack gap="var(--spacing-md)">
                                <div className="bio-detail-row">
                                    <span className="lbl">Birth Date</span>
                                    <span className="val">{player.birth_date || 'Unknown'}</span>
                                </div>
                                <div className="bio-detail-row">
                                    <span className="lbl">Birth Place</span>
                                    <span className="val">{player.birth_place ? `${player.birth_place}, ${player.birth_country}` : 'Unknown'}</span>
                                </div>
                                <div className="bio-detail-row">
                                    <span className="lbl">Height/Weight</span>
                                    <span className="val">{player.height} / {player.weight}</span>
                                </div>
                                <div className="bio-detail-row">
                                    <span className="lbl">Foot</span>
                                    <span className="val">{player.preferred_foot || 'N/A'}</span>
                                </div>
                            </Stack>
                        </Card>
                    </Stack>
                </aside>
            </Grid>
        </div>
    );
};

export default PlayerProfilePageV3;
