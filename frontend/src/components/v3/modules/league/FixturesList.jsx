import React, { useState, useMemo, useRef } from 'react';
import PropTypes from 'prop-types';
import { Card, Stack, Badge, FixtureRow, Switch } from '../../../../design-system';
import InlineFixtureDetails from '../match/InlineFixtureDetails';
import './FixturesList.css';

const getRoundLabel = (round) => {
    if (!round) return round;
    let m = round.match(/^Journée\s*-\s*(\d+)$/i);
    if (m) return `J${m[1]}`;
    m = round.match(/^League Stage\s*-\s*(\d+)$/i);
    if (m) return `MD ${m[1]}`;
    m = round.match(/^Regular Season\s*-\s*(\d+)$/i);
    if (m) return `MD ${m[1]}`;
    // Group Stage - N (WC / Euro format API-Football)
    m = round.match(/^Group Stage\s*-\s*(\d+)$/i);
    if (m) return `GS ${m[1]}`;
    // Exact "Group Stage" (Transfermarkt format)
    if (/^Group Stage$/i.test(round)) return 'Groupes';
    m = round.match(/^Group\s+(.+)$/i);
    if (m) return `GP ${m[1]}`;
    m = round.match(/^(\d+)(?:st|nd|rd|th)\s+Qualifying Round$/i);
    if (m) return `Q${m[1]}`;
    if (/play.?off/i.test(round)) return 'Play-off';
    m = round.match(/^Round of\s*(\d+)$/i);
    if (m) return `R${m[1]}`;
    if (/3rd.?place|third.?place/i.test(round)) return '3e place';
    if (/^Final$/i.test(round)) return 'Final';
    if (/^Final Round$/i.test(round)) return 'Tour Final';
    if (/semi.?final/i.test(round)) return 'Semi';
    if (/quarter.?final/i.test(round)) return 'QF';
    return round.replace(/^Regular Season\s*-\s*/i, 'MD ').replace(/^League Stage\s*-\s*/i, 'MD ');
};

const getRoundPhase = (round) => {
    if (!round) return 'OTHER';
    if (/^Journée/i.test(round)) return 'LEAGUE';
    if (/qualifying/i.test(round)) return 'QUAL';
    if (/play.?off/i.test(round)) return 'PLAYOFF';
    if (/^Regular Season/i.test(round)) return 'LEAGUE';
    // League Stage (UCL/UEL 2024+ format) → phase de groupes
    if (/^League Stage/i.test(round)) return 'GROUP';
    // Group Stage (WC/Euro/UCL) → phase de groupes
    if (/^Group Stage/i.test(round)) return 'GROUP';
    // Group A/B/C... (UCL ancien format, World Cup) → phase de groupes
    if (/^Group\s+[A-Za-z]/i.test(round)) return 'GROUP';
    // Group 1/2/3... (formats numériques)
    if (/^Group/i.test(round)) return 'LEAGUE';
    if (/round of|semi.?final|quarter.?final|final|3rd.?place|third.?place|final round/i.test(round)) return 'KNOCKOUT';
    return 'OTHER';
};

const PHASE_LABELS = {
    QUAL: 'Qualification',
    PLAYOFF: 'Play-offs',
    LEAGUE: 'Phase de Ligue',
    GROUP: 'Phase de Groupes',
    KNOCKOUT: 'Élimination Directe',
    OTHER: 'Autres',
};

const formatDate = (dateStr) =>
    new Date(dateStr).toLocaleDateString('fr-FR', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    });

const formatDateShort = (dateStr) =>
    new Date(dateStr).toLocaleDateString('fr-FR', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
    });

// Infer matchday rounds from date proximity when all rounds are null (e.g. Transfermarkt data)
const inferMatchdays = (fixtures) => {
    if (!fixtures.length) return fixtures;
    const sorted = [...fixtures].sort((a, b) => new Date(a.date) - new Date(b.date));

    // Build clusters: consecutive fixtures within 4 days belong to the same matchday
    const clusters = [];
    let cluster = [sorted[0]];
    for (let i = 1; i < sorted.length; i++) {
        const diffDays = (new Date(sorted[i].date) - new Date(sorted[i - 1].date)) / 86400000;
        if (diffDays <= 4) {
            cluster.push(sorted[i]);
        } else {
            clusters.push(cluster);
            cluster = [sorted[i]];
        }
    }
    clusters.push(cluster);

    // Main clusters (≥3 fixtures) get a sequential journée number
    // Isolated matches (<3) are assigned to the nearest main cluster's journée
    const mainClusters = clusters.filter(c => c.length >= 3);
    const roundMap = new Map();

    clusters.forEach(c => {
        const cTime = new Date(c[0].date).getTime();
        let jIdx;
        if (c.length >= 3) {
            jIdx = mainClusters.indexOf(c) + 1;
        } else {
            const nearest = mainClusters.reduce((best, mc) =>
                Math.abs(cTime - new Date(mc[0].date).getTime()) <
                Math.abs(cTime - new Date(best[0].date).getTime()) ? mc : best,
                mainClusters[0] || c
            );
            jIdx = nearest ? mainClusters.indexOf(nearest) + 1 : clusters.indexOf(c) + 1;
        }
        c.forEach(f => roundMap.set(f.fixture_id, `Journée - ${jIdx}`));
    });

    return fixtures.map(f => ({ ...f, round: roundMap.get(f.fixture_id) || 'Journée - 1' }));
};

const FixturesList = ({ fixturesData, selectedRound, setSelectedRound, compact = false }) => {
    const [expandedFixtureId, setExpandedFixtureId] = useState(null);
    const [sortByDate, setSortByDate] = useState(false);
    const bodyRef = useRef(null);

    const expandedFixture = useMemo(() => {
        if (!expandedFixtureId) return null;
        const all = fixturesData.fixtures || [];
        return all.find(f => f.fixture_id === expandedFixtureId) || null;
    }, [expandedFixtureId, fixturesData.fixtures]);

    // Detect when all rounds are null (TM-sourced data) and infer matchdays from dates
    const allRoundsNull = useMemo(() => {
        const all = fixturesData.fixtures || [];
        return all.length > 0 && all.every(f => f.round == null);
    }, [fixturesData.fixtures]);

    const enrichedFixtures = useMemo(() => {
        if (!allRoundsNull) return fixturesData.fixtures || [];
        return inferMatchdays(fixturesData.fixtures);
    }, [allRoundsNull, fixturesData.fixtures]);

    const effectiveRounds = useMemo(() => {
        if (!allRoundsNull) return fixturesData.rounds || [];
        const seen = new Set();
        const rounds = [];
        [...enrichedFixtures]
            .sort((a, b) => new Date(a.date) - new Date(b.date))
            .forEach(f => { if (!seen.has(f.round)) { seen.add(f.round); rounds.push(f.round); } });
        return rounds;
    }, [allRoundsNull, enrichedFixtures, fixturesData.rounds]);

    const filteredFixtures = useMemo(() => {
        if (!selectedRound || selectedRound === 'ALL') return enrichedFixtures;
        // When Final is selected, also pull in the 3rd place match so it appears in the same view
        if (selectedRound === 'Final') {
            return enrichedFixtures.filter(f => f.round === 'Final' || f.round === '3rd Place Final');
        }
        return enrichedFixtures.filter(f => f.round === selectedRound);
    }, [enrichedFixtures, selectedRound]);

    const handleFixtureToggle = (fixtureId) => {
        setExpandedFixtureId(expandedFixtureId !== fixtureId ? fixtureId : null);
    };

    const groupedFixtures = useMemo(() => {
        const groups = [];
        const processedIds = new Set();

        const sorted = [...filteredFixtures].sort((a, b) => new Date(a.date) - new Date(b.date));

        if (sortByDate) {
            sorted.forEach(f => {
                groups.push({ type: 'SINGLE', fixtures: [f] });
            });
            return groups;
        }

        sorted.forEach(f => {
            if (processedIds.has(f.fixture_id)) return;

            // Only look for two-leg ties in knockout/playoff rounds — never in league phase
            const isTwoLegRound = ['KNOCKOUT', 'PLAYOFF'].includes(getRoundPhase(f.round));

            const companion = isTwoLegRound ? sorted.find(other =>
                other.fixture_id !== f.fixture_id &&
                other.home_team_id === f.away_team_id &&
                other.away_team_id === f.home_team_id &&
                !processedIds.has(other.fixture_id)
            ) : null;

            if (companion) {
                const isFinalLeg = new Date(f.date) > new Date(companion.date);
                const firstLeg = isFinalLeg ? companion : f;
                const secondLeg = isFinalLeg ? f : companion;

                const score1 = (firstLeg.goals_home || 0) + (secondLeg.goals_away || 0);
                const score2 = (firstLeg.goals_away || 0) + (secondLeg.goals_home || 0);

                let winnerName = null;
                if (['FT', 'AET', 'PEN'].includes(secondLeg.status_short)) {
                    if (score1 > score2) winnerName = firstLeg.home_team_name;
                    else if (score2 > score1) winnerName = firstLeg.away_team_name;
                    else {
                        // Equality on aggregate
                        const penHome = secondLeg.score_penalty_home;
                        const penAway = secondLeg.score_penalty_away;

                        if (penHome != null && penAway != null && penHome !== penAway) {
                            winnerName = penHome > penAway ? secondLeg.home_team_name : secondLeg.away_team_name;
                        } else {
                            // Fallback to Away Goals rule
                            // Team A = firstLeg.home_team (scored away in secondLeg)
                            // Team B = firstLeg.away_team (scored away in firstLeg)
                            if (secondLeg.goals_away > firstLeg.goals_away) {
                                winnerName = firstLeg.home_team_name;
                            } else if (firstLeg.goals_away > secondLeg.goals_away) {
                                winnerName = firstLeg.away_team_name;
                            }
                        }
                    }
                }

                groups.push({
                    type: 'TIE',
                    fixtures: [firstLeg, secondLeg],
                    aggregate: `${score1} - ${score2}`,
                    winner: winnerName,
                });
                processedIds.add(firstLeg.fixture_id);
                processedIds.add(secondLeg.fixture_id);
            } else {
                groups.push({ type: 'SINGLE', fixtures: [f] });
                processedIds.add(f.fixture_id);
            }
        });

        const sortedGroups = groups.sort((a, b) => new Date(a.fixtures[0].date) - new Date(b.fixtures[0].date));

        // When Final is selected and there's a 3rd place match, split with section headers
        if (selectedRound === 'Final') {
            const thirdPlaceGroups = sortedGroups.filter(g => g.fixtures.some(f => f.round === '3rd Place Final'));
            const finalGroups = sortedGroups.filter(g => g.fixtures.every(f => f.round !== '3rd Place Final'));
            if (thirdPlaceGroups.length > 0 && finalGroups.length > 0) {
                return [
                    { type: 'SECTION_HEADER', label: 'Petite Finale', key: '__header_3rd__' },
                    ...thirdPlaceGroups,
                    { type: 'SECTION_HEADER', label: 'Finale', key: '__header_final__' },
                    ...finalGroups,
                ];
            }
        }

        return sortedGroups;
    }, [filteredFixtures, sortByDate, selectedRound]);

    const phases = useMemo(() => {
        const result = [];
        let currentPhase = null;
        effectiveRounds.forEach(round => {
            const phaseKey = getRoundPhase(round);
            if (!currentPhase || currentPhase.key !== phaseKey) {
                currentPhase = {
                    key: phaseKey,
                    label: PHASE_LABELS[phaseKey] || phaseKey,
                    rounds: []
                };
                result.push(currentPhase);
            }
            currentPhase.rounds.push(round);
        });
        return result;
    }, [effectiveRounds]);

    const currentRound = useMemo(() => {
        const firstUnplayed = enrichedFixtures.find(f => f.status_short === 'NS' || f.status_short === 'TBD');
        return firstUnplayed ? firstUnplayed.round : (enrichedFixtures[enrichedFixtures.length - 1]?.round || '');
    }, [enrichedFixtures]);

    const selectorLabel = useMemo(() => {
        const phaseSet = new Set(effectiveRounds.map(r => getRoundPhase(r)));
        return (phaseSet.has('KNOCKOUT') || phaseSet.has('GROUP')) && !phaseSet.has('LEAGUE')
            ? 'Tour'
            : 'Journée';
    }, [effectiveRounds]);

    return (
        <Card
            padding="0"
            className="animate-fade-in"
            style={{ display: 'flex', flexDirection: 'column' }}
        >
            {/* Round selector — integrated inside the card */}
            <div className="ds-fixtures-header" style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)' }}>
                <div className="ds-md-selector-row" style={{ flex: 1, minWidth: 0 }}>
                    <div className="ds-md-selector-anchor">
                        <span className="ds-md-selector-label">{selectorLabel}</span>
                        <Badge variant="neutral" size="xs">
                            {(!selectedRound || selectedRound === 'ALL')
                                ? 'Tout'
                                : (getRoundLabel(selectedRound) || selectedRound)}
                        </Badge>
                    </div>
                    <div className="ds-md-selector-scroll">
                    {phases.map(phaseGroup => (
                        <div key={phaseGroup.key} className="ds-md-phase-wrapper">
                            <span className="ds-md-phase-label">{phaseGroup.label}</span>
                            <div className="ds-md-phase-pills">
                                {phaseGroup.rounds.map(round => {
                                    const isSelected = round === selectedRound;
                                    const isCurrent = round === currentRound;
                                    return (
                                        <button
                                            key={round}
                                            onClick={() => setSelectedRound(round)}
                                            type="button"
                                            aria-pressed={isSelected}
                                            className={`ds-md-round-pill ${isSelected ? 'ds-md-round-pill--selected' : isCurrent ? 'ds-md-round-pill--current' : ''}`}
                                            title={round}
                                        >
                                            {getRoundLabel(round)}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                    </div>
                </div>
                <div className="ds-fixtures-view-toggle" style={{ flexShrink: 0 }}>
                    <Switch 
                        checked={sortByDate}
                        onChange={setSortByDate}
                        labelLeft="Rencontres"
                        labelRight="Dates"
                        size="sm"
                    />
                </div>
            </div>

            {/* Fixture list — scrolls independently */}
            <div className="ds-fixtures-body scrollbar-custom" ref={bodyRef}>
                {groupedFixtures.length === 0 ? (
                    <Stack align="center" gap="var(--spacing-sm)" style={{ padding: 'var(--spacing-2xl)' }}>
                        <div className="ds-fixtures-empty-label">NO DATA RECORDED</div>
                        <p style={{ color: 'var(--color-text-dim)', textTransform: 'uppercase', fontWeight: 'bold' }}>
                            Schedule Empty
                        </p>
                    </Stack>
                ) : (
                    groupedFixtures.map((group, idx) => {
                        if (group.type === 'SECTION_HEADER') {
                            return (
                                <div key={group.key} className="ds-fixture-section-header">
                                    <span>{group.label}</span>
                                </div>
                            );
                        }

                        const groupDate = formatDate(group.fixtures[0].date);
                        const prevGroup = groupedFixtures.slice(0, idx).filter(g => g.type !== 'SECTION_HEADER').at(-1);
                        const nextGroup = groupedFixtures.slice(idx + 1).find(g => g.type !== 'SECTION_HEADER');
                        const prevDate = prevGroup ? formatDate(prevGroup.fixtures[0].date) : null;
                        const nextDate = nextGroup ? formatDate(nextGroup.fixtures[0].date) : null;
                        const isFirstGroupOfDay = groupDate !== prevDate;
                        const isLastGroupOfDay = groupDate !== nextDate;
                        const groupIsExpanded = group.fixtures.some(f => f.fixture_id === expandedFixtureId);

                        const groupKey = String(group.fixtures[0].fixture_id);

                        return (
                            <React.Fragment key={groupKey}>
                                <div
                                    className={group.type === 'TIE' ? 'ds-fixture-tie-group' : ''}
                                    data-group-key={groupKey}
                                >
                                    {group.fixtures.map((f, fIdx) => {
                                        const isExpanded = expandedFixtureId === f.fixture_id;

                                        let dateNode = null;
                                        if (group.type === 'TIE') {
                                            dateNode = (
                                                <div className="ds-tie-date">
                                                    <span className="ds-tie-leg-name">{fIdx === 0 ? 'Aller' : 'Retour'}</span>
                                                    <span>{formatDateShort(f.date)}</span>
                                                </div>
                                            );
                                        } else if (isFirstGroupOfDay && fIdx === 0) {
                                            dateNode = formatDateShort(group.fixtures[0].date);
                                        }

                                        return (
                                            <div key={f.fixture_id} className="ds-fixture-date-row">
                                                <div className="ds-fixture-date-col">{dateNode}</div>
                                                <FixtureRow
                                                    homeTeam={{ name: f.home_team_name, logo: f.home_team_logo }}
                                                    awayTeam={{ name: f.away_team_name, logo: f.away_team_logo }}
                                                    scoreHome={f.goals_home}
                                                    scoreAway={f.goals_away}
                                                    xgHome={f.xg_home}
                                                    xgAway={f.xg_away}
                                                    status={f.status_short}
                                                    date={f.date}
                                                    active={isExpanded}
                                                    onClick={() => handleFixtureToggle(f.fixture_id)}
                                                    compact={compact}
                                                />
                                            </div>
                                        );
                                    })}
                                    {group.type === 'TIE' && (
                                        <div className="ds-fixture-tie-footer">
                                            <span className="ds-tie-agg">SCORE CUMULÉ : {group.aggregate}</span>
                                            {group.winner && <span className="ds-tie-winner">QUALIFIÉ : {group.winner} 🏆</span>}
                                        </div>
                                    )}
                                </div>
                                {groupIsExpanded && expandedFixture && (
                                    <div
                                        className="ds-fixture-expansion-panel animate-slide-down"
                                        onClick={e => e.stopPropagation()}
                                        onKeyDown={e => {
                                            if (e.key === 'Escape') setExpandedFixtureId(null);
                                        }}
                                        tabIndex="-1"
                                    >
                                        <InlineFixtureDetails
                                            fixtureId={expandedFixture.fixture_id}
                                            homeTeamId={expandedFixture.home_team_id}
                                            awayTeamId={expandedFixture.away_team_id}
                                        />
                                    </div>
                                )}
                                {isLastGroupOfDay && <div className="ds-fixture-day-sep" />}
                            </React.Fragment>
                        );
                    })
                )}
            </div>
        </Card>
    );
};

FixturesList.propTypes = {
    fixturesData: PropTypes.shape({
        fixtures: PropTypes.array,
        rounds: PropTypes.array,
    }).isRequired,
    selectedRound: PropTypes.string,
    setSelectedRound: PropTypes.func.isRequired,
    compact: PropTypes.bool,
};

export default FixturesList;
