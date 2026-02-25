
import React, { createContext, useContext, useState, useRef, useCallback } from 'react';
import api from '../services/api';

const ImportContext = createContext();

/** Hook moved to the bottom to avoid HMR export conflicts */

export const ImportProvider = ({ children }) => {
    const [isImporting, setIsImporting] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [logs, setLogs] = useState([]);
    const [progress, setProgress] = useState({
        overall: { current: 0, total: 100 },
        currentStep: '',
        stepProgress: { current: 0, total: 100 }
    });
    const readerRef = useRef(null);
    const abortControllerRef = useRef(null);

    const addLog = useCallback((log) => {
        setLogs(prev => [...prev, { ...log, id: Date.now() + Math.random(), timestamp: new Date() }].slice(-1000));
    }, []);

    const startImport = useCallback((url, method = 'POST', body = null) => {
        if (isImporting) {
            console.warn('⚠️ Import already in progress, ignoring request:', url);
            return;
        }

        console.log('🚀 [ImportContext] Starting import stream:', url, body);
        setIsImporting(true);
        setIsPaused(false);
        setLogs([]);
        setProgress({
            overall: { current: 0, total: 100 },
            currentStep: 'Initializing...',
            stepProgress: { current: 0, total: 100 }
        });

        const controller = new AbortController();
        abortControllerRef.current = controller;

        // Use relative path to leverage Vite proxy consistently with other API calls
        fetch(`/api${url}`, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: body ? JSON.stringify(body) : null,
            signal: controller.signal
        }).then(response => {
            console.log('📡 [ImportContext] Stream headers received:', response.status);
            if (!response.body) throw new Error('Response body is null');

            const reader = response.body.getReader();
            readerRef.current = reader;
            const decoder = new TextDecoder();

            function read() {
                reader.read().then(({ done, value }) => {
                    if (done) {
                        setIsImporting(false);
                        setIsPaused(false);
                        readerRef.current = null;
                        return;
                    }
                    const chunk = decoder.decode(value, { stream: true });
                    const lines = chunk.split('\n');

                    lines.forEach(line => {
                        if (line.startsWith('data: ')) {
                            try {
                                const data = JSON.parse(line.substring(6));

                                if (data.message) {
                                    addLog({ text: data.message, type: data.type || 'info' });
                                }

                                if (data.type === 'progress') {
                                    if (data.step === 'overall') {
                                        setProgress(prev => ({ ...prev, overall: { current: data.current, total: data.total } }));
                                    } else {
                                        setProgress(prev => ({
                                            ...prev,
                                            currentStep: data.label || data.step,
                                            stepProgress: { current: data.current, total: data.total }
                                        }));
                                    }
                                }

                                if (data.type === 'complete') {
                                    setIsImporting(false);
                                    setIsPaused(false);
                                    addLog({ text: '✅ Import process completed.', type: 'complete' });
                                }

                                if (data.type === 'error') {
                                    // Don't stop on error — let the batch continue
                                    addLog({ text: `❌ ${data.message}`, type: 'error' });
                                }
                            } catch (e) { }
                        }
                    });
                    read();
                }).catch(err => {
                    if (err.name !== 'AbortError') {
                        addLog({ text: `Stream error: ${err.message}`, type: 'error' });
                    }
                    setIsImporting(false);
                    setIsPaused(false);
                });
            }
            read();
        }).catch(err => {
            if (err.name !== 'AbortError') {
                setIsImporting(false);
                setIsPaused(false);
                addLog({ text: `Critical Error: ${err.message}`, type: 'error' });
            }
        });
    }, [addLog]); // Removed isImporting from dependencies to prevent re-creation while running

    const stopImport = useCallback(async () => {
        try {
            await api.stopImport();
        } catch (e) { /* best effort */ }

        // Also abort the fetch stream client-side
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
        }
        readerRef.current = null;
        setIsImporting(false);
        setIsPaused(false);
        addLog({ text: '🛑 Import stopped by user.', type: 'warning' });
    }, [addLog]);

    const pauseImport = useCallback(async () => {
        try {
            await api.pauseImport();
            setIsPaused(true);
            addLog({ text: '⏸️ Import paused.', type: 'warning' });
        } catch (e) {
            addLog({ text: `Pause failed: ${e.message}`, type: 'error' });
        }
    }, [addLog]);

    const resumeImport = useCallback(async () => {
        try {
            await api.resumeImport();
            setIsPaused(false);
            addLog({ text: '▶️ Import resumed.', type: 'info' });
        } catch (e) {
            addLog({ text: `Resume failed: ${e.message}`, type: 'error' });
        }
    }, [addLog]);

    return (
        <ImportContext.Provider value={{
            isImporting, isPaused, logs, progress,
            startImport, stopImport, pauseImport, resumeImport, setLogs
        }}>
            {children}
        </ImportContext.Provider>
    );
};

export const useImport = () => useContext(ImportContext);
