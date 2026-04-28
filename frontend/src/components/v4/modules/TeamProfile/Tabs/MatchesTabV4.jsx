import React, { useState, useEffect, useMemo, useCallback } from 'react';
import PropTypes from 'prop-types';
import { useNavigate } from 'react-router-dom';
import api from '../../../../../services/api';
import { Card, Badge, Stack, Button, Grid, Accordion } from '../../../../../design-system';

// --- Helpers ---
const getResult = (m, teamId) => {
    if (m.goals_home == null || m.goals_away == null) return null;
    const isHome = String(m.home_team_id) === String(teamId);
    const [hg, ag] = [Number(m.goals_home), Number(m.goals_away)];
    if (hg === ag) return 'D';
    if (isHome) return hg > ag ? 'W' : 'L';
    return ag > hg ? 'W' : 'L';
};

const RESULT_VARIANT = { W: 'success', L: 'danger', D: 'warning' };
const RESULT_LABEL   = { W: 'WIN',    L: 'LOSE',   D: 'DRAW'  };

// --- MatchRow ---
const MatchRow = ({ m, teamId, teamName, navigate }) => {
    const isHome = String(m.home_team_id) === String(teamId);
    const result = getResult(m, teamId);
    const [hg, ag] = [Number(m.goals_home), Number(m.goals_away)];

    const homeTeamName = isHome ? teamName : m.home_name;
    const awayTeamName = isHome ? m.away_name : teamName;

    const handleClick = useCallback(() => {
        if (m.fixture_id) navigate(`/match/${m.fixture_id}`);
    }, [navigate, m.fixture_id]);

    const handleKeyDown = useCallback((e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleClick(); }
    }, [handleClick]);

    return (
        <button
            className="ds-fixture-row ds-button-reset"
            onClick={handleClick}
            onKeyDown={handleKeyDown}
            aria-label={`Match ${homeTeamName} vs ${awayTeamName}`}
            style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
        >
            <Grid columns="80px 1fr 80px" gap="var(--spacing-md)" align="center">
                <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'bold', color: 'var(--color-text-main)' }}>
                        {new Date(m.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                    </div>
                    <div style={{ fontSize: '10px', color: 'var(--color-text-muted)' }}>
                        {new Date(m.date).getFullYear()}
                    </div>
                </div>

                <Stack gap="2px">
                    {m.league_name && (
                        <Stack direction="row" align="center" justify="center" gap="8px" style={{ marginBottom: '4px' }}>
                            <span style={{ fontSize: '9px', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                {m.league_name}
                            </span>
                        </Stack>
                    )}

                    <Grid columns="1fr 80px 1fr" gap="var(--spacing-sm)" align="center">
                        <Stack direction="row" gap="var(--spacing-sm)" align="center" justify="flex-end">
                            <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: isHome ? 'bold' : 'normal', color: isHome ? 'white' : 'var(--color-text-main)', textAlign: 'right' }}>
                                {homeTeamName}
                            </span>
                            {m.home_logo && <img src={m.home_logo} alt="" style={{ width: '24px', height: '24px', objectFit: 'contain' }} />}
                        </Stack>

                        <div style={{ textAlign: 'center' }}>
                            {m.goals_home != null ? (
                                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--font-size-lg)', fontWeight: '900', color: 'var(--color-text-main)' }}>
                                    <span>{hg}</span> <span style={{ color: 'var(--color-text-muted)' }}>-</span> <span>{ag}</span>
                                </div>
                            ) : (
                                <Badge variant="neutral" size="sm">TBD</Badge>
                            )}
                        </div>

                        <Stack direction="row" gap="var(--spacing-sm)" align="center" justify="flex-start">
                            {m.away_logo && <img src={m.away_logo} alt="" style={{ width: '24px', height: '24px', objectFit: 'contain' }} />}
                            <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: isHome ? 'normal' : 'bold', color: isHome ? 'var(--color-text-main)' : 'white' }}>
                                {awayTeamName}
                            </span>
                        </Stack>
                    </Grid>
                </Stack>

                <div style={{ display: 'flex', justifyContent: 'center' }}>
                    {result && (
                        <Badge
                            variant={RESULT_VARIANT[result]}
                            style={{ minWidth: '60px', padding: '2px 12px', textAlign: 'center', fontSize: '10px', fontWeight: 'bold', letterSpacing: '0.05em' }}
                        >
                            {RESULT_LABEL[result]}
                        </Badge>
                    )}
                </div>
            </Grid>
        </button>
    );
};

MatchRow.propTypes = {
    m: PropTypes.object.isRequired,
    teamId: PropTypes.string.isRequired,
    teamName: PropTypes.string.isRequired,
    navigate: PropTypes.func.isRequired,
};

// --- Main Component ---
const MatchesTabV4 = ({ teamId, season, competitionId, teamName }) => {
    const navigate = useNavigate();
    const [matches, setMatches] = useState([]);
    const [loading, setLoading] = useState(true);
    const [venueFilter, setVenueFilter] = useState('all');
    const [resultFilter, setResultFilter] = useState('all');
    const [selectedCompName, setSelectedCompName] = useState('all');

    useEffect(() => {
        if (!season) return;
        const fetchMatches = async () => {
            setLoading(true);
            try {
                // api interceptor unwraps { success, data } → direct data array
                const data = await api.getV4TeamMatches(teamId, {
                    season,
                    competitionId: competitionId || undefined,
                    limit: 100,
                });
                setMatches(Array.isArray(data) ? data : []);
            } catch (err) {
                setMatches([]);
            } finally {
                setLoading(false);
            }
        };
        fetchMatches();
    }, [teamId, season, competitionId]);

    const { finished, scheduled, competitionList } = useMemo(() => {
        let filtered = [...matches];

        if (venueFilter === 'home') {
            filtered = filtered.filter(m => String(m.home_team_id) === String(teamId));
        } else if (venueFilter === 'away') {
            filtered = filtered.filter(m => String(m.away_team_id) === String(teamId));
        }

        if (resultFilter !== 'all') {
            filtered = filtered.filter(m => {
                const r = getResult(m, teamId);
                if (!r) return true;
                if (resultFilter === 'win') return r === 'W';
                if (resultFilter === 'draw') return r === 'D';
                if (resultFilter === 'defeat') return r === 'L';
                return true;
            });
        }

        if (selectedCompName !== 'all') {
            filtered = filtered.filter(m => m.league_name === selectedCompName);
        }

        const sorted = filtered.sort((a, b) => new Date(b.date) - new Date(a.date));
        const now = new Date();
        const comps = [...new Set(matches.map(m => m.league_name))].filter(Boolean);

        return {
            finished: sorted.filter(m => m.goals_home != null),
            scheduled: sorted.filter(m => m.goals_home == null && new Date(m.date) > now).reverse(),
            competitionList: comps,
        };
    }, [matches, teamId, venueFilter, resultFilter, selectedCompName]);

    if (loading) return (
        <Card style={{ padding: '80px', textAlign: 'center' }}>
            <Stack align="center" gap="var(--spacing-md)">
                <div className="ds-button-spinner" />
                <div style={{ color: 'var(--color-text-muted)' }}>Loading fixtures...</div>
            </Stack>
        </Card>
    );

    const headerFilters = (
        <Stack direction="row" gap="8px" role="group" aria-label="Result Filters">
            {[['all', 'All'], ['win', 'Win'], ['draw', 'Draw'], ['defeat', 'Defeat']].map(([val, label]) => (
                <Button key={val} size="xs" variant={resultFilter === val ? 'primary' : 'ghost'} onClick={() => setResultFilter(val)}>
                    {label}
                </Button>
            ))}
        </Stack>
    );

    return (
        <Stack gap="var(--spacing-xl)">
            <Card>
                <Stack gap="var(--spacing-md)">
                    <Stack direction="row" gap="var(--spacing-sm)" role="group" aria-label="Venue Filters">
                        {[['all', 'All'], ['home', 'Home'], ['away', 'Away']].map(([val, label]) => (
                            <Button key={val} size="sm" variant={venueFilter === val ? 'primary' : 'secondary'} onClick={() => setVenueFilter(val)}>
                                {label}
                            </Button>
                        ))}
                    </Stack>
                    <Stack direction="row" gap="4px" style={{ overflowX: 'auto', paddingBottom: '4px' }} role="group" aria-label="Competition Filters">
                        <Button size="xs" variant={selectedCompName === 'all' ? 'primary' : 'ghost'} onClick={() => setSelectedCompName('all')}>All Competitions</Button>
                        {competitionList.map(c => (
                            <Button key={c} size="xs" variant={selectedCompName === c ? 'primary' : 'ghost'} onClick={() => setSelectedCompName(c)}>{c}</Button>
                        ))}
                    </Stack>
                </Stack>
            </Card>

            <Grid columns="1fr" gap="var(--spacing-lg)">
                {scheduled.length > 0 && (
                    <Accordion title="Upcoming Fixtures" defaultExpanded={true} maxHeight="750px">
                        <Stack gap="var(--spacing-xs)">
                            {scheduled.map(m => <MatchRow key={m.fixture_id} m={m} teamId={String(teamId)} teamName={teamName} navigate={navigate} />)}
                        </Stack>
                    </Accordion>
                )}

                <Accordion title="Match History" defaultExpanded={true} maxHeight="750px" headerRight={headerFilters}>
                    <Stack gap="var(--spacing-xs)">
                        {finished.map(m => <MatchRow key={m.fixture_id} m={m} teamId={String(teamId)} teamName={teamName} navigate={navigate} />)}
                        {finished.length === 0 && (
                            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                                No completed matches found with current filters.
                            </div>
                        )}
                    </Stack>
                </Accordion>
            </Grid>
        </Stack>
    );
};

MatchesTabV4.propTypes = {
    teamId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    season: PropTypes.string.isRequired,
    competitionId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    teamName: PropTypes.string.isRequired,
};

export default MatchesTabV4;
