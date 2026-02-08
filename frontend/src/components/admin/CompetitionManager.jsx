import React, { useState, useEffect } from 'react';
import axios from 'axios';

const CompetitionManager = () => {
    const [duplicates, setDuplicates] = useState([]);
    const [loading, setLoading] = useState(false);

    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentPair, setCurrentPair] = useState(null);
    const [targetId, setTargetId] = useState(null);

    useEffect(() => {
        fetchDuplicates();
    }, []);

    const fetchDuplicates = async () => {
        setLoading(true);
        try {
            const response = await axios.get('/api/admin/duplicate-competitions');
            setDuplicates(response.data);
        } catch (error) {
            console.error('Error fetching duplicate competitions:', error);
        } finally {
            setLoading(false);
        }
    };

    const openMergeModal = (pair) => {
        setCurrentPair(pair);
        setTargetId(null); // Force user to pick
        setIsModalOpen(true);
    };

    const handleMerge = async () => {
        if (!targetId || !currentPair) return;

        const sourceId = targetId === currentPair.id1 ? currentPair.id2 : currentPair.id1;

        try {
            await axios.post('/api/admin/merge-competitions', {
                targetId,
                sourceId
            });

            // Remove from list
            setDuplicates(prev => prev.filter(p => p.id1 !== currentPair.id1 || p.id2 !== currentPair.id2));
            setIsModalOpen(false);
            setCurrentPair(null);
            setTargetId(null);
        } catch (error) {
            console.error('Error merging competitions:', error);
            alert('Failed to merge competitions');
        }
    };

    return (
        <div className="competition-manager">
            <h2>Competition Manager - Duplicate Detection</h2>
            <p>Find and merge duplicate competition entries in the database.</p>

            <div className="duplicates-list">
                {loading && <div>Loading duplicates...</div>}

                {!loading && duplicates.length === 0 && (
                    <div style={{ padding: '2rem', background: '#f0fdf4', color: '#15803d', borderRadius: '8px' }}>
                        No duplicate competitions found! 🎉
                    </div>
                )}

                {duplicates.map((pair, index) => (
                    <div key={`${pair.id1}-${pair.id2}`} className="duplicate-card">
                        <div className="duplicate-header">
                            <span className="match-reason">{pair.reason}</span>
                        </div>
                        <div className="duplicate-pair">
                            <div className="competition-item">
                                <div className="competition-header">
                                    <span className="competition-id">#{pair.id1}</span>
                                    {pair.flag1 && (
                                        <img src={pair.flag1} alt={pair.country1} className="country-flag" />
                                    )}
                                </div>
                                <div className="competition-details">
                                    <div className="competition-name">{pair.name1}</div>
                                    {pair.short_name1 && (
                                        <div className="competition-meta">
                                            <span className="label">Short:</span> {pair.short_name1}
                                        </div>
                                    )}
                                    {pair.country1 && (
                                        <div className="competition-meta">
                                            <span className="label">Country:</span> {pair.country1}
                                        </div>
                                    )}
                                    {pair.trophy_type1 && (
                                        <div className="competition-meta">
                                            <span className="label">Type:</span> {pair.trophy_type1}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="vs-separator">VS</div>

                            <div className="competition-item">
                                <div className="competition-header">
                                    <span className="competition-id">#{pair.id2}</span>
                                    {pair.flag2 && (
                                        <img src={pair.flag2} alt={pair.country2} className="country-flag" />
                                    )}
                                </div>
                                <div className="competition-details">
                                    <div className="competition-name">{pair.name2}</div>
                                    {pair.short_name2 && (
                                        <div className="competition-meta">
                                            <span className="label">Short:</span> {pair.short_name2}
                                        </div>
                                    )}
                                    {pair.country2 && (
                                        <div className="competition-meta">
                                            <span className="label">Country:</span> {pair.country2}
                                        </div>
                                    )}
                                    {pair.trophy_type2 && (
                                        <div className="competition-meta">
                                            <span className="label">Type:</span> {pair.trophy_type2}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="merge-actions">
                            <button
                                className="btn-primary"
                                onClick={() => openMergeModal(pair)}
                            >
                                Merge
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {isModalOpen && currentPair && (
                <div className="admin-modal-overlay">
                    <div className="admin-modal">
                        <div className="admin-modal-header">
                            <h3>Merge Duplicate Competitions</h3>
                            <p>Select the version you want to <strong>KEEP</strong> (Target). The other will be merged into it and deleted.</p>
                        </div>
                        <div className="admin-modal-body">
                            <div className="merge-comparison">
                                <div
                                    className={`merge-option ${targetId === currentPair.id1 ? 'target' : targetId === currentPair.id2 ? 'source' : ''}`}
                                    onClick={() => setTargetId(currentPair.id1)}
                                >
                                    <h4>Option A</h4>
                                    <p><strong>{currentPair.name1}</strong></p>
                                    {currentPair.short_name1 && <p>Short: {currentPair.short_name1}</p>}
                                    {currentPair.country1 && <p>Country: {currentPair.country1}</p>}
                                    {currentPair.trophy_type1 && <p>Type: {currentPair.trophy_type1}</p>}
                                    <p>ID: {currentPair.id1}</p>
                                    {targetId === currentPair.id1 && <span className="badge">Surviving</span>}
                                    {targetId === currentPair.id2 && <span className="badge warning">Will be deleted</span>}
                                </div>

                                <div
                                    className={`merge-option ${targetId === currentPair.id2 ? 'target' : targetId === currentPair.id1 ? 'source' : ''}`}
                                    onClick={() => setTargetId(currentPair.id2)}
                                >
                                    <h4>Option B</h4>
                                    <p><strong>{currentPair.name2}</strong></p>
                                    {currentPair.short_name2 && <p>Short: {currentPair.short_name2}</p>}
                                    {currentPair.country2 && <p>Country: {currentPair.country2}</p>}
                                    {currentPair.trophy_type2 && <p>Type: {currentPair.trophy_type2}</p>}
                                    <p>ID: {currentPair.id2}</p>
                                    {targetId === currentPair.id2 && <span className="badge">Surviving</span>}
                                    {targetId === currentPair.id1 && <span className="badge warning">Will be deleted</span>}
                                </div>
                            </div>
                        </div>
                        <div className="admin-modal-footer">
                            <button className="btn-secondary" onClick={() => setIsModalOpen(false)}>Cancel</button>
                            <button
                                className="btn-primary"
                                disabled={!targetId}
                                onClick={handleMerge}
                            >
                                Confirm Merge
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CompetitionManager;
