import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../../../services/api.js';
import { Badge, Button, Card, Input, Select, Stack } from '../../../../design-system';
import { PageContent, PageHeader, PageLayout } from '../../layouts';
import './LineupCorruptionPage.css';

const ACTION_OPTIONS = [
    { value: 'drop_corrupted_payload', label: 'Drop Corrupted Payload' },
    { value: 'queue_for_reimport', label: 'Flag For Reimport' },
    { value: 'repair_with_api', label: 'Repair With API' },
    { value: 'manual_review', label: 'Manual Review' },
    { value: 'ignore_for_now', label: 'Ignore For Now' }
];

const ACTION_LABELS = ACTION_OPTIONS.reduce((acc, option) => {
    acc[option.value] = option.label;
    return acc;
}, {});

const makeDecisionKey = (item) => `${item.league_id}:${item.season_year}:${item.data_source}`;

const formatNumber = (value) => new Intl.NumberFormat('en-US').format(value ?? 0);

const buildDropSql = (items) => {
    if (items.length === 0) return '-- No drop actions selected.';

    return items.map((item) => `
-- ${item.league_name} (${item.country_name}) ${item.season_year} [${item.data_source}]
DELETE FROM v3_fixture_lineups fl
USING v3_fixtures f
WHERE fl.fixture_id = f.fixture_id
  AND f.league_id = ${item.league_id}
  AND f.season_year = ${item.season_year}
  AND fl.team_id NOT IN (f.home_team_id, f.away_team_id);

DELETE FROM v3_fixture_lineup_players lp
USING v3_fixtures f
WHERE lp.fixture_id = f.fixture_id
  AND f.league_id = ${item.league_id}
  AND f.season_year = ${item.season_year}
  AND lp.team_id NOT IN (f.home_team_id, f.away_team_id);

DELETE FROM v3_fixture_player_stats ps
USING v3_fixtures f
WHERE ps.fixture_id = f.fixture_id
  AND f.league_id = ${item.league_id}
  AND f.season_year = ${item.season_year}
  AND ps.team_id NOT IN (f.home_team_id, f.away_team_id);
`.trim()).join('\n\n');
};

const buildRepairCommands = (items) => {
    if (items.length === 0) return '# No repair actions selected.';

    return items.map((item) => {
        if (item.data_source !== 'api_football') {
            return `# ${item.league_name} (${item.country_name}) ${item.season_year} [${item.data_source}] has no direct API-football repair command. Use manual historical rebuild or switch this group to drop/manual review.`;
        }

        return `docker exec statfoot-backend sh -lc "cd /app && node scripts/v3/repair_api_football_lineups.js --league-id ${item.league_id} --season-year ${item.season_year} --batch-key api_lineup_repair_manual_${item.league_id}_${item.season_year} --backup-path '/Users/domp6/Projet Dev/NinetyXI/dataFootV1/backups/db/statfoot_20260328_153059.dump'"`;
    }).join('\n');
};

const buildQueueCommands = (items) => {
    if (items.length === 0) return '# No reimport flag actions selected.';

    return items.map((item) => {
        if (item.data_source !== 'api_football') {
            return `# ${item.league_name} (${item.country_name}) ${item.season_year} [${item.data_source}] is not an api_football repair cohort. Queue this manually only if you intend to rebuild it from another source.`;
        }

        return `docker exec statfoot-backend sh -lc "cd /app && node scripts/v3/queue_fixture_reimports.js --league-id ${item.league_id} --season-year ${item.season_year} --data-source ${item.data_source} --reason-code manual_reimport_queue --notes 'Queued from lineup corruption page' --batch-key reimport_queue_${item.league_id}_${item.season_year}_${item.data_source}"`;
    }).join('\n');
};

const LineupCorruptionPage = () => {
    const navigate = useNavigate();
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [search, setSearch] = useState('');
    const [sourceFilter, setSourceFilter] = useState('all');
    const [decisionByKey, setDecisionByKey] = useState({});
    const [noteByKey, setNoteByKey] = useState({});
    const [copyState, setCopyState] = useState('');

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            setError('');
            try {
                const data = await api.getLineupCorruptionSummary();
                setRows(data);
                setDecisionByKey(Object.fromEntries(
                    data.map((item) => [makeDecisionKey(item), item.suggested_action])
                ));
                setNoteByKey(Object.fromEntries(
                    data.map((item) => [makeDecisionKey(item), item.suggested_reason])
                ));
            } catch (err) {
                setError(err.message || 'Failed to load lineup corruption summary.');
            } finally {
                setLoading(false);
            }
        };

        load();
    }, []);

    const filteredRows = useMemo(() => {
        const q = search.trim().toLowerCase();

        return rows.filter((item) => {
            if (sourceFilter !== 'all' && item.data_source !== sourceFilter) {
                return false;
            }

            if (!q) return true;

            return [
                item.country_name,
                item.league_name,
                String(item.season_year),
                item.data_source
            ].join(' ').toLowerCase().includes(q);
        });
    }, [rows, search, sourceFilter]);

    const totals = useMemo(() => {
        return filteredRows.reduce((acc, item) => {
            acc.groups += 1;
            acc.fixtures += item.affected_fixtures;
            acc.badLineups += item.bad_lineups;
            acc.badLineupPlayers += item.bad_lineup_players;
            acc.badPlayerStats += item.bad_player_stats;
            acc.queuedForReimport += item.pending_reimport_fixtures || 0;
            return acc;
        }, {
            groups: 0,
            fixtures: 0,
            badLineups: 0,
            badLineupPlayers: 0,
            badPlayerStats: 0,
            queuedForReimport: 0
        });
    }, [filteredRows]);

    const plan = useMemo(() => {
        return filteredRows.map((item) => ({
            ...item,
            decision: decisionByKey[makeDecisionKey(item)] || item.suggested_action,
            note: noteByKey[makeDecisionKey(item)] || ''
        }));
    }, [filteredRows, decisionByKey, noteByKey]);

    const planCounts = useMemo(() => {
        return plan.reduce((acc, item) => {
            acc[item.decision] = (acc[item.decision] || 0) + 1;
            return acc;
        }, {});
    }, [plan]);

    const dropItems = plan.filter((item) => item.decision === 'drop_corrupted_payload');
    const queueItems = plan.filter((item) => item.decision === 'queue_for_reimport');
    const repairItems = plan.filter((item) => item.decision === 'repair_with_api');
    const manualItems = plan.filter((item) => item.decision === 'manual_review');

    const dropSql = useMemo(() => buildDropSql(dropItems), [dropItems]);
    const queueCommands = useMemo(() => buildQueueCommands(queueItems), [queueItems]);
    const repairCommands = useMemo(() => buildRepairCommands(repairItems), [repairItems]);

    const copyText = async (value, label) => {
        try {
            await navigator.clipboard.writeText(value);
            setCopyState(`${label} copied`);
            setTimeout(() => setCopyState(''), 1800);
        } catch {
            setCopyState(`Unable to copy ${label.toLowerCase()}`);
            setTimeout(() => setCopyState(''), 1800);
        }
    };

    const sourceOptions = [
        { value: 'all', label: 'All Sources' },
        ...[...new Set(rows.map((item) => item.data_source))].sort().map((value) => ({
            value,
            label: value
        }))
    ];

    return (
        <PageLayout>
            <PageHeader
                title="Lineup Corruption"
                subtitle="Review corrupted lineup payloads by league and season, then prepare a cleanup plan."
                badge={{ label: 'AUDIT', variant: 'warning' }}
                extra={(
                    <Stack direction="row" gap="var(--spacing-sm)">
                        <Button variant="secondary" size="sm" onClick={() => navigate('/lineups-import')}>
                            Lineups Import
                        </Button>
                        <Button variant="secondary" size="sm" onClick={() => globalThis.location.reload()}>
                            Refresh
                        </Button>
                    </Stack>
                )}
            />
            <PageContent>
                <div className="lineup-corruption-page">
                    <div className="lineup-corruption-page__summary">
                        <Card title="Audit Scope" subtitle="Filtered corruption groups">
                            <div className="lineup-corruption-page__metrics">
                                <div className="lineup-corruption-page__metric">
                                    <span className="lineup-corruption-page__metric-value">{formatNumber(totals.groups)}</span>
                                    <span className="lineup-corruption-page__metric-label">League/Season Groups</span>
                                </div>
                                <div className="lineup-corruption-page__metric">
                                    <span className="lineup-corruption-page__metric-value">{formatNumber(totals.fixtures)}</span>
                                    <span className="lineup-corruption-page__metric-label">Affected Fixtures</span>
                                </div>
                                <div className="lineup-corruption-page__metric">
                                    <span className="lineup-corruption-page__metric-value">{formatNumber(totals.badPlayerStats)}</span>
                                    <span className="lineup-corruption-page__metric-label">Bad Player-Stat Rows</span>
                                </div>
                                <div className="lineup-corruption-page__metric">
                                    <span className="lineup-corruption-page__metric-value">{formatNumber(totals.queuedForReimport)}</span>
                                    <span className="lineup-corruption-page__metric-label">Queued For Reimport</span>
                                </div>
                            </div>
                        </Card>
                        <Card title="Filters" subtitle="Narrow the cleanup board">
                            <div className="lineup-corruption-page__filters">
                                <Input
                                    value={search}
                                    onChange={(event) => setSearch(event.target.value)}
                                    placeholder="Search league, country, season, source"
                                />
                                <Select
                                    options={sourceOptions}
                                    value={sourceOptions.find((option) => option.value === sourceFilter)}
                                    onChange={(option) => setSourceFilter(option?.value || 'all')}
                                />
                            </div>
                        </Card>
                    </div>

                    {loading && (
                        <Card title="Loading">
                            <p className="lineup-corruption-page__status">Building corruption summary...</p>
                        </Card>
                    )}

                    {!loading && error && (
                        <Card title="Error">
                            <p className="lineup-corruption-page__status lineup-corruption-page__status--error">{error}</p>
                        </Card>
                    )}

                    {!loading && !error && (
                        <div className="lineup-corruption-page__grid">
                            <div className="lineup-corruption-page__list">
                                <Card
                                    title="Corrupted Payloads"
                                    subtitle="Suggested action defaults to drop for disposable leagues and repair for rows that look like fixture identity corruption."
                                    extra={<Badge variant="secondary">{formatNumber(filteredRows.length)} groups</Badge>}
                                >
                                    <div className="lineup-corruption-page__rows">
                                        {filteredRows.map((item) => {
                                            const key = makeDecisionKey(item);
                                            const selectedAction = decisionByKey[key] || item.suggested_action;
                                            const selectedOption = ACTION_OPTIONS.find((option) => option.value === selectedAction);

                                            return (
                                                <div key={key} className="lineup-corruption-page__row">
                                                    <div className="lineup-corruption-page__row-header">
                                                        <div className="lineup-corruption-page__league">
                                                            {item.logo_url && (
                                                                <img
                                                                    src={item.logo_url}
                                                                    alt=""
                                                                    className="lineup-corruption-page__league-logo"
                                                                />
                                                            )}
                                                            <div>
                                                                <div className="lineup-corruption-page__league-name">
                                                                    {item.league_name}
                                                                </div>
                                                                <div className="lineup-corruption-page__league-meta">
                                                                    {item.country_name} · {item.season_year} · {item.data_source}
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="lineup-corruption-page__badges">
                                                            {item.pending_reimport_fixtures > 0 && (
                                                                <Badge variant="secondary">
                                                                    {formatNumber(item.pending_reimport_fixtures)} queued
                                                                </Badge>
                                                            )}
                                                            {item.is_low_priority && <Badge variant="secondary">Low Priority</Badge>}
                                                            <Badge variant={item.bad_player_stats > 0 ? 'warning' : 'secondary'}>
                                                                {item.bad_player_stats > 0 ? 'Repair Candidate' : 'Drop Candidate'}
                                                            </Badge>
                                                        </div>
                                                    </div>

                                                    <div className="lineup-corruption-page__counts">
                                                        <span>{formatNumber(item.affected_fixtures)} fixtures</span>
                                                        <span>{formatNumber(item.bad_lineups)} bad lineups</span>
                                                        <span>{formatNumber(item.bad_lineup_players)} bad lineup players</span>
                                                        <span>{formatNumber(item.bad_player_stats)} bad player stats</span>
                                                        {item.pending_reimport_fixtures > 0 && (
                                                            <span>{formatNumber(item.pending_reimport_fixtures)} queued for reimport</span>
                                                        )}
                                                        {item.missing_api_fixture_flags > 0 && (
                                                            <span>{formatNumber(item.missing_api_fixture_flags)} confirmed missing in API</span>
                                                        )}
                                                    </div>

                                                    <div className="lineup-corruption-page__samples">
                                                        {(item.sample_fixture_ids || []).map((fixtureId) => (
                                                            <div key={fixtureId} className="lineup-corruption-page__sample-pill">
                                                                Fixture #{fixtureId}
                                                            </div>
                                                        ))}
                                                        {(!item.sample_fixture_ids || item.sample_fixture_ids.length === 0) && (
                                                            <div className="lineup-corruption-page__sample-pill">
                                                                No sample fixture IDs available
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div className="lineup-corruption-page__form">
                                                        <div className="lineup-corruption-page__field">
                                                            <label className="lineup-corruption-page__field-label">Action</label>
                                                            <Select
                                                                options={ACTION_OPTIONS}
                                                                value={selectedOption}
                                                                onChange={(option) => {
                                                                    setDecisionByKey((prev) => ({
                                                                        ...prev,
                                                                        [key]: option?.value || item.suggested_action
                                                                    }));
                                                                }}
                                                            />
                                                        </div>
                                                        <div className="lineup-corruption-page__field">
                                                            <label className="lineup-corruption-page__field-label">Note</label>
                                                            <textarea
                                                                className="lineup-corruption-page__note"
                                                                value={noteByKey[key] || ''}
                                                                onChange={(event) => {
                                                                    const value = event.target.value;
                                                                    setNoteByKey((prev) => ({
                                                                        ...prev,
                                                                        [key]: value
                                                                    }));
                                                                }}
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}

                                        {filteredRows.length === 0 && (
                                            <div className="lineup-corruption-page__empty">
                                                No corruption groups match the current filters.
                                            </div>
                                        )}
                                    </div>
                                </Card>
                            </div>

                            <div className="lineup-corruption-page__plan">
                                <Card title="Cleanup Plan" subtitle="Local form only. Use it to decide what to drop, what to repair, and what to review.">
                                    <div className="lineup-corruption-page__plan-counts">
                                        {ACTION_OPTIONS.map((option) => (
                                            <div key={option.value} className="lineup-corruption-page__plan-chip">
                                                <span>{ACTION_LABELS[option.value]}</span>
                                                <strong>{formatNumber(planCounts[option.value] || 0)}</strong>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="lineup-corruption-page__panel-section">
                                        <div className="lineup-corruption-page__panel-header">
                                            <h3>Drop SQL Preview</h3>
                                            <Button
                                                variant="secondary"
                                                size="sm"
                                                onClick={() => copyText(dropSql, 'Drop SQL')}
                                            >
                                                Copy
                                            </Button>
                                        </div>
                                        <textarea className="lineup-corruption-page__preview" readOnly value={dropSql} />
                                    </div>

                                    <div className="lineup-corruption-page__panel-section">
                                        <div className="lineup-corruption-page__panel-header">
                                            <h3>Reimport Queue Commands</h3>
                                            <Button
                                                variant="secondary"
                                                size="sm"
                                                onClick={() => copyText(queueCommands, 'Queue commands')}
                                            >
                                                Copy
                                            </Button>
                                        </div>
                                        <textarea className="lineup-corruption-page__preview" readOnly value={queueCommands} />
                                    </div>

                                    <div className="lineup-corruption-page__panel-section">
                                        <div className="lineup-corruption-page__panel-header">
                                            <h3>Repair Commands</h3>
                                            <Button
                                                variant="secondary"
                                                size="sm"
                                                onClick={() => copyText(repairCommands, 'Repair commands')}
                                            >
                                                Copy
                                            </Button>
                                        </div>
                                        <textarea className="lineup-corruption-page__preview" readOnly value={repairCommands} />
                                    </div>

                                    <div className="lineup-corruption-page__panel-section">
                                        <h3>Manual Review</h3>
                                        <div className="lineup-corruption-page__manual-list">
                                            {manualItems.length === 0 && <p>No manual-review rows selected.</p>}
                                            {manualItems.map((item) => (
                                                <div key={makeDecisionKey(item)} className="lineup-corruption-page__manual-item">
                                                    <strong>{item.league_name} {item.season_year}</strong>
                                                    <span>{item.note}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {copyState && <p className="lineup-corruption-page__copy-state">{copyState}</p>}
                                </Card>
                            </div>
                        </div>
                    )}
                </div>
            </PageContent>
        </PageLayout>
    );
};

export default LineupCorruptionPage;
