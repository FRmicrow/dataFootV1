import React from 'react';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import { Card, Table, Stack, Button, Grid, Input } from '../../../../design-system';

const getRankTheme = (rank) => {
    if (rank <= 4) return { background: 'var(--color-primary-600)', color: 'white' };
    if (rank >= 18) return { background: 'var(--color-danger-500)', color: 'white' };
    return { background: 'var(--glass-bg)', color: 'var(--color-text-main)' };
};

const RankBadge = ({ rank }) => {
    const theme = getRankTheme(rank);
    return (
        <div
            style={{
                width: '28px',
                height: '28px',
                borderRadius: 'var(--radius-sm)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '11px',
                fontWeight: 'bold',
                ...theme
            }}
        >
            {rank}
        </div>
    );
};

RankBadge.propTypes = {
    rank: PropTypes.number.isRequired
};

const getFormTheme = (char) => {
    switch (char) {
        case 'W': return { background: 'var(--color-success-500)', label: 'Win' };
        case 'D': return { background: 'var(--color-accent-500)', label: 'Draw' };
        case 'L': return { background: 'var(--color-danger-500)', label: 'Loss' };
        default: return { background: 'rgba(255,255,255,0.05)', label: 'Unknown' };
    }
};

const FormIndicator = ({ form }) => {
    const chars = form?.split('') || [];
    return (
        <Stack direction="row" gap="4px" justify="center">
            {chars.map((char, i) => {
                const theme = getFormTheme(char);
                return (
                    <div
                        key={`${char}-${i}`}
                        style={{
                            width: '18px',
                            height: '18px',
                            borderRadius: '4px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '10px',
                            fontWeight: '900',
                            color: 'white',
                            background: theme.background
                        }}
                        aria-label={theme.label}
                        title={theme.label}
                    >
                        {char}
                    </div>
                );
            })}
        </Stack>
    );
};

FormIndicator.propTypes = {
    form: PropTypes.string
};

const StandingsTable = ({
    standings = [],
    rangeStart,
    setRangeStart,
    rangeEnd,
    setRangeEnd,
    handleRangeUpdate,
    loading
}) => {
    const groupMap = (standings || []).reduce((acc, curr) => {
        const group = curr.group_name || 'General Standings';
        if (!acc[group]) acc[group] = [];
        acc[group].push(curr);
        return acc;
    }, {});

    const groups = Object.entries(groupMap);

    const columns = [
        {
            title: '#',
            dataIndex: 'rank',
            key: 'rank',
            align: 'center',
            width: '60px',
            render: (rank) => <RankBadge rank={rank} />
        },
        {
            title: 'Club',
            key: 'team',
            render: (_, t) => (
                <Link to={`/club/${t.team_id}`} style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)', textDecoration: 'none', color: 'inherit' }}>
                    <img src={t.team_logo} alt={`${t.team_name} logo`} style={{ width: '20px', height: '20px', objectFit: 'contain' }} />
                    <span style={{ fontWeight: 'var(--font-weight-bold)', fontSize: 'var(--font-size-sm)' }}>{t.team_name}</span>
                </Link>
            )
        },
        { title: 'P', dataIndex: 'played', key: 'played', align: 'center', width: '40px' },
        { title: 'W', dataIndex: 'win', key: 'win', align: 'center', width: '40px', render: (val) => <span style={{ color: 'var(--color-success-500)', fontWeight: 'bold' }}>{val}</span> },
        { title: 'D', dataIndex: 'draw', key: 'draw', align: 'center', width: '40px' },
        { title: 'L', dataIndex: 'lose', key: 'lose', align: 'center', width: '40px', render: (val) => <span style={{ color: 'var(--color-danger-500)' }}>{val}</span> },
        { title: 'GF', dataIndex: 'goals_for', key: 'gf', align: 'center', width: '40px', render: (val) => <span style={{ opacity: 0.7 }}>{val}</span> },
        { title: 'GA', dataIndex: 'goals_against', key: 'ga', align: 'center', width: '40px', render: (val) => <span style={{ opacity: 0.7 }}>{val}</span> },
        {
            title: 'GD',
            dataIndex: 'goals_diff',
            key: 'diff',
            align: 'center',
            width: '50px',
            render: (val) => {
                const color = val > 0 ? 'var(--color-success-500)' : val < 0 ? 'var(--color-danger-500)' : 'inherit';
                return (
                    <span style={{ color, fontWeight: 'bold' }}>
                        {val > 0 ? `+${val}` : val}
                    </span>
                );
            }
        },
        {
            title: 'PTS',
            dataIndex: 'points',
            key: 'points',
            align: 'center',
            width: '60px',
            render: (pts) => <span style={{ fontSize: 'var(--font-size-base)', fontWeight: '900', color: 'var(--color-primary-400)' }}>{pts}</span>
        },
        {
            title: 'Last 5',
            dataIndex: 'form',
            key: 'form',
            align: 'center',
            width: '120px',
            render: (form) => <FormIndicator form={form} />
        }
    ];

    if (standings.length === 0) {
        return (
            <Card style={{ minHeight: '500px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ textAlign: 'center', maxWidth: '500px', padding: 'var(--spacing-xl)' }}>
                    <div style={{ position: 'relative', width: '120px', height: '120px', margin: '0 auto var(--spacing-lg)' }}>
                        <div style={{ fontSize: '48px', color: 'var(--color-primary-600)', fontWeight: 'black' }}>OFFLINE</div>
                    </div>
                    <h3 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'var(--font-weight-black)', marginBottom: 'var(--spacing-sm)' }}>Classification Matrix Offline</h3>
                    <p style={{ color: 'var(--color-text-dim)', fontSize: 'var(--font-size-sm)', lineHeight: '1.6', marginBottom: 'var(--spacing-xl)' }}>
                        Operational data for this temporal context hasn't been synchronized. The tactical hierarchy cannot be visualized without a full registry sync.
                    </p>
                    <Grid columns="1fr 1fr" gap="var(--spacing-md)">
                        <Button variant="primary" onClick={() => window.location.reload()}>🔄 Sync Registry</Button>
                        <Button variant="secondary" onClick={() => window.location.href = '/import'}>⚙️ System Config</Button>
                    </Grid>
                </div>
            </Card>
        );
    }

    return (
        <Stack gap="var(--spacing-lg)" className="animate-fade-in" style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            {groups.map(([groupName, teams], idx) => (
                <Card
                    key={groupName}
                    title={groupName}
                    padding="0"
                    style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}
                    extra={idx === 0 && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)', background: 'rgba(255,255,255,0.03)', padding: '4px 12px', borderRadius: 'var(--radius-full)' }}>
                            <label htmlFor="range-start" style={{ fontSize: '10px', fontWeight: 'bold', color: 'var(--color-text-dim)' }}>FILTER RANKS</label>
                            <Input
                                id="range-start"
                                type="number"
                                value={rangeStart}
                                onChange={e => setRangeStart(e.target.value)}
                                style={{ width: '48px', textAlign: 'center', padding: '4px' }}
                            />
                            <label htmlFor="range-end" style={{ opacity: 0.3 }}>-</label>
                            <Input
                                id="range-end"
                                type="number"
                                value={rangeEnd}
                                onChange={e => setRangeEnd(e.target.value)}
                                style={{ width: '48px', textAlign: 'center', padding: '4px' }}
                            />
                            <Button size="xs" variant="ghost" onClick={handleRangeUpdate} loading={loading} style={{ padding: '2px 8px' }}>APPLY</Button>
                        </div>
                    )}
                >
                    <Table columns={columns} data={teams} className="plain" interactive style={{ flex: 1, minHeight: 0 }} />
                </Card>
            ))}
        </Stack>
    );
};

StandingsTable.propTypes = {
    standings: PropTypes.arrayOf(PropTypes.shape({
        team_id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
        team_name: PropTypes.string.isRequired,
        team_logo: PropTypes.string,
        rank: PropTypes.number,
        played: PropTypes.number,
        win: PropTypes.number,
        draw: PropTypes.number,
        lose: PropTypes.number,
        goals_for: PropTypes.number,
        goals_against: PropTypes.number,
        goals_diff: PropTypes.number,
        points: PropTypes.number,
        form: PropTypes.string,
        group_name: PropTypes.string
    })),
    rangeStart: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    setRangeStart: PropTypes.func,
    rangeEnd: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    setRangeEnd: PropTypes.func,
    handleRangeUpdate: PropTypes.func,
    isDynamicMode: PropTypes.bool,
    loading: PropTypes.bool
};

export default StandingsTable;
