
import React, { createContext, useContext, useState, useRef, useCallback } from 'react';

const ImportContext = createContext();

export const useImport = () => useContext(ImportContext);

export const ImportProvider = ({ children }) => {
    const [isImporting, setIsImporting] = useState(false);
    const [logs, setLogs] = useState([]);
    const [progress, setProgress] = useState({
        overall: { current: 0, total: 100 },
        currentStep: '',
        stepProgress: { current: 0, total: 100 }
    });
    const eventSourceRef = useRef(null);

    const addLog = useCallback((log) => {
        setLogs(prev => [...prev, { ...log, id: Date.now() + Math.random(), timestamp: new Date() }].slice(-1000));
    }, []);

    const startImport = useCallback((url, method = 'POST', body = null) => {
        if (isImporting) return;

        setIsImporting(true);
        setLogs([]);
        setProgress({
            overall: { current: 0, total: 100 },
            currentStep: 'Initializing...',
            stepProgress: { current: 0, total: 100 }
        });

        // For SSE with POST, we usually need a special trick or just use GET with params.
        // But the backend expects POST for imports. 
        // We can use fetch with SSE-like handling or just start the sync and listen to a different endpoint? 
        // Actually, many people use Fetch + readable stream for POST SSE.

        fetch(`http://localhost:3001/api${url}`, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: body ? JSON.stringify(body) : null
        }).then(response => {
            const reader = response.body.getReader();
            const decoder = new TextDecoder();

            function read() {
                reader.read().then(({ done, value }) => {
                    if (done) {
                        setIsImporting(false);
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
                                    addLog({ text: '✅ Import process completed successfully.', type: 'complete' });
                                }

                                if (data.type === 'error') {
                                    setIsImporting(false);
                                    addLog({ text: `❌ ${data.message}`, type: 'error' });
                                }
                            } catch (e) { }
                        }
                    });
                    read();
                });
            }
            read();
        }).catch(err => {
            setIsImporting(false);
            addLog({ text: `Critical Error: ${err.message}`, type: 'error' });
        });
    }, [addLog, isImporting]);

    const stopImport = () => {
        if (eventSourceRef.current) {
            eventSourceRef.current.close();
        }
        setIsImporting(false);
    };

    return (
        <ImportContext.Provider value={{ isImporting, logs, progress, startImport, stopImport, setLogs }}>
            {children}
        </ImportContext.Provider>
    );
};
