import React from 'react';
import { Link } from 'react-router-dom';
import { Card, Table, Badge, Stack, Button, Grid } from '../../../design-system';

const StandingsTable = ({
    standings = [],
    rangeStart,
    setRangeStart,
    rangeEnd,
    setRangeEnd,
    handleRangeUpdate,
    isDynamicMode,
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
            render: (rank) => (
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
                        background: rank <= 4 ? 'var(--color-primary-600)' : rank >= 18 ? 'var(--color-danger-500)' : 'var(--glass-bg)',
                        color: rank <= 4 || rank >= 18 ? 'white' : 'var(--color-text-main)'
                    }}
                >
                    {rank}
                </div>
            )
        },
        {
            title: 'Club',
            key: 'team',
            render: (_, t) => (
                <Link to={`/club/${t.team_id}`} style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)', textDecoration: 'none', color: 'inherit' }}>
                    <img src={t.team_logo} alt="" style={{ width: '20px', height: '20px', objectFit: 'contain' }} />
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
            render: (val) => (
                <span style={{ color: val > 0 ? 'var(--color-success-500)' : val < 0 ? 'var(--color-danger-500)' : 'inherit', fontWeight: 'bold' }}>
                    {val > 0 ? `+${val}` : val}
                </span>
            )
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
            render: (form) => (
                <Stack direction="row" gap="4px" justify="center">
                    {form?.split('').map((char, i) => (
                        <div
                            key={i}
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
                                background: char === 'W' ? 'var(--color-success-500)' : char === 'D' ? 'var(--color-accent-500)' : char === 'L' ? 'var(--color-danger-500)' : 'rgba(255,255,255,0.05)'
                            }}
                            title={char}
                        >
                            {char}
                        </div>
                    ))}
                </Stack>
            )
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
        <Stack gap="var(--spacing-lg)" className="animate-fade-in">
            {groups.map(([groupName, teams], idx) => (
                <Card
                    key={groupName}
                    title={groupName}
                    padding="0"
                    extra={idx === 0 && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)', background: 'rgba(255,255,255,0.03)', padding: '4px 12px', borderRadius: 'var(--radius-full)' }}>
                            <span style={{ fontSize: '10px', fontWeight: 'bold', color: 'var(--color-text-dim)' }}>FILTER RANKS</span>
                            <input
                                type="number"
                                value={rangeStart}
                                onChange={e => setRangeStart(e.target.value)}
                                style={{ width: '32px', background: 'transparent', border: 'none', color: 'white', fontSize: '12px', fontWeight: 'bold', textAlign: 'center' }}
                            />
                            <span style={{ opacity: 0.3 }}>-</span>
                            <input
                                type="number"
                                value={rangeEnd}
                                onChange={e => setRangeEnd(e.target.value)}
                                style={{ width: '32px', background: 'transparent', border: 'none', color: 'white', fontSize: '12px', fontWeight: 'bold', textAlign: 'center' }}
                            />
                            <Button size="xs" variant="ghost" onClick={handleRangeUpdate} loading={loading} style={{ padding: '2px 8px' }}>APPLY</Button>
                        </div>
                    )}
                >
                    <div style={{ overflowX: 'auto' }} className="scrollbar-custom">
                        <Table columns={columns} data={teams} className="plain" interactive />
                    </div>
                </Card>
            ))}
        </Stack>
    );
};

export default StandingsTable;
