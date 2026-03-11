import React, { useState, useMemo } from 'react';
import PropTypes from 'prop-types';
import './LeagueSelector.css';


/**
 * LeagueSelector (US_022 AC 1 & 4)
 * Panel to search and manage tracked competitions.
 * Props:
 *   - availableLeagues: [{ id, name, country, logo, importance_rank }]
 *   - trackedIds: number[]
 *   - onToggle: (leagueId: number) => void
 *   - onClose: () => void
 */
const LeagueSelector = ({ availableLeagues = [], trackedIds = [], onToggle, onClose }) => {
    const [search, setSearch] = useState('');

    const filtered = useMemo(() => {
        const q = search.toLowerCase().trim();
        return availableLeagues.filter(l =>
            !q || l.name?.toLowerCase().includes(q) || l.country?.toLowerCase().includes(q)
        );
    }, [availableLeagues, search]);

    const tracked = availableLeagues.filter(l => trackedIds.includes(l.id));

    return (
        <div className="league-selector__container">
            {/* Header */}
            <div className="league-selector__header">
                <h2 className="league-selector__title">
                    ⚙️ Configure Competitions
                    <span className="league-selector__count-badge">
                        {trackedIds.length} selected
                    </span>
                </h2>
                <button onClick={onClose} className="league-selector__close-btn">✕</button>
            </div>

            {/* Currently Tracked Chips */}
            {tracked.length > 0 && (
                <div className="league-selector__tracked-section">
                    <div className="league-selector__tracked-label">Tracked</div>
                    <div className="league-selector__chips">
                        {tracked.map(l => (
                            <div key={l.id} className="league-selector__chip">
                                {l.logo && <img src={l.logo} alt="" className="league-selector__chip-logo" />}
                                {l.name}
                                <button onClick={() => onToggle(l.id)} className="league-selector__chip-remove">✕</button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Search input */}
            <input
                type="text"
                placeholder="Search leagues by name or country..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="league-selector__search-input"
            />

            {/* League List (sorted by importance_rank — already sorted from parent) */}
            <div className="league-selector__list">
                {filtered.length === 0 && (
                    <div className="league-selector__empty">
                        No competitions found
                    </div>
                )}
                {filtered.map(l => {
                    const isTracked = trackedIds.includes(l.id);
                    return (
                        <button
                            key={l.id}
                            onClick={() => onToggle(l.id)}
                            className={`league-selector__row ${isTracked ? 'league-selector__row--tracked' : ''}`}
                        >
                            {l.logo && <img src={l.logo} alt="" className="league-selector__row-logo" />}
                            <div className="league-selector__row-info">
                                <div className={`league-selector__row-name ${isTracked ? 'league-selector__row-name--tracked' : ''}`}>{l.name}</div>
                                <div className="league-selector__row-country">{l.country}</div>
                            </div>
                            <div className={`league-selector__row-status ${isTracked ? 'league-selector__row-status--tracked' : ''}`}>
                                {isTracked ? '✓ Tracked' : '+ Add'}
                            </div>
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

LeagueSelector.propTypes = {
    availableLeagues: PropTypes.arrayOf(PropTypes.shape({
        id: PropTypes.number.isRequired,
        name: PropTypes.string.isRequired,
        country: PropTypes.string,
        logo: PropTypes.string,
        importance_rank: PropTypes.number
    })),
    trackedIds: PropTypes.arrayOf(PropTypes.number),
    onToggle: PropTypes.func.isRequired,
    onClose: PropTypes.func.isRequired
};

export default LeagueSelector;

