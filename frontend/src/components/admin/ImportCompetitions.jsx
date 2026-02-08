import React, { useState, useRef, useEffect } from 'react';

const ImportCompetitions = () => {
    const [importing, setImporting] = useState(false);
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
        return () => {
            if (eventSourceRef.current) eventSourceRef.current.close();
        };
    }, []);

    const handleImport = async (start, end) => {
        if (!window.confirm(`This will import all competitions from ID ${start} to ${end} using API-Football. This may take some time. Continue?`)) {
            return;
        }

        setImporting(true);
        setError(null);
        setLogs([]);
        setResult(null);

        try {
            if (eventSourceRef.current) eventSourceRef.current.close();

            const es = new EventSource(`http://localhost:3001/api/admin/import-competitions-range?start=${start}&end=${end}`);
            eventSourceRef.current = es;

            es.onmessage = (event) => {
                const data = JSON.parse(event.data);

                if (data.type === 'complete') {
                    setResult(data);
                    setImporting(false);
                    es.close();
                } else if (data.type === 'error') {
                    setError(data.message);
                    setImporting(false);
                    es.close();
                } else {
                    setLogs(prev => [...prev, {
                        message: data.message,
                        type: data.type,
                        timestamp: new Date()
                    }]);
                }
            };

            es.onerror = () => {
                setError('Connection lost');
                setImporting(false);
                es.close();
            };

        } catch (e) {
            setError(e.message);
            setImporting(false);
        }
    };

    const getLogStyle = (type) => {
        switch (type) {
            case 'success': return { color: '#15803d', fontWeight: 'bold' };
            case 'error': return { color: '#dc2626', fontWeight: 'bold' };
            case 'progress': return { color: '#2563eb', fontWeight: '500' };
            default: return { color: '#64748b' };
        }
    };

    return (
        <div style={{ padding: '2rem', maxWidth: '1000px' }}>
            <h2>Import Competitions (Range)</h2>
            <p>
                Bulk import missing competitions directly from API-Football.
                This will check IDs in the specified range and insert any that are missing in the database.
            </p>

            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button
                    onClick={() => handleImport(1, 1000)}
                    disabled={importing}
                    style={{
                        padding: '12px 24px',
                        fontSize: '16px',
                        backgroundColor: importing ? '#94a3b8' : '#7c3aed',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: importing ? 'not-allowed' : 'pointer',
                        fontWeight: 'bold'
                    }}
                >
                    {importing ? 'Importing...' : '🚀 Import 1-1000'}
                </button>

                <button
                    onClick={() => handleImport(1001, 2000)}
                    disabled={importing}
                    style={{
                        padding: '12px 24px',
                        fontSize: '16px',
                        backgroundColor: importing ? '#94a3b8' : '#2563eb',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: importing ? 'not-allowed' : 'pointer',
                        fontWeight: 'bold'
                    }}
                >
                    {importing ? 'Importing...' : '🚀 Import 1001-2000'}
                </button>
            </div>

            {result && (
                <div style={{
                    marginTop: '2rem',
                    padding: '1.5rem',
                    backgroundColor: '#f0fdf4',
                    border: '2px solid #22c55e',
                    borderRadius: '8px'
                }}>
                    <h3 style={{ color: '#15803d', marginTop: 0 }}>✅ Import Complete!</h3>
                    <p><strong>Imported:</strong> {result.imported}</p>
                    <p><strong>Skipped (Existing):</strong> {result.skipped}</p>
                    <p><strong>Errors:</strong> {result.errors}</p>
                </div>
            )}

            {error && (
                <div style={{
                    marginTop: '2rem',
                    padding: '1rem',
                    backgroundColor: '#fee2e2',
                    border: '1px solid #ef4444',
                    borderRadius: '8px',
                    color: '#b91c1c'
                }}>
                    {error}
                </div>
            )}

            <div style={{
                marginTop: '2rem',
                padding: '1.5rem',
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                height: '500px',
                overflowY: 'auto',
                fontFamily: 'monospace',
                fontSize: '13px'
            }}>
                <h3 style={{ marginTop: 0 }}>📜 Logs</h3>
                {logs.length === 0 && <span style={{ color: '#94a3b8' }}>Logs will appear here...</span>}
                {logs.map((log, i) => (
                    <div key={i} style={{ marginBottom: '4px', ...getLogStyle(log.type) }}>
                        {log.message}
                    </div>
                ))}
                <div ref={logsEndRef} />
            </div>
        </div>
    );
};

export default ImportCompetitions;
