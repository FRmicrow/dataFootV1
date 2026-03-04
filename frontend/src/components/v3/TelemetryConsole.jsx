
import React, { useEffect, useRef, useState } from 'react';
import { useImport } from '../../context/ImportContext.jsx';
import './TelemetryConsole.css';

const TelemetryConsole = () => {
    const { isImporting, logs, progress, setLogs } = useImport();
    const [isMinimized, setIsMinimized] = useState(false);
    const scrollRef = useRef(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [logs]);

    if (logs.length === 0 && !isImporting) return null;

    const overallPercent = Math.round((progress.overall.current / progress.overall.total) * 100) || 0;
    const stepPercent = Math.round((progress.stepProgress.current / progress.stepProgress.total) * 100) || 0;

    return (
        <div className={`telemetry-console ${isMinimized ? 'minimized' : ''} ${isImporting ? 'active' : ''}`}>
            <div className="telemetry-header">
                <div className="telemetry-status">
                    <span className={`status-dot ${isImporting ? 'pulse' : ''}`}></span>
                    {isImporting ? 'REAL-TIME DATA INGESTION ACTIVE' : 'IMPORT PROCESS COMPLETED'}
                </div>
                <div className="telemetry-controls">
                    <button onClick={() => setIsMinimized(!isMinimized)}>
                        {isMinimized ? '🗖' : '🗕'}
                    </button>
                    <button onClick={() => setLogs([])}>✕</button>
                </div>
            </div>

            {!isMinimized && (
                <div className="telemetry-body">
                    <div className="progress-section">
                        <div className="progress-label">
                            <span>MASTER PROGRESS</span>
                            <span>{overallPercent}%</span>
                        </div>
                        <div className="progress-bar-container">
                            <div className="progress-bar-fill master" style={{ width: `${overallPercent}%` }}></div>
                        </div>

                        {isImporting && (
                            <div className="step-section">
                                <div className="progress-label step">
                                    <span>STEP: {progress.currentStep}</span>
                                    <span>{stepPercent}% ({progress.stepProgress.current}/{progress.stepProgress.total})</span>
                                </div>
                                <div className="progress-bar-container step">
                                    <div className="progress-bar-fill step" style={{ width: `${stepPercent}%` }}></div>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="terminal-log" ref={scrollRef}>
                        {logs.map(log => (
                            <div key={log.id} className={`log-line ${log.type}`}>
                                <span className="log-time">[{new Date(log.timestamp).toLocaleTimeString()}]</span>
                                <span className="log-text">{log.text}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {isMinimized && isImporting && (
                <div className="mini-progress">
                    <div className="mini-bar" style={{ width: `${overallPercent}%` }}></div>
                    <span>SYNCING: {overallPercent}%</span>
                </div>
            )}
        </div>
    );
};

export default TelemetryConsole;
