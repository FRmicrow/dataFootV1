import React from 'react';
import { Link } from 'react-router-dom';
import { Card, Table, Badge, Stack, Button } from '../../../design-system';

const StandingsTable = ({
    standings,
    rangeStart,
    setRangeStart,
    rangeEnd,
    setRangeEnd,
    handleRangeUpdate,
    isDynamicMode,
    loading
}) => {
    const groupMap = standings.reduce((acc, curr) => {
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
                        color: rank <= 4 || rank >= 18 ? 'white' : 'inherit'
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
                    <span style={{ fontWeight: 'var(--font-weight-bold)' }}>{t.team_name}</span>
                </Link>
            )
        },
        { title: 'P', dataIndex: 'played', key: 'played', align: 'center', width: '40px' },
        { title: 'W', dataIndex: 'win', key: 'win', align: 'center', width: '40px', render: (val) => <span style={{ color: 'var(--color-success-500)', fontWeight: 'bold' }}>{val}</span> },
        { title: 'D', dataIndex: 'draw', key: 'draw', align: 'center', width: '40px' },
        { title: 'L', dataIndex: 'lose', key: 'lose', align: 'center', width: '40px', render: (val) => <span style={{ color: 'var(--color-danger-500)' }}>{val}</span> },
        {
            title: '+/-',
            dataIndex: 'goals_diff',
            key: 'diff',
            align: 'center',
            width: '50px',
            render: (val) => (
                <span style={{ color: val > 0 ? 'var(--color-success-500)' : val < 0 ? 'var(--color-danger-500)' : 'inherit', opacity: 0.6 }}>
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
            title: 'Recent Form',
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
                                width: '6px',
                                height: '6px',
                                borderRadius: '50%',
                                background: char === 'W' ? 'var(--color-success-500)' : char === 'D' ? 'var(--color-accent-500)' : char === 'L' ? 'var(--color-danger-500)' : 'var(--color-border)'
                            }}
                            title={char}
                        />
                    ))}
                </Stack>
            )
        }
    ];

    if (standings.length === 0) {
        return (
            <Card style={{ minHeight: '400px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Stack align="center" justify="center" gap="var(--spacing-md)">
                    <div style={{ fontSize: '64px', marginBottom: 'var(--spacing-sm)', opacity: 0.5 }}>📉</div>
                    <h3 style={{ fontSize: 'var(--font-size-2xl)' }}>Classification Matrix Empty</h3>
                    <p style={{ color: 'var(--color-text-dim)', textAlign: 'center', maxWidth: '450px', fontSize: 'var(--font-size-sm)' }}>
                        Performance data for this specific season context has not been synchronized.
                        Synchronize the league registry to initialize the operational table.
                    </p>
                    <Stack direction="row" gap="var(--spacing-sm)" style={{ marginTop: 'var(--spacing-md)' }}>
                        <Button variant="primary" onClick={() => window.location.reload()}>🔄 Refresh Registry</Button>
                        <Button variant="secondary" onClick={() => window.location.href = '/import'}>⚙️ System Setup</Button>
                    </Stack>
                </Stack>
            </Card>
        );
    }

    return (
        <Stack gap="var(--spacing-lg)" className="animate-fade-in">
            {groups.map(([groupName, teams], idx) => (
                <Card
                    key={groupName}
                    title={groupName}
                    subtitle={idx === 0 ? "Official league classification" : null}
                    extra={idx === 0 && (
                        <Stack direction="row" gap="var(--spacing-xs)" align="center">
                            <input
                                type="number"
                                value={rangeStart}
                                onChange={e => setRangeStart(e.target.value)}
                                style={{ width: '48px', textAlign: 'center' }}
                            />
                            <span style={{ fontSize: '10px', color: 'var(--color-text-dim)' }}>TO</span>
                            <input
                                type="number"
                                value={rangeEnd}
                                onChange={e => setRangeEnd(e.target.value)}
                                style={{ width: '48px', textAlign: 'center' }}
                            />
                            <Button size="xs" onClick={handleRangeUpdate} loading={loading}>History Filter</Button>
                            {isDynamicMode && <Button size="xs" variant="ghost" onClick={() => window.location.reload()}>Reset</Button>}
                        </Stack>
                    )}
                >
                    <Table columns={columns} data={teams} interactive />
                </Card>
            ))}
        </Stack>
    );
};

export default StandingsTable;
