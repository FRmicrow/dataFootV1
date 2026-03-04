import React, { useState, useEffect } from 'react';
import api from '../../../../services/api';

/**
 * LeagueDiscovery Component (V8 - Forge Intelligence)
 * Shows leagues that are already imported in the DB.
 * Supports multi-selection for batch operations.
 */
const LeagueDiscovery = ({ onSelectBatch, onCancel, importedApiIds = [] }) => {
    const [leagues, setLeagues] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [stagedItems, setStagedItems] = useState([]);

    useEffect(() => {
        fetchLeagues();
    }, []);

    const fetchLeagues = async () => {
        setLoading(true);
        try {
            const data = await api.getImportedLeagues();
            setLeagues(data || []);
        } catch (err) {
            console.error('Failed to fetch leagues', err);
        } finally {
            setLoading(false);
        }
    };

    const filteredLeagues = leagues.filter(l => {
        const term = searchTerm.toLowerCase();
        return (
            l.name?.toLowerCase().includes(term) ||
            l.country_name?.toLowerCase().includes(term)
        );
    });

    const toggleStage = (league) => {
        setStagedItems(prev => {
            const exists = prev.find(s => s.league.id === league.league_id);
            if (exists) return prev.filter(s => s.league.id !== league.league_id);
            return [...prev, { league: { id: league.league_id, api_id: league.api_id, name: league.name } }];
        });
    };

    const isStaged = (id) => stagedItems.some(s => s.league.id === id);

    // Group by country
    const grouped = {};
    filteredLeagues.forEach(l => {
        const country = l.country_name || 'Other';
        if (!grouped[country]) grouped[country] = [];
        grouped[country].push(l);
    });

    return (
        <div style={{
            background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
            border: '1px solid #334155',
            borderRadius: '16px',
            padding: '28px',
            marginBottom: '24px',
            position: 'relative'
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <div>
                    <h3 style={{ color: '#f1f5f9', margin: 0, fontSize: '1.1rem' }}>🔭 League Discovery</h3>
                    <p style={{ color: '#94a3b8', margin: '4px 0 0', fontSize: '0.8rem' }}>
                        Select a league to build models and run simulations
                    </p>
                </div>
                <button onClick={onCancel} style={{
                    background: 'none', border: '1px solid #475569', color: '#94a3b8',
                    borderRadius: '8px', padding: '6px 14px', cursor: 'pointer', fontSize: '0.8rem'
                }}>
                    ✕ Close
                </button>
            </div>

            {/* Search */}
            <div style={{ marginBottom: '16px' }}>
                <input
                    type="text"
                    placeholder="🔍 Search leagues or countries..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{
                        width: '100%', padding: '10px 14px', borderRadius: '10px',
                        border: '1px solid #334155', background: '#0f172a', color: '#e2e8f0',
                        fontSize: '0.85rem', boxSizing: 'border-box'
                    }}
                />
            </div>

            {loading ? (
                <div style={{ color: '#94a3b8', textAlign: 'center', padding: '20px' }}>Loading leagues...</div>
            ) : (
                <div style={{ maxHeight: '400px', overflowY: 'auto', marginBottom: '16px' }}>
                    {Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b)).map(([country, countryLeagues]) => (
                        <div key={country} style={{ marginBottom: '12px' }}>
                            <div style={{
                                color: '#64748b', fontSize: '0.72rem', fontWeight: 600,
                                textTransform: 'uppercase', letterSpacing: '0.5px',
                                padding: '4px 0', borderBottom: '1px solid #1e293b',
                                marginBottom: '6px'
                            }}>
                                {country} ({countryLeagues.length})
                            </div>
                            <div style={{
                                display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                                gap: '8px'
                            }}>
                                {countryLeagues.map(league => (
                                    <div
                                        key={league.league_id}
                                        onClick={() => toggleStage(league)}
                                        style={{
                                            background: isStaged(league.league_id)
                                                ? 'rgba(16, 185, 129, 0.15)'
                                                : 'rgba(30, 41, 59, 0.6)',
                                            border: `1px solid ${isStaged(league.league_id) ? '#10b981' : '#334155'}`,
                                            borderRadius: '10px', padding: '10px 14px', cursor: 'pointer',
                                            display: 'flex', alignItems: 'center', gap: '10px',
                                            transition: 'all 0.2s ease'
                                        }}
                                    >
                                        {league.logo_url && (
                                            <img src={league.logo_url} alt="" style={{ width: 22, height: 22, objectFit: 'contain' }} />
                                        )}
                                        <div style={{ flex: 1 }}>
                                            <div style={{ color: '#e2e8f0', fontSize: '0.82rem', fontWeight: 500 }}>{league.name}</div>
                                            <div style={{ color: '#64748b', fontSize: '0.7rem' }}>
                                                {league.years_imported?.length || 0} seasons imported
                                            </div>
                                        </div>
                                        {isStaged(league.league_id) && (
                                            <span style={{ color: '#10b981', fontWeight: 'bold' }}>✓</span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                    {filteredLeagues.length === 0 && (
                        <div style={{ color: '#64748b', textAlign: 'center', padding: '30px' }}>
                            No leagues found matching "{searchTerm}"
                        </div>
                    )}
                </div>
            )}

            {stagedItems.length > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '12px', borderTop: '1px solid #334155' }}>
                    <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>
                        {stagedItems.length} league{stagedItems.length > 1 ? 's' : ''} selected
                    </span>
                    <button
                        onClick={() => onSelectBatch(stagedItems)}
                        style={{
                            background: 'linear-gradient(135deg, #10b981, #059669)',
                            color: '#fff', border: 'none', borderRadius: '10px',
                            padding: '10px 24px', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem'
                        }}
                    >
                        🚀 Select {stagedItems.length} League{stagedItems.length > 1 ? 's' : ''}
                    </button>
                </div>
            )}
        </div>
    );
};

export default LeagueDiscovery;
