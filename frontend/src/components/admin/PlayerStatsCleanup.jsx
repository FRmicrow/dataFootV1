import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';

const PlayerStatsCleanup = () => {
    const [loading, setLoading] = useState(false);
    const [logs, setLogs] = useState([]);
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);
    const logsEndRef = useRef(null);
    const eventSourceRef = useRef(null);

    const scrollToBottom = () => {
        logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [logs]);

    useEffect(() => {
        // Cleanup on unmount
        return () => {
            if (eventSourceRef.current) {
                eventSourceRef.current.close();
            }
        };
    }, []);

    const handleCleanup = async () => {
        if (!window.confirm('This will merge duplicate player statistics entries. Continue?')) {
            return;
        }

        setLoading(true);
        setError(null);
        setResult(null);
        setLogs([]);

        try {
            // Close any existing connection
            if (eventSourceRef.current) {
                eventSourceRef.current.close();
            }

            // Create new EventSource
            const eventSource = new EventSource('http://localhost:3001/api/admin/cleanup-duplicate-player-stats');
            eventSourceRef.current = eventSource;

            eventSource.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);

                    if (data.type === 'complete') {
                        setResult({
                            groupsMerged: data.groupsMerged,
                            recordsDeleted: data.recordsDeleted
                        });
                        eventSource.close();
                        setLoading(false);
                    } else if (data.type === 'error') {
                        setError(data.message);
                        eventSource.close();
                        setLoading(false);
                    } else {
                        // Add log message
                        setLogs(prev => [...prev, {
                            message: data.message,
                            type: data.type,
                            timestamp: new Date()
                        }]);
                    }
                } catch (e) {
                    console.error('Error parsing message:', e);
                }
            };

            eventSource.onerror = (err) => {
                console.error('EventSource error:', err);
                setError('Connection error occurred');
                eventSource.close();
                setLoading(false);
            };

        } catch (err) {
            console.error('Error starting cleanup:', err);
            setError('Failed to start cleanup');
            setLoading(false);
        }
    };

    const getLogStyle = (type) => {
        switch (type) {
            case 'success':
                return { color: '#15803d', fontWeight: 'bold' };
            case 'error':
                return { color: '#dc2626', fontWeight: 'bold' };
            case 'progress':
                return { color: '#2563eb', fontWeight: '500' };
            default:
                return { color: '#64748b' };
        }
    };

    return (
        <div className="player-stats-cleanup" style={{ padding: '2rem', maxWidth: '1200px' }}>
            <h2>Player Statistics Cleanup</h2>
            <p>
                This tool will find and merge duplicate player statistics entries where:
            </p>
            <ul>
                <li>Same player, club, year, matches, goals, and assists</li>
                <li>But different competition assignments</li>
            </ul>
            <p>
                The entry with the <strong>lowest competition_id</strong> will be kept, and duplicates will be merged into it.
            </p>

            <div style={{ marginTop: '2rem' }}>
                <button
                    onClick={handleCleanup}
                    disabled={loading}
                    style={{
                        padding: '12px 24px',
                        fontSize: '16px',
                        backgroundColor: loading ? '#94a3b8' : '#ef4444',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: loading ? 'not-allowed' : 'pointer',
                        fontWeight: 'bold'
                    }}
                >
                    {loading ? 'Cleaning up...' : '🧹 Run Cleanup'}
                </button>
            </div>

            {logs.length > 0 && (
                <div style={{
                    marginTop: '2rem',
                    padding: '1.5rem',
                    backgroundColor: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    maxHeight: '400px',
                    overflowY: 'auto',
                    fontFamily: 'monospace',
                    fontSize: '14px'
                }}>
                    <h3 style={{ marginTop: 0, marginBottom: '1rem' }}>📋 Cleanup Logs</h3>
                    {logs.map((log, index) => (
                        <div key={index} style={{
                            marginBottom: '0.5rem',
                            ...getLogStyle(log.type)
                        }}>
                            {log.message}
                        </div>
                    ))}
                    <div ref={logsEndRef} />
                </div>
            )}

            {result && (
                <div style={{
                    marginTop: '2rem',
                    padding: '1.5rem',
                    backgroundColor: '#f0fdf4',
                    border: '2px solid #22c55e',
                    borderRadius: '8px'
                }}>
                    <h3 style={{ color: '#15803d', marginTop: 0 }}>✅ Cleanup Successful!</h3>
                    <p><strong>Groups Merged:</strong> {result.groupsMerged.toLocaleString()}</p>
                    <p><strong>Records Deleted:</strong> {result.recordsDeleted.toLocaleString()}</p>
                    <p style={{ marginBottom: 0 }}>All duplicate player statistics have been cleaned up successfully.</p>
                </div>
            )}

            {error && (
                <div style={{
                    marginTop: '2rem',
                    padding: '1.5rem',
                    backgroundColor: '#fef2f2',
                    border: '2px solid #ef4444',
                    borderRadius: '8px',
                    color: '#991b1b'
                }}>
                    <h3 style={{ marginTop: 0 }}>❌ Error</h3>
                    <p style={{ marginBottom: 0 }}>{error}</p>
                </div>
            )}
        </div>
    );
};

export default PlayerStatsCleanup;
