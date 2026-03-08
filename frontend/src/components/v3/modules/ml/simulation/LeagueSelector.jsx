import React from 'react';
import PropTypes from 'prop-types';

const LeagueSelector = ({ leagues, selectedLeague, onLeagueChange, onRefreshLeagues, onShowDiscovery, loading }) => {
    return (
        <div className="param-group">
            <div className="label-with-action">
                <label>① League Target</label>
                <div className="action-row">
                    <button className="text-action-btn" onClick={onRefreshLeagues} disabled={loading}>↻</button>
                    <button className="text-action-btn" onClick={onShowDiscovery}>🔭 Discovery</button>
                </div>
            </div>
            <select
                value={selectedLeague}
                onChange={(e) => onLeagueChange(e.target.value)}
                disabled={loading}
            >
                <option value="">-- Choose League --</option>
                <option value="DISCOVER" style={{ fontWeight: 'bold', color: '#10b981' }}>🔭 Discover & Sync New Leagues</option>
                <optgroup label="Imported Leagues">
                    {leagues.map(l => {
                        const yearsList = l.years_imported || [];
                        const minYear = Math.min(...yearsList);
                        const maxYear = Math.max(...yearsList);
                        const range = yearsList.length > 0 ? `[${minYear}-${maxYear}]` : '(No Data)';
                        return (
                            <option key={l.league_id} value={l.league_id}>
                                {l.country_name} - {l.name} {range}
                            </option>
                        );
                    })}
                </optgroup>
            </select>
        </div>
    );
};

LeagueSelector.propTypes = {
    leagues: PropTypes.array.isRequired,
    selectedLeague: PropTypes.string.isRequired,
    onLeagueChange: PropTypes.func.isRequired,
    onRefreshLeagues: PropTypes.func.isRequired,
    onShowDiscovery: PropTypes.func.isRequired,
    loading: PropTypes.bool.isRequired
};

export default LeagueSelector;
