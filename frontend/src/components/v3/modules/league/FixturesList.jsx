import React, { useState, useMemo } from 'react';
import PropTypes from 'prop-types';
import { Card, Stack, Badge, FixtureRow } from '../../../../design-system';
import InlineFixtureDetails from '../match/InlineFixtureDetails';

const FixturesList = ({
    fixturesData,
    selectedRound,
    setSelectedRound
}) => {
    const [expandedFixtureId, setExpandedFixtureId] = useState(null);

    const filteredFixtures = useMemo(() => {
        if (!selectedRound || selectedRound === 'ALL') return fixturesData.fixtures || [];
        return (fixturesData.fixtures || []).filter(f => f.round === selectedRound);
    }, [fixturesData.fixtures, selectedRound]);

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

    const currentRound = useMemo(() => {
        const all = fixturesData.fixtures || [];
        const firstUnplayed = all.find(f => f.status_short === 'NS' || f.status_short === 'TBD');
        return firstUnplayed ? firstUnplayed.round : (all[all.length - 1]?.round || '');
    }, [fixturesData]);

    return (
        <Stack gap="var(--spacing-lg)" className="animate-fade-in" style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            <div className="ds-md-selector-wrap">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-xs)' }}>
                    <span style={{ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', color: 'var(--color-primary-400)', letterSpacing: '0.1em' }}>
                        Operational Phase Selection
                    </span>
                    <Badge variant="neutral" size="xs">{selectedRound}</Badge>
                </div>
                <div
                    style={{
                        display: 'flex',
                        gap: '6px',
                        overflowX: 'auto',
                        padding: 'var(--spacing-2xs) 0',
                        scrollbarWidth: 'none',
                        maskImage: 'linear-gradient(to right, transparent, black 5%, black 95%, transparent 100%)',
                        WebkitMaskImage: 'linear-gradient(to right, transparent, black 10%, black 90%, transparent 100%)'
                    }}
                    className="hide-scrollbar"
                >
                    <button
                        onClick={() => setSelectedRound('ALL')}
                        type="button"
                        aria-pressed={selectedRound === 'ALL'}
                        style={{
                            flexShrink: 0,
                            padding: '6px 16px',
                            borderRadius: 'var(--radius-full)',
                            fontSize: '11px',
                            fontWeight: '800',
                            cursor: 'pointer',
                            background: selectedRound === 'ALL' ? 'var(--color-primary-600)' : 'var(--glass-bg)',
                            color: selectedRound === 'ALL' ? 'white' : 'var(--color-primary-400)',
                            border: `1px solid ${selectedRound === 'ALL' ? 'var(--color-primary-400)' : 'var(--color-primary-900)'}`,
                            transition: 'var(--transition-fast)',
                            whiteSpace: 'nowrap',
                            fontFamily: 'inherit',
                            outline: 'none'
                        }}
                    >
                        ALL ROUNDS
                    </button>
                    {(fixturesData.rounds || []).map(round => {
                        const isCurrent = round === currentRound;
                        const isSelected = round === selectedRound;
                        const shortLabel = round.replace('Regular Season - ', 'MD ').replace('Group ', 'GP ').replace('Round of ', 'R');

                        return (
                            <button
                                key={round}
                                onClick={() => setSelectedRound(round)}
                                type="button"
                                aria-pressed={isSelected}
                                style={{
                                    flexShrink: 0,
                                    padding: '6px 16px',
                                    borderRadius: 'var(--radius-full)',
                                    fontSize: '11px',
                                    fontWeight: '800',
                                    cursor: 'pointer',
                                    background: isSelected ? 'var(--color-primary-600)' : isCurrent ? 'var(--glass-bg)' : 'transparent',
                                    color: isSelected ? 'white' : isCurrent ? 'var(--color-primary-400)' : 'var(--color-text-dim)',
                                    border: `1px solid ${isSelected ? 'var(--color-primary-400)' : isCurrent ? 'var(--color-primary-900)' : 'transparent'}`,
                                    transition: 'var(--transition-fast)',
                                    whiteSpace: 'nowrap',
                                    fontFamily: 'inherit',
                                    outline: 'none'
                                }}
                                title={round}
                            >
                                {shortLabel}
                            </button>
                        );
                    })}
                </div>
            </div>

            <Card padding="0" style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
                {groupedFixtures.length === 0 ? (
                    <Stack align="center" gap="var(--spacing-sm)" style={{ padding: 'var(--spacing-2xl)' }}>
                        <div style={{ fontSize: '11px', fontWeight: 'black', color: 'var(--color-text-dim)', letterSpacing: '0.2em' }}>NO DATA RECORDED</div>
                        <p style={{ color: 'var(--color-text-dim)', textTransform: 'uppercase', fontWeight: 'bold' }}>Schedule Empty</p>
                    </Stack>
                ) : (
                    <Stack gap="0" style={{ flex: 1, overflowY: 'auto' }} className="scrollbar-custom">
                        {groupedFixtures.map((group) => (
                            <div key={group.fixtures[0].fixture_id} className={group.type === 'TIE' ? 'ds-fixture-tie-group' : ''}>
                                {group.fixtures.map((f, fIdx) => {
                                    const isExpanded = expandedFixtureId === f.fixture_id;
                                    return (
                                        <React.Fragment key={f.fixture_id}>
                                            <FixtureRow
                                                homeTeam={{ name: f.home_team_name, logo: f.home_team_logo }}
                                                awayTeam={{ name: f.away_team_name, logo: f.away_team_logo }}
                                                scoreHome={f.goals_home}
                                                scoreAway={f.goals_away}
                                                status={f.status_short}
                                                date={f.date}
                                                active={isExpanded}
                                                aggregate={group.type === 'TIE' && fIdx === 1 ? group.aggregate : null}
                                                winner={group.type === 'TIE' && fIdx === 1 ? group.winner : null}
                                                onClick={() => handleFixtureToggle(f.fixture_id)}
                                            />
                                            {isExpanded && (
                                                <div
                                                    className="ds-fixture-expansion-panel animate-fade-in"
                                                    onClick={e => e.stopPropagation()}
                                                    onKeyDown={e => {
                                                        if (e.key === 'Enter' || e.key === ' ') {
                                                            e.stopPropagation();
                                                        }
                                                    }}
                                                    tabIndex="0"
                                                    role="button"
                                                >
                                                    <InlineFixtureDetails
                                                        fixtureId={f.fixture_id}
                                                        homeTeamId={f.home_team_id}
                                                        awayTeamId={f.away_team_id}
                                                    />
                                                </div>
                                            )}
                                        </React.Fragment>
                                    );
                                })}
                            </div>
                        ))}
                    </Stack>
                )}
            </Card>
        </Stack>
    );
};

FixturesList.propTypes = {
    fixturesData: PropTypes.shape({
        fixtures: PropTypes.array,
        rounds: PropTypes.array
    }).isRequired,
    selectedRound: PropTypes.string,
    setSelectedRound: PropTypes.func.isRequired
};

export default FixturesList;
