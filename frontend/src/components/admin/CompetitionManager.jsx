import React, { useState, useEffect } from 'react';
import axios from 'axios';

const CompetitionManager = () => {
    const [competitions, setCompetitions] = useState([]);
    const [trophyTypes, setTrophyTypes] = useState([]);
    const [selectedTypes, setSelectedTypes] = useState({}); // { compId: typeId }
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [compRes, typeRes] = await Promise.all([
                axios.get('/api/admin/uncategorized-competitions'),
                axios.get('/api/admin/trophy-types')
            ]);
            setCompetitions(compRes.data);
            setTrophyTypes(typeRes.data);
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSelectChange = (compId, typeId) => {
        setSelectedTypes(prev => ({ ...prev, [compId]: typeId }));
    };

    const handleSetTrophy = async (compId) => {
        const typeId = selectedTypes[compId];
        if (!typeId) return;

        try {
            await axios.post('/api/admin/set-trophy-type', {
                competitionId: compId,
                trophyTypeId: typeId
            });
            // Remove from list
            setCompetitions(prev => prev.filter(c => c.competition_id !== compId));
            // Clear selection
            const newSel = { ...selectedTypes };
            delete newSel[compId];
            setSelectedTypes(newSel);
        } catch (error) {
            console.error('Error updating trophy type:', error);
            alert('Failed to update.');
        }
    };

    if (loading) return <div>Loading...</div>;

    return (
        <div className="competition-manager" style={{ padding: '2rem' }}>
            <h2>Competition Manager</h2>
            <p>Assign trophy types to competitions that are currently uncategorized.</p>

            {competitions.length === 0 ? (
                <div style={{ padding: '2rem', background: '#f0fdf4', color: '#15803d', borderRadius: '8px' }}>
                    All competitions are categorized! 🎉
                </div>
            ) : (
                <div className="competition-list" style={{ display: 'grid', gap: '1rem' }}>
                    {competitions.map(comp => (
                        <div key={comp.competition_id} style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            background: 'white', padding: '1rem', borderRadius: '8px',
                            border: '1px solid #e2e8f0'
                        }}>
                            <div>
                                <strong style={{ fontSize: '1.1rem' }}>{comp.competition_name}</strong>
                                <span style={{ marginLeft: '10px', color: '#64748b', fontSize: '0.9rem' }}>
                                    (ID: {comp.competition_id})
                                </span>
                            </div>

                            <div style={{ display: 'flex', gap: '10px' }}>
                                <select
                                    value={selectedTypes[comp.competition_id] || ''}
                                    onChange={(e) => handleSelectChange(comp.competition_id, e.target.value)}
                                    style={{ padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                                >
                                    <option value="">Select Type...</option>
                                    {trophyTypes.map(type => (
                                        <option key={type.trophy_type_id} value={type.trophy_type_id}>
                                            {type.type_name}
                                        </option>
                                    ))}
                                </select>
                                <button
                                    onClick={() => handleSetTrophy(comp.competition_id)}
                                    disabled={!selectedTypes[comp.competition_id]}
                                    style={{
                                        padding: '8px 16px', borderRadius: '4px', border: 'none',
                                        backgroundColor: !selectedTypes[comp.competition_id] ? '#e2e8f0' : '#3b82f6',
                                        color: !selectedTypes[comp.competition_id] ? '#94a3b8' : 'white',
                                        cursor: !selectedTypes[comp.competition_id] ? 'not-allowed' : 'pointer'
                                    }}
                                >
                                    Set Trophy
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default CompetitionManager;
