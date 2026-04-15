import React from 'react';
import PropTypes from 'prop-types';
import { Card, Table, Grid, Stack, Badge } from '../../../../../design-system';

// --- PerformanceTabV4 ---
// summary: { total_played, total_wins, goals_scored, goals_conceded, avg_total_xg }
// seasons: V4 seasons for current selection (competition campaigns)
const PerformanceTabV4 = ({ summary, season, seasons, competitionId }) => {
    const activeComps = competitionId === 'all'
        ? (seasons || [])
        : (seasons || []).filter(s => String(s.competition_id) === String(competitionId));

    const winRate = (summary?.total_played > 0)
        ? ((summary.total_wins / summary.total_played) * 100).toFixed(1)
        : 0;

    const columns = [
        {
            title: 'Competition',
            key: 'competition',
            render: (_, comp) => (
                <Stack direction="row" align="center" gap="var(--spacing-md)">
                    {comp.competition_logo && <img src={comp.competition_logo} alt="" style={{ width: '24px' }} />}
                    <span style={{ fontWeight: 'bold' }}>{comp.competition_name}</span>
                </Stack>
            )
        },
        {
            title: 'Type',
            key: 'type',
            render: (_, comp) => (
                <Badge variant={comp.competition_type === 'domestic_league' ? 'primary' : 'warning'}>
                    {comp.competition_type === 'domestic_league' ? 'League' : (comp.competition_type || 'Cup')}
                </Badge>
            )
        },
    ];

    return (
        <Stack gap="var(--spacing-xl)">
            {/* Highlights */}
            <Grid columns="repeat(4, 1fr)" gap="var(--spacing-md)">
                <Card title="Win Rate" variant="compact">
                    <Stack align="center" gap="4px">
                        <div style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'bold', color: 'var(--color-accent-500)' }}>
                            {summary?.total_played > 0 ? `${winRate}%` : '—'}
                        </div>
                        <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>SEASON {season}</div>
                    </Stack>
                </Card>
                <Card title="Games Played" variant="compact">
                    <Stack align="center" gap="4px">
                        <div style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'bold' }}>
                            {summary?.total_played ?? '—'}
                        </div>
                        <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
                            {competitionId === 'all' ? 'ALL COMPS' : 'SELECTED'}
                        </div>
                    </Stack>
                </Card>
                <Card title="Goals Scored" variant="compact">
                    <Stack align="center" gap="4px">
                        <div style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'bold', color: 'var(--color-primary-400)' }}>
                            {summary?.goals_scored ?? '—'}
                        </div>
                        <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>AGGREGATED</div>
                    </Stack>
                </Card>
                <Card title="Goals Against" variant="compact">
                    <Stack align="center" gap="4px">
                        <div style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'bold', color: 'var(--color-danger-500)' }}>
                            {summary?.goals_conceded ?? '—'}
                        </div>
                        <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>TOTAL</div>
                    </Stack>
                </Card>
            </Grid>

            {/* Competition Campaigns Table */}
            <Card title="Competition Campaigns" subtitle={`Season ${season} detail view`}>
                <Table columns={columns} data={activeComps} />
                {activeComps.length === 0 && (
                    <div style={{ padding: '40px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                        No campaign history found for this selection.
                    </div>
                )}
            </Card>

            {/* Offensive / Defensive breakdown */}
            {summary?.total_played > 0 && (
                <Grid columns={2} gap="var(--spacing-md)">
                    <Card title="Offensive Analysis">
                        <Stack gap="var(--spacing-md)">
                            <div className="ds-stat-row">
                                <span>Goals Scored</span>
                                <strong>{summary.goals_scored}</strong>
                            </div>
                            <div className="ds-stat-row">
                                <span>Goals Scored / Match</span>
                                <strong>{(summary.goals_scored / summary.total_played).toFixed(2)}</strong>
                            </div>
                            {summary.avg_total_xg != null && (
                                <div className="ds-stat-row">
                                    <span>Avg Total xG</span>
                                    <strong>{Number(summary.avg_total_xg).toFixed(2)}</strong>
                                </div>
                            )}
                        </Stack>
                    </Card>
                    <Card title="Defensive Analysis">
                        <Stack gap="var(--spacing-md)">
                            <div className="ds-stat-row">
                                <span>Goals Conceded</span>
                                <strong>{summary.goals_conceded}</strong>
                            </div>
                            <div className="ds-stat-row">
                                <span>Goals Conceded / Match</span>
                                <strong>{(summary.goals_conceded / summary.total_played).toFixed(2)}</strong>
                            </div>
                            <div className="ds-stat-row">
                                <span>Goal Difference</span>
                                <strong style={{ color: (summary.goals_scored - summary.goals_conceded) >= 0 ? 'var(--color-success-500)' : 'var(--color-danger-500)' }}>
                                    {summary.goals_scored - summary.goals_conceded > 0 ? '+' : ''}{summary.goals_scored - summary.goals_conceded}
                                </strong>
                            </div>
                        </Stack>
                    </Card>
                </Grid>
            )}
        </Stack>
    );
};

PerformanceTabV4.propTypes = {
    summary: PropTypes.shape({
        total_played: PropTypes.number,
        total_wins: PropTypes.number,
        goals_scored: PropTypes.number,
        goals_conceded: PropTypes.number,
        avg_total_xg: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    }),
    season: PropTypes.string,
    seasons: PropTypes.arrayOf(PropTypes.shape({
        competition_id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
        competition_name: PropTypes.string,
        competition_logo: PropTypes.string,
        competition_type: PropTypes.string,
    })),
    competitionId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
};

export default PerformanceTabV4;
