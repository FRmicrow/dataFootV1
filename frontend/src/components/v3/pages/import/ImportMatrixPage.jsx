import React, { useState, useEffect } from 'react';
import api from '../../../../services/api';
import { useImport } from '../../../../context/ImportContext.jsx';
import { PageLayout, PageHeader, PageContent } from '../../layouts';
import { Badge, Stack, Button } from '../../../../design-system';
import '../../modules/import/ImportMatrix.css';

/**
 * Import Status Constants (mirror backend)
 */
const STATUS = {
    NONE: 0,
    PARTIAL: 1,
    COMPLETE: 2,
    NO_DATA: 3,
    LOCKED: 4
};

const TOOLTIP_MESSAGES = {
    [STATUS.NONE]: 'Not imported yet',
    [STATUS.PARTIAL]: (info) => `Partially imported${info.lastSync ? ` — Last: ${new Date(info.lastSync).toLocaleDateString()}` : ''}`,
    [STATUS.COMPLETE]: (info) => `Fully imported${info.lastSync ? ` — Last: ${new Date(info.lastSync).toLocaleDateString()}` : ''}`,
    [STATUS.NO_DATA]: (info) => `No data available${info.reason ? ` — ${info.reason}` : ''}`,
    [STATUS.LOCKED]: 'Season locked — No further imports'
};

const ImportMatrixPage = () => {
    const [leagues, setLeagues] = useState([]);
    const [loading, setLoading] = useState(true);
    const [batchQueue, setBatchQueue] = useState([]);
    const [years, setYears] = useState([]);
    const [isAuditing, setIsAuditing] = useState(false);
    const [selectedLeagues, setSelectedLeagues] = useState([]);

    // US-203 & US-207: Discovery State
    const [countries, setCountries] = useState([]);
    const [selectedCountry, setSelectedCountry] = useState('');
    const [availableLeagues, setAvailableLeagues] = useState([]);
    const [selectedDiscoveryLeague, setSelectedDiscoveryLeague] = useState('');
    const [isDiscovering, setIsDiscovering] = useState(false);
    const [discoveryBatch, setDiscoveryBatch] = useState([]);

    const { startImport, isImporting } = useImport();

    useEffect(() => {
        fetchMatrix();
        fetchCountries();
    }, []);

    const fetchCountries = async () => {
        try {
            const res = await api.getDiscoveryCountries();
            const data = res.data || res;
            setCountries(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('Failed to fetch countries:', err);
        }
    };

    const handleCountryChange = async (countryName) => {
        setSelectedCountry(countryName);
        setSelectedDiscoveryLeague('');
        setAvailableLeagues([]);
        if (!countryName) return;

        try {
            const res = await api.getDiscoveryLeagues(countryName);
            const data = res.data || res;
            setAvailableLeagues(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('Failed to fetch leagues for country:', err);
        }
    };

    const fetchMatrix = async () => {
        setLoading(true);
        try {
            const res = await api.getImportMatrixStatus();
            const data = res.data || res;
            setLeagues(data);
            const allYears = new Set();
            data.forEach(l => l.seasons.forEach(s => allYears.add(s.year)));
            setYears(Array.from(allYears).sort((a, b) => b - a));
        } catch (err) {
            console.error('Failed to load matrix:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleAudit = async () => {
        if (!window.confirm('Start Database Discovery Scan?')) return;
        setIsAuditing(true);
        try {
            await api.triggerAuditScan();
            await fetchMatrix();
        } catch (err) {
            alert('Audit failed: ' + err.message);
        } finally {
            setIsAuditing(false);
        }
    };

    const handleDiscoveryImport = async () => {
        if (!selectedDiscoveryLeague) return;
        const league = availableLeagues.find(l => l.league.id === parseInt(selectedDiscoveryLeague));
        if (!league) return;

        const currentSeason = league.seasons.find(s => s.current)?.year || new Date().getFullYear();
        if (!window.confirm(`Import Core data for ${league.league.name} (${currentSeason})?`)) return;

        setIsDiscovering(true);
        try {
            await startImport('/import/discovery/import', 'POST', {
                leagueId: league.league.id,
                seasonYear: currentSeason
            });
            setSelectedDiscoveryLeague('');
            setTimeout(fetchMatrix, 2000);
        } catch (err) {
            alert('Discovery import failed: ' + err.message);
        } finally {
            setIsDiscovering(false);
        }
    };

    const addToDiscoveryBatch = () => {
        if (!selectedDiscoveryLeague) return;
        const league = availableLeagues.find(l => l.league.id === parseInt(selectedDiscoveryLeague));
        if (!league) return;

        const currentSeason = league.seasons.find(s => s.current)?.year || new Date().getFullYear();
        if (discoveryBatch.some(item => item.leagueId === league.league.id)) return;

        setDiscoveryBatch([...discoveryBatch, {
            leagueId: league.league.id,
            name: league.league.name,
            seasonYear: currentSeason,
            flag: league.country.flag
        }]);
        setSelectedDiscoveryLeague('');
    };

    const removeFromDiscoveryBatch = (leagueId) => {
        setDiscoveryBatch(discoveryBatch.filter(item => item.leagueId !== leagueId));
    };

    const runDiscoveryBatch = async () => {
        if (discoveryBatch.length === 0) return;
        if (!window.confirm(`Start importing ${discoveryBatch.length} discovery leagues?`)) return;

        setIsDiscovering(true);
        try {
            await startImport('/import/discovery/batch', 'POST', {
                selection: discoveryBatch.map(item => ({
                    leagueId: item.leagueId,
                    seasonYear: item.seasonYear
                }))
            });
            setDiscoveryBatch([]);
            setTimeout(fetchMatrix, 2000);
        } catch (err) {
            alert('Discovery batch failed: ' + err.message);
        } finally {
            setIsDiscovering(false);
        }
    };

    const getStatusCode = (pillarStatus) => {
        if (typeof pillarStatus === 'object' && pillarStatus !== null) return pillarStatus.code ?? STATUS.NONE;
        if (pillarStatus === 1) return STATUS.COMPLETE;
        if (pillarStatus === 0.5) return STATUS.PARTIAL;
        return STATUS.NONE;
    };

    const handleIndicatorClick = (leagueId, year, pillar, statusCode) => {
        if (statusCode === STATUS.LOCKED || statusCode === STATUS.NO_DATA) return;
        if (statusCode === STATUS.COMPLETE) {
            if (!window.confirm('This pillar is complete. Re-import?')) return;
        }
        togglePillar(leagueId, year, pillar);
    };

    const togglePillar = (leagueId, year, pillar) => {
        const key = `${leagueId}-${year}-${pillar}`;
        const exists = batchQueue.find(item => `${item.leagueId}-${item.year}-${item.pillar}` === key);
        if (exists) {
            setBatchQueue(batchQueue.filter(item => `${item.leagueId}-${item.year}-${item.pillar}` !== key));
        } else {
            setBatchQueue([...batchQueue, { leagueId, year, pillar }]);
        }
    };

    const runBatch = () => {
        if (batchQueue.length === 0) return;
        startImport('/import/batch', 'POST', { selection: consolidateQueue(batchQueue) });
        setBatchQueue([]);
    };

    const runCategoryBatch = (category) => {
        if (selectedLeagues.length === 0) return;
        const newItems = [];
        leagues.filter(l => selectedLeagues.includes(l.id)).forEach(l => {
            l.seasons.forEach(s => {
                const statusCode = getStatusCode(s.status[category]);
                if (statusCode === STATUS.NONE || statusCode === STATUS.PARTIAL) {
                    newItems.push({ leagueId: l.id, year: s.year, pillar: category });
                }
            });
        });
        setBatchQueue([...batchQueue, ...newItems]);
    };

    const runBatchDeepSync = () => {
        if (selectedLeagues.length === 0) return;
        if (!window.confirm(`⚡ Start Deep Sync for ${selectedLeagues.length} leagues?`)) return;
        startImport('/import/leagues/batch-deep-sync', 'POST', { leagueIds: selectedLeagues });
        setSelectedLeagues([]);
    };

    const consolidateQueue = (queue) => {
        const map = {};
        queue.forEach(item => {
            if (!map[item.leagueId]) map[item.leagueId] = { leagueId: item.leagueId, seasons: [] };
            let season = map[item.leagueId].seasons.find(s => s.year === item.year);
            if (!season) { season = { year: item.year, pillars: [] }; map[item.leagueId].seasons.push(season); }
            if (!season.pillars.includes(item.pillar)) season.pillars.push(item.pillar);
        });
        return Object.values(map);
    };

    if (loading) return <div className="matrix-container"><h1>Loading Matrix...</h1></div>;

    return (
        <PageLayout className="ds-import-matrix-page animate-fade-in">
            <PageHeader
                title="Intelligence Matrix"
                subtitle="High-fidelity data synchronization and state reconciliation"
                badge={{ label: "SYNC STATUS", variant: "primary" }}
                extra={
                    <Stack direction="row" gap="var(--spacing-md)">
                        <Badge variant="neutral">{countries.length} Regions</Badge>
                        <Badge variant="neutral">{leagues.length} Active Modules</Badge>
                    </Stack>
                }
            />

            <PageContent>
                <div className="matrix-container">
                    <header className="matrix-header">
                        <div className="matrix-title">
                            <h1>Import Command Matrix</h1>
                            <p>Unified data ingestion hub for all competitions and seasons.</p>
                        </div>
                        <div className="matrix-actions">
                            <div className="discovery-group">
                                <select
                                    className="discover-select"
                                    value={selectedCountry}
                                    onChange={(e) => handleCountryChange(e.target.value)}
                                >
                                    <option value="">-- Select Country --</option>
                                    {countries.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                                </select>
                                <select
                                    className="discover-select"
                                    value={selectedDiscoveryLeague}
                                    onChange={(e) => setSelectedDiscoveryLeague(e.target.value)}
                                    disabled={!selectedCountry || availableLeagues.length === 0}
                                >
                                    <option value="">-- Select New League --</option>
                                    {availableLeagues.map(l => (
                                        <option key={l.league.id} value={l.league.id}>{l.league.name}</option>
                                    ))}
                                </select>
                                <button
                                    className="btn-discover-import"
                                    onClick={handleDiscoveryImport}
                                    disabled={!selectedDiscoveryLeague || isImporting || isDiscovering}
                                >
                                    {isDiscovering ? '⏳ Importing...' : '📥 Import'}
                                </button>
                                <button
                                    className="btn-discover-add"
                                    onClick={addToDiscoveryBatch}
                                    disabled={!selectedDiscoveryLeague}
                                >
                                    ➕ Add
                                </button>
                            </div>

                            {discoveryBatch.length > 0 && (
                                <div className="discovery-batch-list">
                                    <div className="discovery-batch-items">
                                        {discoveryBatch.map(item => (
                                            <div key={item.leagueId} className="discovery-batch-tag">
                                                <img src={item.flag} alt="" className="mini-flag" />
                                                <span>{item.name} ({item.seasonYear})</span>
                                                <button className="btn-remove-tag" onClick={() => removeFromDiscoveryBatch(item.leagueId)}>×</button>
                                            </div>
                                        ))}
                                    </div>
                                    <button className="btn-process-discovery" onClick={runDiscoveryBatch} disabled={isImporting}>
                                        {isDiscovering ? '⏳ Importing...' : `🚀 Import Batch (${discoveryBatch.length})`}
                                    </button>
                                </div>
                            )}

                            <button className="btn-audit" onClick={handleAudit} disabled={isAuditing}>
                                {isAuditing ? '🔍 Auditing...' : '🛠️ Discovery Scan'}
                            </button>
                            <button className="btn-normalize" onClick={() => api.triggerNormalization()} disabled={selectedLeagues.length === 0}>
                                🧮 Compute Per-90 Metrics
                            </button>
                        </div>
                    </header>

                    <div className="matrix-grid-wrapper">
                        <table className="matrix-table">
                            <thead>
                                <tr>
                                    <th style={{ width: '40px' }}>
                                        <input type="checkbox" checked={selectedLeagues.length === leagues.length} onChange={() => setSelectedLeagues(selectedLeagues.length === leagues.length ? [] : leagues.map(l => l.id))} />
                                    </th>
                                    <th>Competition</th>
                                    {years.map(y => <th key={y}>{y}</th>)}
                                </tr>
                            </thead>
                            <tbody>
                                {leagues.map(league => (
                                    <tr key={league.id} className={selectedLeagues.includes(league.id) ? 'selected' : ''}>
                                        <td><input type="checkbox" checked={selectedLeagues.includes(league.id)} onChange={() => setSelectedLeagues(prev => prev.includes(league.id) ? prev.filter(id => id !== league.id) : [...prev, league.id])} /></td>
                                        <td>
                                            <div className="competition-cell">
                                                <img src={league.logo} alt="" className="comp-logo" />
                                                <div className="comp-info">
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                        <img src={league.flag} alt="" className="comp-flag" />
                                                        <span className="comp-name">{league.name}</span>
                                                    </div>
                                                    <span className="comp-country">{league.country}</span>
                                                </div>
                                            </div>
                                        </td>
                                        {years.map(year => {
                                            const season = league.seasons.find(s => s.year === year);
                                            if (!season) return <td key={year}></td>;
                                            const pillars = ['core', 'events', 'lineups', 'fs', 'ps', 'trophies'];
                                            const pillarLabels = { core: 'C', events: 'E', lineups: 'L', fs: 'FS', ps: 'PS', trophies: 'T' };
                                            return (
                                                <td key={year} className="season-cell">
                                                    <div className="status-box">
                                                        {pillars.map(pillar => {
                                                            const s = season.status[pillar];
                                                            const code = getStatusCode(s);
                                                            const isQueued = batchQueue.some(q => q.leagueId === league.id && q.year === year && q.pillar === pillar);
                                                            return (
                                                                <div key={pillar} className={`indicator indicator-${code === 4 ? 'locked' : (code === 3 ? 'nodata' : (code === 2 ? 'complete' : (code === 1 ? 'partial' : 'none')))} ${isQueued ? 'queued' : ''} tooltip`} onClick={() => handleIndicatorClick(league.id, year, pillar, code)}>
                                                                    {code === 4 ? '🔒' : pillarLabels[pillar]}
                                                                    <span className="tooltiptext">{pillar.toUpperCase()}: {typeof TOOLTIP_MESSAGES[code] === 'function' ? TOOLTIP_MESSAGES[code](s) : TOOLTIP_MESSAGES[code]}</span>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {(batchQueue.length > 0 || selectedLeagues.length > 0) && (
                        <div className="staging-bar">
                            <div className="staging-text">Staged: <span className="staging-count">{batchQueue.length || selectedLeagues.length}</span></div>
                            {selectedLeagues.length > 0 ? (
                                <>
                                    <button className="btn-batch-deep" onClick={runBatchDeepSync}>⚡ Deep Sync</button>
                                    <button className="btn-cat" onClick={() => runCategoryBatch('fs')}>FS</button>
                                    <button className="btn-cat" onClick={() => runCategoryBatch('ps')}>PS</button>
                                    <button className="btn-cat" onClick={() => runCategoryBatch('core')}>Core</button>
                                </>
                            ) : (
                                <button className="btn-batch" onClick={runBatch}>Execute Batch</button>
                            )}
                            <button className="btn-clear" onClick={() => { setBatchQueue([]); setSelectedLeagues([]); }}>Clear</button>
                        </div>
                    )}
                </div>
            </PageContent>
        </PageLayout>
    );
};

export default ImportMatrixPage;
