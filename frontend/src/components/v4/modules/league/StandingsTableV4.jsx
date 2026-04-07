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
    fixtures = [],
    loading
}) => {
    const [rangeStart, setRangeStart] = React.useState('');
    const [rangeEnd, setRangeEnd] = React.useState('');
    const [activeFilterStart, setActiveFilterStart] = React.useState(null);
    const [activeFilterEnd, setActiveFilterEnd] = React.useState(null);

    // Auto-calculate max round from fixtures
    const maxRound = React.useMemo(() => {
        if (!fixtures || fixtures.length === 0) return 0;
        let max = 0;
        fixtures.forEach(f => {
            const match = String(f.round).match(/\d+/);
            const r = match ? parseInt(match[0], 10) : 0;
            if (r > max) max = r;
        });
        return max;
    }, [fixtures]);

    // Initial default: 1 to MAX
    React.useEffect(() => {
        if (maxRound > 0 && activeFilterStart === null) {
            setRangeStart('1');
            setRangeEnd(String(maxRound));
            setActiveFilterStart(1);
            setActiveFilterEnd(maxRound);
        }
    }, [maxRound, activeFilterStart]);

    const handleRangeUpdate = () => {
        setActiveFilterStart(rangeStart ? Number(rangeStart) : null);
        setActiveFilterEnd(rangeEnd ? Number(rangeEnd) : null);
    };

    const computedStandings = React.useMemo(() => {
        if (!activeFilterStart || !activeFilterEnd || fixtures.length === 0) {
            return standings;
        }

        const teamsMap = {};
        standings.forEach(t => {
            teamsMap[t.team_id] = {
                team_id: t.team_id,
                team_name: t.team_name,
                team_logo: t.team_logo,
                group_name: t.group_name || 'General Standings (V4)',
                played: 0,
                win: 0,
                draw: 0,
                lose: 0,
                goals_for: 0,
                goals_against: 0,
                points: 0,
                form: ''
            };
        });

        // Parse round number from strings like "1. Journée" or "Regular Season - 1"
        const getRoundNum = (roundStr) => {
            if (!roundStr) return -1;
            const match = String(roundStr).match(/\d+/);
            return match ? parseInt(match[0], 10) : -1;
        };

        const validFixtures = fixtures.filter(f => {
            const rNum = getRoundNum(f.round);
            return rNum >= activeFilterStart && rNum <= activeFilterEnd && f.goals_home !== null && f.goals_away !== null;
        });

        validFixtures.forEach(f => {
            const home = teamsMap[f.home_team_id];
            const away = teamsMap[f.away_team_id];
            if (!home || !away) return;

            home.played++;
            away.played++;
            home.goals_for += f.goals_home;
            home.goals_against += f.goals_away;
            away.goals_for += f.goals_away;
            away.goals_against += f.goals_home;

            if (f.goals_home > f.goals_away) {
                home.win++; home.points += 3;
                away.lose++;
            } else if (f.goals_home < f.goals_away) {
                away.win++; away.points += 3;
                home.lose++;
            } else {
                home.draw++; home.points += 1;
                away.draw++; away.points += 1;
            }
        });

        const sortedTeams = Object.values(teamsMap).sort((a, b) => {
            if (b.points !== a.points) return b.points - a.points;
            const diffA = a.goals_for - a.goals_against;
            const diffB = b.goals_for - b.goals_against;
            if (diffB !== diffA) return diffB - diffA;
            return b.goals_for - a.goals_for;
        });

        return sortedTeams.map((t, idx) => ({ ...t, rank: idx + 1, goals_diff: t.goals_for - t.goals_against }));
    }, [standings, fixtures, activeFilterStart, activeFilterEnd]);

    const groupMap = (computedStandings || []).reduce((acc, curr) => {
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

    const columns = allColumns;

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

StandingsTableV4.propTypes = {
    standings: PropTypes.array,
    fixtures: PropTypes.array,
    loading: PropTypes.bool
};

export default StandingsTableV4;
