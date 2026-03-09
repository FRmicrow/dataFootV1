import React from 'react';
import PropTypes from 'prop-types';
import './TeamSelector.css';

/**
 * Reusable TeamSelector sidebar/list for navigation.
 */
const TeamSelector = ({
    teams = [],
    selectedTeamId,
    onSelect,
    searchTerm,
    onSearchChange,
    loading = false
}) => {
    return (
        <aside className="ds-team-selector">
            <div className="ds-team-selector-header">
                <h4 className="ds-team-selector-title">Registry Modules</h4>
                <div className="ds-team-selector-search">
                    <input
                        type="text"
                        placeholder="Search system..."
                        value={searchTerm}
                        onChange={(e) => onSearchChange(e.target.value)}
                        className="ds-team-selector-input"
                    />
                </div>
            </div>

            <div className="ds-team-selector-list scrollbar-custom">
                {loading ? (
                    <div className="ds-team-selector-loading">Syncing...</div>
                ) : teams.length === 0 ? (
                    <div className="ds-team-selector-empty">No results</div>
                ) : (
                    teams.map(team => {
                        const isSelected = String(team.team_id) === String(selectedTeamId);
                        return (
                            <button
                                key={team.team_id}
                                onClick={() => onSelect(team.team_id)}
                                className={`ds-team-selector-item ${isSelected ? 'is-active' : ''}`}
                            >
                                <div className="ds-team-selector-logo-wrap">
                                    <img src={team.team_logo} alt={team.team_name} loading="lazy" />
                                </div>
                                <div className="ds-team-selector-info">
                                    <span className="name">{team.team_name}</span>
                                    <span className="meta">Rank #{team.rank}</span>
                                </div>
                                {isSelected && <div className="ds-team-selector-indicator" />}
                            </button>
                        );
                    })
                )}
            </div>
        </aside>
    );
};

TeamSelector.propTypes = {
    teams: PropTypes.arrayOf(PropTypes.shape({
        team_id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
        team_name: PropTypes.string.isRequired,
        team_logo: PropTypes.string,
        rank: PropTypes.number
    })),
    selectedTeamId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    onSelect: PropTypes.func.isRequired,
    searchTerm: PropTypes.string,
    onSearchChange: PropTypes.func.isRequired,
    loading: PropTypes.bool
};

export default TeamSelector;
