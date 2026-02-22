
import React, { useState, useEffect, useMemo } from 'react';
import api from '../../services/api';
import { useImport } from '../../context/ImportContext.jsx';
import './ImportMatrix.css';

const ImportMatrixPage = () => {
    const [leagues, setLeagues] = useState([]);
    const [loading, setLoading] = useState(true);
    const [batchQueue, setBatchQueue] = useState([]); // Array of { leagueId, year, pillar }
    const [years, setYears] = useState([]);
    const [isAuditing, setIsAuditing] = useState(false);
    const [selectedLeagues, setSelectedLeagues] = useState([]); // Array of league IDs
    const { startImport, isImporting } = useImport();

    useEffect(() => {
        fetchMatrix();
    }, []);

    const fetchMatrix = async () => {
        setLoading(true);
        try {
            const res = await api.getImportMatrixStatus();
            const data = res.data || res;
            setLeagues(data);

            // Extract unique years across all leagues
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
        if (!window.confirm('Start Database Discovery Scan? This will analyze existing data to backfill sync flags.')) return;
        setIsAuditing(true);
        try {
            await api.triggerAuditScan();
            await fetchMatrix();
            alert('Audit complete!');
        } catch (err) {
            alert('Audit failed: ' + err.message);
        } finally {
            setIsAuditing(false);
        }
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

    const clearQueue = () => setBatchQueue([]);

    const runBatch = () => {
        if (batchQueue.length === 0) return;
        startImport('/import/batch', 'POST', { selection: consolidateQueue(batchQueue) });
        setBatchQueue([]);
    };

    const consolidateQueue = (queue) => {
        const map = {};
        queue.forEach(item => {
            if (!map[item.leagueId]) map[item.leagueId] = { leagueId: item.leagueId, seasons: [] };
            if (!map[item.leagueId].seasons.includes(item.year)) map[item.leagueId].seasons.push(item.year);
        });
        return Object.values(map);
    };

    const toggleLeagueSelection = (leagueId) => {
        if (selectedLeagues.includes(leagueId)) {
            setSelectedLeagues(selectedLeagues.filter(id => id !== leagueId));
        } else {
            setSelectedLeagues([...selectedLeagues, leagueId]);
        }
    };

    const runBatchDeepSync = () => {
        if (selectedLeagues.length === 0) return;
        const names = leagues
            .filter(l => selectedLeagues.includes(l.id))
            .map(l => l.name)
            .join(', ');

        if (!window.confirm(`🚀 START BATCH DEEP SYNC: This will process ${selectedLeagues.length} leagues (${names}). Continue?`)) return;

        startImport('/import/leagues/batch-deep-sync', 'POST', { leagueIds: selectedLeagues });
        setSelectedLeagues([]);
    };

    const handleDeepSync = (leagueId, leagueName) => {
        if (!window.confirm(`⚠️ START DEEP SYNC: This will scan and import EVERY missing data point (Fixtures, Lineups, Events, Trophies) for ALL seasons of ${leagueName}. Launch?`)) return;
        startImport(`/import/league/${leagueId}/deep-sync`, 'POST');
    };

    const getIndicatorClass = (val, leagueId, year, pillar) => {
        const isQueued = batchQueue.find(item => item.leagueId === leagueId && item.year === year && item.pillar === pillar);
        if (isQueued) return 'indicator queued';

        if (val === 1) return 'indicator complete';
        if (val === 0.5) return 'indicator partial';
        return 'indicator missing';
    };

    if (loading) return <div className="matrix-container"><h1>Loading Matrix...</h1></div>;

    return (
        <div className="matrix-container">
            <header className="matrix-header">
                <div className="matrix-title">
                    <h1>Import Command Matrix</h1>
                    <p>Unified data ingestion hub for all competitions and seasons.</p>
                </div>
                <div className="matrix-actions">
                    <button className="btn-audit" onClick={handleAudit} disabled={isAuditing}>
                        {isAuditing ? '🔍 Auditing...' : '🛠️ Discovery Scan'}
                    </button>
                    <button className="btn-batch" onClick={() => alert('Feature coming soon: Progress Tracker')}>
                        📊 Batch Tracker
                    </button>
                </div>
            </header>

            <div className="matrix-grid-wrapper">
                <table className="matrix-table">
                    <thead>
                        <tr>
                            <th style={{ width: '40px' }}>
                                <input
                                    type="checkbox"
                                    className="league-checkbox"
                                    checked={selectedLeagues.length === leagues.length && leagues.length > 0}
                                    onChange={() => {
                                        if (selectedLeagues.length === leagues.length) setSelectedLeagues([]);
                                        else setSelectedLeagues(leagues.map(l => l.id));
                                    }}
                                />
                            </th>
                            <th>Competition</th>
                            {years.map(y => <th key={y}>{y}</th>)}
                        </tr>
                    </thead>
                    <tbody>
                        {leagues.map(league => (
                            <tr key={league.id} className={selectedLeagues.includes(league.id) ? 'selected' : ''}>
                                <td>
                                    <input
                                        type="checkbox"
                                        className="league-checkbox"
                                        checked={selectedLeagues.includes(league.id)}
                                        onChange={() => toggleLeagueSelection(league.id)}
                                    />
                                </td>
                                <td>
                                    <div className="competition-cell">
                                        <img src={league.logo} alt="" className="comp-logo" />
                                        <div className="comp-info">
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                <img src={league.flag} alt="" className="comp-flag" />
                                                <span className="comp-name">{league.name}</span>
                                                <button
                                                    className="btn-deep-sync tooltip"
                                                    onClick={() => handleDeepSync(league.id, league.name)}
                                                    disabled={isImporting}
                                                >
                                                    ⚡
                                                    <span className="tooltiptext">One-Click Deep Sync</span>
                                                </button>
                                            </div>
                                            <span className="comp-country">{league.country}</span>
                                        </div>
                                    </div>
                                </td>
                                {years.map(year => {
                                    const season = league.seasons.find(s => s.year === year);
                                    if (!season) return <td key={year}></td>;

                                    return (
                                        <td key={year} className="season-cell">
                                            <div className="status-box">
                                                <div
                                                    className={`${getIndicatorClass(season.status.core, league.id, year, 'core')} tooltip`}
                                                    onClick={() => togglePillar(league.id, year, 'core')}
                                                >
                                                    C
                                                    <span className="tooltiptext">CORE: {season.last_sync.core ? new Date(season.last_sync.core).toLocaleDateString() : 'Missing'}</span>
                                                </div>
                                                <div
                                                    className={`${getIndicatorClass(season.status.events, league.id, year, 'events')} tooltip`}
                                                    onClick={() => togglePillar(league.id, year, 'events')}
                                                >
                                                    E
                                                    <span className="tooltiptext">EVENTS: {season.last_sync.events ? new Date(season.last_sync.events).toLocaleDateString() : 'Missing'}</span>
                                                </div>
                                                <div
                                                    className={`${getIndicatorClass(season.status.lineups, league.id, year, 'lineups')} tooltip`}
                                                    onClick={() => togglePillar(league.id, year, 'lineups')}
                                                >
                                                    L
                                                    <span className="tooltiptext">LINEUPS: {season.last_sync.lineups ? new Date(season.last_sync.lineups).toLocaleDateString() : 'Missing'}</span>
                                                </div>
                                                <div
                                                    className={`${getIndicatorClass(season.status.trophies, league.id, year, 'trophies')} tooltip`}
                                                    onClick={() => togglePillar(league.id, year, 'trophies')}
                                                >
                                                    T
                                                    <span className="tooltiptext">TROPHIES: {season.last_sync.trophies ? new Date(season.last_sync.trophies).toLocaleDateString() : 'Missing'}</span>
                                                </div>
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
                    {selectedLeagues.length > 0 && (
                        <>
                            <div className="staging-text">
                                Leagues Selected <span className="staging-count" style={{ background: '#f59e0b' }}>{selectedLeagues.length}</span>
                            </div>
                            <button className="btn-batch-deep" onClick={runBatchDeepSync}>Execute Batch Deep Sync</button>
                            <div style={{ height: '24px', width: '1px', background: '#334155' }}></div>
                        </>
                    )}

                    {batchQueue.length > 0 && (
                        <>
                            <div className="staging-text">
                                Batch Staging Queue <span className="staging-count">{batchQueue.length}</span>
                            </div>
                            <button className="btn-clear" onClick={clearQueue}>Clear Queue</button>
                            <button className="btn-batch" onClick={runBatch}>Execute Batch Import</button>
                        </>
                    )}

                    {batchQueue.length === 0 && selectedLeagues.length > 0 && (
                        <button className="btn-clear" onClick={() => setSelectedLeagues([])}>Clear Selection</button>
                    )}
                </div>
            )}
        </div>
    );
};

export default ImportMatrixPage;
