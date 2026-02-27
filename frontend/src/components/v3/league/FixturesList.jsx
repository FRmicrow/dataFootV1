import React, { useState, useMemo } from 'react';
import InlineFixtureDetails from '../InlineFixtureDetails';
import { Card, Stack, Badge, Grid, Button } from '../../../design-system';

const FixturesList = ({
    fixturesData,
    selectedRound,
    setSelectedRound
}) => {
    const [expandedFixtureId, setExpandedFixtureId] = useState(null);

    const filteredFixtures = (fixturesData.fixtures || []).filter(f => f.round === selectedRound);

    const handleFixtureToggle = (fixtureId) => {
        setExpandedFixtureId(expandedFixtureId === fixtureId ? null : fixtureId);
    };

    const groupedFixtures = useMemo(() => {
        const groups = [];
        const processedIds = new Set();

        filteredFixtures.forEach(f => {
            if (processedIds.has(f.fixture_id)) return;

            const companion = filteredFixtures.find(other =>
                other.fixture_id !== f.fixture_id &&
                ((other.home_team_id === f.away_team_id && other.away_team_id === f.home_team_id)) &&
                !processedIds.has(other.fixture_id)
            );

            if (companion) {
                const isFinalLeg = new Date(f.date) > new Date(companion.date);
                const firstLeg = isFinalLeg ? companion : f;
                const secondLeg = isFinalLeg ? f : companion;

                const score1 = (firstLeg.goals_home || 0) + (secondLeg.goals_away || 0);
                const score2 = (firstLeg.goals_away || 0) + (secondLeg.goals_home || 0);

                let winnerName = null;
                if (secondLeg.status_short === 'FT') {
                    if (score1 > score2) winnerName = firstLeg.home_team_name;
                    else if (score2 > score1) winnerName = firstLeg.away_team_name;
                }

                groups.push({
                    type: 'TIE',
                    fixtures: [firstLeg, secondLeg],
                    aggregate: `${score1} - ${score2}`,
                    winner: winnerName
                });

                processedIds.add(firstLeg.fixture_id);
                processedIds.add(secondLeg.fixture_id);
            } else {
                groups.push({ type: 'SINGLE', fixtures: [f] });
                processedIds.add(f.fixture_id);
            }
        });

        return groups.sort((a, b) => new Date(a.fixtures[0].date) - new Date(b.fixtures[0].date));
    }, [filteredFixtures]);

    const FixtureRow = ({ f, isTiePart = false, isLastLeg = false, aggregate = null, winner = null }) => (
        <div
            onClick={() => handleFixtureToggle(f.fixture_id)}
            style={{
                padding: 'var(--spacing-xs)',
                cursor: 'pointer',
                background: expandedFixtureId === f.fixture_id ? 'rgba(99, 102, 241, 0.1)' : 'transparent',
                borderBottom: '1px solid var(--color-border)',
                transition: 'var(--transition-fast)',
                position: 'relative'
            }}
            className="fixture-row-hover"
        >
            <Grid columns="1fr 120px 1fr" gap="var(--spacing-sm)" align="center">
                {/* Home */}
                <Stack direction="row" gap="var(--spacing-xs)" align="center" justify="flex-end">
                    <span style={{ fontWeight: 'bold', fontSize: 'var(--font-size-sm)', textAlign: 'right' }}>{f.home_team_name}</span>
                    <img src={f.home_team_logo} alt="" style={{ width: '28px', height: '28px', objectFit: 'contain' }} />
                </Stack>

                {/* Score */}
                <Stack align="center" gap="4px">
                    {f.status_short === 'NS' ? (
                        <span style={{ fontSize: 'var(--font-size-xs)', fontWeight: '900', color: 'var(--color-text-dim)' }}>
                            {new Date(f.date).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                        </span>
                    ) : (
                        <div style={{ display: 'flex', gap: '8px', fontSize: 'var(--font-size-lg)', fontWeight: '900', fontFamily: 'monospace' }}>
                            <span>{f.goals_home ?? '-'}</span>
                            <span style={{ opacity: 0.3 }}>:</span>
                            <span>{f.goals_away ?? '-'}</span>
                        </div>
                    )}
                    <Badge variant={f.status_short === 'FT' ? 'neutral' : f.status_short === 'LIVE' ? 'danger' : 'primary'} size="sm">
                        {f.status_short}
                    </Badge>
                </Stack>

                {/* Away */}
                <Stack direction="row" gap="var(--spacing-xs)" align="center">
                    <img src={f.away_team_logo} alt="" style={{ width: '28px', height: '28px', objectFit: 'contain' }} />
                    <span style={{ fontWeight: 'bold', fontSize: 'var(--font-size-sm)' }}>{f.away_team_name}</span>
                </Stack>
            </Grid>

            {isLastLeg && aggregate && (
                <div style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', textAlign: 'right' }}>
                    <div style={{ fontSize: '9px', textTransform: 'uppercase', color: 'var(--color-primary-400)' }}>AGG: {aggregate}</div>
                    {winner && <div style={{ fontSize: '9px', fontWeight: 'bold' }}>🏆 {winner}</div>}
                </div>
            )}

            {expandedFixtureId === f.fixture_id && (
                <div style={{ marginTop: 'var(--spacing-xs)', animation: 'fadeIn 0.3s' }} onClick={e => e.stopPropagation()}>
                    <InlineFixtureDetails
                        fixtureId={f.fixture_id}
                        homeTeamId={f.home_team_id}
                        awayTeamId={f.away_team_id}
                    />
                </div>
            )}
        </div>
    );

    const currentRound = useMemo(() => {
        const all = fixturesData.fixtures || [];
        const firstUnplayed = all.find(f => f.status_short === 'NS' || f.status_short === 'TBD');
        return firstUnplayed ? firstUnplayed.round : (all[all.length - 1]?.round || '');
    }, [fixturesData]);

    return (
        <Stack gap="var(--spacing-lg)" className="animate-fade-in">
            <Card title="Calendar Overview" subtitle="Matchday progression">
                <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '12px' }}>
                    {(fixturesData.rounds || []).map(round => {
                        const isCurrent = round === currentRound;
                        const isSelected = round === selectedRound;
                        return (
                            <Button
                                key={round}
                                size="xs"
                                variant={isSelected ? 'primary' : isCurrent ? 'secondary' : 'ghost'}
                                onClick={() => setSelectedRound(round)}
                            >
                                {round.replace('Regular Season - ', 'MD ')}
                            </Button>
                        );
                    })}
                </div>
            </Card>

            <Card>
                {groupedFixtures.length === 0 ? (
                    <Stack align="center" gap="var(--spacing-sm)" style={{ padding: 'var(--spacing-12)' }}>
                        <span style={{ fontSize: '48px', opacity: 0.2 }}>📅</span>
                        <p style={{ color: 'var(--color-text-dim)', textTransform: 'uppercase', fontWeight: 'bold' }}>No fixtures scheduled</p>
                    </Stack>
                ) : (
                    <Stack gap="0">
                        {groupedFixtures.map((group, idx) => (
                            <div key={idx} style={group.type === 'TIE' ? { background: 'rgba(0,0,0,0.1)', borderRadius: 'var(--radius-md)', padding: '8px', marginBottom: '8px' } : {}}>
                                {group.fixtures.map((f, fIdx) => (
                                    <FixtureRow
                                        key={f.fixture_id}
                                        f={f}
                                        isTiePart={group.type === 'TIE'}
                                        isLastLeg={group.type === 'TIE' && fIdx === 1}
                                        aggregate={group.aggregate}
                                        winner={group.winner}
                                    />
                                ))}
                            </div>
                        ))}
                    </Stack>
                )}
            </Card>
        </Stack>
    );
};

export default FixturesList;
