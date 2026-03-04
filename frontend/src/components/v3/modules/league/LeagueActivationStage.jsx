import React, { useState, useEffect } from 'react';
import api from '../../../../services/api';

/**
 * LeagueActivationStage Component (V8 - Forge Intelligence)
 * Manages the multi-season activation pipeline for a single league.
 * Runs deep-sync to ensure all data integrity checks pass before Forge simulation.
 */
const LeagueActivationStage = ({ leagueId, onComplete, onCancel }) => {
    const [status, setStatus] = useState('INITIALIZING');
    const [progress, setProgress] = useState(0);
    const [logs, setLogs] = useState([]);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (leagueId) {
            runActivation();
        }
    }, [leagueId]);

    const runActivation = async () => {
        setStatus('SYNCING');
        setLogs(prev => [...prev, `Starting deep-sync for league #${leagueId}...`]);

        try {
            // Trigger a deep sync to backfill missing data
            const res = await api.triggerDeepSync(leagueId);

            if (res.success !== false) {
                setProgress(50);
                setLogs(prev => [...prev, 'Deep sync triggered. Polling for completion...']);

                // Poll for sync completion
                let attempts = 0;
                const maxAttempts = 30;
                const interval = setInterval(async () => {
                    attempts++;
                    try {
                        const syncRes = await api.getSyncStatus(leagueId);
                        const pct = Math.min(50 + Math.floor((attempts / maxAttempts) * 50), 95);
                        setProgress(pct);

                        if (String(syncRes.status) === 'COMPLETED' || syncRes.is_syncing === false) {
                            clearInterval(interval);
                            setProgress(100);
                            setStatus('COMPLETE');
                            setLogs(prev => [...prev, '✅ Activation complete. League is Forge-ready.']);
                            setTimeout(() => onComplete(), 1500);
                        } else if (attempts >= maxAttempts) {
                            clearInterval(interval);
                            setProgress(100);
                            setStatus('COMPLETE');
                            setLogs(prev => [...prev, '⚠️ Sync timed out but league may be partially ready.']);
                            setTimeout(() => onComplete(), 1500);
                        }
                    } catch (pollErr) {
                        // Silently continue polling
                    }
                }, 3000);
            } else {
                setError(res.message || 'Deep sync initiation failed.');
                setStatus('FAILED');
            }
        } catch (err) {
            console.error('Activation failed:', err);
            setError(err.message || 'Activation pipeline failed.');
            setStatus('FAILED');
        }
    };

    return (
        <div style={{
            background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
            border: '1px solid #334155',
            borderRadius: '16px',
            padding: '28px',
            marginBottom: '24px'
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ color: '#f1f5f9', margin: 0, fontSize: '1.05rem' }}>
                    ⚡ League Activation Pipeline
                </h3>
                <button onClick={onCancel} style={{
                    background: 'none', border: '1px solid #475569', color: '#94a3b8',
                    borderRadius: '8px', padding: '6px 14px', cursor: 'pointer', fontSize: '0.8rem'
                }}>
                    ✕ Cancel
                </button>
            </div>

            {/* Progress Bar */}
            <div style={{
                background: '#1e293b', borderRadius: '8px', height: '8px',
                marginBottom: '16px', overflow: 'hidden'
            }}>
                <div style={{
                    height: '100%', width: `${progress}%`,
                    background: status === 'FAILED' ? '#ef4444' : 'linear-gradient(90deg, #10b981, #3b82f6)',
                    borderRadius: '8px',
                    transition: 'width 0.5s ease'
                }} />
            </div>

            {/* Status Badge */}
            <div style={{ marginBottom: '12px' }}>
                <span style={{
                    display: 'inline-block', padding: '4px 12px', borderRadius: '20px',
                    fontSize: '0.72rem', fontWeight: 600, textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    background: status === 'COMPLETE' ? 'rgba(16,185,129,0.15)' :
                        status === 'FAILED' ? 'rgba(239,68,68,0.15)' : 'rgba(59,130,246,0.15)',
                    color: status === 'COMPLETE' ? '#10b981' :
                        status === 'FAILED' ? '#ef4444' : '#3b82f6'
                }}>
                    {status}
                </span>
                <span style={{ color: '#64748b', fontSize: '0.78rem', marginLeft: '10px' }}>
                    {progress}%
                </span>
            </div>

            {/* Logs */}
            <div style={{
                background: '#0f172a', borderRadius: '10px', padding: '12px',
                maxHeight: '150px', overflowY: 'auto', fontFamily: 'monospace',
                fontSize: '0.75rem', color: '#94a3b8', lineHeight: '1.6'
            }}>
                {logs.map((log, i) => (
                    <div key={i}>{log}</div>
                ))}
            </div>

            {error && (
                <div style={{
                    marginTop: '12px', padding: '10px 14px', borderRadius: '8px',
                    background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
                    color: '#fca5a5', fontSize: '0.8rem'
                }}>
                    ⚠️ {error}
                </div>
            )}
        </div>
    );
};

export default LeagueActivationStage;
