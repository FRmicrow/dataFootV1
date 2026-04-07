import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import { Card, Stack, Badge, Grid } from '../../../../design-system';

const MatchRow = ({ fixture, teamId, top6Ids, simResult, onSimulate }) => {
    const isHome = fixture.home_team_id === teamId;
    const opponentName = isHome ? fixture.away_team : fixture.home_team;
    const opponentId = isHome ? fixture.away_team_id : fixture.home_team_id;
    const isTop6Clash = top6Ids.has(opponentId);
    const score = fixture.goals_home !== null ? `${fixture.goals_home}-${fixture.goals_away}` : null;

    // Map global simulated result (H, D, A) to local (V, N, D)
    const localSim = useMemo(() => {
        if (!simResult) return null;
        if (simResult === 'D') return 'N';
        if (isHome) return simResult === 'H' ? 'V' : 'D';
        return simResult === 'A' ? 'V' : 'D';
    }, [simResult, isHome]);

    const handleSelect = (local) => {
        let global = null;
        if (local === 'N') global = 'D';
        else if (isHome) global = local === 'V' ? 'H' : 'A';
        else global = local === 'V' ? 'A' : 'H';
        onSimulate(fixture.fixture_id, global);
    };

    return (
        <div 
            style={{
                padding: '10px 12px',
                borderRadius: 'var(--radius-sm)',
                background: isTop6Clash ? 'rgba(var(--color-primary-rgb), 0.2)' : 'rgba(255,255,255,0.02)',
                border: isTop6Clash ? '1px solid var(--color-primary-500)' : '1px solid rgba(255,255,255,0.05)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '11px',
                transition: 'all 0.2s ease',
                cursor: 'default',
                boxShadow: isTop6Clash ? '0 0 15px rgba(var(--color-primary-rgb), 0.1)' : 'none',
                position: 'relative',
                overflow: 'hidden'
            }}
        >
            {isTop6Clash && (
                <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '3px',
                    height: '100%',
                    background: 'var(--color-primary-500)'
                }} />
            )}
            <Stack direction="row" gap="8px" align="center" style={{ flex: 1, minWidth: 0 }}>
                <span style={{ 
                    width: '14px',
                    opacity: 0.6, 
                    fontWeight: '900', 
                    fontSize: '9px',
                    color: isHome ? 'var(--color-success-500)' : 'var(--color-danger-500)',
                    flexShrink: 0
                }}>{isHome ? 'H' : 'A'}</span>
                
                <span style={{ 
                    fontWeight: isTop6Clash ? '900' : '500', 
                    opacity: isTop6Clash ? 1 : 0.85,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    flex: 1
                }}>
                    {opponentName}
                </span>
            </Stack>

            {score ? (
                <span style={{ 
                    fontWeight: 'bold', 
                    color: 'var(--color-primary-400)',
                    fontFamily: 'monospace',
                    fontSize: '12px',
                    marginLeft: '8px',
                    flexShrink: 0
                }}>
                    {score}
                </span>
            ) : (
                <Stack direction="row" gap="4px">
                    {['V', 'N', 'D'].map(btn => {
                        const isSelected = localSim === btn;
                        const colors = {
                            V: 'var(--color-success-500)',
                            N: 'var(--color-text-dim)',
                            D: 'var(--color-danger-500)'
                        };
                        return (
                            <button
                                key={btn}
                                onClick={() => handleSelect(isSelected ? null : btn)}
                                style={{
                                    width: '20px',
                                    height: '20px',
                                    borderRadius: '50%',
                                    border: isSelected ? `1px solid ${colors[btn]}` : '1px solid rgba(255,255,255,0.1)',
                                    background: isSelected ? `rgba(${btn === 'V' ? '34, 197, 94' : btn === 'D' ? '239, 68, 68' : '156, 163, 175'}, 0.2)` : 'transparent',
                                    color: isSelected ? colors[btn] : 'rgba(255,255,255,0.4)',
                                    fontSize: '8px',
                                    fontWeight: '900',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    transition: 'all 0.1s ease',
                                    outline: 'none'
                                }}
                            >
                                {btn}
                            </button>
                        );
                    })}
                </Stack>
            )}
        </div>
    );
};

const TeamSprintCard = ({ team, teamFixtures, top6Ids, simResults, onSimulate, totalPoints }) => {
    const simIncrease = useMemo(() => {
        let inc = 0;
        teamFixtures.forEach(f => {
            if (f.goals_home !== null) return;
            const res = simResults[f.fixture_id];
            if (!res) return;
            const isHome = f.home_team_id === team.team_id;
            if (res === 'D') inc += 1;
            else if ((isHome && res === 'H') || (!isHome && res === 'A')) inc += 3;
        });
        return inc;
    }, [teamFixtures, team.team_id, simResults]);

    return (
        <Card 
            padding="0"
            style={{ 
                background: 'var(--glass-bg)', 
                border: team.rank === 1 ? '1px solid var(--color-primary-900)' : '1px solid rgba(255,255,255,0.05)',
                display: 'flex', 
                flexDirection: 'column',
                height: '100%',
                transition: 'transform 0.3s ease'
            }}
        >
            <div style={{ 
                padding: 'var(--spacing-md)', 
                borderBottom: '1px solid rgba(255,255,255,0.08)',
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--spacing-sm)',
                background: team.rank === 1 ? 'rgba(var(--color-primary-rgb), 0.08)' : 'rgba(255,255,255,0.01)'
            }}>
                <Badge variant={team.rank === 1 ? 'primary' : 'neutral'} size="xs" style={{ fontWeight: '900' }}>{team.rank}</Badge>
                <img src={team.team_logo} alt="" style={{ width: '24px', height: '24px', objectFit: 'contain' }} />
                <Stack gap="0" style={{ minWidth: 0, flex: 1 }}>
                    <span style={{ 
                        fontWeight: '900', 
                        fontSize: '12px', 
                        textTransform: 'uppercase', 
                        letterSpacing: '0.08em',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                    }}>
                        {team.team_name}
                    </span>
                    <span style={{ fontSize: '10px', color: 'var(--color-primary-400)', fontWeight: 'bold' }}>
                        {team.points} <span style={{ opacity: 0.5 }}>pts</span>
                        {simIncrease > 0 && <span style={{ color: 'var(--color-success-400)' }}> +{simIncrease}</span>}
                        {simIncrease > 0 && <span style={{ color: '#fff', marginLeft: '4px' }}>= {totalPoints}</span>}
                    </span>
                </Stack>
            </div>
            
            <div style={{ padding: 'var(--spacing-sm)', display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
                {teamFixtures.map(f => (
                    <MatchRow 
                        key={f.fixture_id} 
                        fixture={f} 
                        teamId={team.team_id} 
                        top6Ids={top6Ids}
                        simResult={simResults[f.fixture_id]}
                        onSimulate={onSimulate}
                    />
                ))}
                {teamFixtures.length === 0 && (
                    <div style={{ padding: '40px 20px', textAlign: 'center', opacity: 0.3, fontSize: '11px', fontWeight: 'bold' }}>
                        NO REMAINING FIXTURES
                    </div>
                )}
            </div>
        </Card>
    );
};

const TitleRaceV4 = ({ standings, fixtures }) => {
    const [simResults, setSimResults] = React.useState({});

    const handleSimulate = (fixtureId, globalResult) => {
        setSimResults(prev => ({
            ...prev,
            [fixtureId]: globalResult
        }));
    };

    const top6 = useMemo(() => {
        const teams = [...standings].sort((a, b) => a.rank - b.rank).slice(0, 6);
        return teams.map(t => {
            // Calculate simulated points
            let simPts = 0;
            fixtures.forEach(f => {
                if (f.goals_home !== null) return;
                const res = simResults[f.fixture_id];
                if (!res) return;
                const isHome = f.home_team_id === t.team_id;
                const isAway = f.away_team_id === t.team_id;
                if (!isHome && !isAway) return;

                if (res === 'D') simPts += 1;
                else if ((isHome && res === 'H') || (isAway && res === 'A')) simPts += 3;
            });
            return { ...t, totalPoints: t.points + simPts };
        });
    }, [standings, fixtures, simResults]);

    const sortedTop6 = useMemo(() => {
        return [...top6].sort((a, b) => b.totalPoints - a.totalPoints || a.rank - b.rank);
    }, [top6]);

    const top6Ids = useMemo(() => new Set(top6.map(t => t.team_id)), [top6]);

    const runInFixtures = useMemo(() => {
        if (!fixtures || fixtures.length === 0) return {};

        const unplayed = fixtures.filter(f => f.status_short === 'NS' || f.status_short === 'TBD');
        
        let targetFixtures = [];
        if (unplayed.length > 0) {
            targetFixtures = unplayed;
        } else {
            const rounds = [...new Set(fixtures.map(f => f.round))].filter(Boolean);
            const sortedRounds = rounds.sort((a, b) => {
                const numA = parseInt(String(a).match(/\d+/)?.[0] || 0, 10);
                const numB = parseInt(String(b).match(/\d+/)?.[0] || 0, 10);
                return numA - numB;
            });
            const last10Rounds = sortedRounds.slice(-10);
            targetFixtures = fixtures.filter(f => last10Rounds.includes(f.round));
        }

        const map = {};
        top6.forEach(team => {
            map[team.team_id] = targetFixtures.filter(f => 
                f.home_team_id === team.team_id || f.away_team_id === team.team_id
            ).sort((a, b) => new Date(a.date) - new Date(b.date));
        });
        return map;
    }, [fixtures, top6]);

    const isHistorical = useMemo(() => {
        return fixtures.filter(f => f.status_short === 'NS' || f.status_short === 'TBD').length === 0;
    }, [fixtures]);

    if (!top6.length) return null;

    return (
        <div className="ds-title-race animate-fade-in" style={{ paddingBottom: 'var(--spacing-xl)' }}>
            <div style={{ marginBottom: 'var(--spacing-xl)', textAlign: 'center' }}>
                <h3 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'var(--font-weight-black)', textTransform: 'uppercase', letterSpacing: '0.15em', color: 'white' }}>
                    Title Race Simulator
                </h3>
                <p style={{ color: 'var(--color-primary-400)', fontSize: '11px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: '4px' }}>
                    {isHistorical ? 'Historical Sprint (Simulate Alternative Endings)' : 'Live Season Prediction Mode'}
                </p>
                <div style={{ marginTop: '12px' }}>
                    <button 
                        onClick={() => setSimResults({})}
                        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontSize: '9px', fontWeight: 'bold', padding: '4px 12px', borderRadius: 'var(--radius-full)', cursor: 'pointer' }}
                    >
                        RESET SIMULATION
                    </button>
                </div>
            </div>
            
            <Grid columns="repeat(3, 1fr)" gap="var(--spacing-md)">
                {sortedTop6.map(team => (
                    <TeamSprintCard 
                        key={team.team_id}
                        team={team}
                        teamFixtures={runInFixtures[team.team_id] || []}
                        top6Ids={top6Ids}
                        simResults={simResults}
                        onSimulate={handleSimulate}
                        totalPoints={team.totalPoints}
                    />
                ))}
            </Grid>
        </div>
    );
};

TitleRaceV4.propTypes = {
    standings: PropTypes.array.isRequired,
    fixtures: PropTypes.array.isRequired,
};

export default TitleRaceV4;
