import React, { useState, useEffect, useRef } from 'react';
import api from '../../services/api';
import LeagueSelector from './import/LeagueSelector';
import SeasonSelector from './import/SeasonSelector';

const ImportV3Page = () => {
    // --- State ---
    const [countries, setCountries] = useState([]);
    const [selectedCountry, setSelectedCountry] = useState('');

    const [leagues, setLeagues] = useState([]);
    const [selectedLeague, setSelectedLeague] = useState('');
    const [availableSeasons, setAvailableSeasons] = useState([]);

    // Season Range State
    const [fromYear, setFromYear] = useState('');
    const [toYear, setToYear] = useState('');
    const [skipExisting, setSkipExisting] = useState(true);
    const [leagueSyncStatus, setLeagueSyncStatus] = useState([]); // Array of {year, players, fixtures, standings}

    // Queue State
    const [importQueue, setImportQueue] = useState([]);

    const [isImporting, setIsImporting] = useState(false);
    const [logs, setLogs] = useState([]);
    const [autoScroll, setAutoScroll] = useState(true);

    const logsEndRef = useRef(null);

    // --- Effects ---

    useEffect(() => {
        fetchCountries();
    }, []);

    useEffect(() => {
        if (selectedCountry) {
            fetchLeagues(selectedCountry);
            setSelectedLeague('');
        } else {
            setLeagues([]);
        }
    }, [selectedCountry]);

    useEffect(() => {
        if (autoScroll) {
            logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }
    }, [logs, autoScroll]);

    // Update available seasons when league changes
    useEffect(() => {
        if (selectedLeague && leagues.length > 0) {
            // Fetch comprehensive availability status
            fetchSyncStatus(selectedLeague);
        } else {
            setAvailableSeasons([]);
            setFromYear('');
            setToYear('');
            setLeagueSyncStatus([]);
        }
    }, [selectedLeague]);

    // --- API Calls ---

    const fetchCountries = async () => {
        try {
            const data = await api.getCountries();
            setCountries(data);
        } catch (error) {
            console.error("Failed to fetch countries", error);
        }
    };

    const fetchLeagues = async (countryName) => {
        try {
            const data = await api.getLeagues(countryName);
            setLeagues(data);
        } catch (error) {
            console.error("Failed to fetch leagues", error);
        }
    };

    const fetchSyncStatus = async (leagueId) => {
        try {
            const data = await api.getAvailableSeasons(leagueId);
            // The endpoint returns { league: {}, seasons: [{ year, status, ... }] }
            const seasons = data.seasons || [];
            setLeagueSyncStatus(seasons);

            // Also update availableSeasons (years list) from this source of truth
            const years = seasons.map(s => s.year).sort((a, b) => b - a);
            setAvailableSeasons(years);

            // Smart Defaulting
            if (years.length > 0) {
                setFromYear(years[years.length - 1]);
                setToYear(years[0]);
            }
        } catch (error) {
            console.error("Failed to fetch sync status", error);
        }
    };

    // --- Handlers ---

    const handleAddToQueue = () => {
        if (!selectedLeague || !selectedCountry) {
            alert("Please select a country and a league.");
            return;
        }

        const leagueObj = leagues.find(l => l.league.id === parseInt(selectedLeague));
        if (!leagueObj) return;

        const start = parseInt(fromYear);
        const end = parseInt(toYear);

        if (start > end) {
            alert("Start year cannot be after end year.");
            return;
        }

        const selectedSeasons = [];
        for (let y = start; y <= end; y++) {
            if (skipExisting) {
                const statusObj = leagueSyncStatus.find(s => s.year === y);
                // statusObj has { status: 'FULL' | 'PARTIAL' | 'NOT_IMPORTED' }
                const isFullyImported = statusObj && statusObj.status === 'FULL';

                if (!isFullyImported) {
                    selectedSeasons.push(y);
                }
            } else {
                selectedSeasons.push(y);
            }
        }

        if (selectedSeasons.length === 0) {
            alert("No new seasons to add (all already imported or skipped).");
            return;
        }

        // Find league name for display
        const leagueName = leagueObj ? leagueObj.league.name : 'Unknown League';

        const queueSeasons = selectedSeasons.map(y => {
            const statusObj = leagueSyncStatus.find(s => s.year === y);
            const status = statusObj ? statusObj.status : 'NOT_IMPORTED';
            return {
                year: y,
                isFull: status === 'FULL',
                isPartial: status === 'PARTIAL' || status === 'PARTIAL_DISCOVERY'
            };
        });

        const queueItem = {
            id: Date.now(),
            country: selectedCountry,
            leagueId: parseInt(selectedLeague),
            leagueName: leagueName,
            seasons: queueSeasons
        };

        setImportQueue(prev => [...prev, queueItem]);
    };

    const handleRemoveFromQueue = (id) => {
        setImportQueue(prev => prev.filter(item => item.id !== id));
    };

    const handleBatchImport = async () => {
        if (importQueue.length === 0) return;


        setIsImporting(true);
        setLogs([{ type: 'info', message: `🚀 Starting Batch V3 Import with ${importQueue.length} items...` }]);

        const selection = importQueue.map(item => ({
            leagueId: item.leagueId,
            seasons: item.seasons.map(s => s.year),
            forceApiId: true
        }));

        try {
            const response = await fetch('/api/import/batch', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ selection })
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
                            setLogs(prev => [...prev, data]);

                            if (data.type === 'complete' || (data.type === 'error' && data.message && data.message.includes("Critical"))) {
                                if (data.type === 'complete') {
                                    setLogs(prev => [...prev, {
                                        type: 'success',
                                        message: `✅ Import Finished. View Dashboard: /league/${data.leagueId}/season/${data.season}`,
                                        link: `/league/${data.leagueId}/season/${data.season}`
                                    }]);
                                    // Refresh status
                                    if (selectedLeague) fetchSyncStatus(selectedLeague);
                                }
                                if (data.type === 'error') {
                                    // Don't stop fully, maybe subsequent items work? 
                                    // For batch, usually we continue, but let's see.
                                }
                            }
                        } catch (e) {
                            console.error("SSE Parse Error", e);
                        }
                    }
                });
            }
            setIsImporting(false);
            setImportQueue([]); // Clear queue on success

        } catch (error) {
            console.error("Import failed", error);
            setLogs(prev => [...prev, { type: 'error', message: `Fatal Error: ${error.message}` }]);
            setIsImporting(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans">
            {/* Header */}
            <header className="bg-slate-800 border-b border-slate-700 px-8 py-6 shadow-sm">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-400">
                            🧪 V3 Schema POC Import
                        </h1>
                        <p className="text-slate-400 text-sm mt-1">Multi-Criteria Mass Import System</p>
                    </div>
                    <div className="flex gap-3">
                        <a href="/events" className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm font-medium transition-colors border border-slate-600">Events Sync</a>
                        <a href="/lineups-import" className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm font-medium transition-colors border border-slate-600">Lineups Sync</a>
                        <a href="/trophies" className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm font-medium transition-colors border border-slate-600">Trophies</a>
                    </div>
                </div>
            </header>

            <div className="flex-1 flex overflow-hidden p-6 gap-6">

                {/* Left Panel: Configuration */}
                <div className="w-1/3 min-w-[400px] flex flex-col gap-6 bg-slate-800/50 rounded-xl border border-slate-700 p-6 shadow-lg overflow-y-auto">

                    <h2 className="text-lg font-bold text-white border-b border-slate-700 pb-3">Configuration</h2>

                    <LeagueSelector
                        countries={countries}
                        selectedCountry={selectedCountry}
                        setSelectedCountry={setSelectedCountry}
                        leagues={leagues}
                        selectedLeague={selectedLeague}
                        setSelectedLeague={setSelectedLeague}
                        disabled={isImporting}
                    />

                    {selectedLeague && (
                        <SeasonSelector
                            availableSeasons={availableSeasons}
                            fromYear={fromYear}
                            setFromYear={setFromYear}
                            toYear={toYear}
                            setToYear={setToYear}
                            skipExisting={skipExisting}
                            setSkipExisting={setSkipExisting}
                            leagueSyncStatus={leagueSyncStatus}
                            disabled={isImporting}
                        />
                    )}

                    <button
                        onClick={handleAddToQueue}
                        disabled={isImporting || !selectedLeague}
                        className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-bold rounded-lg shadow-lg shadow-emerald-900/20 transition-all transform active:scale-95"
                    >
                        + Add to Batch Queue
                    </button>

                    <div className="mt-4 bg-slate-900 rounded-lg border border-slate-700 p-4 flex-1">
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 border-b border-slate-800 pb-2">
                            Staging Queue ({importQueue.length})
                        </h3>

                        {importQueue.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-32 text-slate-600 italic text-sm">
                                <span>Queue is empty</span>
                            </div>
                        ) : (
                            <ul className="space-y-3">
                                {importQueue.map(item => (
                                    <li key={item.id} className="bg-slate-800 rounded-lg p-3 flex items-start justify-between group border border-slate-700 hover:border-blue-500/50 transition-colors">
                                        <div>
                                            <div className="font-bold text-white text-sm">{item.leagueName}</div>
                                            <div className="text-xs text-slate-500 mb-2">{item.country}</div>
                                            <div className="flex flex-wrap gap-1.5">
                                                {item.seasons.map(s => (
                                                    <span
                                                        key={s.year}
                                                        className={`text-[10px] px-1.5 py-0.5 rounded border ${s.isFull
                                                                ? 'bg-emerald-900/30 border-emerald-800 text-emerald-400'
                                                                : s.isPartial
                                                                    ? 'bg-amber-900/30 border-amber-800 text-amber-400'
                                                                    : 'bg-slate-700 border-slate-600 text-slate-400'
                                                            }`}
                                                    >
                                                        {s.year} {s.isFull ? '✓' : s.isPartial ? '!' : ''}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleRemoveFromQueue(item.id)}
                                            disabled={isImporting}
                                            className="text-slate-500 hover:text-rose-500 transition-colors p-1"
                                        >
                                            ✕
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>

                    <button
                        onClick={handleBatchImport}
                        disabled={isImporting || importQueue.length === 0}
                        className={`
                            w-full py-4 rounded-xl font-bold text-lg shadow-xl transition-all
                            ${isImporting
                                ? 'bg-slate-700 text-slate-400 cursor-wait'
                                : importQueue.length === 0
                                    ? 'bg-slate-800 text-slate-600 cursor-not-allowed border border-slate-700'
                                    : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white transform hover:-translate-y-1 shadow-blue-900/20'
                            }
                        `}
                    >
                        {isImporting ? (
                            <span className="flex items-center justify-center gap-2">
                                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Processing Batch...
                            </span>
                        ) : 'Start Batch Import'}
                    </button>
                </div>

                {/* Right Panel: Logs */}
                <div className="flex-1 bg-black rounded-xl border border-slate-800 shadow-2xl flex flex-col overflow-hidden font-mono text-sm relative">
                    <div className="bg-slate-900 px-4 py-2 border-b border-slate-800 flex justify-between items-center">
                        <div className="flex items-center gap-2">
                            <div className="flex gap-1.5">
                                <div className="w-3 h-3 rounded-full bg-red-500/50"></div>
                                <div className="w-3 h-3 rounded-full bg-amber-500/50"></div>
                                <div className="w-3 h-3 rounded-full bg-emerald-500/50"></div>
                            </div>
                            <span className="ml-3 text-slate-400 text-xs">import-cli — v3.0.1</span>
                        </div>
                        <label className="flex items-center gap-2 text-xs text-slate-500 cursor-pointer hover:text-slate-300">
                            <input
                                type="checkbox"
                                checked={autoScroll}
                                onChange={(e) => setAutoScroll(e.target.checked)}
                                className="rounded border-slate-700 bg-slate-800 text-blue-500 focus:ring-0 focus:ring-offset-0"
                            />
                            Auto-scroll
                        </label>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-2 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
                        {logs.length === 0 && (
                            <div className="h-full flex flex-col items-center justify-center text-slate-700">
                                <div className="text-4xl mb-4">⌨️</div>
                                <p>Ready for input...</p>
                            </div>
                        )}
                        {logs.map((log, index) => (
                            <div key={index} className="flex gap-3 font-mono text-xs md:text-sm">
                                <span className="text-slate-600 shrink-0">[{new Date().toLocaleTimeString()}]</span>
                                <span className={`break-words ${log.type === 'error' ? 'text-red-400' :
                                        log.type === 'success' ? 'text-emerald-400 font-bold' :
                                            log.type === 'warning' ? 'text-amber-400' :
                                                log.type === 'complete' ? 'text-emerald-300 border-t border-emerald-900/30 pt-2 mt-2 block w-full' :
                                                    'text-slate-300'
                                    }`}>
                                    {log.type === 'info' && <span className="text-blue-500 mr-2">ℹ</span>}
                                    {log.type === 'success' && <span className="text-emerald-500 mr-2">✓</span>}
                                    {log.type === 'error' && <span className="text-red-500 mr-2">✗</span>}
                                    {log.message}
                                    {log.link && (
                                        <a href={log.link} target="_blank" rel="noreferrer" className="ml-2 text-blue-400 hover:text-blue-300 underline underline-offset-2">
                                            Open Dashboard ↗
                                        </a>
                                    )}
                                </span>
                            </div>
                        ))}
                        <div ref={logsEndRef} />
                    </div>
                </div>

            </div>
        </div>
    );
};

export default ImportV3Page;
