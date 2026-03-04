
import React, { useRef, useEffect, useState } from 'react';
import { useImport } from '../../context/ImportContext.jsx';
import './ImportLogPanel.css';

const ImportLogPanel = () => {
    const {
        isImporting, isPaused, logs, progress,
        stopImport, pauseImport, resumeImport, setLogs
    } = useImport();

    const logRef = useRef(null);
    const [autoScroll, setAutoScroll] = useState(true);

    // Auto-scroll logic
    useEffect(() => {
        if (autoScroll && logRef.current) {
            logRef.current.scrollTop = logRef.current.scrollHeight;
        }
    }, [logs, autoScroll]);

    const handleLogScroll = () => {
        if (!logRef.current) return;
        const { scrollTop, scrollHeight, clientHeight } = logRef.current;
        const isAtBottom = scrollHeight - scrollTop - clientHeight < 50;
        setAutoScroll(isAtBottom);
    };

    const scrollToBottom = () => {
        setAutoScroll(true);
        if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
    };

    if (logs.length === 0 && !isImporting) return null;

    const logColor = (type) => {
        switch (type) {
            case 'success': case 'complete': return '#10b981';
            case 'warning': return '#f59e0b';
            case 'error': return '#f43f5e';
            default: return '#cbd5e1';
        }
    };

    const progressPercent = Math.round((progress.overall.current / Math.max(progress.overall.total, 1)) * 100);

    return (
        <div className="import-log-panel">
            <div className="log-panel-header">
                <div className="log-panel-status">
                    <span className={`log-status-dot ${isImporting ? 'active' : ''}`}></span>
                    <span className="log-status-text">
                        {isImporting ? (isPaused ? 'PAUSED' : 'SYNCING') : 'IDLE'}
                    </span>
                    {isImporting && (
                        <>
                            <span className="log-progress-badge">{progressPercent}%</span>
                            <span className="log-step-label">{progress.currentStep || 'Batch Orchestration...'}</span>
                        </>
                    )}
                </div>
                <div className="log-panel-controls">
                    {isImporting && (
                        <>
                            {!isPaused ? (
                                <button className="log-ctrl-btn pause" onClick={pauseImport} title="Pause">⏸</button>
                            ) : (
                                <button className="log-ctrl-btn resume" onClick={resumeImport} title="Resume">▶️</button>
                            )}
                            <button className="log-ctrl-btn stop" onClick={stopImport} title="Stop">⏹</button>
                        </>
                    )}
                    {!isImporting && (
                        <button className="log-ctrl-btn close" onClick={() => setLogs([])} title="Clear Logs">✕</button>
                    )}
                </div>
            </div>

            {isImporting && (
                <div className="log-progress-bar-container">
                    <div className="log-progress-bar" style={{ width: `${progressPercent}%` }}></div>
                </div>
            )}

            <div className="log-terminal" ref={logRef} onScroll={handleLogScroll}>
                {logs.map((log) => (
                    <div key={log.id} className="log-entry" style={{ color: logColor(log.type) }}>
                        <span className="log-ts">[{new Date(log.timestamp).toLocaleTimeString([], { hour12: false })}]</span>
                        <span className="log-msg">{log.text}</span>
                    </div>
                ))}
            </div>

            {!autoScroll && isImporting && (
                <button className="log-scroll-btn" onClick={scrollToBottom}>
                    ↓ SCROLL TO LATEST
                </button>
            )}
        </div>
    );
};

export default ImportLogPanel;
