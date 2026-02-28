import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../../services/api';
import { Card, Table, Badge, Stack, Grid } from '../../../design-system';

const SquadExplorer = ({ leagueId, season, teams }) => {
    const [teamId, setTeamId] = useState('');
    const [position, setPosition] = useState('ALL');
    const [players, setPlayers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [sortConfig, setSortConfig] = useState({ key: 'goals', direction: 'DESC' });

    useEffect(() => {
        const fetchExplorerData = async () => {
            setLoading(true);
            try {
                const res = await api.getSeasonPlayers(leagueId, season, {
                    teamId: teamId,
                    position: position,
                    sortBy: sortConfig.key,
                    order: sortConfig.direction
                });
                setPlayers(res);
            } catch (err) {
                console.error("Failed to fetch explorer players:", err);
            } finally {
                setLoading(false);
            }
        };

        if (leagueId && season) {
            fetchExplorerData();
        }
    }, [leagueId, season, teamId, position, sortConfig]);

    const handleSort = (key) => {
        setSortConfig(prev => ({
            key,
            direction: prev.key === key && prev.direction === 'DESC' ? 'ASC' : 'DESC'
        }));
    };

    const columns = [
        {
            title: 'Player',
            key: 'name',
            dataIndex: 'name',
            width: '180px',
            render: (name, player) => (
                <Link to={`/player/${player.player_id}`} style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}>
                    <img src={player.photo_url} alt="" style={{ width: '28px', height: '28px', borderRadius: '50%', border: '1px solid var(--color-border)' }} />
                    <span style={{ fontWeight: 'var(--font-weight-bold)', fontSize: 'var(--font-size-sm)', color: 'var(--color-text-main)' }}>{name}</span>
                </Link>
            )
        },
        {
            title: 'Team',
            key: 'team',
            dataIndex: 'team_name',
            width: '140px',
            render: (name, player) => (
                <Link to={`/club/${player.team_id}`} style={{ display: 'flex', alignItems: 'center', gap: '6px', textDecoration: 'none' }}>
                    <img src={player.team_logo} alt="" style={{ width: '16px', height: '16px', objectFit: 'contain' }} />
                    <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</span>
                </Link>
            )
        },
        { title: 'Pos', key: 'pos', dataIndex: 'position', align: 'center', width: '60px', render: (v) => <span style={{ opacity: 0.6 }}>{v?.substring(0, 1)}</span> },
        { title: 'App', key: 'apps', dataIndex: 'appearances', align: 'center', width: '50px' },
        { title: '90s', key: 'mins', dataIndex: 'minutes', align: 'center', width: '50px', render: (m) => Math.round(m / 90) },
        { title: 'G', key: 'goals', dataIndex: 'goals', align: 'center', width: '40px', render: (v) => <span style={{ color: v > 0 ? 'var(--color-success-500)' : 'inherit', fontWeight: v > 0 ? 'bold' : 'normal' }}>{v}</span> },
        { title: 'A', key: 'assists', dataIndex: 'assists', align: 'center', width: '40px', render: (v) => <span style={{ color: v > 0 ? 'var(--color-primary-400)' : 'inherit', fontWeight: v > 0 ? 'bold' : 'normal' }}>{v}</span> },
        {
            title: 'Rat',
            key: 'rating',
            dataIndex: 'rating',
            align: 'center',
            width: '60px',
            render: (v) => v ? <Badge variant="primary" size="sm">{v}</Badge> : '-'
        }
    ];

    return (
        <Card
            title="Squad Explorer"
            subtitle="Deep statistical drill-down"
            extra={
                <Stack direction="row" gap="var(--spacing-xs)">
                    <select
                        value={teamId}
                        onChange={(e) => setTeamId(e.target.value)}
                        style={{ padding: '4px 12px', fontSize: '11px', fontWeight: 'bold' }}
                    >
                        <option value="">All Teams</option>
                        {teams.map(t => (
                            <option key={t.team_id} value={t.team_id}>{t.team_name}</option>
                        ))}
                    </select>

                    <select
                        value={position}
                        onChange={(e) => setPosition(e.target.value)}
                        style={{ padding: '4px 12px', fontSize: '11px', fontWeight: 'bold' }}
                    >
                        <option value="ALL">Positions</option>
                        <option value="Goalkeeper">GK</option>
                        <option value="Defender">DF</option>
                        <option value="Midfielder">MF</option>
                        <option value="Attacker">FW</option>
                    </select>
                </Stack>
            }
            style={{ flex: 1, height: '100%', minHeight: '600px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
            className="animate-slide-up"
        >
            <div className="ds-card-body scrollbar-custom" style={{ padding: 0, overflowY: 'auto', flex: 1 }}>
                <Table
                    columns={columns.map(col => ({
                        ...col,
                        title: (
                            <div
                                onClick={() => handleSort(col.key)}
                                style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', justifyContent: col.align === 'center' ? 'center' : 'flex-start' }}
                            >
                                {col.title}
                                {sortConfig.key === col.key && (
                                    <span style={{ fontSize: '8px', color: 'var(--color-primary-400)' }}>
                                        {sortConfig.direction === 'DESC' ? '▼' : '▲'}
                                    </span>
                                )}
                            </div>
                        )
                    }))}
                    data={players}
                    loading={loading}
                    interactive
                />
            </div>

            <footer style={{ marginTop: 'var(--spacing-sm)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '10px', color: 'var(--color-text-dim)', textTransform: 'uppercase' }}>
                    {players.length} Profiles Analyzing
                </span>
                <Badge variant="success" size="sm">LIVE DATA</Badge>
            </footer>
        </Card>
    );
};

export default SquadExplorer;
