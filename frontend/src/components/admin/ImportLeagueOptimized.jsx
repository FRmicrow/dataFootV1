import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import './Admin.css';
import '../ImportModal.css';

const ImportLeagueOptimized = () => {
    const [countries, setCountries] = useState([]);
    const [selectedCountry, setSelectedCountry] = useState('');
    const [leagues, setLeagues] = useState([]);
    const [selectedLeagues, setSelectedLeagues] = useState([]); // Multi-select

    // Season Selection
    const [seasonMode, setSeasonMode] = useState('single'); // 'single', 'range', 'multi'
    const [selectedSeason, setSelectedSeason] = useState(new Date().getFullYear().toString());
    const [seasonRange, setSeasonRange] = useState({ start: 2020, end: new Date().getFullYear() });
    const [selectedSeasons, setSelectedSeasons] = useState([new Date().getFullYear()]);

    // Options
    const [importMode, setImportMode] = useState('fast'); // 'fast' | 'full'

    // Queue State
    const [queue, setQueue] = useState([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [liveLogs, setLiveLogs] = useState([]);
    const [isAutoScrollEnabled, setIsAutoScrollEnabled] = useState(true);

    const logsEndRef = useRef(null);
    const logsContainerRef = useRef(null);
    const abortControllerRef = useRef(null);

    const yearOptions = [];
    for (let year = new Date().getFullYear(); year >= 2010; year--) {
        yearOptions.push(year);
    }

    const scrollToBottom = () => {
        if (isAutoScrollEnabled) {
            logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }
    };

    // Handle manual scroll to disable/enable auto-scroll
    const handleLogsScroll = () => {
        if (!logsContainerRef.current) return;
        const { scrollTop, scrollHeight, clientHeight } = logsContainerRef.current;
        const isAtBottom = scrollHeight - scrollTop - clientHeight < 50;
        setIsAutoScrollEnabled(isAtBottom);
    };

    useEffect(() => {
        scrollToBottom();
    }, [liveLogs]);

    useEffect(() => {
        fetchCountries();
    }, []);

    useEffect(() => {
        if (selectedCountry) {
            fetchLeagues(selectedCountry);
            setSelectedLeagues([]);
        } else {
            setLeagues([]);
            setSelectedLeagues([]);
        }
    }, [selectedCountry]);

    // Handle abrupt pause
    useEffect(() => {
        if (!isProcessing && abortControllerRef.current) {
            setLiveLogs(prev => [...prev, { type: 'warning', message: '⏸ Batch Paused. Aborting current task...' }]);
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
        }
    }, [isProcessing]);

    // Auto-process queue (Sequential)
    useEffect(() => {
        if (isProcessing) {
            const hasPending = queue.some(item => item.status === 'pending');
            const hasInProgress = queue.some(item => item.status === 'in-progress');

            if (hasPending && !hasInProgress) {
                processNextItem();
            } else if (!hasPending && !hasInProgress && queue.length > 0) { // Added queue.length > 0 condition
                setIsProcessing(false);
            }
        }
    }, [queue, isProcessing]);

    const fetchCountries = async () => {
        try {
            const res = await axios.get('/api/admin/countries');
            setCountries(res.data);
        } catch (error) {
            console.error("Failed to fetch countries", error);
        }
    };

    const fetchLeagues = async (countryName) => {
        try {
            const res = await axios.get(`/api/admin/api-leagues?country=${encodeURIComponent(countryName)}`);
            setLeagues(res.data.response);
        } catch (error) {
            console.error("Failed to fetch leagues", error);
        }
    };

    const handleLeagueToggle = (leagueId) => {
        setSelectedLeagues(prev => {
            if (prev.includes(leagueId)) return prev.filter(id => id !== leagueId);
            return [...prev, leagueId];
        });
    };

    const handleSeasonToggle = (year) => {
        setSelectedSeasons(prev => {
            if (prev.includes(year)) return prev.filter(y => y !== year);
            return [...prev, year].sort((a, b) => b - a);
        });
    };

    const addToQueue = () => {
        if (selectedLeagues.length === 0) {
            alert("Please select at least one league.");
            return;
        }

        const newJobs = [];
        let seasonsToProcess = [];

        if (seasonMode === 'single') seasonsToProcess = [parseInt(selectedSeason)];
        else if (seasonMode === 'multi') seasonsToProcess = selectedSeasons;
        else if (seasonMode === 'range') {
            for (let y = parseInt(seasonRange.start); y <= parseInt(seasonRange.end); y++) {
                seasonsToProcess.push(y);
            }
        }

        selectedLeagues.forEach(leagueId => {
            const league = leagues.find(l => l.league.id === leagueId);
            seasonsToProcess.forEach(season => {
                // Prevent duplicates
                const exists = queue.some(j => j.leagueId === leagueId && j.season === season && j.mode === importMode && j.status !== 'error');
                if (!exists) {
                    newJobs.push({
                        id: Date.now() + Math.random(),
                        leagueId,
                        leagueName: league?.league.name || 'Unknown',
                        logo: league?.league.logo,
                        season,
                        mode: importMode,
                        status: 'pending', // pending, in-progress, done, error
                        progress: 0,
                        logs: []
                    });
                }
            });
        });

        setQueue(prev => [...prev, ...newJobs]);
    };

    const processNextItem = async () => {
        const jobIndex = queue.findIndex(j => j.status === 'pending');
        if (jobIndex === -1) return;

        const job = queue[jobIndex];

        // Update status to in-progress
        setQueue(prev => {
            const newQ = [...prev];
            newQ[jobIndex] = { ...job, status: 'in-progress' };
            return newQ;
        });

        // Add start log
        setLiveLogs(prev => [...prev, { type: 'info', message: `🚀 Starting ${job.mode === 'full' ? 'FULL' : 'Fast'} Import: ${job.leagueName} (${job.season})...` }]);

        // Setup AbortController for this request
        const controller = new AbortController();
        abortControllerRef.current = controller;

        try {
            // Determine Endpoint based on Mode
            let url = '/api/admin/import-league-optimized'; // Fast
            let body = { leagueId: job.leagueId, season: job.season, mode: job.mode };

            const response = await fetch(`http://localhost:3001${url}`, { // Changed URL to use relative path and template literal
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
                signal: controller.signal // Pass the signal to the fetch request
            });

            const reader = response.body.getReader();
            const decoder = new TextDecoder();

            while (true) {
                const { value, done } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value);
                const lines = chunk.split('\n');

                lines.forEach(line => {
                    if (line.startsWith('data: ')) {
                        try {
                            const data = JSON.parse(line.slice(6));

                            // Update Logs (Keep last 50)
                            setLiveLogs(prev => [...prev.slice(-49), data]);

                            if (data.type === 'complete') {
                                setQueue(prev => {
                                    const newQ = [...prev];
                                    const current = newQ.findIndex(j => j.id === job.id);
                                    if (current !== -1) newQ[current] = { ...newQ[current], status: 'done', progress: 100 };
                                    return newQ;
                                });
                            }
                            if (data.type === 'error') {
                                setQueue(prev => {
                                    const newQ = [...prev];
                                    const current = newQ.findIndex(j => j.id === job.id);
                                    if (current !== -1) newQ[current] = { ...newQ[current], status: 'error', error: data.message };
                                    return newQ;
                                });
                            }
                        } catch (e) {
                            console.error("SSE Parse Error", e);
                        }
                    }
                });
            }

            // Clean up ref if we finished naturally
            if (abortControllerRef.current === controller) {
                abortControllerRef.current = null;
            }

            // Just in case loop breaks without complete message
            setQueue(prev => {
                const newQ = [...prev];
                const currentIdx = newQ.findIndex(j => j.id === job.id);
                if (currentIdx !== -1 && newQ[currentIdx].status === 'in-progress') {
                    newQ[currentIdx] = { ...newQ[currentIdx], status: 'done' };
                }
                return newQ;
            });

        } catch (err) {
            if (err.name === 'AbortError') {
                console.log("Job Aborted");
                // Reset job to pending so it can be resumed
                setQueue(prev => {
                    const newQ = [...prev];
                    const currentIdx = newQ.findIndex(j => j.id === job.id);
                    if (currentIdx !== -1) newQ[currentIdx] = { ...newQ[currentIdx], status: 'pending' };
                    return newQ;
                });
                return;
            }

            console.error("Job Error", err);
            setLiveLogs(prev => [...prev, { type: 'error', message: `Fatal Error: ${err.message}` }]);
            setQueue(prev => {
                const newQ = [...prev];
                const currentIdx = newQ.findIndex(j => j.id === job.id);
                if (currentIdx !== -1) newQ[currentIdx] = { ...newQ[currentIdx], status: 'error', error: err.message };
                return newQ;
            });
        } finally {
            if (abortControllerRef.current === controller) {
                abortControllerRef.current = null;
            }
        }
    };

    const clearQueue = () => {
        setQueue([]);
        setLiveLogs([]);
    };

    const removeJob = (id) => setQueue(prev => prev.filter(j => j.id !== id));

    return (
        <div style={{ padding: '0 2rem 2rem 2rem', maxWidth: '1400px', margin: '0 auto' }}>
            {/* STICKY TOP BAR */}
            <div style={{
                position: 'sticky',
                top: 0,
                zIndex: 100,
                background: '#f8fafc',
                padding: '1.5rem 0',
                borderBottom: '1px solid #e2e8f0',
                marginBottom: '2rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
            }}>
                <div>
                    <h1 style={{ margin: 0, color: '#1e293b', fontSize: '1.6rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        📦 Batch Multi-Import
                        {isProcessing && <div className="sync-spinner" style={{ width: '20px', height: '20px', border: '3px solid #3b82f6', borderTopColor: 'transparent' }}></div>}
                    </h1>
                    <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '0.9rem' }}>
                        {queue.length > 0 ? `${queue.filter(j => j.status === 'done').length} of ${queue.length} tasks completed` : 'Configure your import batch below'}
                    </p>
                </div>

                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    {queue.length > 0 && (
                        <>
                            <button className="btn-secondary" onClick={clearQueue} disabled={isProcessing} style={{ padding: '10px 20px' }}>
                                Clear All
                            </button>
                            <button
                                className="btn-sync"
                                onClick={() => setIsProcessing(!isProcessing)}
                                style={{
                                    background: isProcessing ? '#ef4444' : '#10b981',
                                    borderColor: 'transparent',
                                    padding: '10px 24px',
                                    fontSize: '1rem',
                                    fontWeight: 'bold',
                                    minWidth: '160px',
                                    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'
                                }}
                            >
                                {isProcessing ? '⏸ Pause Batch' : '▶ Start Processing'}
                            </button>
                        </>
                    )}
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '350px 1fr', gap: '2rem', alignItems: 'start' }}>
                {/* Process Config Panel */}
                <div className="card" style={{ padding: '1.5rem', background: '#1e293b', border: '1px solid #334155', color: 'white', position: 'sticky', top: '100px' }}>
                    <h2 style={{ fontSize: '1.1rem', marginBottom: '1.25rem', borderBottom: '1px solid #334155', paddingBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ background: '#3b82f6', width: '24px', height: '24px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem' }}>1</span>
                        Configuration
                    </h2>

                    {/* Country */}
                    <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                        <label className="form-label" style={{ fontWeight: '600', color: '#94a3b8', fontSize: '0.85rem', marginBottom: '6px', display: 'block' }}>Country</label>
                        <select
                            value={selectedCountry}
                            onChange={(e) => setSelectedCountry(e.target.value)}
                            className="form-select"
                            style={{ width: '100%', padding: '10px', background: '#0f172a', color: 'white', border: '1px solid #475569', borderRadius: '6px' }}
                        >
                            <option value="">-- Select Country --</option>
                            {countries.map(c => (
                                <option key={c.country_id} value={c.country_name}>{c.country_name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Leagues Multi-Select */}
                    <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                        <label className="form-label" style={{ fontWeight: '600', color: '#94a3b8', fontSize: '0.85rem', marginBottom: '6px', display: 'block' }}>Leagues (Select Multiple)</label>
                        <div style={{ maxHeight: '200px', overflowY: 'auto', background: '#0f172a', border: '1px solid #475569', borderRadius: '6px', padding: '0.5rem' }}>
                            {leagues.length === 0 && <div style={{ padding: '0.5rem', color: '#64748b', fontSize: '0.85rem' }}>Select a country first</div>}
                            {leagues.map(item => (
                                <div
                                    key={item.league.id}
                                    onClick={() => handleLeagueToggle(item.league.id)}
                                    style={{
                                        padding: '8px 10px',
                                        cursor: 'pointer',
                                        background: selectedLeagues.includes(item.league.id) ? '#3b82f6' : 'transparent',
                                        color: selectedLeagues.includes(item.league.id) ? 'white' : '#cbd5e1',
                                        borderRadius: '4px',
                                        marginBottom: '2px',
                                        display: 'flex', alignItems: 'center', gap: '8px',
                                        transition: 'all 0.1s',
                                        fontSize: '0.85rem'
                                    }}
                                >
                                    <img src={item.league.logo} alt="" style={{ width: '20px', height: '20px', objectFit: 'contain', background: 'white', borderRadius: '50%', padding: '2px' }} />
                                    {item.league.name}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Seasons */}
                    <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                        <label className="form-label" style={{ fontWeight: '600', color: '#94a3b8', fontSize: '0.85rem', marginBottom: '6px', display: 'block' }}>Seasons</label>
                        <div style={{ display: 'flex', gap: '4px', marginBottom: '10px' }}>
                            <button className={`btn-sm`} onClick={() => setSeasonMode('single')} style={{ flex: 1, padding: '6px', background: seasonMode === 'single' ? '#3b82f6' : '#334155', border: 'none', color: 'white', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem' }}>Single</button>
                            <button className={`btn-sm`} onClick={() => setSeasonMode('range')} style={{ flex: 1, padding: '6px', background: seasonMode === 'range' ? '#3b82f6' : '#334155', border: 'none', color: 'white', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem' }}>Range</button>
                            <button className={`btn-sm`} onClick={() => setSeasonMode('multi')} style={{ flex: 1, padding: '6px', background: seasonMode === 'multi' ? '#3b82f6' : '#334155', border: 'none', color: 'white', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem' }}>Multi</button>
                        </div>

                        {seasonMode === 'single' && (
                            <select value={selectedSeason} onChange={e => setSelectedSeason(e.target.value)} className="form-select" style={{ width: '100%', padding: '10px', background: '#0f172a', color: 'white', border: '1px solid #475569', borderRadius: '6px' }}>
                                {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
                            </select>
                        )}

                        {seasonMode === 'range' && (
                            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                <select value={seasonRange.start} onChange={e => setSeasonRange(prev => ({ ...prev, start: e.target.value }))} className="form-select" style={{ flex: 1, padding: '10px', background: '#0f172a', color: 'white', border: '1px solid #475569', borderRadius: '6px' }}>
                                    {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
                                </select>
                                <span style={{ color: '#94a3b8' }}>-</span>
                                <select value={seasonRange.end} onChange={e => setSeasonRange(prev => ({ ...prev, end: e.target.value }))} className="form-select" style={{ flex: 1, padding: '10px', background: '#0f172a', color: 'white', border: '1px solid #475569', borderRadius: '6px' }}>
                                    {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
                                </select>
                            </div>
                        )}

                        {seasonMode === 'multi' && (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', maxHeight: '120px', overflowY: 'auto', background: '#0f172a', padding: '0.5rem', borderRadius: '6px', border: '1px solid #475569' }}>
                                {yearOptions.map(y => (
                                    <div
                                        key={y}
                                        onClick={() => handleSeasonToggle(y)}
                                        style={{
                                            padding: '4px 8px',
                                            cursor: 'pointer',
                                            background: selectedSeasons.includes(y) ? '#3b82f6' : '#334155',
                                            borderRadius: '4px',
                                            fontSize: '0.8rem',
                                            color: 'white'
                                        }}
                                    >
                                        {y}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Mode */}
                    <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                        <label className="form-label" style={{ fontWeight: '600', color: '#94a3b8', fontSize: '0.85rem', marginBottom: '6px', display: 'block' }}>Import Mode</label>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <div
                                onClick={() => setImportMode('fast')}
                                style={{
                                    flex: 1, padding: '0.75rem', border: `2px solid ${importMode === 'fast' ? '#3b82f6' : '#334155'}`,
                                    borderRadius: '8px', cursor: 'pointer', background: importMode === 'fast' ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                                    textAlign: 'center'
                                }}
                            >
                                <strong style={{ color: '#3b82f6', display: 'block', fontSize: '0.9rem' }}>🚀 Fast</strong>
                                <span style={{ fontSize: '0.65rem', color: '#94a3b8' }}>Selected Only</span>
                            </div>
                            <div
                                onClick={() => setImportMode('full')}
                                style={{
                                    flex: 1, padding: '0.75rem', border: `2px solid ${importMode === 'full' ? '#a855f7' : '#334155'}`,
                                    borderRadius: '8px', cursor: 'pointer', background: importMode === 'full' ? 'rgba(168, 85, 247, 0.1)' : 'transparent',
                                    textAlign: 'center'
                                }}
                            >
                                <strong style={{ color: '#a855f7', display: 'block', fontSize: '0.9rem' }}>📚 Full</strong>
                                <span style={{ fontSize: '0.65rem', color: '#94a3b8' }}>+ History</span>
                            </div>
                        </div>
                    </div>

                    <button className="btn-primary" onClick={addToQueue} style={{ width: '100%', padding: '14px', fontSize: '1rem', fontWeight: 'bold', background: '#3b82f6', border: 'none', borderRadius: '6px', color: 'white', cursor: 'pointer', boxShadow: '0 4px 6px -1px rgba(59, 130, 246, 0.3)' }}>
                        + Add to Queue
                    </button>
                </div>

                {/* Queue Panel */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                    <div className="card" style={{ padding: '0', background: 'white', borderRadius: '12px', overflow: 'hidden', display: 'flex', flexDirection: 'column', border: '1px solid #e2e8f0', minHeight: '300px', maxHeight: '500px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                        <div style={{ padding: '1.25rem 1.5rem', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h2 style={{ fontSize: '1.1rem', color: '#1e293b', margin: 0, fontWeight: '700' }}>📋 Import Queue</h2>
                        </div>

                        <div style={{ flex: 1, overflowY: 'auto', padding: '0' }}>
                            {queue.length === 0 ? (
                                <div style={{ textAlign: 'center', color: '#94a3b8', padding: '4rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                                    <div style={{ fontSize: '2.5rem' }}>📥</div>
                                    <div style={{ fontWeight: '500' }}>No tasks queued. Select a league and seasons to begin.</div>
                                </div>
                            ) : (
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                                    <thead style={{ background: '#f1f5f9', position: 'sticky', top: 0, zIndex: 1 }}>
                                        <tr style={{ color: '#475569', textAlign: 'left', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                            <th style={{ padding: '12px 16px' }}>League</th>
                                            <th style={{ padding: '12px 16px' }}>Season</th>
                                            <th style={{ padding: '12px 16px' }}>Mode</th>
                                            <th style={{ padding: '12px 16px' }}>Status</th>
                                            <th style={{ padding: '12px 16px' }}></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {queue.map(job => (
                                            <tr key={job.id} style={{ borderBottom: '1px solid #f1f5f9', background: job.status === 'in-progress' ? '#eff6ff' : 'white', transition: 'background 0.2s' }}>
                                                <td style={{ padding: '12px 16px', color: '#1e293b' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                        {job.logo && <img src={job.logo} style={{ width: '24px', height: '24px', objectFit: 'contain' }} alt="" />}
                                                        <span style={{ fontWeight: '600' }}>{job.leagueName}</span>
                                                    </div>
                                                </td>
                                                <td style={{ padding: '12px 16px', color: '#475569' }}>
                                                    <span style={{ background: '#f1f5f9', padding: '4px 10px', borderRadius: '6px', fontWeight: '500', color: '#334155' }}>{job.season}</span>
                                                </td>
                                                <td style={{ padding: '12px 16px' }}>
                                                    <span style={{
                                                        fontSize: '0.7rem', padding: '4px 10px', borderRadius: '20px', fontWeight: '700', textTransform: 'uppercase',
                                                        background: job.mode === 'fast' ? '#dbeafe' : '#f3e8ff',
                                                        color: job.mode === 'fast' ? '#1d4ed8' : '#7e22ce'
                                                    }}>
                                                        {job.mode}
                                                    </span>
                                                </td>
                                                <td style={{ padding: '12px 16px' }}>
                                                    {job.status === 'pending' && <span style={{ color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '6px' }}>⏳ Pending</span>}
                                                    {job.status === 'in-progress' && <span style={{ color: '#2563eb', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}><div className="sync-spinner" style={{ width: '12px', height: '12px', border: '2px solid #2563eb', borderTopColor: 'transparent' }}></div> Processing</span>}
                                                    {job.status === 'done' && <span style={{ color: '#16a34a', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}>✅ Complete</span>}
                                                    {job.status === 'error' && <span style={{ color: '#dc2626', fontWeight: 'bold' }}>❌ Failed</span>}
                                                </td>
                                                <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                                                    {job.status === 'pending' && (
                                                        <button
                                                            onClick={() => removeJob(job.id)}
                                                            style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '1.25rem', padding: '4px 8px' }}
                                                            title="Remove Task"
                                                        >
                                                            ×
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>

                    {/* Live Logs */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 style={{ fontSize: '1rem', color: '#1e293b', margin: 0, fontWeight: '700' }}>Terminal Output</h3>
                            <button
                                onClick={() => setIsAutoScrollEnabled(!isAutoScrollEnabled)}
                                style={{
                                    background: isAutoScrollEnabled ? '#3b82f6' : '#94a3b8',
                                    color: 'white', border: 'none', padding: '4px 12px', borderRadius: '4px', fontSize: '0.75rem', cursor: 'pointer',
                                    fontWeight: '600'
                                }}
                            >
                                {isAutoScrollEnabled ? '✓ Auto-Scroll ON' : 'Auto-Scroll OFF'}
                            </button>
                        </div>
                        <div
                            className="card"
                            ref={logsContainerRef}
                            onScroll={handleLogsScroll}
                            style={{
                                height: '350px',
                                padding: '1rem',
                                background: '#0f172a',
                                border: '1px solid #334155',
                                overflowY: 'auto',
                                fontFamily: 'monospace',
                                fontSize: '0.85rem',
                                color: '#f8fafc',
                                borderRadius: '12px',
                                boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.2)'
                            }}
                        >
                            <div style={{ color: '#94a3b8', borderBottom: '1px solid #334155', marginBottom: '0.75rem', paddingBottom: '0.5rem', fontWeight: 'bold', display: 'flex', justifyContent: 'space-between', position: 'sticky', top: 0, background: '#0f172a' }}>
                                <span>&gt; Live Execution Log</span>
                                <span style={{ color: '#64748b' }}>active-session</span>
                            </div>
                            {liveLogs.length > 0 ? (
                                <>
                                    {liveLogs.map((log, i) => (
                                        <div key={i} className={`log-entry log-${log.type}`} style={{ animation: 'fadeIn 0.1s', padding: '2px 0' }}>
                                            {log.type === 'info' && <span style={{ marginRight: '8px', color: '#3b82f6' }}>🔹</span>}
                                            {log.type === 'success' && <span style={{ marginRight: '8px', color: '#10b981' }}>✅</span>}
                                            {log.type === 'warning' && <span style={{ marginRight: '8px', color: '#fbbf24' }}>⚠️</span>}
                                            {log.type === 'error' && <span style={{ marginRight: '8px', color: '#ef4444' }}>❌</span>}
                                            {log.type === 'complete' && <span style={{ marginRight: '8px', color: '#a855f7' }}>🏁</span>}
                                            {log.message}
                                        </div>
                                    ))}
                                </>
                            ) : (
                                <div style={{ color: '#475569', fontStyle: 'italic', marginTop: '1rem', textAlign: 'center' }}>
                                    <div>Waiting for processing to start...</div>
                                </div>
                            )}
                            <div ref={logsEndRef} />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ImportLeagueOptimized;
