
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

    const processDataChunk = useCallback((chunk, decoder) => {
        const text = decoder.decode(chunk, { stream: true });
        const lines = text.split('\n');

        for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            try {
                const data = JSON.parse(line.substring(6));
                handleServerEvent(data);
            } catch (e) {
                // Ignore malformed JSON
            }
        }
    }, []);

    const handleServerEvent = useCallback((data) => {
        if (data.message) {
            addLog({ text: data.message, type: data.type || 'info' });
        }

        if (data.type === 'progress') {
            updateProgress(data);
        }

        if (data.type === 'complete') {
            terminateImport('✅ Import process completed.', 'complete');
        }

        if (data.type === 'error') {
            addLog({ text: `❌ ${data.message}`, type: 'error' });
        }
    }, [addLog]);

    const updateProgress = (data) => {
        if (data.step === 'overall') {
            setProgress(prev => ({ ...prev, overall: { current: data.current, total: data.total } }));
        } else {
            setProgress(prev => ({
                ...prev,
                currentStep: data.label || data.step,
                stepProgress: { current: data.current, total: data.total }
            }));
        }
    };

    const terminateImport = (msg, type) => {
        setIsImporting(false);
        setIsPaused(false);
        if (msg) addLog({ text: msg, type });
        readerRef.current = null;
    };

    const startImport = useCallback(async (url, method = 'POST', body = null) => {
        if (isImporting) return;

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

        try {
            const response = await fetch(`/api${url}`, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: body ? JSON.stringify(body) : null,
                signal: controller.signal
            });

            if (!response.body) throw new Error('Response body is null');

            const reader = response.body.getReader();
            readerRef.current = reader;
            const decoder = new TextDecoder();

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                processDataChunk(value, decoder);
            }
            terminateImport();

        } catch (err) {
            if (err.name !== 'AbortError') {
                terminateImport(`Critical Error: ${err.message}`, 'error');
            }
        }
    }, [isImporting, addLog, processDataChunk]);

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
