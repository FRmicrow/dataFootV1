import React, { useState, useEffect } from 'react';
import axios from 'axios';

const StatusBadge = ({ status }) => {
    let color = '#cbd5e1'; // gray-300 (To Do)
    let text = 'To Do';

    if (status === 'COMPLETED') {
        color = '#22c55e'; // green-500
        text = 'OK';
    } else if (status === 'IN_PROGRESS') {
        color = '#3b82f6'; // blue-500
        text = 'Ongoing';
    } else if (status === 'FAILED') {
        color = '#ef4444'; // red-500
        text = 'Failed';
    }

    return (
        <span style={{
            backgroundColor: color,
            color: 'white',
            padding: '2px 6px',
            borderRadius: '4px',
            fontSize: '0.7rem',
            fontWeight: 'bold',
            marginLeft: '6px'
        }}>
            {text}
        </span>
    );
};

const LeagueItem = ({ leagueData, statusMap, startYear, endYear, isSelected, onToggle }) => {
    const [expanded, setExpanded] = useState(false);
    const { league } = leagueData;

    // Calculate Summary Stats
    const yearsToCheck = [];
    for (let y = parseInt(startYear); y <= parseInt(endYear); y++) {
        yearsToCheck.push(y);
    }

    let completedCount = 0;
    const yearStatuses = yearsToCheck.map(y => {
        // key strategy: `${league.id}-${y}` if we used map with keys, 
        // but statusMap is passed as nested object [leagueId][season] -> status
        const s = statusMap[league.id]?.[y]?.status;
        if (s === 'COMPLETED') completedCount++;
        return { year: y, status: s };
    });

    const isFullyDone = completedCount === yearsToCheck.length && yearsToCheck.length > 0;
    const isPartiallyDone = completedCount > 0 && !isFullyDone;

    return (
        <div style={{ borderBottom: '1px solid #f1f5f9', padding: '0.5rem 0' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => onToggle(league.id)}
                        disabled={false}
                    />
                    <img src={league.logo} alt="" style={{ width: '24px', height: '24px', objectFit: 'contain' }} />
                    <span style={{ fontWeight: 500 }}>{league.name}</span>
                    <span style={{ fontSize: '0.8rem', color: '#64748b' }}>({league.type})</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ fontSize: '0.85rem' }}>
                        {isFullyDone ? (
                            <span style={{ color: '#22c55e', fontWeight: 'bold' }}>All Done</span>
                        ) : (
                            <span style={{ color: isPartiallyDone ? '#3b82f6' : '#94a3b8' }}>
                                {completedCount} / {yearsToCheck.length} Done
                            </span>
                        )}
                    </div>
                    <button
                        onClick={() => setExpanded(!expanded)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem', padding: '0 4px' }}
                    >
                        {expanded ? '−' : '+'}
                    </button>
                </div>
            </div>

            {expanded && (
                <div style={{ marginLeft: '36px', marginTop: '0.5rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: '8px' }}>
                    {yearStatuses.map(({ year, status }) => (
                        <div key={year} style={{
                            display: 'flex', flexDirection: 'column', alignItems: 'center',
                            padding: '4px', background: '#f8fafc', borderRadius: '4px', border: '1px solid #e2e8f0'
                        }}>
                            <span style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>{year}</span>
                            <StatusBadge status={status} />
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

const ImportPlayers = () => {
    // Shared State
    const [yearStart, setYearStart] = useState(2010);
    const [yearEnd, setYearEnd] = useState(new Date().getFullYear());
    const [logs, setLogs] = useState([]);
    const [importing, setImporting] = useState(false);
    const [error, setError] = useState(null);

    // Single Import State
    const [countries, setCountries] = useState([]);
    const [leagues, setLeagues] = useState([]);
    const [selectedCountry, setSelectedCountry] = useState('');
    const [selectedLeague, setSelectedLeague] = useState('');

    // Mass Import State
    const [massRegion, setMassRegion] = useState('Europe');
    const [regionData, setRegionData] = useState(null); // { international: [], countries: [] }
    const [loadingRegion, setLoadingRegion] = useState(false);
    const [importStatuses, setImportStatuses] = useState({}); // { leagueId: { season: { status, ... } } }
    const [selectedLeagueIds, setSelectedLeagueIds] = useState(new Set());
    const [expandedCountries, setExpandedCountries] = useState(new Set()); // For collapsible country lists

    useEffect(() => {
        fetchCountries();
        fetchImportStatuses();
    }, []);

    const addLog = (message) => {
        setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`]);
    };

    const fetchImportStatuses = async () => {
        try {
            const res = await axios.get('/api/admin/import-status');
            const map = {};
            res.data.forEach(row => {
                if (!map[row.league_id]) map[row.league_id] = {};
                map[row.league_id][row.season] = row;
            });
            setImportStatuses(map);
        } catch (e) {
            console.error("Failed to fetch status", e);
        }
    };

    const fetchCountries = async () => {
        try {
            const response = await axios.get('/api/admin/countries');
            setCountries(response.data);
        } catch (err) {
            console.error('Error fetching countries:', err);
        }
    };

    // --- Single Import Logic ---
    const handleCountryChange = async (e) => {
        const countryName = e.target.value;
        setSelectedCountry(countryName);
        if (countryName) {
            const response = await axios.get(`/api/admin/api-leagues?country=${encodeURIComponent(countryName)}`);
            setLeagues(response.data.response || []);
        }
    };

    const handleSingleImport = async () => {
        setImporting(true);
        setLogs([]);
        addLog(`Starting single import...`);
        try {
            for (let year = parseInt(yearStart); year <= parseInt(yearEnd); year++) {
                addLog(`Processing ${year}...`);
                const res = await axios.post('/api/admin/import-league-players', { leagueId: selectedLeague, season: year });
                if (res.data.skipped) addLog(`  ⏭️ ${year}: Skipped (Done).`);
                else if (res.data.success) addLog(`  ✓ ${year}: ${res.data.importedCount} Imported.`);
                else addLog(`  ⚠️ ${year}: ${res.data.message}`);
            }
            fetchImportStatuses(); // Refresh status check
        } finally {
            setImporting(false);
        }
    };

    // --- Mass Import Logic ---
    const handleScanRegion = async () => {
        setLoadingRegion(true);
        setError(null);
        setRegionData(null);
        try {
            addLog(`Scanning leagues for ${massRegion}... (This may take a moment)`);
            const res = await axios.get(`/api/admin/region-leagues?region=${massRegion}`);
            setRegionData(res.data);

            // Auto-expand top 5 countries
            const top5 = new Set(res.data.countries.slice(0, 5).map(c => c.name));
            setExpandedCountries(top5);

            addLog(`Scan complete. Found ${res.data.international.length} INT and ${res.data.countries.length} Countries.`);
        } catch (err) {
            setError('Failed to scan region.');
            console.error(err);
        } finally {
            setLoadingRegion(false);
        }
    };

    const toggleLeagueSelection = (id) => {
        const next = new Set(selectedLeagueIds);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setSelectedLeagueIds(next);
    };

    const toggleCountryExpand = (name) => {
        const next = new Set(expandedCountries);
        if (next.has(name)) next.delete(name);
        else next.add(name);
        setExpandedCountries(next);
    };

    const handleMassImportExecution = async () => {
        if (selectedLeagueIds.size === 0) {
            setError("No leagues selected!");
            return;
        }

        setImporting(true);
        setLogs([]);
        setError(null);
        addLog(`🚀 Starting Batch Import for ${selectedLeagueIds.size} leagues (${yearStart}-${yearEnd})...`);

        try {
            // Flatten the list of leagues to process
            // We need to know which IDs correspond to which names for logging, 
            // but the ID is enough for the API.

            const queue = Array.from(selectedLeagueIds);

            for (let i = 0; i < queue.length; i++) {
                const leagueId = queue[i];
                addLog(`\n[${i + 1}/${queue.length}] Processing League ID: ${leagueId}`);

                for (let year = parseInt(yearStart); year <= parseInt(yearEnd); year++) {
                    try {
                        // Check if we can skip strictly if we trust our status map?
                        // Best to let the backend do the atomic check to be safe.
                        const res = await axios.post('/api/admin/import-league-players', {
                            leagueId: leagueId,
                            season: year
                        });

                        if (res.data.skipped) {
                            addLog(`   ⏭️ ${year}: Skipped.`);
                        } else if (res.data.success) {
                            addLog(`   ✓ ${year}: ${res.data.importedCount} Imported.`);
                            // Optimistic update of status map for UI
                            setImportStatuses(prev => ({
                                ...prev,
                                [leagueId]: {
                                    ...prev[leagueId],
                                    [year]: { status: 'COMPLETED' }
                                }
                            }));
                        } else {
                            addLog(`   ⚠️ ${year}: ${res.data.message}`);
                        }
                    } catch (e) {
                        addLog(`   ❌ ${year}: Failed.`);
                    }
                }
            }
            addLog('\n✅ Batch Import Finished.');
            fetchImportStatuses(); // Full refresh
        } catch (e) {
            console.error(e);
            setError("Batch import critical failure.");
        } finally {
            setImporting(false);
        }
    };

    return (
        <div className="import-players-page" style={{ paddingBottom: '100px' }}>
            <h2>Import Management</h2>

            {/* --- Global Settings --- */}
            <div className="card" style={{ padding: '1rem', background: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', marginBottom: '2rem' }}>
                <h4>📅 Date Range (Global)</h4>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <div>
                        <label>Start Year</label>
                        <input type="number" value={yearStart} onChange={(e) => setYearStart(e.target.value)} disabled={importing} />
                    </div>
                    <div>
                        <label>End Year</label>
                        <input type="number" value={yearEnd} onChange={(e) => setYearEnd(e.target.value)} disabled={importing} />
                    </div>
                </div>
            </div>

            {/* --- Mass Import Section (Primary) --- */}
            <div className="mass-import-container" style={{ marginBottom: '2rem' }}>
                <h3>🌍 Regional Mass Import</h3>
                <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                    <select value={massRegion} onChange={(e) => setMassRegion(e.target.value)} disabled={importing || loadingRegion}>
                        <option value="Europe">Europe</option>
                        <option value="World">World</option>
                        <option value="Americas">Americas</option>
                        <option value="Asia">Asia</option>
                        <option value="Africa">Africa</option>
                    </select>
                    <button className="btn-secondary" onClick={handleScanRegion} disabled={importing || loadingRegion}>
                        {loadingRegion ? 'Scanning...' : 'Scan Region'}
                    </button>
                    {regionData && (
                        <button className="btn-primary" onClick={handleMassImportExecution} disabled={importing || selectedLeagueIds.size === 0}>
                            {importing ? 'Importing...' : `Import Selected (${selectedLeagueIds.size})`}
                        </button>
                    )}
                </div>

                {error && <div className="badge warning">{error}</div>}

                {regionData && (
                    <div className="leagues-tree" style={{ border: '1px solid #e2e8f0', borderRadius: '8px', background: 'white', padding: '1rem' }}>

                        {/* International Section */}
                        {regionData.international.length > 0 && (
                            <div className="region-section">
                                <h4 style={{ borderBottom: '2px solid #3b82f6', paddingBottom: '0.5rem', marginTop: 0 }}>🏆 International</h4>
                                {regionData.international.map(lItem => (
                                    <LeagueItem
                                        key={lItem.league.id}
                                        leagueData={lItem}
                                        statusMap={importStatuses}
                                        startYear={yearStart}
                                        endYear={yearEnd}
                                        isSelected={selectedLeagueIds.has(lItem.league.id)}
                                        onToggle={toggleLeagueSelection}
                                    />
                                ))}
                            </div>
                        )}

                        {/* Countries Section */}
                        <div className="countries-section" style={{ marginTop: '2rem' }}>
                            <h4 style={{ borderBottom: '2px solid #3b82f6', paddingBottom: '0.5rem' }}>🏳️ Countries ({regionData.countries.length})</h4>
                            {regionData.countries.map(c => (
                                <div key={c.name} className="country-group" style={{ marginBottom: '0.5rem' }}>
                                    <div
                                        onClick={() => toggleCountryExpand(c.name)}
                                        style={{
                                            background: '#f1f5f9', padding: '0.5rem', borderRadius: '4px', cursor: 'pointer', fontWeight: 600,
                                            display: 'flex', justifyContent: 'space-between'
                                        }}
                                    >
                                        <span>{c.name} ({c.leagues.length} Leagues)</span>
                                        <span>{expandedCountries.has(c.name) ? '▼' : '▶'}</span>
                                    </div>

                                    {expandedCountries.has(c.name) && (
                                        <div style={{ marginLeft: '1rem', paddingLeft: '1rem', borderLeft: '2px solid #e2e8f0' }}>
                                            {c.leagues.map(lItem => (
                                                <LeagueItem
                                                    key={lItem.league.id}
                                                    leagueData={lItem}
                                                    statusMap={importStatuses}
                                                    startYear={yearStart}
                                                    endYear={yearEnd}
                                                    isSelected={selectedLeagueIds.has(lItem.league.id)}
                                                    onToggle={toggleLeagueSelection}
                                                />
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* --- Logs --- */}
            <div className="import-log-area" style={{ background: '#1e293b', color: '#f8fafc', padding: '1rem', borderRadius: '4px', height: '300px', overflowY: 'auto', fontFamily: 'monospace' }}>
                <h4 style={{ marginTop: 0, color: '#94a3b8' }}>Process Logs</h4>
                {logs.map((log, i) => (
                    <div key={i}>{log}</div>
                ))}
            </div>

            {/* --- Legacy Single Import (Collapsible optional) --- */}
            <details style={{ marginTop: '2rem', color: '#64748b' }}>
                <summary>Old Single Import Tool</summary>
                <div className="filters-row" style={{ marginTop: '1rem' }}>
                    <select value={selectedCountry} onChange={handleCountryChange}><option value="">Country</option>{countries.map(c => <option key={c.country_id} value={c.country_name}>{c.country_name}</option>)}</select>
                    <select value={selectedLeague} onChange={(e) => setSelectedLeague(e.target.value)}><option value="">League</option>{leagues.map(l => <option key={l.league.id} value={l.league.id}>{l.league.name}</option>)}</select>
                    <button onClick={handleSingleImport} disabled={!selectedLeague || importing}>Run</button>
                </div>
            </details>
        </div>
    );
};

export default ImportPlayers;
