import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../../../../services/api';
import {
    Card, Grid, Stack, Badge, Table, Button,
    ProfileHeader, Progress
} from '../../../../design-system';
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
                title={player?.name || 'Unknown Player'}
                image={player?.photo_url || ''}
                accentColor={currentContext?.team?.accent_color || 'var(--color-primary-500)'}
                secondaryColor={currentContext?.team?.secondary_color}
                tertiaryColor={currentContext?.team?.tertiary_color}
                subtitles={[
                    player?.nationality,
                    player?.age ? `${player.age} yrs` : '',
                    player?.height,
                    player?.preferred_foot ? `Preferred: ${player.preferred_foot}` : ''
                ].filter(Boolean)}

                badges={[
                    {
                        label: currentContext?.team?.name || 'Free Agent',
                        variant: 'primary',
                        icon: currentContext?.team?.logo_url && (
                            <img src={currentContext.team.logo_url} alt="" style={{ width: '12px', height: '12px', borderRadius: '4px' }} />
                        )
                    },
                    { label: player.position || 'Unknown', variant: 'neutral' }
                ]}
                stats={[
                    { label: 'Total Apps', value: totalApps },
                    { label: 'Career Goals', value: totalGoals },
                    { label: 'Born', value: player.birth_date || 'N/A' }
                ]}
                actions={
                    syncStatus === 'idle' ? (
                        <Button variant="secondary" size="sm" onClick={handleDeepSync}>Deep Sync</Button>
                    ) : (
                        <div style={{ minWidth: '150px' }}>
                            <Progress value={syncProgress} variant="primary" size="sm" showLabel />
                        </div>
                    )
                }
            />

            <Grid columns="2.5fr 1fr" gap="var(--spacing-xl)" className="mb-xl">
                <Stack gap="var(--spacing-xl)">
                    <Card title="Career Snapshot" subtitle="Consolidated performance metrics by club">
                        <Table
                            columns={[
                                {
                                    title: 'Team',
                                    key: 'team',
                                    render: (_, club) => (
                                        <Link to={`/club/${club.team_id}`} className="ds-link-team">
                                            <Stack direction="row" gap="var(--spacing-2xs)" align="center">
                                                <img src={club.team_logo} alt="" style={{ width: '18px' }} />
                                                <span style={{ fontWeight: 'bold' }}>{club.team_name}</span>
                                            </Stack>
                                        </Link>
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
                        <h2 style={{ fontSize: 'var(--font-size-xl)' }}>Professional Timeline</h2>
                        <Stack direction="row" gap="var(--spacing-2xs)" dense>
                            <Button size="xs" variant={careerView === 'year' ? 'primary' : 'secondary'} onClick={() => setCareerView('year')}>Annual</Button>
                            <Button size="xs" variant={careerView === 'club' ? 'primary' : 'secondary'} onClick={() => setCareerView('club')}>Club View</Button>
                        </Stack>
                    </Stack>

                    <Stack gap="var(--spacing-md)">
                        {sortedKeys.map(key => {
                            const isClubView = careerView === 'club';
                            const rows = isClubView ? groupedCareer[key].rows : groupedCareer[key];
                            const teamLogo = isClubView ? rows[0]?.team_logo : null;

                            return (
                                <div key={key} className="timeline-section">
                                    <div className="timeline-separator">
                                        {isClubView && teamLogo && <img src={teamLogo} alt="" className="timeline-club-icon" />}
                                        <span className="timeline-label">{isClubView ? key : `${key}/${parseInt(key) + 1}`}</span>
                                    </div>
                                    <Card ghost>
                                        <Table
                                            columns={[
                                                ...(careerView !== 'club' ? [{
                                                    title: 'Team',
                                                    key: 'team',
                                                    render: (_, row) => (
                                                        <Link to={`/club/${row.team_id}`} className="ds-link-team">
                                                            <Stack direction="row" gap="var(--spacing-2xs)" align="center">
                                                                <img src={row.team_logo} alt="" style={{ width: '16px' }} />
                                                                <span>{row.team_name}</span>
                                                            </Stack>
                                                        </Link>
                                                    )
                                                }] : []),
                                                {
                                                    title: 'Competition',
                                                    key: 'league',
                                                    render: (_, row) => (
                                                        <Link to={`/league/${row.league_id}/season/${row.season_year}`} className="ds-link">
                                                            <Stack direction="row" gap="8px" align="center">
                                                                <img src={`https://media.api-sports.io/football/leagues/${row.league_id}.png`} alt="" style={{ width: '14px', height: '14px', objectFit: 'contain' }} />
                                                                {row.league_name}
                                                            </Stack>
                                                        </Link>
                                                    )
                                                },
                                                ...(careerView !== 'year' ? [{ title: 'Season', dataIndex: 'season_year', key: 'season' }] : []),
                                                { title: 'Apps', dataIndex: 'games_appearences', key: 'apps', align: 'center' },
                                                { title: 'Goals', dataIndex: 'goals_total', key: 'goals', align: 'center', render: (v) => <strong style={{ color: 'var(--color-primary-400)' }}>{v}</strong> },
                                                {
                                                    title: 'Rating',
                                                    dataIndex: 'games_rating',
                                                    key: 'rating',
                                                    align: 'center',
                                                    render: (val) => (
                                                        <Badge variant={parseFloat(val) > 7.3 ? 'success' : parseFloat(val) > 6.7 ? 'primary' : 'neutral'}>
                                                            {val || '--'}
                                                        </Badge>
                                                    )
                                                }
                                            ]}
                                            data={rows}
                                        />
                                    </Card>
                                </div>
                            );
                        })}
                    </Stack>
                </Stack>

                <aside>
                    <Stack gap="var(--spacing-xl)">
                        {trophies.length > 0 && (
                            <Card title="Honor Hub">
                                <Stack gap="var(--spacing-xs)">
                                    {trophies
                                        .sort((a, b) => (a.importance_rank || 99) - (b.importance_rank || 99) || b.season - a.season)
                                        .map((t, idx) => (
                                            <div key={idx} className="honor-item">
                                                <div className="honor-left">
                                                    <Badge variant={t.place?.toLowerCase().includes('winner') ? 'warning' : 'neutral'} size="xs" dense>
                                                        {t.place?.toLowerCase().includes('winner') ? 'Winner' : 'Runner-up'}
                                                    </Badge>
                                                </div>
                                                <div className="honor-main">
                                                    <Stack direction="row" gap="8px" align="center">
                                                        <img src={`https://media.api-sports.io/football/leagues/${t.league_id}.png`} alt="" style={{ width: '16px', height: '16px', objectFit: 'contain' }} />
                                                        <span className="honor-league">{t.league_name || t.trophy}</span>
                                                    </Stack>
                                                    <div className="honor-seasons">{t.season}</div>
                                                </div>
                                            </div>
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
