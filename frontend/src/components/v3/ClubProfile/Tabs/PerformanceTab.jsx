import React from 'react';
import { Card, Table, Grid, Stack, Badge } from '../../../../design-system';

const PerformanceTab = ({ clubId, year, competitionId, summary, seasons }) => {

    const activeComps = competitionId === 'all'
        ? seasons
        : seasons.filter(s => s.league_id == competitionId);

    const columns = [
        {
            title: 'Competition',
            key: 'league',
            render: (_, comp) => (
                <Stack direction="row" align="center" gap="var(--spacing-md)">
                    <img src={comp.league_logo} alt="" style={{ width: '24px' }} />
                    <span style={{ fontWeight: 'bold' }}>{comp.league_name}</span>
                </Stack>
            )
        },
        {
            title: 'Rank / Round',
            key: 'rank',
            render: (_, comp) => (
                <Badge variant={comp.competition_type === 'League' ? 'primary' : 'warning'}>
                    {comp.competition_type === 'League' ? `#${comp.rank || '—'}` : (comp.round_reached || 'Group Stage')}
                </Badge>
            )
        },
        { title: 'P', dataIndex: 'played', key: 'p', align: 'center' },
        { title: 'W', dataIndex: 'win', key: 'w', align: 'center', render: (v) => <span style={{ color: 'var(--color-success-500)' }}>{v}</span> },
        { title: 'D', dataIndex: 'draw', key: 'd', align: 'center' },
        { title: 'L', dataIndex: 'lose', key: 'l', align: 'center', render: (v) => <span style={{ color: 'var(--color-danger-500)' }}>{v}</span> },
        {
            title: 'GD',
            key: 'gd',
            align: 'center',
            render: (_, comp) => {
                const diff = (comp.goals_for || 0) - (comp.goals_against || 0);
                return (
                    <span style={{ color: diff > 0 ? 'var(--color-success-500)' : diff < 0 ? 'var(--color-danger-500)' : 'inherit' }}>
                        {diff > 0 ? `+${diff}` : diff}
                    </span>
                );
            }
        },
        { title: 'Sqr', dataIndex: 'squad_size', key: 'sqr', align: 'center' }
    ];

    return (
        <Stack gap="var(--spacing-xl)">
            {/* Highlights */}
            <Grid columns="repeat(4, 1fr)" gap="var(--spacing-md)">
                <Card title="Win Rate" variant="compact">
                    <Stack align="center" gap="4px">
                        <div style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'bold', color: 'var(--color-accent-500)' }}>
                            {summary?.win_rate ? `${parseFloat(summary.win_rate).toFixed(1)}%` : '—'}
                        </div>
                        <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>SEASON {year}</div>
                    </Stack>
                </Card>
                <Card title="Games Played" variant="compact">
                    <Stack align="center" gap="4px">
                        <div style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'bold' }}>
                            {summary?.total_played || '—'}
                        </div>
                        <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>{competitionId === 'all' ? 'ALL COMPS' : 'SELECTED'}</div>
                    </Stack>
                </Card>
                <Card title="Goals Scored" variant="compact">
                    <Stack align="center" gap="4px">
                        <div style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'bold', color: 'var(--color-primary-400)' }}>
                            {summary?.goals_scored || '—'}
                        </div>
                        <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>AGGREGATED</div>
                    </Stack>
                </Card>
                <Card title="Goals Against" variant="compact">
                    <Stack align="center" gap="4px">
                        <div style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'bold', color: 'var(--color-danger-500)' }}>
                            {summary?.goals_conceded || '—'}
                        </div>
                        <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>TOTAL</div>
                    </Stack>
                </Card>
            </Grid>

            {/* Competition Table */}
            <Card title="Competition Campaigns" subtitle={`Season ${year} detail view`}>
                <Table columns={columns} data={activeComps} />
                {activeComps.length === 0 && (
                    <div style={{ padding: '40px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                        No campaign history found for this selection.
                    </div>
                )}
            </Card>
        </Stack>
    );
};

export default PerformanceTab;
