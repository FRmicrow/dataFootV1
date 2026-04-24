import React, { useState, useMemo, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Card, Stack, Badge, FixtureRow, Switch } from '../../../../design-system';
import InlineFixtureDetailsV4 from '../match/InlineFixtureDetailsV4';
import './FixturesListV4.css';

const getRoundLabel = (round) => {
    if (!round) return round;
    let m = round.match(/^Journée\s*-\s*(\d+)$/i);
    if (m) return `J${m[1]}`;
    m = round.match(/^League Stage\s*-\s*(\d+)$/i);
    if (m) return `MD ${m[1]}`;
    m = round.match(/^Regular Season\s*-\s*(\d+)$/i);
    if (m) return `MD ${m[1]}`;
    m = round.match(/^Group Stage\s*-\s*(\d+)$/i);
    if (m) return `GS ${m[1]}`;
    if (/^Group Stage$/i.test(round)) return 'Groupes';
    m = round.match(/^Group\s+(.+)$/i);
    if (m) return `GP ${m[1]}`;
    m = round.match(/^(\d+)(?:st|nd|rd|th)\s+Qualifying Round$/i);
    if (m) return `Q${m[1]}`;
    if (/^Groupe\s+([A-Z])$/i.test(round)) return round;
    if (round === '1/8 de finale') return '1/8';
    if (round === '1/4 de finale') return '1/4';
    if (round === 'Demi-finale') return 'Demis';
    if (round === '3ème place') return '3e place';
    if (/play.?off/i.test(round)) return 'Play-off';
    m = round.match(/^Round of\s*(\d+)$/i);
    if (m) return `R${m[1]}`;
    if (/3rd.?place|third.?place/i.test(round) || round === '3ème place') return '3e place';
    if (/^Final$/i.test(round) || round === 'Finale') return 'Finale';
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
    if (/^League Stage/i.test(round)) return 'GROUP';
    if (/^Group Stage/i.test(round)) return 'GROUP';
    if (/^Group/i.test(round) || /^Groupe/i.test(round)) return 'GROUP';
    if (/round of|semi.?final|quarter.?final|final|3rd.?place|third.?place|final round|finale|1\/8|1\/4|demi|3ème|relégation|barrage/i.test(round)) return 'KNOCKOUT';
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

const parseSafeDate = (d) => {
    // If d is null/undefined, try alternate property names just in case
    const val = d;
    if (!val) return new Date(0); 
    if (val instanceof Date) return val;
    
    const n = Number(val);
    if (!isNaN(n) && n > 0) {
        // Handle unix seconds vs milliseconds
        return new Date(n < 10000000000 ? n * 1000 : n);
    }
    
    const dateStr = String(val).replace(' ', 'T');
    const date = new Date(dateStr);
    return isNaN(date.getTime()) ? new Date(0) : date;
};

const formatDate = (dateStr) =>
    parseSafeDate(dateStr).toLocaleDateString('fr-FR', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    });

const formatDateShort = (dateStr) =>
    parseSafeDate(dateStr).toLocaleDateString('fr-FR', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
    });

const FixturesListV4 = ({ fixturesData, selectedRound, setSelectedRound, compact = false, league, season }) => {
    const [expandedFixtureId, setExpandedFixtureId] = useState(null);
    const [isDetailedView, setIsDetailedView] = useState(false);
    const [expandedGroupId, setExpandedGroupId] = useState(null);
    const [collapsedStages, setCollapsedStages] = useState(new Set());
    const bodyRef = useRef(null);

    const { fixtures = [], rounds = [], phases: compPhases = [] } = fixturesData;
    
    // The main competition name is passed as `league`. We use it to set the default phase.
    const defaultCompPhase = useMemo(() => {
        if (compPhases.length === 0) return '';
        // If the main tournament is in the phases, prefer it
        if (compPhases.includes(league)) return league;
        // Otherwise just take the first one
        return compPhases[0];
    }, [compPhases, league]);

    const [selectedCompPhase, setSelectedCompPhase] = useState(defaultCompPhase);

    // Sync state when defaultCompPhase changes
    useEffect(() => {
        if (defaultCompPhase && selectedCompPhase !== defaultCompPhase && !compPhases.includes(selectedCompPhase)) {
            setSelectedCompPhase(defaultCompPhase);
        }
    }, [defaultCompPhase, compPhases, selectedCompPhase]);

    const expandedFixture = useMemo(() => {
        if (!expandedFixtureId) return null;
        return fixtures.find(f => f.fixture_id === expandedFixtureId) || null;
    }, [expandedFixtureId, fixtures]);

    const baseFixtures = useMemo(() => {
        if (!selectedCompPhase || selectedCompPhase === 'ALL') return fixtures;
        return fixtures.filter(f => f.competition_name === selectedCompPhase);
    }, [fixtures, selectedCompPhase]);

    const dynamicRounds = useMemo(() => {
        return [...new Set(baseFixtures.map(f => f.round))]
            .filter(r => r && r !== '3ème place')
            .sort((a, b) => {
            const sortOrder = [
                /^Groupe\s+/i,
                /1\/8/,
                /1\/4/,
                /Demi/,
                /3ème/,
                /Finale/
            ];
            const getOrderIdx = (r) => {
                for (let i = 0; i < sortOrder.length; i++) {
                    if (sortOrder[i].test(r)) return i;
                }
                return 999;
            };
            const idxA = getOrderIdx(a);
            const idxB = getOrderIdx(b);
            if (idxA !== idxB) return idxA - idxB;
            if (idxA === 0) return a.localeCompare(b);
            const numA = Number.parseInt(String(a).match(/\d+/)?.[0] || '0', 10);
            const numB = Number.parseInt(String(b).match(/\d+/)?.[0] || '0', 10);
            return numA - numB;
        });
    }, [baseFixtures]);

    // Reset round selection when competition phase changes
    useEffect(() => {
        if (dynamicRounds.length > 0) {
            // Only reset if the current round is invalid or empty
            if (!selectedRound || (!dynamicRounds.includes(selectedRound) && !selectedRound.startsWith('PHASE_'))) {
                const defaultPhase = getRoundPhase(dynamicRounds[0]);
                setSelectedRound(isDetailedView ? dynamicRounds[0] : `PHASE_${defaultPhase}`);
            }
        }
    }, [dynamicRounds, isDetailedView]);

    // Clear expanded states when switching round
    useEffect(() => {
        setExpandedGroupId(null);
        setCollapsedStages(new Set());
    }, [selectedRound]);

    // Scroll to top when selectedRound changes
    useEffect(() => {
        if (bodyRef.current) {
            bodyRef.current.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }, [selectedRound]);

    const filteredFixtures = useMemo(() => {
        if (!selectedRound || selectedRound === 'ALL') return baseFixtures;
        if (selectedRound.startsWith('PHASE_')) {
            const phaseKey = selectedRound.replace('PHASE_', '');
            return baseFixtures.filter(f => getRoundPhase(f.round) === phaseKey);
        }
        if (selectedRound === 'Finale') {
            return baseFixtures.filter(f => f.round === 'Finale' || f.round === '3ème place');
        }
        return baseFixtures.filter(f => f.round === selectedRound);
    }, [baseFixtures, selectedRound]);

    const handleFixtureToggle = (fixtureId) => {
        setExpandedFixtureId(expandedFixtureId !== fixtureId ? fixtureId : null);
    };

    const groupedFixtures = useMemo(() => {
        const groups = [];
        const processedIds = new Set();
        const sorted = [...filteredFixtures].sort((a, b) => 
            parseSafeDate(a.date || a.match_date) - parseSafeDate(b.date || b.match_date)
        );

        sorted.forEach(f => {
            if (processedIds.has(f.fixture_id)) return;

            const isTwoLegRound = ['KNOCKOUT', 'PLAYOFF'].includes(getRoundPhase(f.round));

            const companion = isTwoLegRound ? sorted.find(other =>
                other.fixture_id !== f.fixture_id &&
                other.home_team_id === f.away_team_id &&
                other.away_team_id === f.home_team_id &&
                !processedIds.has(other.fixture_id)
            ) : null;

            if (companion) {
                const isFinalLeg = parseSafeDate(f.date || f.match_date) > parseSafeDate(companion.date || companion.match_date);
                const firstLeg = isFinalLeg ? companion : f;
                const secondLeg = isFinalLeg ? f : companion;

                const score1 = (firstLeg.goals_home || 0) + (secondLeg.goals_away || 0);
                const score2 = (firstLeg.goals_away || 0) + (secondLeg.goals_home || 0);

                let winnerName = null;
                if (['FT', 'AET', 'PEN'].includes(secondLeg.status_short)) {
                    if (score1 > score2) winnerName = firstLeg.home_team;
                    else if (score2 > score1) winnerName = firstLeg.away_team;
                    else {
                        const penHome = secondLeg.score_penalty_home;
                        const penAway = secondLeg.score_penalty_away;
                        if (penHome != null && penAway != null && penHome !== penAway) {
                            winnerName = penHome > penAway ? secondLeg.home_team : secondLeg.away_team;
                        } else {
                            if (secondLeg.goals_away > firstLeg.goals_away) {
                                winnerName = firstLeg.home_team;
                            } else if (firstLeg.goals_away > secondLeg.goals_away) {
                                winnerName = firstLeg.away_team;
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

        const sortedGroups = groups.sort((a, b) => 
            parseSafeDate(a.fixtures[0].date || a.fixtures[0].match_date) - parseSafeDate(b.fixtures[0].date || b.fixtures[0].match_date)
        );

        if (selectedRound === 'PHASE_KNOCKOUT') {
            const stages = [
                { label: 'Huitièmes de finale', filter: /1\/8|round of 16/i },
                { label: 'Quarts de finale', filter: /1\/4|quarter.?final/i },
                { label: 'Demi-finales', filter: /demi|semi.?final/i },
                { label: 'Barrages / Relégation', filter: /relégation|barrage|play.?off/i },
                { label: 'Petite Finale', filter: /3ème|3rd.?place|third.?place|petite/i },
                { label: 'Finale', filter: /^finale$|^final$/i }
            ];
            const result = [];
            const processedGroupIndices = new Set();

            stages.forEach(s => {
                const stageGroups = sortedGroups.filter((g, idx) => {
                    if (processedGroupIndices.has(idx)) return false;
                    const matches = g.fixtures.some(f => s.filter.test(f.round));
                    if (matches) {
                        processedGroupIndices.add(idx);
                        return true;
                    }
                    return false;
                });

                if (stageGroups.length > 0) {
                    const isCollapsed = collapsedStages.has(s.label);
                    result.push({ 
                        type: 'SECTION_HEADER', 
                        label: s.label, 
                        key: `__header_${s.label}__`,
                        isCollapsible: true,
                        isCollapsed
                    });
                    if (!isCollapsed) {
                        result.push(...stageGroups);
                    }
                }
            });
            
            // Add any leftover knockout matches that didn't match specific filters
            const leftovers = sortedGroups.filter((g, idx) => !processedGroupIndices.has(idx) && getRoundPhase(g.fixtures[0].round) === 'KNOCKOUT');
            if (leftovers.length > 0) {
                result.push({ type: 'SECTION_HEADER', label: 'Autres Phases Finales', key: '__header_leftovers__' });
                result.push(...leftovers);
            }

            return result;
        }

        if (selectedRound === 'PHASE_GROUP') {
            const sections = [...new Set(filteredFixtures.map(f => `${f.competition_name} - ${f.round}`))].sort();
            const result = [];
            
            sections.forEach(sec => {
                const [compName, roundLabel] = sec.split(' - ');
                const grFixtures = filteredFixtures.filter(f => f.competition_name === compName && f.round === roundLabel);
                const teams = {};
                grFixtures.forEach(f => {
                    if (f.goals_home == null || f.goals_away == null) return;
                    const p = (id, name, logo, gf, ga) => {
                        if (!teams[id]) teams[id] = { id, name, logo, p:0, w:0, d:0, l:0, gf:0, ga:0, pts:0 };
                        const t = teams[id]; t.p++; t.gf += gf; t.ga += ga;
                        if (gf > ga) { t.w++; t.pts += 3; } else if (gf < ga) { t.l++; } else { t.d++; t.pts += 1; }
                    };
                    p(f.home_team_id, f.home_team, f.home_team_logo, f.goals_home, f.goals_away);
                    p(f.away_team_id, f.away_team, f.away_team_logo, f.goals_away, f.goals_home);
                });
                const standings = Object.values(teams).sort((a,b) => (b.pts - a.pts) || ((b.gf-b.ga)-(a.gf-a.ga)) || (b.gf-a.gf));
                
                result.push({ 
                    type: 'GROUP_STANDINGS', 
                    label: sec, 
                    standings, 
                    key: `__std_${sec}__` 
                });
                
                if (isDetailedView || expandedGroupId === sec) {
                    result.push(...sortedGroups.filter(g => 
                        g.fixtures.every(f => f.competition_name === compName && f.round === roundLabel)
                    ));
                }
            });
            return result;
        }

        if (selectedRound === 'Finale') {
            const thirdPlaceGroups = sortedGroups.filter(g => g.fixtures.some(f => f.round === '3ème place'));
            const finalGroups = sortedGroups.filter(g => g.fixtures.every(f => f.round !== '3ème place'));
            if (thirdPlaceGroups.length > 0 || finalGroups.length > 0) {
                const result = [];
                if (thirdPlaceGroups.length > 0) {
                    result.push({ type: 'SECTION_HEADER', label: 'Petite Finale', key: '__header_3rd__' });
                    result.push(...thirdPlaceGroups);
                }
                if (finalGroups.length > 0) {
                    result.push({ type: 'SECTION_HEADER', label: 'Finale', key: '__header_final__' });
                    result.push(...finalGroups);
                }
                return result;
            }
        }

        return sortedGroups;
    }, [filteredFixtures, isDetailedView, selectedRound, expandedGroupId, collapsedStages]);

    const phases = useMemo(() => {
        const result = [];
        let currentPhase = null;
        dynamicRounds.forEach(round => {
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
    }, [dynamicRounds]);

    const currentRound = useMemo(() => {
        const firstUnplayed = baseFixtures.find(f => f.status_short === 'NS' || f.status_short === 'TBD');
        return firstUnplayed ? firstUnplayed.round : (baseFixtures[baseFixtures.length - 1]?.round || '');
    }, [baseFixtures]);

    const selectorLabel = useMemo(() => {
        const phaseSet = new Set(dynamicRounds.map(r => getRoundPhase(r)));
        return (phaseSet.has('KNOCKOUT') || phaseSet.has('GROUP')) && !phaseSet.has('LEAGUE')
            ? 'Tour'
            : 'Journée';
    }, [dynamicRounds]);

    return (
        <Card
            padding="0"
            className="animate-fade-in"
            style={{ display: 'flex', flexDirection: 'column' }}
        >
            {compPhases.length > 1 && (
                <div style={{ padding: 'var(--spacing-xs) var(--spacing-md)', borderBottom: '1px solid var(--color-border-subtle)', display: 'flex', gap: 'var(--spacing-xs)', overflowX: 'auto', alignItems: 'center' }} className="scrollbar-custom">
                    <span className="ds-md-selector-label" style={{ marginRight: '8px' }}>PHASE</span>
                    {compPhases.map(cp => {
                        const isSelected = cp === selectedCompPhase;
                        return (
                            <button
                                key={cp}
                                type="button"
                                onClick={() => setSelectedCompPhase(cp)}
                                className={`ds-md-round-pill ${isSelected ? 'ds-md-round-pill--selected' : ''}`}
                            >
                                {cp}
                            </button>
                        );
                    })}
                </div>
            )}
            <div className="ds-fixtures-header" style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)' }}>
                <div className="ds-md-selector-row" style={{ flex: 1, minWidth: 0 }}>
                    <div className="ds-md-selector-scroll">
                    {!isDetailedView ? (
                        <div className="ds-md-compact-selector" style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
                            {phases.filter(p => p.key === 'GROUP' || p.key === 'KNOCKOUT').map(phaseGroup => {
                                const isPhaseSelected = selectedRound === `PHASE_${phaseGroup.key}`;
                                return (
                                    <button 
                                        key={phaseGroup.key}
                                        className={`ds-md-round-pill ${isPhaseSelected ? 'ds-md-round-pill--selected' : ''}`}
                                        onClick={() => setSelectedRound(`PHASE_${phaseGroup.key}`)}
                                        style={{ padding: '6px 20px' }}
                                    >
                                        {phaseGroup.label}
                                    </button>
                                );
                            })}
                        </div>
                    ) : (
                        phases.map(phaseGroup => {
                            const isPhaseSelected = selectedRound === `PHASE_${phaseGroup.key}` || 
                                                  (getRoundPhase(selectedRound) === phaseGroup.key);
                            return (
                                <div key={phaseGroup.key} className="ds-md-phase-wrapper">
                                    <button 
                                        className={`ds-md-phase-label-btn ${isPhaseSelected ? 'active' : ''}`}
                                        onClick={() => setSelectedRound(`PHASE_${phaseGroup.key}`)}
                                    >
                                        {phaseGroup.label}
                                    </button>
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
                            );
                        })
                    )}
                    </div>
                </div>
                <div className="ds-fixtures-view-toggle" style={{ flexShrink: 0 }}>
                    <Switch 
                        checked={isDetailedView}
                        onChange={setIsDetailedView}
                        labelLeft="Compactée"
                        labelRight="Détaillée"
                        size="sm"
                    />
                </div>
            </div>

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
                            if (group.type === 'GROUP_STANDINGS') {
                                return (
                                    <div 
                                        key={group.key} 
                                        className={`ds-md-group-section ${expandedGroupId === group.label ? 'expanded' : ''}`}
                                        onClick={() => !isDetailedView && setExpandedGroupId(expandedGroupId === group.label ? null : group.label)}
                                        style={{ cursor: !isDetailedView ? 'pointer' : 'default' }}
                                    >
                                        <div className="ds-fixture-section-header" style={{ border: 'none', background: 'none', padding: '0 0 var(--spacing-xs) 0' }}>
                                            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                {!isDetailedView && <span style={{ opacity: 0.5 }}>{expandedGroupId === group.label ? '▼' : '▶'}</span>}
                                                {group.label}
                                            </span>
                                        </div>
                                        <table className="ds-md-standings-mini">
                                            <thead>
                                                <tr>
                                                    <th>Club</th>
                                                    <th>MJ</th>
                                                    <th>V</th>
                                                    <th>N</th>
                                                    <th>D</th>
                                                    <th>Diff</th>
                                                    <th>Pts</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {group.standings.map(t => (
                                                    <tr key={t.id}>
                                                        <td className="col-club">
                                                            <div className="col-club-inner">
                                                                <img src={t.logo} className="ds-md-mini-logo" alt="" referrerPolicy="no-referrer" />
                                                                {t.name}
                                                            </div>
                                                        </td>
                                                        <td className="col-pts">{t.p}</td>
                                                        <td className="sov4-win">{t.w}</td>
                                                        <td>{t.d}</td>
                                                        <td className="sov4-lose">{t.l}</td>
                                                        <td className={(t.gf - t.ga) >= 0 ? 'sov4-pos' : 'sov4-neg'}>
                                                            {(t.gf - t.ga) > 0 ? `+${t.gf - t.ga}` : t.gf - t.ga}
                                                        </td>
                                                        <td className="col-pts-total">{t.pts}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                );
                            }

                            if (group.type === 'SECTION_HEADER') {
                            const toggle = () => {
                                if (group.isCollapsible) {
                                    const next = new Set(collapsedStages);
                                    if (next.has(group.label)) next.delete(group.label);
                                    else next.add(group.label);
                                    setCollapsedStages(next);
                                }
                            };
                            return (
                                <div 
                                    key={group.key} 
                                    className={`ds-fixture-section-header ${group.isCollapsible ? 'collapsible' : ''}`}
                                    onClick={toggle}
                                    style={{ cursor: group.isCollapsible ? 'pointer' : 'default' }}
                                >
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        {group.isCollapsible && <span style={{ opacity: 0.5 }}>{group.isCollapsed ? '▶' : '▼'}</span>}
                                        {group.label}
                                    </span>
                                </div>
                            );
                        }

                        const groupDate = formatDate(group.fixtures[0].date || group.fixtures[0].match_date);
                        const prevGroup = groupedFixtures.slice(0, idx).filter(g => g.type !== 'SECTION_HEADER' && g.type !== 'GROUP_STANDINGS').at(-1);
                        const nextGroup = groupedFixtures.slice(idx + 1).find(g => g.type !== 'SECTION_HEADER' && g.type !== 'GROUP_STANDINGS');
                        const prevDate = prevGroup ? formatDate(prevGroup.fixtures[0].date || prevGroup.fixtures[0].match_date) : null;
                        const nextDate = nextGroup ? formatDate(nextGroup.fixtures[0].date || nextGroup.fixtures[0].match_date) : null;
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
                                                    <span>{formatDateShort(f.date || f.match_date)}</span>
                                                </div>
                                            );
                                        } else if (isFirstGroupOfDay && fIdx === 0) {
                                            dateNode = formatDateShort(group.fixtures[0].date || group.fixtures[0].match_date);
                                        }

                                        return (
                                            <div key={f.fixture_id} className="ds-fixture-date-row">
                                                <div className="ds-fixture-date-col">{dateNode}</div>
                                                <FixtureRow
                                                    homeTeam={{ name: f.home_team, logo: f.home_team_logo }}
                                                    awayTeam={{ name: f.away_team, logo: f.away_team_logo }}
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
                                        <InlineFixtureDetailsV4
                                            fixtureId={expandedFixture.fixture_id}
                                            homeTeamId={expandedFixture.home_team_id}
                                            awayTeamId={expandedFixture.away_team_id}
                                            league={league}
                                            season={season}
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

FixturesListV4.propTypes = {
    fixturesData: PropTypes.shape({
        fixtures: PropTypes.array,
        rounds: PropTypes.array,
    }).isRequired,
    selectedRound: PropTypes.string,
    setSelectedRound: PropTypes.func.isRequired,
    compact: PropTypes.bool,
    league:  PropTypes.string,
    season:  PropTypes.string,
};

export default FixturesListV4;
