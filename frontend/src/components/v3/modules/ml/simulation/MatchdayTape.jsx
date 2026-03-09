import React from 'react';
import PropTypes from 'prop-types';

const getGreenOpacity = (probStr) => {
    if (!probStr) return 'rgba(0, 0, 0, 0)';
    const val = Number.parseFloat(probStr.replaceAll('%', ''));
    if (Number.isNaN(val)) return 'rgba(0, 0, 0, 0)';
    const opacity = Math.min((val / 100) * 0.9 + 0.1, 1);
    return `rgba(16, 185, 129, ${opacity.toFixed(2)})`;
};

const MatchdayTape = ({ tapeData, loadingTape }) => {
    if (loadingTape) {
        return <div className="tape-loading">Loading Results... 🔄</div>;
    }

    if (!tapeData || tapeData.length === 0) {
        return <div className="tape-loading">No results available.</div>;
    }

    return (
        <div className="tape-table-wrapper">
            <table className="tape-table">
                <thead>
                    <tr>
                        <th>Round</th>
                        <th>Match</th>
                        <th className="center">1</th>
                        <th className="center">X</th>
                        <th className="center">2</th>
                        <th>Score</th>
                        <th>Result</th>
                    </tr>
                </thead>
                <tbody>
                    {tapeData.map((m, idx) => {
                        const homeTeam = m.home_team_name || 'Home';
                        const awayTeam = m.away_team_name || 'Away';
                        const isCorrect = m.is_correct === 1;

                        const prevRound = idx > 0 ? tapeData[idx - 1].round_name : null;
                        const isNewRound = idx === 0 || m.round_name !== prevRound;
                        const itemKey = m.match_id || `${m.round_name}-${m.home_team_id}-${idx}`;

                        return (
                            <React.Fragment key={itemKey}>
                                {isNewRound && (
                                    <tr className="round-separator">
                                        <td colSpan="7">{m.round_name || 'Next Phase'}</td>
                                    </tr>
                                )}
                                <tr>
                                    <td className="tape-round">{m.round_name?.replaceAll('Regular Season - ', 'MD ') || '-'}</td>
                                    <td className="tape-match">{homeTeam} vs {awayTeam}</td>

                                    <td className="center tape-prob-cell" style={{ backgroundColor: getGreenOpacity(m.prob_home) }}>
                                        <div className="prob-val">{m.prob_home}</div>
                                    </td>
                                    <td className="center tape-prob-cell" style={{ backgroundColor: getGreenOpacity(m.prob_draw) }}>
                                        <div className="prob-val">{m.prob_draw}</div>
                                    </td>
                                    <td className="center tape-prob-cell" style={{ backgroundColor: getGreenOpacity(m.prob_away) }}>
                                        <div className="prob-val">{m.prob_away}</div>
                                    </td>

                                    <td className="tape-score-cell">{m.score || '-'}</td>
                                    <td className={`tape-prediction-cell ${isCorrect ? 'win' : 'loss'}`}>
                                        {isCorrect ? (
                                            <span className="prediction-tick">✓</span>
                                        ) : (
                                            <span className="prediction-cross">✕</span>
                                        )}
                                    </td>
                                </tr>
                            </React.Fragment>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
};

MatchdayTape.propTypes = {
    tapeData: PropTypes.arrayOf(PropTypes.shape({
        home_team_name: PropTypes.string,
        away_team_name: PropTypes.string,
        is_correct: PropTypes.number,
        round_name: PropTypes.string,
        prob_home: PropTypes.string,
        prob_draw: PropTypes.string,
        prob_away: PropTypes.string,
        score: PropTypes.string,
    })).isRequired,
    loadingTape: PropTypes.bool.isRequired
};

export default MatchdayTape;
