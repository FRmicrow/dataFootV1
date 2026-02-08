import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

const TeamMapping = () => {
    const [countries, setCountries] = useState([]);
    const [selectedCountry, setSelectedCountry] = useState('');
    const [duplicates, setDuplicates] = useState([]);
    const [loading, setLoading] = useState(false);

    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentPair, setCurrentPair] = useState(null);
    const [targetId, setTargetId] = useState(null);
    const [logs, setLogs] = useState([]);
    const logsEndRef = useRef(null);
    const [showBatchConfirm, setShowBatchConfirm] = useState(false);

    useEffect(() => {
        logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [logs]);

    useEffect(() => {
        fetchCountries();
    }, []);

    useEffect(() => {
        if (selectedCountry) {
            fetchDuplicates(selectedCountry);
        } else {
            setDuplicates([]);
        }
    }, [selectedCountry]);

    const fetchCountries = async () => {
        try {
            const response = await axios.get('/api/admin/countries');
            setCountries(response.data);
        } catch (error) {
            console.error('Error fetching countries:', error);
        }
    };

    const fetchDuplicates = async (countryId) => {
        setLoading(true);
        const params = {};
        if (countryId && countryId !== 'all') {
            params.countryId = countryId;
        }

        try {
            const response = await axios.get(`/api/admin/duplicates`, {
                params
            });
            setDuplicates(response.data);
        } catch (error) {
            console.error('Error fetching duplicates:', error);
        } finally {
            setLoading(false);
        }
    };

    const openMergeModal = (pair) => {
        setCurrentPair(pair);
        // Default target is the one with longer name? Or arbitrary?
        // Let's default to no selection, force user to pick.
        setTargetId(null);
        setIsModalOpen(true);
    };

    const handleMerge = async () => {
        if (!targetId || !currentPair) return;

        const sourceId = targetId === currentPair.id1 ? currentPair.id2 : currentPair.id1;

        try {
            await axios.post('/api/admin/merge-clubs', {
                targetId,
                sourceId
            });

            // Remove from list
            setDuplicates(prev => prev.filter(p => p.id1 !== currentPair.id1 || p.id2 !== currentPair.id2));
            setIsModalOpen(false);
            setCurrentPair(null);
            setTargetId(null);
        } catch (error) {
            console.error('Error merging clubs:', error);
            alert('Failed to merge clubs');
        }
    };

    const handleDuplicateMerge = () => {
        setShowBatchConfirm(true);
    };

    const executeBatchMerge = async () => {
        setShowBatchConfirm(false);
        setLoading(true);
        setLogs([]);
        try {
            setLogs(prev => [...prev, { message: "Starting batch merge (limit 100)...", type: "info" }]);
            const response = await axios.post('/api/admin/cleanup-merge-duplicates', { limit: 100 });
            const data = response.data;
            if (data.success) {
                if (data.groupsFound === 0) {
                    setLogs(prev => [...prev, { message: "✅ No strict duplicates found.", type: "success" }]);
                } else {
                    setLogs(prev => [...prev, { message: `✅ Batch Complete! Found: ${data.groupsFound}, Merged: ${data.groupsMerged}, Deleted: ${data.clubsDeleted}`, type: "success" }]);

                    if (data.details) {
                        data.details.forEach(d => {
                            setLogs(prev => [...prev, {
                                message: `   🔗 ${d.name}: Kept #${d.targetId} <- Merged [${d.sourceIds.join(', ')}] (${d.statsMerged} stats moved)`,
                                type: "detail"
                            }]);
                        });
                    }

                    setLogs(prev => [...prev, { message: "👉 Run again to process more.", type: "info" }]);
                }
                if (selectedCountry) fetchDuplicates(selectedCountry);
            } else {
                setLogs(prev => [...prev, { message: `❌ Error: ${data.error}`, type: "error" }]);
            }
        } catch (error) {
            console.error('Merge duplicates failed:', error);
            setLogs(prev => [...prev, { message: `❌ Failed: ${error.message}`, type: "error" }]);
        } finally {
            setLoading(false);
        }
    };

    const handleMassMerge = async () => {
        if (!window.confirm("Are you sure? This will automatically merge ALL clubs with EXACT NAME MATCHES where one has an API ID and the other doesn't. This cannot be undone.")) {
            return;
        }

        setLoading(true);
        try {
            const response = await axios.post('/api/admin/mass-merge-exact');
            alert(`Mass Merge Complete! Merged ${response.data.mergedCount} pairs.`);
            if (selectedCountry) {
                fetchDuplicates(selectedCountry);
            }
        } catch (error) {
            console.error('Mass merge failed:', error);
            alert('Mass merge failed. Check console.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="team-mapping">
            <h2>Team Mapping & Deduplication</h2>

            <div className="mapping-filters">
                <div className="filter-group">
                    <label>Country</label>
                    <select
                        value={selectedCountry}
                        onChange={(e) => setSelectedCountry(e.target.value)}
                    >
                        <option value="">Select a country...</option>
                        <option value="all">⚡ All Countries (Global Scan)</option>
                        {countries.map(c => (
                            <option key={c.country_id} value={c.country_id}>
                                {c.country_name}
                            </option>
                        ))}
                    </select>
                </div>

                <button
                    className="btn-primary"
                    onClick={handleMassMerge}
                    disabled={loading}
                    style={{ height: 'fit-content', alignSelf: 'center', marginLeft: 'auto', backgroundColor: '#7c3aed' }}
                >
                    ⚡ Mass Merge Exact Matches
                </button>

                <button
                    className="btn-primary"
                    onClick={handleDuplicateMerge}
                    disabled={loading}
                    style={{ height: 'fit-content', alignSelf: 'center', marginLeft: '1rem', backgroundColor: '#f59e0b' }}
                >
                    🔄 Merge Strict Duplicates (Same API+Name)
                </button>
            </div>

            <div className="duplicates-list">
                {loading && <div>Loading duplicates...</div>}

                {!loading && duplicates.length === 0 && selectedCountry && (
                    <div>No potential duplicates found.</div>
                )}

                {duplicates.map((pair, index) => (
                    <div key={`${pair.id1}-${pair.id2}`} className="duplicate-card">
                        <div className="duplicate-pair">
                            <div className="club-item">
                                <span className="club-id">#{pair.id1}</span>
                                {pair.logo1 && <img src={pair.logo1} alt="" className="club-logo" />}
                                <div className="club-details">
                                    <span className="club-name">{pair.name1}</span>
                                    {pair.api_id1 ? (
                                        <span className="api-badge">API: {pair.api_id1}</span>
                                    ) : (
                                        <span className="local-badge">Local Only</span>
                                    )}
                                </div>
                            </div>
                            <div className="club-item">
                                <span className="club-id">#{pair.id2}</span>
                                {pair.logo2 && <img src={pair.logo2} alt="" className="club-logo" />}
                                <div className="club-details">
                                    <span className="club-name">{pair.name2}</span>
                                    {pair.api_id2 ? (
                                        <span className="api-badge">API: {pair.api_id2}</span>
                                    ) : (
                                        <span className="local-badge">Local Only</span>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="merge-actions">
                            <button
                                className="btn-primary"
                                onClick={() => openMergeModal(pair)}
                            >
                                Merge...
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {isModalOpen && currentPair && (
                <div className="admin-modal-overlay">
                    <div className="admin-modal">
                        <div className="admin-modal-header">
                            <h3>Merge Duplicates</h3>
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

            {showBatchConfirm && (
                <div className="admin-modal-overlay">
                    <div className="admin-modal">
                        <div className="admin-modal-header">
                            <h3>⚠️ Confirm Batch Merge</h3>
                        </div>
                        <div className="admin-modal-body">
                            <p>This will merge up to <strong>100 groups</strong> of strict duplicates (Same Name + API ID).</p>
                            <p>This action <strong>cannot be undone</strong>.</p>
                        </div>
                        <div className="admin-modal-footer">
                            <button className="btn-secondary" onClick={() => setShowBatchConfirm(false)}>Cancel</button>
                            <button className="btn-primary" onClick={executeBatchMerge} style={{ backgroundColor: '#f59e0b' }}>
                                Yes, Merge Duplicates
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Logs Area */}
            {logs.length > 0 && (
                <div className="logs-container" style={{ marginTop: '1rem', height: '300px', overflowY: 'auto', background: '#1e293b', color: '#e2e8f0', padding: '1rem', borderRadius: '8px', fontFamily: 'monospace', fontSize: '0.9rem' }}>
                    {logs.map((log, i) => (
                        <div key={i} style={{ marginBottom: '4px', color: log.type === 'error' ? '#f87171' : log.type === 'success' ? '#4ade80' : log.type === 'detail' ? '#94a3b8' : 'inherit' }}>
                            {log.message}
                        </div>
                    ))}
                    <div ref={logsEndRef} />
                </div>
            )}
        </div>
    );
};

export default TeamMapping;
