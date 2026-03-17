import React from 'react';
import { Badge, Table } from '../../../../../design-system';
import { fmtDate, fmtPct, fmtDecimal, getOutcomeVariant } from '../shared/mlUtils';

/**
 * Table showing simulation results for a specific run and market.
 */
export const SimulationResultsTable = ({ results, selectedMarket }) => {
    const deriveTopPrediction = (row) => {
        const values = [
            { label: '1', prob: parseFloat(row.prob_home) || 0 },
            { label: 'X', prob: parseFloat(row.prob_draw) || 0 },
            { label: '2', prob: parseFloat(row.prob_away) || 0 },
        ];
        values.sort((a, b) => b.prob - a.prob);
        return values[0];
    };

    const buildRowInsight = (row) => {
        if (row.display_mode === '1X2') {
            return {
                title: `Confiance ${row.primary_probability || '—'}`,
                detail: row.actual_result === row.predicted_outcome ? 'Issue conforme au pick' : 'Issue contraire au pick',
            };
        }

        const actual = Number(row.actual_numeric_value);
        const expected = Number(row.expected_total);
        if (!Number.isFinite(actual) || !Number.isFinite(expected)) {
            return {
                title: `Attendu ${row.expected_total_label || '—'}`,
                detail: `Réel ${row.actual_numeric_label || '—'}`,
            };
        }

        const delta = actual - expected;
        const absDelta = Math.abs(delta).toFixed(2);
        const direction = delta > 0 ? 'au-dessus' : delta < 0 ? 'en-dessous' : 'aligné';

        return {
            title: `Delta ${delta > 0 ? '+' : ''}${delta.toFixed(2)}`,
            detail: direction === 'aligné' ? 'Réel aligné au modèle' : `Réel ${direction} du modèle de ${absDelta}`,
        };
    };

    const resultsColumns = [
        {
            key: 'date',
            title: 'Date',
            dataIndex: 'fixture_date',
            width: 110,
            render: (_, row) => (
                <>
                    <div className="ml-orch__table-date">{fmtDate(row.fixture_date)}</div>
                    <div className="ml-orch__table-round">{row.round_name || 'Fixture'}</div>
                </>
            ),
        },
        {
            key: 'market',
            title: 'Marché',
            dataIndex: 'market_label',
            width: 110,
            render: (_, row) => (
                <div className="ml-orch__market-cell">
                    <Badge variant="neutral" size="sm">{row.market_label || 'FT 1X2'}</Badge>
                </div>
            ),
        },
        {
            key: 'match',
            title: 'Match',
            width: 220,
            render: (_, row) => (
                <div className="ml-orch__matchup">
                    <span className="ml-orch__team-name" title={row.home_team_name}>{row.home_team_name}</span>
                    <span className="ml-orch__matchup-sep">vs</span>
                    <span className="ml-orch__team-name" title={row.away_team_name}>{row.away_team_name}</span>
                </div>
            ),
        },
        {
            key: 'prediction',
            title: 'Prédiction',
            width: 240,
            render: (_, row) => {
                const topPick = row.display_mode === '1X2' ? deriveTopPrediction(row) : null;
                return (
                    <div className="ml-orch__prediction-cell">
                        {row.display_mode === '1X2' ? (
                            <>
                                <div className="ml-orch__prediction-head">
                                    <Badge variant="primary" size="sm">{topPick.label}</Badge>
                                    <span className="ml-orch__prediction-confidence">{fmtPct(topPick.prob, 1)}</span>
                                </div>
                                <div className="ml-orch__prob-grid">
                                    <span>1 {row.prob_home}</span>
                                    <span>X {row.prob_draw}</span>
                                    <span>2 {row.prob_away}</span>
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="ml-orch__prediction-head">
                                    <Badge variant="primary" size="sm">{row.predicted_outcome}</Badge>
                                    <span className="ml-orch__prediction-confidence">{row.primary_probability || '—'}</span>
                                </div>
                                <div className="ml-orch__prob-grid">
                                    <span>{row.predicted_outcome} {row.primary_probability || '—'}</span>
                                    <span>{row.alternate_outcome || '—'} {row.alternate_probability || '—'}</span>
                                    <span>Exp. {row.expected_total_label || '—'}</span>
                                </div>
                            </>
                        )}
                    </div>
                );
            },
        },
        {
            key: 'result',
            title: 'Réalité',
            width: 130,
            render: (_, row) => (
                <div className="ml-orch__result-cell">
                    <div className="ml-orch__result-score">
                        {row.display_mode === '1X2' ? row.score : row.actual_numeric_label != null ? `Total ${row.actual_numeric_label}` : '—'}
                    </div>
                    <Badge variant="neutral" size="sm">{row.actual_result}</Badge>
                </div>
            ),
        },
        {
            key: 'verdict',
            title: 'Verdict',
            width: 110,
            render: (_, row) => (
                <div className="ml-orch__verdict-cell">
                    <Badge variant={getOutcomeVariant(row.is_correct)} size="sm">
                        {row.is_correct === 1 || row.is_correct === true ? 'Hit' : row.is_correct === 0 || row.is_correct === false ? 'Miss' : '—'}
                    </Badge>
                    <div className="ml-orch__verdict-subline">Pick {row.predicted_outcome}</div>
                </div>
            ),
        },
        {
            key: 'gap',
            title: 'Écart modèle',
            width: 180,
            render: (_, row) => {
                const insight = buildRowInsight(row);
                return (
                    <div className="ml-orch__insight-cell">
                        <div className="ml-orch__insight-title">{insight.title}</div>
                        <div className="ml-orch__insight-detail">{insight.detail}</div>
                    </div>
                );
            },
        },
    ];

    return (
        <Table
            columns={resultsColumns}
            data={results}
            rowKey={(row) => `${row.fixture_id}-${row.market_type}`}
            className="plain ml-orch__results-table-ds"
        />
    );
};
