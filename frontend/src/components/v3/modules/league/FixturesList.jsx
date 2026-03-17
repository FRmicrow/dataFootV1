import React, { useState, useMemo } from 'react';
import PropTypes from 'prop-types';
import { Card, Stack, Badge, FixtureRow } from '../../../../design-system';
import InlineFixtureDetails from '../match/InlineFixtureDetails';
import './FixturesList.css';

const getRoundLabel = (round) => {
    if (!round) return round;
    let m = round.match(/^League Stage\s*-\s*(\d+)$/i);
    if (m) return `MD ${m[1]}`;
    m = round.match(/^Regular Season\s*-\s*(\d+)$/i);
    if (m) return `MD ${m[1]}`;
    m = round.match(/^Group\s+(.+)$/i);
    if (m) return `GP ${m[1]}`;
    m = round.match(/^(\d+)(?:st|nd|rd|th)\s+Qualifying Round$/i);
    if (m) return `Q${m[1]}`;
    if (/play.?off/i.test(round)) return 'Play-off';
    m = round.match(/^Round of\s*(\d+)$/i);
    if (m) return `R${m[1]}`;
    if (/^Final$/i.test(round)) return 'Final';
    if (/semi.?final/i.test(round)) return 'Semi';
    if (/quarter.?final/i.test(round)) return 'QF';
    return round.replace(/^Regular Season\s*-\s*/i, 'MD ').replace(/^League Stage\s*-\s*/i, 'MD ');
};

const getRoundPhase = (round) => {
    if (!round) return 'OTHER';
    if (/qualifying/i.test(round)) return 'QUAL';
    if (/play.?off/i.test(round)) return 'PLAYOFF';
    if (/^League Stage/i.test(round) || /^Regular Season/i.test(round) || /^Group/i.test(round)) return 'LEAGUE';
    if (/round of|semi.?final|quarter.?final|final/i.test(round)) return 'KNOCKOUT';
    return 'OTHER';
};

const PHASE_LABELS = {
    QUAL: 'Qualification',
    PLAYOFF: 'Play-offs',
    LEAGUE: 'Phase de Ligue',
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

const FixturesList = ({ fixturesData, selectedRound, setSelectedRound, compact = false }) => {
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

        const sorted = [...filteredFixtures].sort((a, b) => new Date(a.date) - new Date(b.date));

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
                if (secondLeg.status_short === 'FT') {
                    if (score1 > score2) winnerName = firstLeg.home_team_name;
                    else if (score2 > score1) winnerName = firstLeg.away_team_name;
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

        return groups.sort((a, b) => new Date(a.fixtures[0].date) - new Date(b.fixtures[0].date));
    }, [filteredFixtures]);

    const currentRound = useMemo(() => {
        const all = fixturesData.fixtures || [];
        const firstUnplayed = all.find(f => f.status_short === 'NS' || f.status_short === 'TBD');
        return firstUnplayed ? firstUnplayed.round : (all[all.length - 1]?.round || '');
    }, [fixturesData]);

    return (
        <Card
            padding="0"
            className="animate-fade-in"
            style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}
        >
            {/* Round selector — integrated inside the card */}
            <div className="ds-fixtures-header">
                <div className="ds-md-selector-row">
                    <div className="ds-md-selector-anchor">
                        <span className="ds-md-selector-label">Journée</span>
                        <Badge variant="neutral" size="xs">
                            {(!selectedRound || selectedRound === 'ALL')
                                ? 'Tout'
                                : (getRoundLabel(selectedRound) || selectedRound)}
                        </Badge>
                    </div>
                    <div className="ds-md-selector-scroll">
                    {(fixturesData.rounds || []).reduce((acc, round, idx, arr) => {
                        const isSelected = round === selectedRound;
                        const isCurrent = round === currentRound;
                        const phase = getRoundPhase(round);
                        const prevPhase = idx > 0 ? getRoundPhase(arr[idx - 1]) : phase;

                        if (idx === 0 && phase !== 'LEAGUE') {
                            acc.push(<span key="sep-first" className="ds-md-phase-sep">{PHASE_LABELS[phase]}</span>);
                        } else if (idx > 0 && phase !== prevPhase) {
                            acc.push(<span key={`sep-${idx}`} className="ds-md-phase-sep">{PHASE_LABELS[phase]}</span>);
                        }

                        acc.push(
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
                        return acc;
                    }, [])}
                    </div>
                </div>
            </div>

            {/* Fixture list — scrolls independently */}
            <div className="ds-fixtures-body scrollbar-custom">
                {groupedFixtures.length === 0 ? (
                    <Stack align="center" gap="var(--spacing-sm)" style={{ padding: 'var(--spacing-2xl)' }}>
                        <div className="ds-fixtures-empty-label">NO DATA RECORDED</div>
                        <p style={{ color: 'var(--color-text-dim)', textTransform: 'uppercase', fontWeight: 'bold' }}>
                            Schedule Empty
                        </p>
                    </Stack>
                ) : (
                    groupedFixtures.map((group, idx) => {
                        const groupDate = formatDate(group.fixtures[0].date);
                        const prevDate = idx > 0 ? formatDate(groupedFixtures[idx - 1].fixtures[0].date) : null;
                        const nextDate = idx < groupedFixtures.length - 1 ? formatDate(groupedFixtures[idx + 1].fixtures[0].date) : null;
                        const isFirstGroupOfDay = groupDate !== prevDate;
                        const isLastGroupOfDay = groupDate !== nextDate;

                        return (
                            <React.Fragment key={group.fixtures[0].fixture_id}>
                                <div className={group.type === 'TIE' ? 'ds-fixture-tie-group' : ''}>
                                    {group.fixtures.map((f, fIdx) => {
                                        const isExpanded = expandedFixtureId === f.fixture_id;
                                        const dateLabel = isFirstGroupOfDay && fIdx === 0
                                            ? formatDateShort(group.fixtures[0].date)
                                            : null;
                                        return (
                                            <React.Fragment key={f.fixture_id}>
                                                <div className="ds-fixture-date-row">
                                                    <span className="ds-fixture-date-col">{dateLabel}</span>
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
                                                        aggregate={group.type === 'TIE' && fIdx === 1 ? group.aggregate : null}
                                                        winner={group.type === 'TIE' && fIdx === 1 ? group.winner : null}
                                                        onClick={() => handleFixtureToggle(f.fixture_id)}
                                                        compact={compact}
                                                    />
                                                </div>
                                                {isExpanded && (
                                                    <div
                                                        className="ds-fixture-expansion-panel animate-fade-in"
                                                        onClick={e => e.stopPropagation()}
                                                        onKeyDown={e => {
                                                            if (e.key === 'Enter' || e.key === ' ') e.stopPropagation();
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
