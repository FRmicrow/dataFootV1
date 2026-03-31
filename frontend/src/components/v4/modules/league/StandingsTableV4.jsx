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

const StandingsTableV4 = ({
    standings = [],
    rangeStart,
    setRangeStart,
    rangeEnd,
    setRangeEnd,
    handleRangeUpdate,
    loading,
    isSplitView,
    onToggleSplit
}) => {
    const groupMap = (standings || []).reduce((acc, curr) => {
        const group = curr.group_name || 'General Standings (V4)';
        if (!acc[group]) acc[group] = [];
        acc[group].push(curr);
        return acc;
    }, {});

    const groups = Object.entries(groupMap);

    const allColumns = [
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
                <Link to={`/v4/club/${t.team_id}`} style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)', textDecoration: 'none', color: 'inherit' }}>
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
                const getGDColor = (v) => {
                    if (v > 0) return 'var(--color-success-500)';
                    if (v < 0) return 'var(--color-danger-500)';
                    return 'inherit';
                };
                let displayVal = val;
                if (val > 0) displayVal = `+${val}`;
                return <span style={{ color: getGDColor(val), fontWeight: 'bold' }}>{displayVal}</span>;
            }
        },
        {
            title: 'PTS',
            dataIndex: 'points',
            key: 'points',
            align: 'center',
            width: '60px',
            render: (pts) => <span style={{ fontSize: 'var(--font-size-base)', fontWeight: '900', color: 'var(--color-primary-400)' }}>{pts}</span>
        }
    ];

    const columns = isSplitView ? allColumns : allColumns;

    if (standings.length === 0) {
        return (
            <Card style={{ minHeight: '500px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ textAlign: 'center', maxWidth: '500px', padding: 'var(--spacing-xl)' }}>
                    <h3 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'var(--font-weight-black)', marginBottom: 'var(--spacing-sm)' }}>V4 Matrix Loading...</h3>
                    <p style={{ color: 'var(--color-text-dim)', fontSize: 'var(--font-size-sm)', lineHeight: '1.6' }}>
                        Processing historical calculation for this temporal context.
                    </p>
                </div>
            </Card>
        );
    }

    return (
        <Stack gap="var(--spacing-lg)" className="animate-fade-in" style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            {groups.map(([groupName, teams], idx) => (
                <Card key={groupName} title={groupName} padding="0" style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
                    <Table columns={columns} data={teams} className="plain" interactive style={{ flex: 1, minHeight: 0 }} />
                </Card>
            ))}
        </Stack>
    );
};

StandingsTableV4.propTypes = {
    standings: PropTypes.array,
    rangeStart: PropTypes.number,
    setRangeStart: PropTypes.func,
    rangeEnd: PropTypes.number,
    setRangeEnd: PropTypes.func,
    handleRangeUpdate: PropTypes.func,
    loading: PropTypes.bool,
    isSplitView: PropTypes.bool,
    onToggleSplit: PropTypes.func
};

export default StandingsTableV4;
