import React from 'react';
import PropTypes from 'prop-types';
import { Skeleton } from '../../../../design-system';
import './GroupStandings.css';

const GroupCard = ({ group, qualificationSpots, compact }) => (
    <div className="gs-group-card">
        <div className="gs-group-header">
            <span className="gs-group-name">{group.name}</span>
            <span className="gs-group-teams">{group.standings.length} équipes</span>
        </div>
        <table className="gs-table">
            <thead>
                <tr>
                    <th className="gs-th gs-th--rank">#</th>
                    <th className="gs-th gs-th--team">Équipe</th>
                    <th className="gs-th gs-th--num">J</th>
                    {!compact && <>
                        <th className="gs-th gs-th--num">V</th>
                        <th className="gs-th gs-th--num">N</th>
                        <th className="gs-th gs-th--num">D</th>
                        <th className="gs-th gs-th--num">BP</th>
                        <th className="gs-th gs-th--num">BC</th>
                    </>}
                    <th className="gs-th gs-th--num">Diff</th>
                    <th className="gs-th gs-th--pts">Pts</th>
                </tr>
            </thead>
            <tbody>
                {group.standings.map((team, idx) => {
                    const rank = idx + 1;
                    const qualified = rank <= qualificationSpots;
                    const borderline = rank === qualificationSpots;
                    return (
                        <tr
                            key={team.team_id}
                            className={`gs-row${qualified ? ' gs-row--qualified' : ''}${borderline ? ' gs-row--borderline' : ''}`}
                        >
                            <td className="gs-td gs-td--rank">{rank}</td>
                            <td className="gs-td gs-td--team">
                                {team.logo
                                    ? <img src={team.logo} alt="" className="gs-team-logo" />
                                    : <span className="gs-team-logo gs-team-logo--placeholder" />
                                }
                                <span className="gs-team-name">{team.name}</span>
                            </td>
                            <td className="gs-td gs-td--num">{team.played}</td>
                            {!compact && <>
                                <td className="gs-td gs-td--num">{team.won}</td>
                                <td className="gs-td gs-td--num">{team.drawn}</td>
                                <td className="gs-td gs-td--num">{team.lost}</td>
                                <td className="gs-td gs-td--num">{team.goals_for}</td>
                                <td className="gs-td gs-td--num">{team.goals_against}</td>
                            </>}
                            <td className={`gs-td gs-td--num gs-td--diff${team.goal_diff > 0 ? ' gs-td--positive' : team.goal_diff < 0 ? ' gs-td--negative' : ''}`}>
                                {team.goal_diff > 0 ? `+${team.goal_diff}` : team.goal_diff}
                            </td>
                            <td className="gs-td gs-td--pts">{team.points}</td>
                        </tr>
                    );
                })}
            </tbody>
        </table>
    </div>
);

GroupCard.propTypes = {
    group: PropTypes.shape({
        name: PropTypes.string.isRequired,
        standings: PropTypes.array.isRequired,
    }).isRequired,
    qualificationSpots: PropTypes.number.isRequired,
    compact: PropTypes.bool,
};

const GroupStandings = ({ groups, loading, qualificationSpots = 2, compact = false }) => {
    if (loading) {
        return (
            <div className="gs-grid">
                {[1, 2, 3, 4].map(i => (
                    <div key={i} className="gs-group-card">
                        <Skeleton height="200px" />
                    </div>
                ))}
            </div>
        );
    }

    if (!groups || groups.length === 0) {
        return (
            <div className="gs-empty">
                <p>Aucune phase de groupes disponible pour cette saison.</p>
            </div>
        );
    }

    return (
        <div className={`gs-grid${compact ? ' gs-grid--compact' : ''}`}>
            {groups.map(group => (
                <GroupCard
                    key={group.name}
                    group={group}
                    qualificationSpots={qualificationSpots}
                    compact={compact}
                />
            ))}
        </div>
    );
};

GroupStandings.propTypes = {
    groups: PropTypes.arrayOf(PropTypes.shape({
        name: PropTypes.string.isRequired,
        standings: PropTypes.array.isRequired,
    })),
    loading: PropTypes.bool,
    qualificationSpots: PropTypes.number,
    compact: PropTypes.bool,
};

export default GroupStandings;
