import React, { useState, useEffect, useMemo } from 'react';
import api from '../../../../services/api';
import { useNavigate } from 'react-router-dom';
import { Card, Table, Badge, Stack, Button, Grid } from '../../../../design-system';

const MatchesTab = ({ clubId, year, competitionId }) => {
    const navigate = useNavigate();
    const [matches, setMatches] = useState([]);
    const [loading, setLoading] = useState(true);
    const [venueFilter, setVenueFilter] = useState('all');
    const [winsOnly, setWinsOnly] = useState(false);
    const [defeatOnly, setDefeatOnly] = useState(false);
    const [selectedCompName, setSelectedCompName] = useState('all');

    useEffect(() => {
        const fetchMatches = async () => {
            setLoading(true);
            try {
                const data = await api.getClubMatches(clubId, {
                    year,
                    competition: competitionId !== 'all' ? competitionId : undefined,
                    venue_type: venueFilter !== 'all' ? venueFilter : undefined
                });
                setMatches(data);
            } catch (error) {
                console.error("Failed to fetch matches:", error);
            }
            setLoading(false);
        };

        if (year) fetchMatches();
    }, [clubId, year, competitionId, venueFilter]);

    const { finished, scheduled, competitionList } = useMemo(() => {
        const finishedStatuses = ['FT', 'AET', 'PEN'];
        const comps = Array.from(new Set(matches.map(m => m.league_name || m.competition?.name))).filter(Boolean);

        let filtered = [...matches];
        if (winsOnly) {
            filtered = filtered.filter(m => {
                const isHome = String(m.home_id || m.home?.id) === String(clubId);
                const [hg, ag] = (m.score || `${m.home_goals}-${m.away_goals}`).split('-').map(Number);
                return isHome ? (hg > ag) : (ag > hg);
            });
        }
        if (defeatOnly) {
            filtered = filtered.filter(m => {
                const isHome = String(m.home_id || m.home?.id) === String(clubId);
                const [hg, ag] = (m.score || `${m.home_goals}-${m.away_goals}`).split('-').map(Number);
                return isHome ? (ag > hg) : (hg > ag);
            });
        }
        if (selectedCompName !== 'all') {
            filtered = filtered.filter(m => (m.league_name || m.competition?.name) === selectedCompName);
        }

        const sorted = filtered.sort((a, b) => new Date(b.date) - new Date(a.date));

        return {
            finished: sorted.filter(m => finishedStatuses.includes(m.status)),
            scheduled: sorted.filter(m => !finishedStatuses.includes(m.status)).reverse().slice(0, 5),
            competitionList: comps
        };
    }, [matches, clubId, winsOnly, defeatOnly, selectedCompName]);

    if (loading) return (
        <Card style={{ padding: '80px', textAlign: 'center' }}>
            <Stack align="center" gap="var(--spacing-md)">
                <div className="ds-button-spinner"></div>
                <div style={{ color: 'var(--color-text-muted)' }}>Synchronizing fixtures...</div>
            </Stack>
        </Card>
    );

    const MatchRow = ({ m }) => {
        const isHome = String(m.home_id || m.home?.id) === String(clubId);
        const [hg, ag] = (m.score || `${m.home_goals}-${m.away_goals}`).split('-').map(Number);
        const result = hg === ag ? 'D' : (isHome ? (hg > ag ? 'W' : 'L') : (ag > hg ? 'W' : 'L'));

        return (
            <div className={`ds-match-row ${result.toLowerCase()}`} onClick={() => navigate(`/match/${m.match_id || m.fixture_id}`)}>
                <Stack direction="row" align="center" gap="var(--spacing-xl)">
                    <div style={{ width: '60px', textAlign: 'center' }}>
                        <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'bold' }}>{new Date(m.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</div>
                        <div style={{ fontSize: '10px', color: 'var(--color-text-muted)' }}>{new Date(m.date).getFullYear()}</div>
                    </div>

                    <div style={{ flex: 1 }}>
                        <Stack gap="4px">
                            <Stack direction="row" align="center" gap="8px">
                                <img src={m.league_logo || m.competition?.logo} alt="" style={{ width: '14px' }} />
                                <span style={{ fontSize: '10px', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>{m.league_name || m.competition?.name}</span>
                            </Stack>
                            <Stack direction="row" align="center" justify="space-between">
                                <Stack direction="row" align="center" gap="var(--spacing-md)" style={{ flex: 1, justifyContent: 'flex-end' }}>
                                    <span style={{ fontWeight: isHome ? 'bold' : 'normal', color: isHome ? 'white' : 'var(--color-text-muted)' }}>{isHome ? 'This Club' : (m.home_name || m.home?.name)}</span>
                                    <img src={m.home_logo || m.home?.logo} alt="" style={{ width: '24px' }} />
                                </Stack>

                                <div className="ds-match-score">
                                    {m.status === 'NS' ? (
                                        <Badge variant="neutral">{new Date(m.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Badge>
                                    ) : (
                                        <Stack direction="row" gap="4px" align="center">
                                            <span className="s">{hg}</span>
                                            <span className="v">-</span>
                                            <span className="s">{ag}</span>
                                        </Stack>
                                    )}
                                </div>

                                <Stack direction="row" align="center" gap="var(--spacing-md)" style={{ flex: 1 }}>
                                    <img src={m.away_logo || m.away?.logo} alt="" style={{ width: '24px' }} />
                                    <span style={{ fontWeight: !isHome ? 'bold' : 'normal', color: !isHome ? 'white' : 'var(--color-text-muted)' }}>{!isHome ? 'This Club' : (m.away_name || m.away?.name)}</span>
                                </Stack>
                            </Stack>
                        </Stack>
                    </div>

                    <div style={{ width: '32px' }}>
                        {m.status !== 'NS' && (
                            <Badge variant={result === 'W' ? 'success' : result === 'L' ? 'danger' : 'warning'} size="sm">{result}</Badge>
                        )}
                    </div>
                </Stack>
            </div>
        );
    };

    return (
        <Stack gap="var(--spacing-xl)">
            {/* Toolbar */}
            <Card>
                <Stack gap="var(--spacing-md)">
                    <Stack direction="row" justify="space-between" align="center">
                        <Stack direction="row" gap="var(--spacing-sm)">
                            {['all', 'home', 'away'].map(v => (
                                <Button key={v} size="sm" variant={venueFilter === v ? 'primary' : 'secondary'} onClick={() => setVenueFilter(v)}>
                                    {v.charAt(0).toUpperCase() + v.slice(1)}
                                </Button>
                            ))}
                        </Stack>
                        <Stack direction="row" gap="8px">
                            <Badge
                                variant={winsOnly ? 'success' : 'neutral'}
                                onClick={() => { setWinsOnly(!winsOnly); setDefeatOnly(false); }}
                                style={{ cursor: 'pointer' }}
                            >
                                Wins Only
                            </Badge>
                            <Badge
                                variant={defeatOnly ? 'danger' : 'neutral'}
                                onClick={() => { setDefeatOnly(!defeatOnly); setWinsOnly(false); }}
                                style={{ cursor: 'pointer' }}
                            >
                                Defeats Only
                            </Badge>
                        </Stack>
                    </Stack>

                    <Stack direction="row" gap="4px" style={{ overflowX: 'auto', paddingBottom: '4px' }}>
                        <Button size="xs" variant={selectedCompName === 'all' ? 'primary' : 'ghost'} onClick={() => setSelectedCompName('all')}>All Competitions</Button>
                        {competitionList.map(c => (
                            <Button key={c} size="xs" variant={selectedCompName === c ? 'primary' : 'ghost'} onClick={() => setSelectedCompName(c)}>{c}</Button>
                        ))}
                    </Stack>
                </Stack>
            </Card>

            <Grid columns="1fr" gap="var(--spacing-lg)">
                {scheduled.length > 0 && (
                    <Card title="Upcoming Fixtures">
                        <Stack gap="var(--spacing-xs)">
                            {scheduled.map(m => <MatchRow key={m.fixture_id || m.match_id} m={m} />)}
                        </Stack>
                    </Card>
                )}

                <Card title="Match History" subtitle="Full results for the selected period">
                    <Stack gap="var(--spacing-xs)">
                        {finished.map(m => <MatchRow key={m.fixture_id || m.match_id} m={m} />)}
                        {finished.length === 0 && (
                            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                                No completed matches found with current filters.
                            </div>
                        )}
                    </Stack>
                </Card>
            </Grid>
        </Stack>
    );
};

export default MatchesTab;
