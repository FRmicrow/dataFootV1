import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Table, Badge, Stack, Button } from '../../../../design-system';
import { getShortPosition } from '../../../../utils/positionUtils';

const SquadTab = ({ roster, year }) => {
    const navigate = useNavigate();
    const [filterPos, setFilterPos] = useState('ALL');

    const counts = useMemo(() => {
        if (!roster) return {};
        const base = { 'ALL': 0, 'Goalkeeper': 0, 'Defender': 0, 'Midfielder': 0, 'Attacker': 0 };
        return roster.reduce((acc, p) => {
            const pos = p.position || 'Unknown';
            acc[pos] = (acc[pos] || 0) + 1;
            acc['ALL'] = (acc['ALL'] || 0) + 1;
            return acc;
        }, base);
    }, [roster]);

    const filteredRoster = useMemo(() => {
        if (!roster) return [];
        return filterPos === 'ALL'
            ? roster
            : roster.filter(p => p.position === filterPos);
    }, [roster, filterPos]);

    const columns = [
        {
            title: 'Player',
            key: 'player',
            render: (_, p) => (
                <Stack direction="row" align="center" gap="var(--spacing-md)">
                    <img src={p.photo_url} alt="" style={{ width: '32px', height: '32px', borderRadius: '50%', border: '1px solid var(--color-border)' }} />
                    <span style={{ fontWeight: 'bold' }}>{p.name}</span>
                </Stack>
            )
        },
        {
            title: 'Pos',
            key: 'info',
            width: '80px',
            align: 'center',
            render: (_, p) => (
                <Stack direction="row" align="center" justify="center" gap="var(--spacing-sm)">
                    <Badge variant="primary" size="sm" style={{ minWidth: '24px', textAlign: 'center' }}>
                        {getShortPosition(p.position)}
                    </Badge>
                    <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>{p.age}y</span>
                </Stack>
            )
        },
        { title: 'Apps', dataIndex: 'appearances', key: 'apps', align: 'center' },
        { title: 'Mins', dataIndex: 'minutes', key: 'mins', align: 'center', render: (v) => v?.toLocaleString() || 0 },
        { title: 'Goals', dataIndex: 'goals', key: 'goals', align: 'center', render: (v) => <strong style={{ color: 'var(--color-primary-400)' }}>{v || 0}</strong> },
        { title: 'Assists', dataIndex: 'assists', key: 'assists', align: 'center' },
        {
            title: 'Rating',
            dataIndex: 'rating',
            key: 'rating',
            align: 'center',
            render: (v) => <Badge variant={parseFloat(v) >= 7.2 ? 'primary' : 'neutral'}>{v ? parseFloat(v).toFixed(1) : '—'}</Badge>
        }
    ];

    if (!roster || roster.length === 0) {
        return (
            <Card>
                <Stack align="center" justify="center" gap="var(--spacing-md)" style={{ padding: '80px' }}>
                    <span style={{ fontSize: '48px' }}>👥</span>
                    <h3>No squad data for this selection</h3>
                    <p style={{ color: 'var(--color-text-muted)' }}>Try another season or reset your filters to see the roster.</p>
                </Stack>
            </Card>
        );
    }

    return (
        <Stack gap="var(--spacing-lg)">
            <Stack direction="row" gap="var(--spacing-sm)" className="squad-tabs-scroll" style={{ overflowX: 'auto', paddingBottom: '8px' }}>
                {['ALL', 'Goalkeeper', 'Defender', 'Midfielder', 'Attacker'].map(pos => (
                    <Button
                        key={pos}
                        variant={filterPos === pos ? 'primary' : 'secondary'}
                        size="sm"
                        onClick={() => setFilterPos(pos)}
                    >
                        {pos === 'ALL' ? 'Total Squad' : pos}
                        <Badge variant="neutral" size="sm" style={{ marginLeft: '8px', opacity: 0.8 }}>{counts[pos] || 0}</Badge>
                    </Button>
                ))}
            </Stack>

            <Card title={`Active Roster (${filteredRoster.length})`} subtitle={`Season ${year} statistics`}>
                <Table
                    columns={columns}
                    data={filteredRoster}
                    onRowClick={(p) => navigate(`/player/${p.player_id}`)}
                />
            </Card>
        </Stack>
    );
};

export default SquadTab;
