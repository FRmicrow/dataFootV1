import React, { useState, useEffect, useMemo, useCallback } from 'react';
import PropTypes from 'prop-types';
import { useNavigate } from 'react-router-dom';
import api from '../../../../../services/api';
import { Card, Badge, Stack, Button, Grid, Accordion } from '../../../../../design-system';

const getMatchResult = (m, teamId, isHome) => {
    if (m.status === 'NS') return null;
    const [hg, ag] = (m.score || `${m.home_goals}-${m.away_goals}`).split('-').map(Number);
    if (hg === ag) return 'D';
    if (isHome) return hg > ag ? 'W' : 'L';
    return ag > hg ? 'W' : 'L';
};

const getResultVariant = (res) => {
    switch (res) {
        case 'W': return 'success';
        case 'L': return 'danger';
        case 'D': return 'warning';
        default: return 'primary';
    }
};

const MatchRow = ({ m, teamId, teamName, navigate }) => {
    const isHome = String(m.home_id || m.home?.id) === String(teamId);
    const result = getMatchResult(m, teamId, isHome);
    const [hg, ag] = (m.score || `${m.home_goals}-${m.away_goals}`).split('-').map(Number);

    const compName = m.league_name || m.competition?.name;
    const homeTeamName = isHome ? teamName : (m.home_name || m.home?.name);
    const awayTeamName = isHome ? (m.away_name || m.away?.name) : teamName;

    const handleNavigate = useCallback(() => {
        navigate(`/match/${m.match_id || m.fixture_id}`);
    }, [navigate, m.match_id, m.fixture_id]);

    const handleKeyDown = useCallback((e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleNavigate();
        }
    }, [handleNavigate]);

    return (
        <button
            className="ds-fixture-row ds-button-reset"
            onClick={handleNavigate}
            onKeyDown={handleKeyDown}
            aria-label={`Match ${homeTeamName} vs ${awayTeamName}`}
            style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
        >
            <Grid columns="80px 1fr 40px" gap="var(--spacing-md)" align="center">
                <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'bold', color: 'var(--color-text-main)' }}>
                        {new Date(m.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                    </div>
                    <div style={{ fontSize: '10px', color: 'var(--color-text-muted)' }}>
                        {new Date(m.date).getFullYear()}
                    </div>
                </div>

                <Stack gap="2px">
                    {compName && (
                        <Stack direction="row" align="center" justify="center" gap="8px" style={{ marginBottom: '4px' }}>
                            <img src={m.league_logo || m.competition?.logo} alt={`${compName} logo`} style={{ width: '12px' }} />
                            <span style={{ fontSize: '9px', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{compName}</span>
                        </Stack>
                    )}

                    <Grid columns="1fr 80px 1fr" gap="var(--spacing-sm)" align="center">
                        <Stack direction="row" gap="var(--spacing-sm)" align="center" justify="flex-end">
                            <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: isHome ? 'bold' : 'normal', color: isHome ? 'white' : 'var(--color-text-main)', textAlign: 'right' }}>
                                {homeTeamName}
                            </span>
                            <img src={m.home_logo || m.home?.logo} alt={`${homeTeamName} logo`} style={{ width: '24px', height: '24px', objectFit: 'contain' }} />
                        </Stack>

                        <div style={{ textAlign: 'center' }}>
                            {m.status === 'NS' ? (
                                <Badge variant="neutral" size="sm">{new Date(m.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Badge>
                            ) : (
                                <div style={{ fontFamily: 'Inter, monospace', fontSize: 'var(--font-size-lg)', fontWeight: '900', color: 'var(--color-text-main)' }}>
                                    <span>{hg}</span> <span style={{ color: 'var(--color-text-muted)' }}>-</span> <span>{ag}</span>
                                </div>
                            )}
                        </div>

                        <Stack direction="row" gap="var(--spacing-sm)" align="center" justify="flex-start">
                            <img src={m.away_logo || m.away?.logo} alt={`${awayTeamName} logo`} style={{ width: '24px', height: '24px', objectFit: 'contain' }} />
                            <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: isHome ? 'normal' : 'bold', color: isHome ? 'var(--color-text-main)' : 'white', textAlign: 'left' }}>
                                {awayTeamName}
                            </span>
                        </Stack>
                    </Grid>
                </Stack>

                <div style={{ display: 'flex', justifyContent: 'center' }}>
                    {result && (
                        <Badge
                            variant={getResultVariant(result)}
                            style={{
                                minWidth: '60px',
                                padding: '2px 12px',
                                textAlign: 'center',
                                fontSize: '10px',
                                fontWeight: 'bold',
                                letterSpacing: '0.05em'
                            }}
                        >
                            {(() => {
                                if (result === 'W') return 'WIN';
                                if (result === 'L') return 'LOSE';
                                return 'DRAW';
                            })()}
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
    navigate: PropTypes.func.isRequired
};

const MatchesTab = ({ teamId, year, competitionId, teamName }) => {
    const navigate = useNavigate();
    const [matches, setMatches] = useState([]);
    const [loading, setLoading] = useState(true);
    const [venueFilter, setVenueFilter] = useState('all');
    const [resultFilter, setResultFilter] = useState('all');
    const [selectedCompName, setSelectedCompName] = useState('all');

    useEffect(() => {
        const fetchMatches = async () => {
            setLoading(true);
            try {
                const data = await api.getTeamMatches(teamId, {
                    year,
                    competition: competitionId === 'all' ? undefined : competitionId,
                    venue_type: venueFilter === 'all' ? undefined : venueFilter,
                    limit: 100
                });
                setMatches(data);
            } catch (error) {
                console.error("Failed to fetch matches:", error);
            }
            setLoading(false);
        };

        if (year) {
            fetchMatches();
        }
    }, [teamId, year, competitionId, venueFilter]);

    const { finished, scheduled, competitionList } = useMemo(() => {
        const finishedStatuses = new Set(['FT', 'AET', 'PEN']);
        const comps = Array.from(new Set(matches.map(m => m.league_name || m.competition?.name))).filter(Boolean);

        let filtered = [...matches];

        if (venueFilter === 'home') {
            filtered = filtered.filter(m => String(m.home_id || m.home?.id) === String(teamId));
        } else if (venueFilter === 'away') {
            filtered = filtered.filter(m => String(m.away_id || m.away?.id) === String(teamId));
        }

        if (resultFilter !== 'all') {
            filtered = filtered.filter(m => {
                if (!finishedStatuses.has(m.status)) return true;
                const isHome = String(m.home_id || m.home?.id) === String(teamId);
                const hg = Number.parseInt(m.home_goals, 10);
                const ag = Number.parseInt(m.away_goals, 10);
                const [shg, sag] = (m.score || "").split('-').map(Number);
                const final_hg = Number.isNaN(hg) ? shg : hg;
                const final_ag = Number.isNaN(ag) ? sag : ag;

                if (resultFilter === 'draw') return final_hg === final_ag;
                if (resultFilter === 'win') return isHome ? (final_hg > final_ag) : (final_ag > final_hg);
                if (resultFilter === 'defeat') return isHome ? (final_ag > final_hg) : (final_hg > final_ag);
                return true;
            });
        }

        if (selectedCompName !== 'all') {
            filtered = filtered.filter(m => (m.league_name || m.competition?.name) === selectedCompName);
        }

        const sorted = filtered.sort((a, b) => new Date(b.date) - new Date(a.date));
        const now = new Date();

        return {
            finished: sorted.filter(m => finishedStatuses.has(m.status)),
            scheduled: sorted.filter(m => !finishedStatuses.has(m.status) && new Date(m.date) > now).reverse(),
            competitionList: comps
        };
    }, [matches, teamId, resultFilter, selectedCompName, venueFilter]);

    if (loading) return (
        <Card style={{ padding: '80px', textAlign: 'center' }}>
            <Stack align="center" gap="var(--spacing-md)">
                <div className="ds-button-spinner"></div>
                <div style={{ color: 'var(--color-text-muted)' }}>Synchronizing fixtures...</div>
            </Stack>
        </Card>
    );

    const headerFilters = (
        <Stack direction="row" gap="8px" role="group" aria-label="Result Filters">
            <Button size="xs" variant={resultFilter === 'all' ? 'primary' : 'ghost'} onClick={() => setResultFilter('all')}>All</Button>
            <Button size="xs" variant={resultFilter === 'win' ? 'primary' : 'ghost'} onClick={() => setResultFilter('win')}>Win</Button>
            <Button size="xs" variant={resultFilter === 'draw' ? 'primary' : 'ghost'} onClick={() => setResultFilter('draw')}>Draw</Button>
            <Button size="xs" variant={resultFilter === 'defeat' ? 'primary' : 'ghost'} onClick={() => setResultFilter('defeat')}>Defeat</Button>
        </Stack>
    );

    return (
        <Stack gap="var(--spacing-xl)">
            <Card>
                <Stack gap="var(--spacing-md)">
                    <Stack direction="row" justify="space-between" align="center">
                        <Stack direction="row" gap="var(--spacing-sm)" role="group" aria-label="Venue Filters">
                            {['all', 'home', 'away'].map(v => (
                                <Button key={v} size="sm" variant={venueFilter === v ? 'primary' : 'secondary'} onClick={() => setVenueFilter(v)}>
                                    {v.charAt(0).toUpperCase() + v.slice(1)}
                                </Button>
                            ))}
                        </Stack>
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
                            {scheduled.map(m => <MatchRow key={m.fixture_id || m.match_id} m={m} teamId={teamId} teamName={teamName} navigate={navigate} />)}
                        </Stack>
                    </Accordion>
                )}

                <Accordion title="Match History" defaultExpanded={true} maxHeight="750px" headerRight={headerFilters}>
                    <Stack gap="var(--spacing-xs)">
                        {finished.map(m => <MatchRow key={m.fixture_id || m.match_id} m={m} teamId={teamId} teamName={teamName} navigate={navigate} />)}
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

MatchesTab.propTypes = {
    teamId: PropTypes.string.isRequired,
    year: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    competitionId: PropTypes.string.isRequired,
    teamName: PropTypes.string.isRequired
};

export default MatchesTab;
