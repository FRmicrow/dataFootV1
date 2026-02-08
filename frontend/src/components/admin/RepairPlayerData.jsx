import React, { useState, useRef, useEffect } from 'react';

const RepairPlayerData = () => {
    const [scanning, setScanning] = useState(false);
    const [fixing, setFixing] = useState(false);
    const [logs, setLogs] = useState([]);
    const [scanResult, setScanResult] = useState(null);
    const [fixResult, setFixResult] = useState(null);
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
        return () => {
            if (eventSourceRef.current) {
                eventSourceRef.current.close();
            }
        };
    }, []);

    const handleScan = async () => {
        setScanning(true);
        setError(null);
        setScanResult(null);
        setLogs([]);

        try {
            if (eventSourceRef.current) {
                eventSourceRef.current.close();
            }

            const eventSource = new EventSource('http://localhost:3001/api/admin/scan-missing-competitions');
            eventSourceRef.current = eventSource;

            eventSource.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);

                    if (data.type === 'complete') {
                        if (data.stats) {
                            setScanResult({
                                totalMissing: data.stats.totalIssues,
                                nullCount: data.stats.nullCount,
                                orphanedCount: data.stats.orphanedCount,
                                topPlayers: data.playerBreakdown
                            });
                        } else {
                            setScanResult({
                                totalMissing: data.totalMissing,
                                affectedPlayers: data.affectedPlayers,
                                affectedClubs: data.affectedClubs,
                                topPlayers: data.topPlayers
                            });
                        }
                        eventSource.close();
                        setScanning(false);
                    } else if (data.type === 'error') {
                        setError(data.message);
                        eventSource.close();
                        setScanning(false);
                    } else {
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
                setScanning(false);
            };

        } catch (err) {
            console.error('Error starting scan:', err);
            setError('Failed to start scan');
            setScanning(false);
        }
    };

    const handleFix = async () => {
        if (!window.confirm('This will call the API-Football API to fix all missing competition data. This may take several minutes and consume API credits. Continue?')) {
            return;
        }

        setFixing(true);
        setError(null);
        setFixResult(null);
        setLogs([]);

        try {
            if (eventSourceRef.current) {
                eventSourceRef.current.close();
            }

            const eventSource = new EventSource('http://localhost:3001/api/admin/fix-all-missing-competitions');
            eventSourceRef.current = eventSource;

            eventSource.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);

                    if (data.type === 'complete') {
                        setFixResult({
                            totalFixed: data.totalFixed,
                            totalErrors: data.totalErrors,
                            apiCalls: data.apiCalls,
                            processed: data.processed
                        });
                        eventSource.close();
                        setFixing(false);
                    } else if (data.type === 'error') {
                        setError(data.message);
                        eventSource.close();
                        setFixing(false);
                    } else {
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
                setFixing(false);
            };

        } catch (err) {
            console.error('Error starting fix:', err);
            setError('Failed to start repair');
            setFixing(false);
        }
    };

    const handleMergeClubs = async () => {
        if (!window.confirm('This will merge all clubs sharing the same Name & API ID. This cannot be undone. Continue?')) return;

        setFixing(true);
        setError(null);
        setLogs([]);

        try {
            setLogs(prev => [...prev, { message: "Starting merge process...", type: "info" }]);
            const response = await fetch('http://localhost:3001/api/admin/cleanup-merge-duplicates', { method: 'POST' });
            const data = await response.json();

            if (data.success) {
                setLogs(prev => [...prev, {
                    message: `✅ Found ${data.groupsFound} duplicate groups.`,
                    type: 'success'
                }]);
                setLogs(prev => [...prev, {
                    message: `✅ Merged ${data.groupsMerged} groups.`,
                    type: 'success'
                }]);
                setLogs(prev => [...prev, {
                    message: `🗑️ Deleted ${data.clubsDeleted} duplicate clubs.`,
                    type: 'success'
                }]);
                alert(`Merge Complete!\nGroups Found: ${data.groupsFound}\nClubs Deleted: ${data.clubsDeleted}`);
            } else {
                setError(data.error);
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setFixing(false);
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
        <div className="repair-player-data" style={{ padding: '2rem', maxWidth: '1200px' }}>
            <h2>Repair Player Data</h2>
            <p>
                This tool scans and fixes missing competition data in player statistics.
                Records with "Unknown" competition will be matched with actual competitions from the API-Football API.
            </p>

            <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem' }}>
                <button
                    onClick={handleScan}
                    disabled={scanning || fixing}
                    style={{
                        padding: '12px 24px',
                        fontSize: '16px',
                        backgroundColor: scanning ? '#94a3b8' : '#3b82f6',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: scanning || fixing ? 'not-allowed' : 'pointer',
                        fontWeight: 'bold'
                    }}
                >
                    {scanning ? 'Scanning...' : '🔍 Scan Data'}
                </button>

                <button
                    onClick={handleFix}
                    disabled={scanning || fixing || !scanResult}
                    style={{
                        padding: '12px 24px',
                        fontSize: '16px',
                        backgroundColor: fixing ? '#94a3b8' : scanResult ? '#10b981' : '#d1d5db',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: scanning || fixing || !scanResult ? 'not-allowed' : 'pointer',
                        fontWeight: 'bold'
                    }}
                >
                    {fixing ? 'Repairing...' : '🔧 Repair All'}
                </button>

                <button
                    onClick={async () => {
                        if (!window.confirm('This will search API-Football for missing competition IDs by name. Continue?')) return;
                        setFixing(true);
                        setError(null);
                        setLogs([]);

                        try {
                            if (eventSourceRef.current) eventSourceRef.current.close();
                            const es = new EventSource('http://localhost:3001/api/admin/fix-competition-ids');
                            eventSourceRef.current = es;

                            es.onmessage = (e) => {
                                const data = JSON.parse(e.data);
                                if (data.type === 'complete') {
                                    setFixing(false);
                                    es.close();
                                    alert(`Finished! Fixed: ${data.fixed}, Errors: ${data.errors}`);
                                } else if (data.type === 'error') {
                                    setError(data.message);
                                    setFixing(false);
                                    es.close();
                                } else {
                                    setLogs(prev => [...prev, { message: data.message, type: data.type, timestamp: new Date() }]);
                                }
                            };
                            es.onerror = () => { setError('Connection failed'); setFixing(false); es.close(); };
                        } catch (e) {
                            setError(e.message);
                            setFixing(false);
                        }
                    }}
                    disabled={scanning || fixing}
                    style={{
                        padding: '12px 24px',
                        fontSize: '16px',
                        backgroundColor: fixing ? '#94a3b8' : '#8b5cf6',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: scanning || fixing ? 'not-allowed' : 'pointer',
                        fontWeight: 'bold'
                    }}
                >
                    {fixing ? 'Working...' : '🆔 Fix Competition IDs'}
                </button>

                <button
                    onClick={handleMergeClubs}
                    disabled={scanning || fixing}
                    style={{
                        padding: '12px 24px',
                        fontSize: '16px',
                        backgroundColor: fixing ? '#94a3b8' : '#f59e0b',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: scanning || fixing ? 'not-allowed' : 'pointer',
                        fontWeight: 'bold'
                    }}
                >
                    {fixing ? 'Merging...' : '🔄 Merge Duplicate Clubs'}
                </button>
            </div>

            {
                scanResult && !fixing && (
                    <div style={{
                        marginTop: '2rem',
                        padding: '1.5rem',
                        backgroundColor: '#fef3c7',
                        border: '2px solid #f59e0b',
                        borderRadius: '8px'
                    }}>
                        <h3 style={{ color: '#92400e', marginTop: 0 }}>📊 Scan Results</h3>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                            <div style={{ background: 'white', padding: '10px', borderRadius: '4px' }}>
                                <div style={{ fontSize: '0.9em', color: '#666' }}>Total Issues</div>
                                <div style={{ fontSize: '1.5em', fontWeight: 'bold' }}>{scanResult.totalMissing.toLocaleString()}</div>
                            </div>
                            <div style={{ background: 'white', padding: '10px', borderRadius: '4px' }}>
                                <div style={{ fontSize: '0.9em', color: '#666' }}>Missing (NULL)</div>
                                <div style={{ fontSize: '1.5em', fontWeight: 'bold', color: '#eab308' }}>{scanResult.nullCount?.toLocaleString() || '-'}</div>
                            </div>
                            <div style={{ background: 'white', padding: '10px', borderRadius: '4px' }}>
                                <div style={{ fontSize: '0.9em', color: '#666' }}>Invalid (Orphaned)</div>
                                <div style={{ fontSize: '1.5em', fontWeight: 'bold', color: '#ef4444' }}>{scanResult.orphanedCount?.toLocaleString() || '-'}</div>
                            </div>
                        </div>

                        {scanResult.topPlayers && scanResult.topPlayers.length > 0 && (
                            <div style={{ marginTop: '1rem' }}>
                                <strong>Top Players with Missing Data:</strong>
                                <ul style={{ marginTop: '0.5rem', marginBottom: 0 }}>
                                    {scanResult.topPlayers.slice(0, 10).map((p, idx) => (
                                        <li key={idx}>{p.first_name} {p.last_name}: {p.missing_count} records</li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                )
            }

            {
                logs.length > 0 && (
                    <div style={{
                        marginTop: '2rem',
                        padding: '1.5rem',
                        backgroundColor: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        maxHeight: '400px',
                        overflowY: 'auto',
                        fontFamily: 'monospace',
                        fontSize: '13px'
                    }}>
                        <h3 style={{ marginTop: 0, marginBottom: '1rem' }}>📋 Logs</h3>
                        {logs.map((log, index) => (
                            <div key={index} style={{
                                marginBottom: '0.3rem',
                                ...getLogStyle(log.type)
                            }}>
                                {log.message}
                            </div>
                        ))}
                        <div ref={logsEndRef} />
                    </div>
                )
            }

            {
                fixResult && (
                    <div style={{
                        marginTop: '2rem',
                        padding: '1.5rem',
                        backgroundColor: '#f0fdf4',
                        border: '2px solid #22c55e',
                        borderRadius: '8px'
                    }}>
                        <h3 style={{ color: '#15803d', marginTop: 0 }}>✅ Repair Complete!</h3>
                        <p><strong>Records Fixed:</strong> {fixResult.totalFixed.toLocaleString()}</p>
                        <p><strong>Errors:</strong> {fixResult.totalErrors.toLocaleString()}</p>
                        <p><strong>API Calls Made:</strong> {fixResult.apiCalls.toLocaleString()}</p>
                        <p style={{ marginBottom: 0 }}><strong>Total Processed:</strong> {fixResult.processed.toLocaleString()}</p>
                    </div>
                )
            }

            {
                error && (
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
                )
            }
        </div >
    );
};

export default RepairPlayerData;
