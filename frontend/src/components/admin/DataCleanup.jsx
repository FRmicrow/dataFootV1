import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './DataCleanup.css';

const DataCleanup = () => {
    const [unknowns, setUnknowns] = useState([]);
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [loading, setLoading] = useState(false);

    const [allCompetitions, setAllCompetitions] = useState([]);

    useEffect(() => {
        fetchUnknowns();
        fetchAllCompetitions();
    }, [page]);

    const fetchUnknowns = async () => {
        setLoading(true);
        try {
            const res = await axios.get('/api/admin/cleanup-candidates', { params: { page, limit: 100 } });
            setUnknowns(res.data.unknowns);
            setTotal(res.data.total);
            setTotalPages(res.data.totalPages);
        } catch (error) {
            console.error("Error fetching data:", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchAllCompetitions = async () => {
        try {
            const res = await axios.get('/api/admin/cleanup-competitions');
            setAllCompetitions(res.data);
        } catch (e) {
            console.error('Error fetching competitions:', e);
        }
    };

    const bulkUpdateCompetition = async (orphanedId, newCompetitionId) => {
        if (!confirm(`This will update ALL records with orphaned competition ID ${orphanedId}. Continue?`)) {
            return;
        }

        try {
            const res = await axios.post('/api/admin/cleanup-bulk-update', {
                orphanedCompetitionId: orphanedId,
                newCompetitionId
            });

            alert(`Successfully updated ${res.data.updatedCount} records!`);
            setUnknowns(prev => prev.filter(u => u.orphaned_competition_id !== orphanedId));
        } catch (e) {
            alert("Error updating records: " + e.message);
        }
    };

    return (
        <div className="data-cleanup-container">
            <div className="cleanup-header">
                <h1>Orphaned Competition IDs</h1>
                <p>Fix competition IDs that exist in player statistics but not in the competitions table</p>
                <div className="stats-badge">
                    {total} orphaned IDs • Page {page} of {totalPages}
                </div>
            </div>

            <PaginationControls page={page} totalPages={totalPages} setPage={setPage} total={total} loading={loading} />

            {loading ? (
                <div className="loading-container">
                    <div className="spinner"></div>
                    <p>Loading data...</p>
                </div>
            ) : (
                <div className="cleanup-list">
                    {unknowns.length === 0 && (
                        <div className="empty-state">
                            <div className="empty-icon">✨</div>
                            <h3>No orphaned competition IDs found!</h3>
                            <p>All competition references are valid</p>
                        </div>
                    )}

                    {unknowns.map((item) => (
                        <OrphanedCompetitionRow
                            key={item.orphaned_competition_id}
                            item={item}
                            competitions={allCompetitions}
                            onUpdate={bulkUpdateCompetition}
                        />
                    ))}
                </div>
            )}

            {!loading && unknowns.length > 0 && (
                <div style={{ marginTop: '2rem' }}>
                    <PaginationControls page={page} totalPages={totalPages} setPage={setPage} total={total} loading={loading} />
                </div>
            )}
        </div>
    );
};

const PaginationControls = ({ page, totalPages, setPage, total, loading }) => (
    <div className="pagination-controls">
        <button
            disabled={page <= 1 || loading}
            onClick={() => setPage(p => p - 1)}
            className="pagination-btn"
        >
            ← Previous
        </button>
        <button
            disabled={page >= totalPages || loading}
            onClick={() => setPage(p => p + 1)}
            className="pagination-btn"
        >
            Next →
        </button>
    </div>
);

const OrphanedCompetitionRow = ({ item, competitions, onUpdate }) => {
    const [selectedCompetition, setSelectedCompetition] = useState('');

    const playerName = (item.first_name && item.last_name)
        ? `${item.first_name} ${item.last_name}`
        : (item.first_name || item.last_name || `Player ID: ${item.player_id}`);

    const initials = (item.first_name && item.last_name)
        ? `${item.first_name[0]}${item.last_name[0]}`
        : '?';

    return (
        <div className="stat-card orphaned-card">
            <div className="stat-header">
                <div className="orphaned-badge">
                    <span className="badge-label">Orphaned ID</span>
                    <span className="badge-value">{item.orphaned_competition_id}</span>
                </div>
                <div className="affected-count">
                    {item.affected_records} records affected
                </div>
            </div>

            <div className="stat-body">
                <div className="example-player-section">
                    <h4>Example Player (Most Matches)</h4>
                    <div className="player-card-mini">
                        <div className="player-avatar-small">
                            {initials}
                        </div>
                        <div className="player-details">
                            <div className="player-name">{playerName}</div>
                            <div className="player-meta">
                                <span className="club-name">{item.club_name}</span>
                                <span className="separator">•</span>
                                <span className="season-badge">{item.season}</span>
                                <span className="separator">•</span>
                                <span className="country">{item.country_name || 'Unknown'}</span>
                            </div>
                            <div className="stats-mini">
                                <span>⚽ {item.goals}G</span>
                                <span>🎯 {item.assists}A</span>
                                <span>📊 {item.matches_played}M</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="action-section-bulk">
                    <label>Reassign to Valid Competition</label>
                    <div className="bulk-update-controls">
                        <select
                            className="competition-select"
                            value={selectedCompetition}
                            onChange={(e) => setSelectedCompetition(e.target.value)}
                        >
                            <option value="">Select a competition...</option>
                            {competitions.map(c => (
                                <option key={c.competition_id} value={c.competition_id}>
                                    {c.competition_name} (ID: {c.competition_id})
                                </option>
                            ))}
                        </select>
                        <button
                            className="update-btn"
                            disabled={!selectedCompetition}
                            onClick={() => onUpdate(item.orphaned_competition_id, selectedCompetition)}
                        >
                            Update All {item.affected_records} Records
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DataCleanup;
