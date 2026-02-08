import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

const ImportPlayersV2 = () => {
    // Test State
    const [testId, setTestId] = useState('');
    const [testSeason, setTestSeason] = useState('2024');
    const [testResult, setTestResult] = useState(null);
    const [testing, setTesting] = useState(false);

    // Bulk State
    const [startId, setStartId] = useState(1);
    const [endId, setEndId] = useState(100);
    const [importing, setImporting] = useState(false);
    const [logs, setLogs] = useState([]);
    const [result, setResult] = useState(null);
    const [stats, setStats] = useState({ rate: 0, importedStats: 0 });
    const [lastProcessed, setLastProcessed] = useState(null);

    const logsEndRef = useRef(null);
    const eventSourceRef = useRef(null);

    const scrollToBottom = () => {
        logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [logs]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (eventSourceRef.current) eventSourceRef.current.close();
        };
    }, []);

    const handleTest = async () => {
        if (!testId || !testSeason) {
            alert("Please enter Player ID and Season");
            return;
        }
        setTesting(true);
        setTestResult(null);
        try {
            const res = await axios.post('/api/admin/import-player-v2', { playerId: testId, season: testSeason });
            setTestResult(res.data);
        } catch (err) {
            setTestResult({ error: err.response?.data?.error || err.message });
        } finally {
            setTesting(false);
        }
    };

    const stopImport = () => {
        if (eventSourceRef.current) {
            eventSourceRef.current.close();
            eventSourceRef.current = null;
        }
        setImporting(false);
        setLogs(prev => [...prev, { message: '🛑 Import Stopped by User', type: 'error' }]);
    };

    const handleBulkImport = (customStart, customEnd, customMode) => {
        const s = customStart || startId;
        const e = customEnd || endId;
        const m = customMode || 'default';

        if (importing) return;

        setImporting(true);
        setLogs(prev => customStart ? prev : []); // Clear logs if new run, keep if resume? Maybe clear best.
        if (!customStart) setLogs([]);

        setResult(null);

        // Reset stats if new run
        if (!customStart) setStats({ rate: 0, importedStats: 0 });

        const url = `/api/admin/import-players-range-v2?start=${s}&end=${e}&mode=${m}`;
        const eventSource = new EventSource(url);
        eventSourceRef.current = eventSource;

        eventSource.onmessage = (event) => {
            const data = JSON.parse(event.data);

            if (data.type === 'complete') {
                setResult(data);
                setImporting(false);
                eventSource.close();
                eventSourceRef.current = null;
            } else if (data.type === 'error') {
                setLogs(prev => [...prev, { message: `❌ Error: ${data.message}`, type: 'error' }]);
                setImporting(false);
                eventSource.close();
                eventSourceRef.current = null;
            } else if (data.type === 'progress') {
                setLastProcessed(data.currentId);
                setStats({ rate: data.rate, importedStats: data.importedStats });
                setLogs(prev => [...prev, data]);
            } else if (data.type === 'skip') {
                // Determine if we should show skip logs (could be spammy if thousands)
                // Maybe only show every 100th skip log or update a counter
                setStats(prev => ({ ...prev, rate: data.rate }));
                setLogs(prev => {
                    // filtering previous similar logs could be good but simple is fine
                    return [...prev, data];
                });
            } else {
                setLogs(prev => [...prev, data]);
            }
        };

        eventSource.onerror = (err) => {
            if (eventSource.readyState === EventSource.CLOSED) return;

            setLogs(prev => [...prev, { message: '⚠️ Connection interrupted', type: 'error' }]);
            setImporting(false);
            eventSource.close();
            eventSourceRef.current = null;
        };
    };

    const handleResume = () => {
        if (lastProcessed) {
            const nextId = parseInt(lastProcessed) + 1;
            if (nextId <= endId) {
                setStartId(nextId); // Update input
                handleBulkImport(nextId, endId);
            } else {
                alert("Already finished range!");
            }
        }
    };

    return (
        <div style={{ padding: '2rem' }}>
            <h1 style={{ marginBottom: '1rem', color: '#1e293b' }}>⚡ Import Players V2 (Optimized)</h1>
            <p className="page-description">
                Optimized import using the "Player Season" endpoint. Fetches all statistics for a player in a specific season in a SINGLE API call.
            </p>

            {/* Test Section */}
            <div className="card" style={{ marginBottom: '2rem', padding: '1.5rem', background: 'white', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.5rem' }}>🧪 Test Single Import</h2>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <label style={{ fontWeight: '500', color: '#64748b' }}>Player ID</label>
                        <input
                            type="number"
                            value={testId}
                            onChange={e => setTestId(e.target.value)}
                            placeholder="e.g. 874"
                            style={{ padding: '0.5rem', border: '1px solid #e2e8f0', borderRadius: '4px' }}
                        />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <label style={{ fontWeight: '500', color: '#64748b' }}>Season</label>
                        <input
                            type="number"
                            value={testSeason}
                            onChange={e => setTestSeason(e.target.value)}
                            placeholder="e.g. 2008"
                            style={{ padding: '0.5rem', border: '1px solid #e2e8f0', borderRadius: '4px' }}
                        />
                    </div>
                    <button
                        onClick={handleTest}
                        disabled={testing}
                        className="btn-primary"
                        style={{ height: '38px' }}
                    >
                        {testing ? 'Testing...' : 'Test Import'}
                    </button>
                </div>
                {testResult && (
                    <div style={{ marginTop: '1rem', background: '#f8fafc', padding: '1rem', borderRadius: '4px', overflow: 'auto', maxHeight: '300px', fontSize: '0.875rem' }}>
                        <pre>{JSON.stringify(testResult, null, 2)}</pre>
                    </div>
                )}
            </div>

            {/* Bulk Section */}
            <div className="card" style={{ padding: '1.5rem', background: 'white', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.5rem' }}>
                    <h2 style={{ fontSize: '1.25rem', margin: 0 }}>🚀 Bulk Import</h2>
                    {stats.rate > 0 && (
                        <div style={{ fontSize: '0.9rem', color: '#059669', background: '#ecfdf5', padding: '4px 8px', borderRadius: '4px', border: '1px solid #6ee7b7' }}>
                            🚀 Speed: <strong>{stats.rate}</strong> players/min | 📥 Stats Imported: <strong>{stats.importedStats}</strong>
                        </div>
                    )}
                </div>

                <div className="import-controls" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <button className="btn-primary" onClick={() => handleBulkImport(1, 1000)} disabled={importing}>1-1000</button>
                        <button className="btn-primary" onClick={() => handleBulkImport(1001, 2000)} disabled={importing}>1001-2000</button>
                        <button
                            className="btn-primary"
                            onClick={() => handleBulkImport(1781, 10000, 'missing_and_incomplete')}
                            disabled={importing}
                            style={{ background: '#f59e0b', borderColor: '#d97706' }}
                        >
                            🔧 Repair 1-10k
                        </button>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginLeft: 'auto', background: '#f8fafc', padding: '0.5rem', borderRadius: '4px' }}>
                        <span style={{ fontSize: '0.9rem', fontWeight: '500' }}>Custom Range:</span>
                        <input type="number" value={startId} onChange={e => setStartId(e.target.value)} style={{ width: '70px', padding: '4px', border: '1px solid #e2e8f0' }} />
                        <span>to</span>
                        <input type="number" value={endId} onChange={e => setEndId(e.target.value)} style={{ width: '70px', padding: '4px', border: '1px solid #e2e8f0' }} />

                        {!importing ? (
                            <button className="btn-secondary" onClick={() => handleBulkImport()} disabled={importing}>Run</button>
                        ) : (
                            <button className="btn-secondary" onClick={stopImport} style={{ background: '#fee2e2', color: '#ef4444', borderColor: '#fca5a5' }}>⛔ Stop</button>
                        )}
                    </div>
                </div>

                {/* Resume Button */}
                {!importing && lastProcessed && parseInt(lastProcessed) < endId && (
                    <div style={{ marginBottom: '1rem', padding: '0.5rem', background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <span style={{ color: '#b45309' }}>⚠️ Import stopped at ID <strong>{lastProcessed}</strong>.</span>
                        <button onClick={handleResume} style={{ padding: '4px 12px', background: '#fbbf24', color: 'black', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
                            RESUME from {parseInt(lastProcessed) + 1}
                        </button>
                    </div>
                )}

                {/* Logs */}
                <div className="logs-container" style={{ marginTop: '1rem', height: '400px', overflowY: 'auto', background: '#1e293b', color: '#e2e8f0', padding: '1rem', borderRadius: '8px', fontFamily: 'monospace', fontSize: '0.9rem' }}>
                    {logs.length === 0 && <div style={{ opacity: 0.5, textAlign: 'center', marginTop: '20%' }}>Ready to start import...</div>}
                    {logs.map((log, i) => (
                        <div key={i} style={{ marginBottom: '4px', color: log.type === 'error' ? '#f87171' : log.type === 'success' ? '#4ade80' : log.type === 'progress' ? '#fbbf24' : 'inherit' }}>
                            {log.message}
                        </div>
                    ))}
                    <div ref={logsEndRef} />
                </div>

                {result && (
                    <div style={{ marginTop: '1rem', padding: '1rem', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '6px', color: '#166534' }}>
                        <strong>✅ Import Completed:</strong> {result.imported} players imported, {result.errors} errors.
                    </div>
                )}
            </div>
        </div>
    );
};

export default ImportPlayersV2;
