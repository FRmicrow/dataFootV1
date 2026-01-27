
// NEW TEAM DETAIL MODAL WITH 3 SECTIONS
import React from 'react';

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
            <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '1100px', width: '95%' }}>
                {/* HEADER */}
                <div className="modal-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <img src={team.logo_url} alt={team.name} style={{ width: '60px', height: '60px', objectFit: 'contain' }} />
                        <div>
                            <h2 style={{ margin: 0 }}>{team.name}</h2>
                            {team.country && <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.9rem', color: '#718096' }}>{team.country}</p>}
                        </div>
                    </div>
                    <button className="btn btn-primary btn-small" onClick={() => setSelectedTeam(null)}>Close</button>
                </div>

                <div className="modal-body" style={{ maxHeight: '75vh', overflowY: 'auto', padding: '1.5rem' }}>

                    {/* SECTION 1: CLUB DESCRIPTION */}
                    <div style={{ marginBottom: '2rem', padding: '1.5rem', background: '#f7fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                        <h3 style={{ margin: '0 0 1rem', fontSize: '1.3rem', color: '#2d3748', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            ℹ️ Club Information
                        </h3>
                        {teamDetails && teamDetails.venue ? (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                                {teamDetails.team?.founded && (
                                    <div>
                                        <strong style={{ color: '#4a5568', fontSize: '0.9rem' }}>Founded:</strong>
                                        <p style={{ margin: '0.25rem 0 0', fontSize: '1.1rem', color: '#2d3748' }}>{teamDetails.team.founded}</p>
                                    </div>
                                )}
                                {teamDetails.venue?.name && (
                                    <div>
                                        <strong style={{ color: '#4a5568', fontSize: '0.9rem' }}>Stadium:</strong>
                                        <p style={{ margin: '0.25rem 0 0', fontSize: '1.1rem', color: '#2d3748' }}>{teamDetails.venue.name}</p>
                                    </div>
                                )}
                                {teamDetails.venue?.capacity && (
                                    <div>
                                        <strong style={{ color: '#4a5568', fontSize: '0.9rem' }}>Capacity:</strong>
                                        <p style={{ margin: '0.25rem 0 0', fontSize: '1.1rem', color: '#2d3748' }}>{teamDetails.venue.capacity.toLocaleString()}</p>
                                    </div>
                                )}
                                {teamDetails.venue?.city && (
                                    <div>
                                        <strong style={{ color: '#4a5568', fontSize: '0.9rem' }}>Location:</strong>
                                        <p style={{ margin: '0.25rem 0 0', fontSize: '1.1rem', color: '#2d3748' }}>{teamDetails.venue.city}, {team.country}</p>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <p style={{ color: '#718096', fontStyle: 'italic', margin: 0 }}>Club information not available</p>
                        )}
                    </div>

                    {/* SECTION 2: SEASON STATISTICS */}
                    <div style={{ marginBottom: '2rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                            <h3 style={{ margin: 0, fontSize: '1.3rem', color: '#2d3748', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                📊 Season Statistics
                            </h3>
                            <select
                                value={selectedSeason}
                                onChange={(e) => handleSeasonChange(parseInt(e.target.value))}
                                style={{
                                    padding: '0.5rem 1rem',
                                    fontSize: '1rem',
                                    borderRadius: '8px',
                                    border: '2px solid #e2e8f0',
                                    background: 'white',
                                    cursor: 'pointer',
                                    fontWeight: 'bold',
                                    color: '#2d3748'
                                }}
                            >
                                {yearOptions.map(year => (
                                    <option key={year} value={year}>{year - 1}/{year}</option>
                                ))}
                            </select>
                        </div>

                        {statistics ? (
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                                gap: '1rem',
                                padding: '1.5rem',
                                background: '#ffffff',
                                borderRadius: '12px',
                                border: '1px solid #e2e8f0'
                            }}>
                                {/* Fixtures */}
                                <div style={{ padding: '1rem', background: '#f7fafc', borderRadius: '8px', textAlign: 'center' }}>
                                    <h5 style={{ margin: '0 0 0.75rem', color: '#4a5568', fontSize: '0.9rem', textTransform: 'uppercase' }}>Matches Played</h5>
                                    <p style={{ fontSize: '2rem', fontWeight: 'bold', margin: 0, color: '#2d3748' }}>
                                        {statistics.fixtures?.played?.total || 0}
                                    </p>
                                </div>

                                {/* Wins */}
                                <div style={{ padding: '1rem', background: '#f0fdf4', borderRadius: '8px', textAlign: 'center' }}>
                                    <h5 style={{ margin: '0 0 0.75rem', color: '#15803d', fontSize: '0.9rem', textTransform: 'uppercase' }}>Wins</h5>
                                    <p style={{ fontSize: '2rem', fontWeight: 'bold', margin: 0, color: '#15803d' }}>
                                        {statistics.fixtures?.wins?.total || 0}
                                    </p>
                                </div>

                                {/* Draws */}
                                <div style={{ padding: '1rem', background: '#fffbeb', borderRadius: '8px', textAlign: 'center' }}>
                                    <h5 style={{ margin: '0 0 0.75rem', color: '#b45309', fontSize: '0.9rem', textTransform: 'uppercase' }}>Draws</h5>
                                    <p style={{ fontSize: '2rem', fontWeight: 'bold', margin: 0, color: '#b45309' }}>
                                        {statistics.fixtures?.draws?.total || 0}
                                    </p>
                                </div>

                                {/* Losses */}
                                <div style={{ padding: '1rem', background: '#fef2f2', borderRadius: '8px', textAlign: 'center' }}>
                                    <h5 style={{ margin: '0 0 0.75rem', color: '#dc2626', fontSize: '0.9rem', textTransform: 'uppercase' }}>Losses</h5>
                                    <p style={{ fontSize: '2rem', fontWeight: 'bold', margin: 0, color: '#dc2626' }}>
                                        {statistics.fixtures?.loses?.total || 0}
                                    </p>
                                </div>

                                {/* Goals For */}
                                <div style={{ padding: '1rem', background: '#eff6ff', borderRadius: '8px', textAlign: 'center' }}>
                                    <h5 style={{ margin: '0 0 0.75rem', color: '#1e40af', fontSize: '0.9rem', textTransform: 'uppercase' }}>Goals Scored</h5>
                                    <p style={{ fontSize: '2rem', fontWeight: 'bold', margin: 0, color: '#1e40af' }}>
                                        {statistics.goals?.for?.total?.total || 0}
                                    </p>
                                </div>

                                {/* Goals Against */}
                                <div style={{ padding: '1rem', background: '#fef2f2', borderRadius: '8px', textAlign: 'center' }}>
                                    <h5 style={{ margin: '0 0 0.75rem', color: '#dc2626', fontSize: '0.9rem', textTransform: 'uppercase' }}>Goals Conceded</h5>
                                    <p style={{ fontSize: '2rem', fontWeight: 'bold', margin: 0, color: '#dc2626' }}>
                                        {statistics.goals?.against?.total?.total || 0}
                                    </p>
                                </div>

                                {/* Clean Sheets */}
                                <div style={{ padding: '1rem', background: '#f0f9ff', borderRadius: '8px', textAlign: 'center' }}>
                                    <h5 style={{ margin: '0 0 0.75rem', color: '#0369a1', fontSize: '0.9rem', textTransform: 'uppercase' }}>Clean Sheets</h5>
                                    <p style={{ fontSize: '2rem', fontWeight: 'bold', margin: 0, color: '#0369a1' }}>
                                        {statistics.clean_sheet?.total || 0}
                                    </p>
                                </div>

                                {/* Form */}
                                {statistics.form && (
                                    <div style={{ padding: '1rem', background: '#f5f3ff', borderRadius: '8px', textAlign: 'center' }}>
                                        <h5 style={{ margin: '0 0 0.75rem', color: '#6d28d9', fontSize: '0.9rem', textTransform: 'uppercase' }}>Recent Form</h5>
                                        <p style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: 0, color: '#6d28d9', letterSpacing: '0.1em' }}>
                                            {statistics.form}
                                        </p>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div style={{ padding: '2rem', textAlign: 'center', background: '#f7fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                                <p style={{ color: '#718096', fontStyle: 'italic', margin: 0 }}>
                                    No statistics available for the {selectedSeason - 1}/{selectedSeason} season
                                </p>
                            </div>
                        )}
                    </div>

                    {/* SECTION 3: TROPHY CABINET */}
                    <div style={{ marginBottom: '1rem' }}>
                        <h3 style={{ margin: '0 0 1rem', fontSize: '1.3rem', color: '#2d3748', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            🏆 Trophy Cabinet
                        </h3>

                        {!trophies || trophies.length === 0 ? (
                            <div style={{ padding: '2rem', textAlign: 'center', background: '#f7fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                                <p style={{ color: '#718096', fontStyle: 'italic', margin: 0 }}>
                                    No trophies recorded in database. Import from Wikipedia to add trophy history.
                                </p>
                            </div>
                        ) : (
                            <div>
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
                                        <div key={idx} style={{ marginBottom: '1.5rem' }}>
                                            <h4 style={{ margin: '0 0 0.75rem', color: '#2d3748', fontSize: '1.1rem' }}>
                                                {getCategoryName(category.type)}
                                            </h4>
                                            <div style={{
                                                display: 'grid',
                                                gap: '0.75rem',
                                                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))'
                                            }}>
                                                {category.competitions?.map((comp, cIdx) => (
                                                    <div key={cIdx} style={{
                                                        padding: '1rem',
                                                        background: '#ffffff',
                                                        borderRadius: '8px',
                                                        border: '1px solid #e2e8f0',
                                                        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                                                    }}>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                                            <strong style={{ fontSize: '0.95rem', color: '#2d3748' }}>{comp.name}</strong>
                                                            <span style={{
                                                                background: '#3b82f6',
                                                                color: 'white',
                                                                padding: '0.25rem 0.75rem',
                                                                borderRadius: '12px',
                                                                fontSize: '0.85rem',
                                                                fontWeight: 'bold'
                                                            }}>
                                                                {comp.count}×
                                                            </span>
                                                        </div>
                                                        <div style={{ fontSize: '0.75rem', color: '#718096', lineHeight: '1.5' }}>
                                                            {comp.years.join(', ')}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })}

                                <div style={{
                                    marginTop: '1.5rem',
                                    padding: '1rem',
                                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                    borderRadius: '8px',
                                    textAlign: 'center'
                                }}>
                                    <strong style={{ fontSize: '1.2rem', color: 'white' }}>
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
