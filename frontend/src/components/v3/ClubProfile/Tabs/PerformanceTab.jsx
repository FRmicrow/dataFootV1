import React from 'react';

const PerformanceTab = ({ clubId, year, competitionId, summary, seasons }) => {

    // Filter to the specific competition if selected
    const activeComps = competitionId === 'all'
        ? seasons
        : seasons.filter(s => s.league_id == competitionId);

    return (
        <div className="performance-tab-v4">
            <h2 className="section-title">Season Overview</h2>

            {/* US_282: Global Season Highlights */}
            <div className="performance-hero-stats">
                <div className="hero-stat-box gold">
                    <span className="h-val">{summary?.win_rate ? `${parseFloat(summary.win_rate).toFixed(1)}%` : '—'}</span>
                    <span className="h-label">Win Rate</span>
                    <small className="h-context">Season {year}</small>
                </div>
                <div className="hero-stat-box">
                    <span className="h-val">{summary?.total_played || '—'}</span>
                    <span className="h-label">Games Played</span>
                    <small className="h-context">{competitionId === 'all' ? 'All Competitions' : 'Selected Comp'}</small>
                </div>
                <div className="hero-stat-box blue">
                    <span className="h-val">{summary?.goals_scored || '—'}</span>
                    <span className="h-label">Goals For</span>
                    <small className="h-context">Aggregated</small>
                </div>
                <div className="hero-stat-box red">
                    <span className="h-val">{summary?.goals_conceded || '—'}</span>
                    <span className="h-label">Goals Against</span>
                    <small className="h-context">Total</small>
                </div>
            </div>

            <h2 className="section-title">Competition Summary</h2>

            {activeComps.length > 0 ? (
                <div className="table-container-v4">
                    <table className="v4-common-table">
                        <thead>
                            <tr>
                                <th className="sticky-col">Competition</th>
                                <th>Type</th>
                                <th>Result / Rank</th>
                                <th className="center">P</th>
                                <th className="center">W</th>
                                <th className="center">D</th>
                                <th className="center">L</th>
                                <th className="center">GF</th>
                                <th className="center">GA</th>
                                <th className="center">GD</th>
                                <th className="center">Sqr</th>
                            </tr>
                        </thead>
                        <tbody>
                            {activeComps.map(comp => (
                                <tr key={comp.league_id} className="v4-row">
                                    <td className="p-cell-v4 sticky-col">
                                        <img src={comp.league_logo} alt="" className="mini-badge-v4" />
                                        <div className="p-name-v4">
                                            <span className="main-name">{comp.league_name}</span>
                                        </div>
                                    </td>
                                    <td><span className="type-badge-v4">{comp.competition_type}</span></td>
                                    <td>
                                        <span className={`rank-pill ${comp.competition_type === 'League' ? 'league' : 'cup'}`}>
                                            {comp.competition_type === 'League' ? `#${comp.rank || '—'}` : (comp.round_reached || 'Group Stage')}
                                        </span>
                                    </td>
                                    <td className="center">{comp.played || 0}</td>
                                    <td className="center win-color">{comp.win || 0}</td>
                                    <td className="center draw-color">{comp.draw || 0}</td>
                                    <td className="center loss-color">{comp.lose || 0}</td>
                                    <td className="center">{comp.goals_for || 0}</td>
                                    <td className="center">{comp.goals_against || 0}</td>
                                    <td className="center">{comp.goals_for - comp.goals_against}</td>
                                    <td className="center">{comp.squad_size || '—'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="empty-v4">
                    <div className="empty-icon">📂</div>
                    <h3>No campaign history found</h3>
                    <p>Try selecting another season or resetting the competition filter.</p>
                </div>
            )}
        </div>
    );
};

export default PerformanceTab;
