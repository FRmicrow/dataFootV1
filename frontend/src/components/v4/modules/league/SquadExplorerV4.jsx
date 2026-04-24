import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';

import api from '../../../../services/api';
import { Card, Table, Badge, Stack, Grid, Select } from '../../../../design-system';
import { getShortPosition } from '../../../../utils/positionUtils';

const VIEW_MODES = [
    { id: 'standard', label: 'Standard' },
    { id: 'xg',       label: 'xG Deep' },
];

const SquadExplorerV4 = ({ leagueId, season, teams, displayMode }) => {
    const [teamId, setTeamId] = useState('');
    const [position, setPosition] = useState('ALL');
    const [players, setPlayers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [sortConfig, setSortConfig] = useState({ key: 'goals', direction: 'DESC' });
    const [viewMode, setViewMode] = useState('standard');

    useEffect(() => {
        const fetchExplorerData = async () => {
            setLoading(true);
            try {
                const res = await api.getSeasonPlayersV4(leagueId, season, {
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

    const fmtXg = (v) => (v !== null && v !== undefined) ? Number(v).toFixed(2) : '-';

    const baseColumns = [
        {
            title: 'Player',
            key: 'name',
            dataIndex: 'name',
            width: '180px',
            render: (name, player) => (
                <Link to={`/player/${player.player_id}`} style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)', textDecoration: 'none' }}>
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
                <Link to={`/club/${player.team_slug || player.team_id}`} style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-2xs)', textDecoration: 'none' }}>
                    <img src={player.team_logo} alt="" style={{ width: '16px', height: '16px', objectFit: 'contain' }} />
                    <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</span>
                </Link>
            )
        },
        { title: 'Pos', key: 'pos', dataIndex: 'position', align: 'center', width: '60px', render: (v) => <span style={{ opacity: 0.6 }}>{getShortPosition(v)}</span> },
        { title: 'App', key: 'apps', dataIndex: 'appearances', align: 'center', width: '50px' },
        { title: '90s', key: 'mins', dataIndex: 'minutes', align: 'center', width: '50px', render: (m) => Math.round(m / 90) },
    ];

    const hasXg = players.some(p => p.xg !== null && p.xg > 0);
    const hasCards = players.some(p => p.yellow_cards > 0 || p.red_cards > 0);

    const standardColumns = [
        ...baseColumns,
        {
            title: 'G',
            key: 'goals',
            dataIndex: 'goals',
            align: 'center',
            width: '40px',
            render: (v, player, index) => {
                const isTopScorer = sortConfig.key === 'goals' && index === 0 && v > 0;
                return (
                    <span style={{
                        color: v > 0 ? 'var(--color-success-500)' : 'inherit',
                        fontWeight: v > 0 ? 'bold' : 'normal',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 'var(--spacing-2xs)'
                    }}>
                        {v}
                        {isTopScorer && <span title="Golden Boot Candidate">👑</span>}
                    </span>
                );
            }
        },
        { title: 'A', key: 'assists', dataIndex: 'assists', align: 'center', width: '40px', render: (v) => <span style={{ color: v > 0 ? 'var(--color-primary-400)' : 'inherit', fontWeight: v > 0 ? 'bold' : 'normal' }}>{v}</span> },
        ...(hasCards ? [{
            title: 'Cards',
            key: 'cards',
            align: 'center',
            width: '60px',
            render: (_, p) => (
                <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                    {p.yellow_cards > 0 && <span style={{ background: '#f59e0b', color: '#fff', fontSize: '10px', padding: '1px 4px', borderRadius: '2px' }}>{p.yellow_cards}</span>}
                    {p.red_cards > 0 && <span style={{ background: '#ef4444', color: '#fff', fontSize: '10px', padding: '1px 4px', borderRadius: '2px' }}>{p.red_cards}</span>}
                    {p.yellow_cards === 0 && p.red_cards === 0 && <span style={{ color: 'var(--color-text-dim)' }}>-</span>}
                </div>
            )
        }] : []),
        ...(hasXg ? [
            { title: 'xG', key: 'xg', dataIndex: 'xg', align: 'center', width: '60px', render: fmtXg },
            { title: 'xA', key: 'xa', dataIndex: 'xa', align: 'center', width: '60px', render: fmtXg },
            { title: 'npxG', key: 'npxg', dataIndex: 'npxg', align: 'center', width: '60px', render: fmtXg },
            { title: 'xG/90', key: 'xg_90', dataIndex: 'xg_90', align: 'center', width: '60px', render: fmtXg }
        ] : []),
        {
            title: 'Rat',
            key: 'rating',
            dataIndex: 'rating',
            align: 'center',
            width: '60px',
            render: (v) => v ? <Badge variant="primary" size="sm">{v}</Badge> : '-'
        }
    ];

    const xgColumns = [
        ...baseColumns,
        { title: 'xG', key: 'xg', dataIndex: 'xg', align: 'center', width: '56px', render: fmtXg },
        { title: 'NPxG', key: 'npxg', dataIndex: 'npxg', align: 'center', width: '56px', render: fmtXg },
        { title: 'xA', key: 'xa', dataIndex: 'xa', align: 'center', width: '56px', render: fmtXg },
        { title: 'xG/90', key: 'xg_90', dataIndex: 'xg_90', align: 'center', width: '60px', render: fmtXg },
        { title: 'NPxG/90', key: 'npxg_90', dataIndex: 'npxg_90', align: 'center', width: '72px', render: fmtXg },
        { title: 'xA/90', key: 'xa_90', dataIndex: 'xa_90', align: 'center', width: '60px', render: fmtXg },
        { title: 'xGChain', key: 'xg_chain', dataIndex: 'xg_chain', align: 'center', width: '72px', render: fmtXg },
        { title: 'Chain/90', key: 'xg_chain_90', dataIndex: 'xg_chain_90', align: 'center', width: '74px', render: fmtXg },
        { title: 'xGBuild', key: 'xg_buildup', dataIndex: 'xg_buildup', align: 'center', width: '72px', render: fmtXg },
        { title: 'Build/90', key: 'xg_buildup_90', dataIndex: 'xg_buildup_90', align: 'center', width: '74px', render: fmtXg },
    ];

    const columns = viewMode === 'xg' ? xgColumns : standardColumns;

    return (
        <Card
            title="Squad Explorer"
            subtitle="Deep statistical drill-down"
            extra={
                <Stack direction="row" gap="var(--spacing-xs)">
                    {/* View mode toggle - Hide xG mode if no xG data */}
                    <div style={{ display: 'flex', gap: '4px', marginRight: 'var(--spacing-xs)' }}>
                        {VIEW_MODES.filter(m => m.id === 'standard' || (m.id === 'xg' && hasXg)).map(m => (
                            <button
                                key={m.id}
                                type="button"
                                onClick={() => { setViewMode(m.id); setSortConfig({ key: m.id === 'xg' ? 'xg' : 'goals', direction: 'DESC' }); }}
                                style={{
                                    padding: '4px 10px',
                                    borderRadius: 'var(--radius-sm)',
                                    border: '1px solid var(--color-border-subtle)',
                                    background: viewMode === m.id ? 'var(--color-primary-600)' : 'transparent',
                                    color: viewMode === m.id ? '#fff' : 'var(--color-text-dim)',
                                    fontSize: 'var(--font-size-xs)',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    transition: 'var(--transition-fast)',
                                }}
                            >
                                {m.label}
                            </button>
                        ))}
                    </div>
                    <Select
                        options={[{ value: '', label: 'All Teams' }, ...teams.map(t => ({ value: t.team_id, label: t.team_name }))]}
                        value={(() => {
                            if (!teamId) return { value: '', label: 'All Teams' };
                            const t = teams.find(team => String(team.team_id) === String(teamId));
                            return { value: teamId, label: t?.team_name || 'All Teams' };
                        })()}
                        onChange={(opt) => setTeamId(opt.value)}
                        placeholder="Team"
                        isSearchable
                        aria-label="Filter by Team"
                    />

                    <Select
                        options={[
                            { value: 'ALL', label: 'Positions' },
                            { value: 'Goalkeeper', label: 'GK' },
                            { value: 'Defender', label: 'DF' },
                            { value: 'Midfielder', label: 'MF' },
                            { value: 'Attacker', label: 'FW' }
                        ]}
                        value={(() => {
                            const labels = {
                                'ALL': 'Positions',
                                'Goalkeeper': 'GK',
                                'Defender': 'DF',
                                'Midfielder': 'MF',
                                'Attacker': 'FW'
                            };
                            return { value: position, label: labels[position] || 'FW' };
                        })()}
                        onChange={(opt) => setPosition(opt.value)}
                        placeholder="Pos"
                        aria-label="Filter by Position"
                    />
                </Stack>
            }
            style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
            className="animate-slide-up"
        >
            <div className="ds-card-body scrollbar-custom" style={{ padding: 0, overflowY: 'auto', flex: 1 }}>
                <Table
                    columns={columns.map((col, colIndex) => ({
                        ...col,
                        title: (
                            <button
                                onClick={() => handleSort(col.key)}
                                type="button"
                                aria-label={`Sort by ${col.title}`}
                                className="ds-table-sort-btn"
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    padding: 0,
                                    color: 'inherit',
                                    font: 'inherit',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 'var(--spacing-2xs)',
                                    justifyContent: col.align === 'center' ? 'center' : 'flex-start',
                                    width: '100%'
                                }}
                            >
                                {col.title}
                                {sortConfig.key === col.key && (
                                    <span style={{ fontSize: 'var(--font-size-2xs, 10px)', color: 'var(--color-primary-400)' }}>
                                        {sortConfig.direction === 'DESC' ? '▼' : '▲'}
                                    </span>
                                )}
                            </button>
                        )
                    }))}
                    data={players}
                    loading={loading}
                    rowKey="player_id"
                    interactive
                />
            </div>

            <footer style={{ marginTop: 'var(--spacing-sm)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-dim)', textTransform: 'uppercase' }}>
                    {players.length} Profiles Analyzing
                </span>
                <Badge variant="success" size="sm">LIVE DATA</Badge>
            </footer>
        </Card>
    );
};

SquadExplorerV4.propTypes = {
    leagueId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    season: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    teams: PropTypes.array.isRequired
};

export default SquadExplorerV4;
