import React, { useState, useMemo } from 'react';
import PropTypes from 'prop-types';
import { useNavigate } from 'react-router-dom';
import { Card, Table, Badge, Stack, Button } from '../../../../../design-system';

// V4 squad has: player_id, name (full_name), photo, position_code, appearances, starts, number
// position_code → GK, CB, LB, RB, CDM, CM, CAM, LW, RW, CF, ST, etc.
const posCodeToGroup = (code) => {
    if (!code) return 'Unknown';
    const c = code.toUpperCase();
    if (c === 'GK') return 'Goalkeeper';
    if (['CB', 'LB', 'RB', 'LWB', 'RWB', 'SW'].includes(c)) return 'Defender';
    if (['CM', 'CDM', 'CAM', 'LM', 'RM', 'DM', 'AM'].includes(c)) return 'Midfielder';
    if (['LW', 'RW', 'CF', 'ST', 'SS', 'FW'].includes(c)) return 'Attacker';
    return 'Unknown';
};

const SquadTabV4 = ({ roster, season }) => {
    const navigate = useNavigate();
    const [filterPos, setFilterPos] = useState('ALL');

    // Enrich roster with position group derived from position_code
    const enrichedRoster = useMemo(() => {
        if (!roster) return [];
        return roster.map(p => ({ ...p, positionGroup: posCodeToGroup(p.position_code) }));
    }, [roster]);

    const counts = useMemo(() => {
        const base = { ALL: 0, Goalkeeper: 0, Defender: 0, Midfielder: 0, Attacker: 0 };
        return enrichedRoster.reduce((acc, p) => {
            const g = p.positionGroup;
            acc[g] = (acc[g] || 0) + 1;
            acc.ALL++;
            return acc;
        }, base);
    }, [enrichedRoster]);

    const filteredRoster = useMemo(() => {
        if (filterPos === 'ALL') return enrichedRoster;
        return enrichedRoster.filter(p => p.positionGroup === filterPos);
    }, [enrichedRoster, filterPos]);

    const columns = [
        {
            title: 'Player',
            key: 'player',
            render: (_, p) => (
                <Stack direction="row" align="center" gap="var(--spacing-md)">
                    <img
                        src={p.photo}
                        alt=""
                        style={{ width: '32px', height: '32px', borderRadius: '50%', border: '1px solid var(--color-border)' }}
                    />
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
                    <Badge variant="primary" size="sm" style={{ minWidth: '28px', textAlign: 'center' }}>
                        {p.position_code || '??'}
                    </Badge>
                    {p.number && (
                        <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>#{p.number}</span>
                    )}
                </Stack>
            )
        },
        { title: 'Apps', dataIndex: 'appearances', key: 'apps', align: 'center' },
        { title: 'Starts', dataIndex: 'starts', key: 'starts', align: 'center' },
        {
            title: 'Goals',
            dataIndex: 'goals',
            key: 'goals',
            align: 'center',
            render: (v) => <strong style={{ color: 'var(--color-primary-400)' }}>{v || 0}</strong>
        },
        { title: 'Assists', dataIndex: 'assists', key: 'assists', align: 'center' },
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

            <Card title={`Active Roster (${filteredRoster.length})`} subtitle={`Season ${season} statistics`}>
                <Table
                    columns={columns}
                    data={filteredRoster}
                    onRowClick={(p) => navigate(`/player/${p.player_id}`)}
                />
            </Card>
        </Stack>
    );
};

SquadTabV4.propTypes = {
    roster: PropTypes.arrayOf(PropTypes.shape({
        player_id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
        name: PropTypes.string.isRequired,
        photo: PropTypes.string,
        position_code: PropTypes.string,
        appearances: PropTypes.number,
        starts: PropTypes.number,
        number: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
        goals: PropTypes.number,
        assists: PropTypes.number,
    })).isRequired,
    season: PropTypes.string,
};

export default SquadTabV4;
