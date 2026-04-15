import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import api from '../../../../../services/api';
import { Card, Table, Badge, Stack, Button, Grid } from '../../../../../design-system';

const MetricRow = ({ label, value, subValue, title }) => (
    <div title={title} className={title ? 'tooltip-hover' : ''} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid var(--color-border)', cursor: title ? 'help' : 'default' }}>
        <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)' }}>{label}</span>
        <Stack align="flex-end" gap="2px">
            <span style={{ fontWeight: 'bold' }}>{value || '—'}</span>
            {subValue && <span style={{ fontSize: '10px', opacity: 0.6 }}>{subValue}</span>}
        </Stack>
    </div>
);

MetricRow.propTypes = {
    label: PropTypes.string.isRequired,
    value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    subValue: PropTypes.string,
    title: PropTypes.string
};

const StatsTab = ({ clubId, year, competitionId }) => {
    const [stats, setStats] = useState(null);
    const [history, setHistory] = useState(null);
    const [view, setView] = useState('overview'); // 'overview' or 'history'
    const [loading, setLoading] = useState(true);
    const [coreOnly, setCoreOnly] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                if (view === 'overview') {
                    const data = await api.getV4ClubTacticalSummary(clubId, {
                        year,
                        competition: competitionId !== 'all' ? competitionId : undefined
                    });
                    setStats(data);
                } else {
                    const data = await api.getV4ClubTacticalSummary(clubId, {
                        history: true,
                        competition: competitionId !== 'all' ? competitionId : undefined
                    });
                    setHistory(data);
                }
            } catch (error) {
                console.error("Failed to fetch tactical data:", error);
            }
            setLoading(false);
        };
        fetchData();
    }, [clubId, year, competitionId, view]);

    if (loading) return (
        <Card style={{ padding: '80px', textAlign: 'center' }}>
            <Stack align="center" gap="var(--spacing-md)">
                <div className="ds-button-spinner"></div>
                <div style={{ color: 'var(--color-text-muted)' }}>Mining tactical performance patterns...</div>
            </Stack>
        </Card>
    );

    if (view === 'overview') {
        if (!stats || !stats.all) return (
            <Card style={{ padding: '80px', textAlign: 'center' }}>
                <span style={{ fontSize: '48px', opacity: 0.5 }}>📊</span>
                <h3 className="mt-md">Tactical data pending</h3>
                <p style={{ color: 'var(--color-text-muted)' }}>Detailed performance metrics aren't available for this selection yet.</p>
            </Card>
        );
        const s = stats.all;

        return (
            <Stack gap="var(--spacing-xl)">
                <Stack direction="row" gap="var(--spacing-sm)">
                    <Button variant="primary" size="sm">Overview</Button>
                    <Button variant="secondary" size="sm" onClick={() => setView('history')}>Season History</Button>
                </Stack>

                <Grid columns="1fr 1fr 1fr" gap="var(--spacing-lg)">
                    <Card title="Possession & Passing">
                        <Stack>
                            <MetricRow label="Ball Possession" value={`${s.possession}%`} title="Average percentage of time the team controls the ball per match." />
                            <MetricRow label="Pass Accuracy" value={`${s.pass_accuracy}%`} title="Percentage of successful passes." />
                            <MetricRow label="Corners / Match" value={s.corners_per_match} title="Average corners won per match." />
                            <MetricRow label="Touches in Box" value={s.touches_per_match} title="Average number of ball touches inside the opponent's penalty area per match." />
                        </Stack>
                    </Card>

                    <Card title="Shooting & Efficiency">
                        <Stack>
                            <MetricRow label="Expected Goals (xG)" value={s.expected_goals || '—'} title="Cumulative probability of shots resulting in a goal (Expected Goals)." />
                            <MetricRow label="Shots / Match" value={s.shots_per_match} subValue={`${s.shots_on_target_per_match} Target`} title="Total shots attempted per match, and how many hit the target." />
                            <MetricRow label="Goal Conv. Rate" value={`${s.shot_conversion}%`} title="Percentage of shots that result in a goal." />
                            <MetricRow label="Big Chances / M" value={s.big_chances_per_match} title="Average number of clear scoring opportunities per match." />
                            <MetricRow label="Goals Scored / M" value={s.goals_scored_per_match} title="Average number of goals scored per match in this selection." />
                        </Stack>
                    </Card>

                    <Card title="Defense & Discipline">
                        <Stack>
                            <MetricRow label="Clean Sheet %" value={`${s.clean_sheet_pct}%`} title="Percentage of matches where the team conceded zero goals." />
                            <MetricRow label="xG Against (xGA)" value={s.expected_goals_against || '—'} title="Cumulative Expected Goals conceded. Measures defensive frailty." />
                            <MetricRow label="Gls Conceded / M" value={s.goals_conceded_per_match} title="Average goals conceded per match." />
                            <MetricRow label="Saves / Match" value={s.saves_per_match} title="Average goalkeeper saves per match." />
                            <MetricRow label="Yellow / Match" value={s.yellow_cards_per_match} title="Average yellow cards received per match." />
                        </Stack>
                    </Card>
                </Grid>

                <Card title="Home / Away Split" subtitle="Performance variations by venue">
                    <Table
                        columns={[
                            { title: 'Metric', dataIndex: 'metric', key: 'metric' },
                            { title: 'Home', dataIndex: 'home', key: 'home', align: 'center', render: (v) => <Badge variant="primary">{v}</Badge> },
                            { title: 'Away', dataIndex: 'away', key: 'away', align: 'center', render: (v) => <Badge variant="neutral">{v}</Badge> }
                        ]}
                        data={[
                            { metric: 'Win Rate', home: `${stats.home?.win_rate || 0}%`, away: `${stats.away?.win_rate || 0}%` },
                            { metric: 'Gls Scored / M', home: stats.home?.goals_scored_per_match || 0, away: stats.away?.goals_scored_per_match || 0 },
                            { metric: 'Possession', home: `${stats.home?.possession || 0}%`, away: `${stats.away?.possession || 0}%` },
                        ]}
                    />
                </Card>
            </Stack>
        );
    }

    // HISTORY VIEW
    const years = history ? Object.keys(history).sort((a, b) => b - a) : [];
    const allMetrics = [
        { key: 'win_rate', label: 'Win Rate (%)', core: true },
        { key: 'points_per_match', label: 'Points / Match', core: true },
        { key: 'goals_scored_per_match', label: 'GF / Match', core: true },
        { key: 'goals_conceded_per_match', label: 'GA / Match', core: true },
        { key: 'clean_sheet_pct', label: 'Clean Sheets (%)', core: true },
        { key: 'possession', label: 'Possession (%)', core: false },
        { key: 'pass_accuracy', label: 'Pass Accuracy (%)', core: false },
        { key: 'shot_conversion', label: 'Shot Conv. (%)', core: false },
    ];

    const filteredMetrics = coreOnly ? allMetrics.filter(m => m.core) : allMetrics;

    return (
        <Stack gap="var(--spacing-xl)">
            <Stack direction="row" justify="space-between" align="center">
                <Stack direction="row" gap="var(--spacing-sm)">
                    <Button variant="secondary" size="sm" onClick={() => setView('overview')}>Overview</Button>
                    <Button variant="primary" size="sm">Season History</Button>
                </Stack>
                <Button size="xs" variant="ghost" onClick={() => setCoreOnly(!coreOnly)}>
                    {coreOnly ? 'Show Detailed Metrics' : 'Show Core Only'}
                </Button>
            </Stack>

            <Card title="Tactical Evolution" subtitle="Year-over-year performance trends">
                <Table
                    columns={[
                        { title: 'Metric', dataIndex: 'label', key: 'label' },
                        ...years.map(y => ({
                            title: y,
                            key: y,
                            align: 'center',
                            render: (_, m) => <span style={{ fontWeight: 'bold' }}>{history[y]?.[m.key] || '—'}</span>
                        }))
                    ]}
                    data={filteredMetrics}
                />
            </Card>
        </Stack>
    );
};

StatsTab.propTypes = {
    clubId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    year: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    competitionId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired
};

export default StatsTab;
