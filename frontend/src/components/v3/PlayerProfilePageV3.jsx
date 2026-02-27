import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../../services/api';
import {
    Card, Grid, Stack, Badge, Table, Button,
    ProfileHeader, Progress
} from '../../design-system';
import './PlayerProfilePageV3.css';

const PlayerProfilePageV3 = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [syncStatus, setSyncStatus] = useState('idle');
    const [syncProgress, setSyncProgress] = useState(0);
    const [trophies, setTrophies] = useState([]);

    useEffect(() => {
        const fetchPlayerProfile = async () => {
            setLoading(true);
            try {
                const [playerData, trophiesData] = await Promise.all([
                    api.getPlayer(id),
                    api.getPlayerTrophies(id)
                ]);
                setData(playerData);
                setTrophies(trophiesData || []);
            } catch (err) {
                console.error("Error fetching player profile:", err);
                setError(err.response?.data?.error || "Failed to load player profile.");
            } finally {
                setLoading(false);
            }
        };
        if (id) fetchPlayerProfile();
    }, [id]);

    const handleDeepSync = async () => {
        setSyncStatus('syncing');
        setSyncProgress(0);
        try {
            const response = await fetch(`/api/player/${id}/sync-career`, { method: 'POST' });
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
                            if (eventData.type === 'fetching') {
                                setSyncProgress(Math.round((eventData.current / eventData.total) * 100));
                            } else if (eventData.type === 'complete') {
                                setSyncProgress(100);
                                setSyncStatus('complete');
                                setTimeout(() => setSyncStatus('idle'), 5000);
                                api.getPlayer(id).then(data => setData(data));
                            }
                        } catch (e) { }
                    }
                });
            }
        } catch (err) {
            setSyncStatus('idle');
        }
    };

    const [careerView, setCareerView] = useState('year');

    const { clubCareer, internationalCareer } = React.useMemo(() => {
        const full = (data && Array.isArray(data.career)) ? data.career : [];
        return {
            clubCareer: full.filter(s => !s.is_national_team),
            internationalCareer: full.filter(s => !!s.is_national_team).sort((a, b) => b.season_year - a.season_year)
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
        } else if (careerView === 'club') {
            grouped = clubCareer.reduce((acc, curr) => {
                const key = curr.team_name;
                if (!acc[key]) acc[key] = { rows: [], latest: 0 };
                acc[key].rows.push(curr);
                if (curr.season_year > acc[key].latest) acc[key].latest = curr.season_year;
                return acc;
            }, {});
            keys = Object.keys(grouped).sort((a, b) => grouped[b].latest - grouped[a].latest);
        }
        return { groupedCareer: grouped, sortedKeys: keys };
    }, [careerView, clubCareer]);

    if (loading) return (
        <div style={{ height: '80vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <div className="ds-button-spinner" style={{ marginBottom: '12px' }}></div>
            <p style={{ color: 'var(--color-text-dim)' }}>Scanning biological registries...</p>
        </div>
    );

    if (error || !data) return (
        <div style={{ padding: '80px', textAlign: 'center' }}>
            <Card style={{ maxWidth: '400px', margin: '0 auto' }}>
                <span style={{ fontSize: '48px' }}>⚠️</span>
                <h2 style={{ margin: '24px 0 12px' }}>Data Link Lost</h2>
                <Button variant="primary" onClick={() => navigate(-1)}>Return</Button>
            </Card>
        </div>
    );

    const { player, careerTotals, currentContext } = data;
    const totalApps = Array.isArray(data.career) ? data.career.reduce((sum, s) => sum + (s.games_appearences || 0), 0) : 0;
    const totalGoals = Array.isArray(data.career) ? data.career.reduce((sum, s) => sum + (s.goals_total || 0), 0) : 0;

    const careerColumns = (view) => [
        ...(view !== 'club' ? [{
            title: 'Team',
            key: 'team',
            render: (_, row) => (
                <Stack direction="row" gap="var(--spacing-2xs)" align="center">
                    <img src={row.team_logo} alt="" style={{ width: '16px' }} />
                    <span>{row.team_name}</span>
                </Stack>
            )
        }] : []),
        {
            title: 'Competition',
            key: 'league',
            render: (_, row) => (
                <Link to={`/league/${row.league_id}/season/${row.season_year}`} className="ds-link">
                    {row.league_name}
                </Link>
            )
        },
        ...(view !== 'year' ? [{ title: 'Season', dataIndex: 'season_year', key: 'season' }] : []),
        { title: 'Apps', dataIndex: 'games_appearences', key: 'apps', align: 'center' },
        { title: 'Goals', dataIndex: 'goals_total', key: 'goals', align: 'center', render: (v) => <strong style={{ color: 'var(--color-primary-400)' }}>{v}</strong> },
        {
            title: 'Rating',
            dataIndex: 'games_rating',
            key: 'rating',
            align: 'center',
            render: (val) => (
                <Badge variant={parseFloat(val) > 7.3 ? 'success' : parseFloat(val) > 6.7 ? 'primary' : 'neutral'}>
                    {val || 'N/A'}
                </Badge>
            )
        }
    ];

    return (
        <div className="v3-player-page animate-fade-in">
            <ProfileHeader
                title={player.name}
                image={player.photo_url}
                subtitles={[
                    player.nationality,
                    `${player.age} Years Old`,
                    player.height,
                    player.preferred_foot ? `Preferred: ${player.preferred_foot}` : ''
                ].filter(Boolean)}
                badges={[
                    { label: currentContext?.team?.name || 'Free Agent', variant: 'primary', icon: '👤' },
                    { label: player.position || 'Unknown', variant: 'neutral' }
                ]}
                stats={[
                    { label: 'Total Apps', value: totalApps },
                    { label: 'Career Goals', value: totalGoals },
                    { label: 'Birth Date', value: player.birth_date || 'N/A' }
                ]}
                actions={
                    syncStatus === 'idle' ? (
                        <Button variant="secondary" size="sm" onClick={handleDeepSync}>🔄 Deep Sync</Button>
                    ) : (
                        <div style={{ minWidth: '150px' }}>
                            <Progress value={syncProgress} variant="primary" size="sm" showLabel />
                        </div>
                    )
                }
            />

            <Grid columns="2.5fr 1fr" gap="var(--spacing-xl)">
                <Stack gap="var(--spacing-xl)">
                    <Card title="Career Snapshot" subtitle="Consolidated performance metrics by club">
                        <Table
                            columns={[
                                {
                                    title: 'Team',
                                    key: 'team',
                                    render: (_, club) => (
                                        <Stack direction="row" gap="var(--spacing-2xs)" align="center">
                                            <img src={club.team_logo} alt="" style={{ width: '18px' }} />
                                            <span>{club.team_name}</span>
                                        </Stack>
                                    )
                                },
                                { title: 'Apps', dataIndex: 'total_matches', key: 'apps', align: 'center' },
                                { title: 'Goals', dataIndex: 'total_goals', key: 'goals', align: 'center', render: (v) => <strong style={{ color: 'var(--color-primary-400)' }}>{v}</strong> },
                                { title: 'Assists', dataIndex: 'total_assists', key: 'assists', align: 'center' },
                                { title: 'Avg Rating', dataIndex: 'avg_rating', key: 'rating', align: 'center', render: (v) => <Badge variant="primary">{v}</Badge> }
                            ]}
                            data={careerTotals.sort((a, b) => b.total_matches - a.total_matches)}
                        />
                    </Card>

                    <Stack direction="row" justify="space-between" align="center">
                        <h2 style={{ fontSize: 'var(--font-size-xl)' }}>Timeline</h2>
                        <Stack direction="row" gap="var(--spacing-2xs)">
                            <Button size="xs" variant={careerView === 'year' ? 'primary' : 'secondary'} onClick={() => setCareerView('year')}>Annual View</Button>
                            <Button size="xs" variant={careerView === 'club' ? 'primary' : 'secondary'} onClick={() => setCareerView('club')}>Club View</Button>
                        </Stack>
                    </Stack>

                    <Stack gap="var(--spacing-md)">
                        {sortedKeys.map(key => {
                            const rows = careerView === 'year' ? groupedCareer[key] : groupedCareer[key].rows;
                            return (
                                <Card key={key} title={careerView === 'year' ? `${key}/${parseInt(key) + 1}` : key} ghost>
                                    <Table columns={careerColumns(careerView)} data={rows} />
                                </Card>
                            );
                        })}
                    </Stack>
                </Stack>

                <aside>
                    <Stack gap="var(--spacing-xl)">
                        {trophies.length > 0 && (
                            <Card title="Honours Hub">
                                <Stack gap="var(--spacing-md)">
                                    {trophies.map((t, idx) => (
                                        <Stack key={idx} direction="row" justify="space-between" align="center">
                                            <div>
                                                <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'bold' }}>{t.league_name || t.trophy}</div>
                                                <div style={{ fontSize: '10px', color: 'var(--color-text-dim)' }}>{t.season}</div>
                                            </div>
                                            <Badge variant={t.place?.toLowerCase().includes('winner') ? 'warning' : 'neutral'}>
                                                {t.place || 'Champion'}
                                            </Badge>
                                        </Stack>
                                    ))}
                                </Stack>
                            </Card>
                        )}
                        <Card title="Vitals">
                            <Stack gap="var(--spacing-md)">
                                {[
                                    { l: 'Birth Place', v: player.birth_place ? `${player.birth_place}, ${player.birth_country}` : 'N/A' },
                                    { l: 'Weight', v: player.weight || 'N/A' },
                                    { l: 'Status', v: currentContext?.status || 'Active' }
                                ].map((item, i) => (
                                    <Grid key={i} columns="1fr auto">
                                        <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-dim)' }}>{item.l}</span>
                                        <span style={{ fontSize: 'var(--font-size-xs)', fontWeight: 'bold' }}>{item.v}</span>
                                    </Grid>
                                ))}
                            </Stack>
                        </Card>
                    </Stack>
                </aside>
            </Grid>
        </div>
    );
};

export default PlayerProfilePageV3;
