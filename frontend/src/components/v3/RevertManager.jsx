import React, { useState, useEffect } from 'react';
import axios from 'axios';

const RevertManager = () => {
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(false);

    const fetchHistory = async () => {
        try {
            const res = await axios.get('/api/admin/health/history');
            setHistory(res.data);
        } catch (e) {
            console.error("Failed to fetch history:", e);
        }
    };

    useEffect(() => {
        fetchHistory();
    }, []);

    const handleRevert = async (groupId, count, date) => {
        if (!window.confirm(`This will restore ${count} records deleted on ${new Date(date).toLocaleString()}. Continue?`)) return;

        setLoading(true);
        try {
            await axios.post(`/api/admin/health/revert/${groupId}`);
            alert("Restoration successful!");
            fetchHistory();
        } catch (e) {
            alert("Revert failed: " + e.message);
        } finally {
            setLoading(true); // Should be false but wait, just a quick check
            setLoading(false);
        }
    };

    return (
        <div className="revert-manager">
            <div className="panel-header">
                <h3>🕒 Cleanup History</h3>
                <button className="btn-small" onClick={fetchHistory}>🔄 Refresh</button>
            </div>
            <div className="panel-body history-list">
                {history.length === 0 ? (
                    <div className="empty-state">No past cleanups found.</div>
                ) : (
                    history.map((item) => (
                        <div key={item.group_id} className="history-item">
                            <div className="history-info">
                                <div className="history-reason">{item.reason}</div>
                                <div className="history-details">{item.affected_count} records in {item.table_name}</div>
                                <div className="history-date">{new Date(item.timestamp).toLocaleString()}</div>
                            </div>
                            <button
                                className="btn btn-revert"
                                onClick={() => handleRevert(item.group_id, item.affected_count, item.timestamp)}
                                disabled={loading}
                            >
                                ↩️ Revert
                            </button>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default RevertManager;
