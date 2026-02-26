import React, { useState, useEffect } from 'react';
import api from '../../../../services/api';

const StatsTab = ({ clubId, year, competitionId }) => {
    const [stats, setStats] = useState(null);
    const [history, setHistory] = useState(null);
    const [view, setView] = useState('overview'); // 'overview' or 'history'
    const [loading, setLoading] = useState(true);
    const [searchHistory, setSearchHistory] = useState('');
    const [coreOnly, setCoreOnly] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                if (view === 'overview') {
                    const data = await api.getClubTacticalSummary(clubId, {
                        year,
                        competition: competitionId !== 'all' ? competitionId : undefined
                    });
                    setStats(data);
                } else {
                    const data = await api.getClubTacticalSummary(clubId, {
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
        <div className="tab-loading">
            <div className="spinner-v3 small"></div>
            <span>Mining tactical performance patterns...</span>
        </div>
    );

    const MetricCard = ({ label, value, subValue, group }) => (
        <div className={`v4-metric-card group-${group?.toLowerCase().replace(/&/g, '').replace(/ /g, '-')}`}>
            <span className="m-label">{label}</span>
            <div className="m-val-row">
                <span className="m-value">{value || '—'}</span>
                {subValue && <span className="m-sub">{subValue}</span>}
            </div>
        </div>
    );

    if (view === 'overview') {
        if (!stats || !stats.all) return (
            <div className="empty-state-card-v4">
                <div className="empty-icon">📊</div>
                <h3>Tactical data pending</h3>
                <p>Detailed performance metrics aren't available for this selection yet.</p>
            </div>
        );
        const s = stats.all;

        return (
            <div className="stats-tab-v4">
                <div className="view-selector-v4">
                    <button className="active">Overview</button>
                    <button onClick={() => setView('history')}>Season History</button>
                </div>

                <div className="stats-sections-v4">
                    <section className="metric-group-v4">
                        <h3 className="group-title">Possession & Passing</h3>
                        <div className="metrics-grid-v4">
                            <MetricCard label="Ball Possession" value={`${s.possession}%`} group="pos" />
                            <MetricCard label="Pass Accuracy" value={`${s.pass_accuracy}%`} group="pos" />
                            <MetricCard label="Corners / Match" value={s.corners_per_match} group="pos" />
                            <MetricCard label="Touches in Box" value={s.touches_per_match || '—'} group="pos" />
                        </div>
                    </section>

                    <section className="metric-group-v4">
                        <h3 className="group-title">Shooting & Efficiency</h3>
                        <div className="metrics-grid-v4">
                            <MetricCard label="Shots / Match" value={s.shots_per_match} subValue={`${s.shots_on_target_per_match} Target`} group="atk" />
                            <MetricCard label="Goal Conv. Rate" value={`${s.shot_conversion}%`} group="atk" />
                            <MetricCard label="Big Chances / M" value={s.big_chances_per_match || '—'} group="atk" />
                            <MetricCard label="Goals Scored / M" value={s.goals_scored_per_match} group="atk" />
                        </div>
                    </section>

                    <section className="metric-group-v4">
                        <h3 className="group-title">Defense & Discipline</h3>
                        <div className="metrics-grid-v4">
                            <MetricCard label="Clean Sheet %" value={`${s.clean_sheet_pct}%`} group="def" />
                            <MetricCard label="Gls Conceded / M" value={s.goals_conceded_per_match} group="def" />
                            <MetricCard label="Saves / Match" value={s.saves_per_match || '—'} group="def" />
                            <MetricCard label="Yellow / Match" value={s.yellow_cards_per_match || '—'} group="def" />
                        </div>
                    </section>
                </div>

                <div className="split-performance-v4-compact">
                    <h3 className="group-title-mini">Home / Away Split</h3>
                    <table className="v4-performance-split-table-mini">
                        <thead>
                            <tr>
                                <th align="left">Metric</th>
                                <th align="center">HOME</th>
                                <th align="center">AWAY</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td>Win Rate</td>
                                <td align="center">{stats.home?.win_rate || '—'}%</td>
                                <td align="center">{stats.away?.win_rate || '—'}%</td>
                            </tr>
                            <tr>
                                <td>Gls Scored / M</td>
                                <td align="center">{stats.home?.goals_scored_per_match || '—'}</td>
                                <td align="center">{stats.away?.goals_scored_per_match || '—'}</td>
                            </tr>
                            <tr>
                                <td>Possession</td>
                                <td align="center">{stats.home?.possession || '—'}%</td>
                                <td align="center">{stats.away?.possession || '—'}%</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        );
    }

    // HISTORY VIEW
    if (!history) return <div className="tab-loading">Archiving history...</div>;
    const years = Object.keys(history).sort((a, b) => b - a);

    const allMetrics = [
        { key: 'win_rate', label: 'Win Rate (%)', core: true },
        { key: 'points_per_match', label: 'Points / Match', core: true },
        { key: 'goals_scored_per_match', label: 'GF / Match', core: true },
        { key: 'goals_conceded_per_match', label: 'GA / Match', core: true },
        { key: 'clean_sheet_pct', label: 'Clean Sheets (%)', core: true },
        { key: 'possession', label: 'Possession (%)', core: false },
        { key: 'pass_accuracy', label: 'Pass Accuracy (%)', core: false },
        { key: 'shot_conversion', label: 'Shot Conv. (%)', core: false },
        { key: 'shots_per_match', label: 'Shots / Match', core: false },
        { key: 'average_rating', label: 'Squad Rating', core: false }
    ];

    const filteredMetrics = coreOnly ? allMetrics.filter(m => m.core) : allMetrics;

    return (
        <div className="stats-tab-v4">
            <div className="view-selector-v4">
                <button onClick={() => setView('overview')}>Overview</button>
                <button className="active">Season History</button>
            </div>

            <div className="history-controls-v4">
                <button
                    className={`toggle-btn ${coreOnly ? 'active' : ''}`}
                    onClick={() => setCoreOnly(!coreOnly)}
                >
                    {coreOnly ? 'Show All Metrics' : 'Show Core Only'}
                </button>
            </div>

            <div className="history-table-wrapper-v4">
                <table className="v4-history-summary-table">
                    <thead>
                        <tr>
                            <th className="sticky-metric-col">Tactical Metric</th>
                            {years.map(y => <th key={y} align="center" className="year-header">{y}</th>)}
                        </tr>
                    </thead>
                    <tbody>
                        {filteredMetrics.map(m => (
                            <tr key={m.key}>
                                <td className="sticky-metric-col label-cell">{m.label}</td>
                                {years.map(y => (
                                    <td key={y} align="center" className="val-cell">
                                        {history[y] && history[y][m.key] ? history[y][m.key] : '—'}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default StatsTab;
