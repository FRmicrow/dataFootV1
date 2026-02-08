import React from 'react';
import './TeamDetailModal.css';

const TeamDetailModal = ({ selectedTeam, setSelectedTeam, selectedSeason, handleSeasonChange }) => {
    if (!selectedTeam) return null;
    const { team, statistics, teamDetails, trophies, leagueId } = selectedTeam;

    // Generate year options (2010 to 2024)
    const yearOptions = [];
    for (let year = 2024; year >= 2010; year--) {
        yearOptions.push(year);
    }

    return (
        <div className="modal-overlay" onClick={() => setSelectedTeam(null)}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                {/* HEADER */}
                <div className="modal-header">
                    <div className="modal-title-group">
                        <img src={team.logo_url} alt={team.name} className="modal-logo" />
                        <div className="modal-title">
                            <h2>{team.name}</h2>
                            {team.country && <p className="modal-subtitle">{team.country}</p>}
                        </div>
                    </div>
                    <button className="btn btn-primary btn-small" onClick={() => setSelectedTeam(null)}>Close</button>
                </div>

                <div className="modal-body">

                    {/* SECTION 1: CLUB DESCRIPTION */}
                    <div className="modal-section">
                        <h3 className="section-title">
                            ℹ️ Club Information
                        </h3>
                        {teamDetails && teamDetails.venue ? (
                            <div className="info-grid">
                                {teamDetails.team?.founded && (
                                    <div className="info-item">
                                        <strong>Founded</strong>
                                        <p>{teamDetails.team.founded}</p>
                                    </div>
                                )}
                                {teamDetails.venue?.name && (
                                    <div className="info-item">
                                        <strong>Stadium</strong>
                                        <p>{teamDetails.venue.name}</p>
                                    </div>
                                )}
                                {teamDetails.venue?.capacity && (
                                    <div className="info-item">
                                        <strong>Capacity</strong>
                                        <p>{teamDetails.venue.capacity.toLocaleString()}</p>
                                    </div>
                                )}
                                {teamDetails.venue?.city && (
                                    <div className="info-item">
                                        <strong>Location</strong>
                                        <p>{teamDetails.venue.city}, {team.country}</p>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <p className="no-data">Club information not available</p>
                        )}
                    </div>

                    {/* SECTION 2: SEASON STATISTICS */}
                    <div className="modal-section">
                        {statistics ? (
                            <>
                                <div className="stats-header">
                                    <h3 className="section-title" style={{ margin: 0, border: 'none', padding: 0 }}>
                                        📊 Season Statistics
                                    </h3>
                                    <select
                                        className="season-select"
                                        value={selectedSeason}
                                        onChange={(e) => handleSeasonChange(parseInt(e.target.value))}
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        {yearOptions.map(year => (
                                            <option key={year} value={year}>{year - 1}/{year}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="stats-grid">
                                    {/* Fixtures */}
                                    <div className="stat-card">
                                        <h5 className="stat-title">Matches Played</h5>
                                        <p className="stat-value">
                                            {statistics.fixtures?.played?.total || 0}
                                        </p>
                                    </div>

                                    {/* Wins */}
                                    <div className="stat-card wins">
                                        <h5 className="stat-title">Wins</h5>
                                        <p className="stat-value">
                                            {statistics.fixtures?.wins?.total || 0}
                                        </p>
                                    </div>

                                    {/* Draws */}
                                    <div className="stat-card draws">
                                        <h5 className="stat-title">Draws</h5>
                                        <p className="stat-value">
                                            {statistics.fixtures?.draws?.total || 0}
                                        </p>
                                    </div>

                                    {/* Losses */}
                                    <div className="stat-card losses">
                                        <h5 className="stat-title">Losses</h5>
                                        <p className="stat-value">
                                            {statistics.fixtures?.loses?.total || 0}
                                        </p>
                                    </div>

                                    {/* Goals For */}
                                    <div className="stat-card goals-for">
                                        <h5 className="stat-title">Goals Scored</h5>
                                        <p className="stat-value">
                                            {statistics.goals?.for?.total?.total || 0}
                                        </p>
                                    </div>

                                    {/* Goals Against */}
                                    <div className="stat-card goals-against">
                                        <h5 className="stat-title">Goals Conceded</h5>
                                        <p className="stat-value">
                                            {statistics.goals?.against?.total?.total || 0}
                                        </p>
                                    </div>

                                    {/* Clean Sheets */}
                                    <div className="stat-card clean-sheet">
                                        <h5 className="stat-title">Clean Sheets</h5>
                                        <p className="stat-value">
                                            {statistics.clean_sheet?.total || 0}
                                        </p>
                                    </div>

                                    {/* Form */}
                                    {statistics.form && (
                                        <div className="stat-card form">
                                            <h5 className="stat-title">Recent Form</h5>
                                            <p className="stat-value">
                                                {statistics.form}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </>
                        ) : (
                            <div className="no-data">
                                <div className="stats-header">
                                    <h3 className="section-title" style={{ margin: 0, border: 'none', padding: 0 }}>
                                        📊 Season Statistics
                                    </h3>
                                    <select
                                        className="season-select"
                                        value={selectedSeason}
                                        onChange={(e) => handleSeasonChange(parseInt(e.target.value))}
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        {yearOptions.map(year => (
                                            <option key={year} value={year}>{year - 1}/{year}</option>
                                        ))}
                                    </select>
                                </div>
                                <p>No statistics available for the {selectedSeason - 1}/{selectedSeason} season</p>
                            </div>
                        )}
                    </div>

                    {/* SECTION 3: TROPHY CABINET */}
                    <div className="modal-section">
                        <h3 className="section-title">
                            🏆 Trophy Cabinet
                        </h3>

                        {!trophies || trophies.length === 0 ? (
                            <div className="no-data">
                                <p>No trophies recorded in database. Import from Wikipedia to add trophy history.</p>
                            </div>
                        ) : (
                            <div>
                                <div className="trophy-layout">
                                    {trophies.map((category, idx) => {
                                        // Smart category naming
                                        const getCategoryName = (type) => {
                                            if (type === 'championship') return '🏆 Championships';
                                            if (type === 'national_cup') return '🥇 National Cups';
                                            if (type === 'international_cup') return '🌍 International Cups';
                                            if (type === 'World') return '🌍 International';
                                            if (type === 'Europe') return '🌍 European';
                                            if (['England', 'France', 'Spain', 'Italy', 'Germany'].includes(type))
                                                return `🏆 ${type}`;
                                            return `🏆 ${type}`;
                                        };

                                        return (
                                            <div key={idx} className="trophy-category">
                                                <h4 className="category-title">
                                                    {getCategoryName(category.type)}
                                                </h4>
                                                <div className="trophy-grid">
                                                    {category.competitions?.map((comp, cIdx) => (
                                                        <div key={cIdx} className="trophy-card">
                                                            <div className="trophy-header">
                                                                <strong className="trophy-name">{comp.name}</strong>
                                                                <span className="trophy-count">
                                                                    {comp.count}×
                                                                </span>
                                                            </div>
                                                            <div className="trophy-years">
                                                                {comp.years.join(', ')}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                <div className="total-trophies">
                                    <strong>
                                        Total Trophies: {trophies.reduce((sum, cat) =>
                                            sum + (cat.competitions?.reduce((s, c) => s + c.count, 0) || 0), 0
                                        )}
                                    </strong>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TeamDetailModal;
