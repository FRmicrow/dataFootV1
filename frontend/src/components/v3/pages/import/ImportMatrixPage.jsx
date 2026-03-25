import React, { useState, useEffect, useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';
import api from '../../../../services/api';
import { useImport } from '../../../../context/ImportContext.jsx';
import { PageLayout, PageHeader, PageContent } from '../../layouts';
import { Badge, Stack, Button, Select as CustomSelect } from '../../../../design-system';
import '../../modules/import/ImportMatrix.css';

const STATUS = {
    NONE: 0,
    PARTIAL: 1,
    COMPLETE: 2,
    NO_DATA: 3,
    LOCKED: 4
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

const TOOLTIP_MESSAGES = {
    [STATUS.NONE]: 'Not imported yet',
    [STATUS.PARTIAL]: (info) => `Partially imported${info.lastSync ? ` — Last: ${new Date(info.lastSync).toLocaleDateString()}` : ''}`,
    [STATUS.COMPLETE]: (info) => `Fully imported${info.lastSync ? ` — Last: ${new Date(info.lastSync).toLocaleDateString()}` : ''}`,
    [STATUS.NO_DATA]: (info) => `No data available${info.reason ? ` — ${info.reason}` : ''}`,
    [STATUS.LOCKED]: 'Season locked — No further imports'
};

const resolveStatus = (s) => {
    if (typeof s === 'object' && s !== null) {
        return s.status ?? s.code ?? STATUS.NONE;
    }
    // Handle new system integers (0-4) first
    if (Number.isInteger(s) && s >= 0 && s <= 4) return s;

    // Legacy mapping (if s is float 0.5 or old 1)
    if (s === 1) return STATUS.COMPLETE;
    if (s === 0.5) return STATUS.PARTIAL;
    return STATUS.NONE;
};

const getStatusType = (code) => {
    switch (code) {
        case STATUS.LOCKED: return 'locked';
        case STATUS.NO_DATA: return 'nodata';
        case STATUS.COMPLETE: return 'complete';
        case STATUS.PARTIAL: return 'partial';
        default: return 'none';
    }
};

const StatusIndicator = React.memo(({ pillar, code, isQueued, onClick, tooltipText, label }) => {
    const statusType = getStatusType(code);

    return (
        <Button
            className={`indicator indicator-${statusType} ${isQueued ? 'queued' : ''} tooltip`}
            onClick={onClick}
            variant="ghost"
            size="xs"
            aria-label={`${pillar.toUpperCase()}: ${tooltipText}`}
        >
            {code === STATUS.LOCKED ? '🔒' : label}
            <span className="tooltiptext">{pillar.toUpperCase()}: {tooltipText}</span>
        </Button>
    );
});

StatusIndicator.propTypes = {
    pillar: PropTypes.string.isRequired,
    code: PropTypes.number.isRequired,
    isQueued: PropTypes.bool.isRequired,
    onClick: PropTypes.func.isRequired,
    tooltipText: PropTypes.string.isRequired,
    label: PropTypes.string.isRequired
};

const MatrixRow = React.memo(({ league, years, isSelected, onSelect, batchQueueKeys, onIndicatorClick }) => (
    <tr className={isSelected ? 'selected' : ''}>
        <td>
            <input
                type="checkbox"
                checked={isSelected}
                onChange={() => onSelect(league.id)}
            />
        </td>
        <td>
            <div className="competition-cell">
                <img src={league.logo} alt="" className="comp-logo" />
                <div className="comp-info">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {league.flag && <img src={league.flag} alt="" className="comp-flag" />}
                        <span className="comp-name">{league.name}</span>
                    </div>
                    <span className="comp-country">{league.country}</span>
                </div>
            </div>
        </td>
        {years.map(year => {
            const season = league.seasons.find(s => s.year === year);
            return (
                <SeasonCell
                    key={year}
                    leagueId={league.id}
                    year={year}
                    season={season}
                    batchQueueKeys={batchQueueKeys}
                    onIndicatorClick={onIndicatorClick}
                />
            );
        })}
    </tr>
));

MatrixRow.propTypes = {
    league: PropTypes.object.isRequired,
    years: PropTypes.array.isRequired,
    isSelected: PropTypes.bool.isRequired,
    onSelect: PropTypes.func.isRequired,
    batchQueueKeys: PropTypes.instanceOf(Set).isRequired,
    onIndicatorClick: PropTypes.func.isRequired
};

const SeasonCell = React.memo(({ leagueId, year, season, batchQueueKeys, onIndicatorClick }) => {
    if (!season) return <td></td>;

    const pillars = ['core', 'events', 'lineups', 'fs', 'ps', 'trophies'];
    const pillarLabels = { core: 'C', events: 'E', lineups: 'L', fs: 'FS', ps: 'PS', trophies: 'T' };

    return (
        <td className="season-cell">
            <div className="status-box">
                {pillars.map(pillar => {
                    const s = season.status[pillar];
                    const code = resolveStatus(s);
                    const key = `${leagueId}|${year}|${pillar}`;
                    const isQueued = batchQueueKeys.has(key);
                    const tooltip = typeof TOOLTIP_MESSAGES[code] === 'function' ? TOOLTIP_MESSAGES[code](s) : TOOLTIP_MESSAGES[code];

                    return (
                        <StatusIndicator
                            key={pillar}
                            pillar={pillar}
                            code={code}
                            isQueued={isQueued}
                            label={pillarLabels[pillar]}
                            tooltipText={tooltip}
                            onClick={() => onIndicatorClick(leagueId, year, pillar, code)}
                        />
                    );
                })}
            </div>
        </td>
    );
});

const ImportMatrixPage = () => {
    const [leagues, setLeagues] = useState([]);
    const [loading, setLoading] = useState(true);
    const [batchQueue, setBatchQueue] = useState([]);
    const [isAuditing, setIsAuditing] = useState(false);
    const [selectedLeagues, setSelectedLeagues] = useState([]);
    const [years, setYears] = useState([2025, 2024, 2023, 2022, 2021, 2020]);

    // Pagination & Search
    const [page, setPage] = useState(1);
    const [limit] = useState(50);
    const [search, setSearch] = useState('');
    const [totalLeagues, setTotalLeagues] = useState(0);

    const [countries, setCountries] = useState([]);
    const [selectedCountry, setSelectedCountry] = useState('');
    const [availableLeagues, setAvailableLeagues] = useState([]);
    const [selectedDiscoveryLeague, setSelectedDiscoveryLeague] = useState('');
    const [isDiscovering, setIsDiscovering] = useState(false);
    const [discoveryBatch, setDiscoveryBatch] = useState([]);
    const [leagueCache, setLeagueCache] = useState({}); // { countryName: leagues[] }

    const { startImport, isImporting } = useImport();

    const fetchCountries = async () => {
        try {
            const res = await api.getDiscoveryCountries();
            const data = res.data || res;
            setCountries(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('Failed to fetch countries:', err);
        }
    };

    const fetchMatrix = useCallback(async (currentSearch) => {
        try {
            setLoading(true);
            const res = await api.getImportMatrixStatus({ page, limit, search: currentSearch });
            setLeagues(res.leagues || []);
            setTotalLeagues(res.total || 0);
        } catch (err) {
            console.error('Failed to fetch matrix:', err);
        } finally {
            setLoading(false);
        }
    }, [page, limit]);

    useEffect(() => {
        fetchCountries();
    }, []);

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchMatrix(search);
        }, 300);
        return () => clearTimeout(timer);
    }, [fetchMatrix, search]);

    const totalPages = Math.ceil(totalLeagues / limit);

    const handleSearchChange = (e) => {
        setSearch(e.target.value);
        setPage(1); // Reset to first page on search
    };

    const handleAudit = useCallback(async () => {
        if (!globalThis.confirm('Start Database Discovery Scan?')) return;
        setIsAuditing(true);
        try {
            const res = await api.triggerAuditScan();
            const result = res.data || res;
            await fetchMatrix(search);
            alert(`Discovery Scan Complete!\n- Scanned: ${result.scanned}\n- Updated: ${result.updated}\n- Discovered 2026: ${result.discovered || 0}\n- Auto-Locked: ${result.autoLocked}`);
        } catch (err) {
            alert('Audit failed: ' + err.message);
        } finally {
            setIsAuditing(false);
        }
    }, [fetchMatrix]);

    const batchQueueKeys = useMemo(() => {
        const set = new Set();
        batchQueue.forEach(q => set.add(`${q.leagueId}|${q.year}|${q.pillar}`));
        return set;
    }, [batchQueue]);

    const selectOptionsCountries = useMemo(() =>
        countries.map(c => ({ value: c.name, label: c.name })),
        [countries]);

    const selectOptionsLeagues = useMemo(() =>
        availableLeagues.map(l => ({ value: l.league.id.toString(), label: l.league.name })),
        [availableLeagues]);

    const handleIndicatorClick = useCallback((leagueId, year, pillar, statusCode) => {
        if (statusCode === STATUS.LOCKED || statusCode === STATUS.NO_DATA) return;
        if (statusCode === STATUS.COMPLETE) {
            if (!globalThis.confirm('This pillar is complete. Re-import?')) return;
        }

        const key = `${leagueId}|${year}|${pillar}`;
        setBatchQueue(prev => {
            const exists = prev.find(q => `${q.leagueId}|${q.year}|${q.pillar}` === key);
            if (exists) return prev.filter(q => q !== exists);
            return [...prev, { leagueId, year, pillar }];
        });
    }, []);

    const toggleLeagueSelection = useCallback((leagueId) => {
        setSelectedLeagues(prev => prev.includes(leagueId) ? prev.filter(id => id !== leagueId) : [...prev, leagueId]);
    }, []);

    const handleDiscoveryImport = async () => {
        if (!selectedDiscoveryLeague) return;
        const league = availableLeagues.find(l => l.league.id === Number.parseInt(selectedDiscoveryLeague));
        if (!league) return;

        const currentSeason = league.seasons.find(s => s.current)?.year || new Date().getFullYear();
        if (!globalThis.confirm(`Import Core data for ${league.league.name} (${currentSeason})?`)) return;

        setIsDiscovering(true);
        try {
            await startImport('/import/discovery/import', 'POST', {
                leagueId: league.league.id,
                seasonYear: currentSeason
            });
            setSelectedDiscoveryLeague('');
            setTimeout(() => fetchMatrix(search), 2000);
        } catch (err) {
            alert('Discovery import failed: ' + err.message);
        } finally {
            setIsDiscovering(false);
        }
    };

    const addToDiscoveryBatch = () => {
        if (!selectedDiscoveryLeague) return;
        const league = availableLeagues.find(l => l.league.id === Number.parseInt(selectedDiscoveryLeague));
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
        if (!globalThis.confirm(`Start importing ${discoveryBatch.length} discovery leagues?`)) return;

        setIsDiscovering(true);
        try {
            await startImport('/import/discovery/batch', 'POST', {
                selection: discoveryBatch.map(item => ({
                    leagueId: item.leagueId,
                    seasonYear: item.seasonYear
                }))
            });
            setDiscoveryBatch([]);
            setTimeout(() => fetchMatrix(search), 2000);
        } catch (err) {
            alert('Discovery batch failed: ' + err.message);
        } finally {
            setIsDiscovering(false);
        }
    };

    const runBatch = () => {
        if (batchQueue.length === 0) return;
        startImport('/import/batch', 'POST', { selection: consolidateQueue(batchQueue) });
        setBatchQueue([]);
    };

    const runCategoryBatch = (category) => {
        if (selectedLeagues.length === 0) return;

        const newItems = leagues
            .filter(l => selectedLeagues.includes(l.id))
            .flatMap(l => l.seasons.map(s => ({ leagueId: l.id, season: s, year: s.year })))
            .filter(({ season }) => {
                const statusCode = resolveStatus(season.status[category]);
                return statusCode === STATUS.NONE || statusCode === STATUS.PARTIAL;
            })
            .map(({ leagueId, year }) => ({ leagueId, year, pillar: category }));

        setBatchQueue([...batchQueue, ...newItems]);
    };

    const runBatchDeepSync = () => {
        if (selectedLeagues.length === 0) return;
        if (!globalThis.confirm(`⚡ Start Deep Sync for ${selectedLeagues.length} leagues?`)) return;
        startImport('/import/leagues/batch-deep-sync', 'POST', { leagueIds: selectedLeagues });
        setSelectedLeagues([]);
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
                        <Badge variant="neutral">{totalLeagues} Active Modules</Badge>
                    </Stack>
                }
            />

            <PageContent>
                <div className="matrix-pagination" style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '15px', background: '#111', padding: '10px', borderRadius: '8px' }}>
                    <button
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page === 1}
                        className="v3-button secondary small"
                    >
                        Previous
                    </button>
                    <span style={{ color: '#aaa' }}>Page <strong>{page}</strong> of {totalPages} ({totalLeagues} leagues)</span>
                    <button
                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                        disabled={page === totalPages}
                        className="v3-button secondary small"
                    >
                        Next
                    </button>
                </div>

                <div className="matrix-container v3-card">
                    <header className="matrix-header">
                        <div className="matrix-title">
                            <h1>Import Command Matrix</h1>
                            <p>Unified data ingestion hub for all competitions and seasons.</p>
                        </div>
                        <div className="discovery-header">
                            <div className="discovery-main-controls">
                                <div className="discovery-group">
                                    <input
                                        type="text"
                                        placeholder="Search league or country..."
                                        value={search}
                                        onChange={handleSearchChange}
                                        className="matrix-search-input"
                                        style={{
                                            padding: '8px 12px',
                                            borderRadius: '6px',
                                            border: '1px solid #333',
                                            background: '#1a1a1a',
                                            color: '#fff',
                                            width: '250px'
                                        }}
                                    />
                                </div>
                                <div className="discovery-divider" />
                                <div className="discovery-group">
                                    <CustomSelect
                                        placeholder="Select Country"
                                        options={selectOptionsCountries}
                                        value={selectedCountry ? { value: selectedCountry, label: selectedCountry } : null}
                                        onChange={(opt) => handleCountryChange(opt?.value || '')}
                                        className="discover-select-wrapper"
                                    />
                                    <CustomSelect
                                        placeholder="Select New League"
                                        options={selectOptionsLeagues}
                                        value={selectedDiscoveryLeague ? {
                                            value: selectedDiscoveryLeague,
                                            label: availableLeagues.find(l => l.league.id.toString() === selectedDiscoveryLeague)?.league.name || selectedDiscoveryLeague
                                        } : null}
                                        onChange={(opt) => setSelectedDiscoveryLeague(opt?.value || '')}
                                        disabled={!selectedCountry || availableLeagues.length === 0}
                                        className="discover-select-wrapper"
                                    />
                                    <Button
                                        variant="primary"
                                        size="sm"
                                        onClick={handleDiscoveryImport}
                                        disabled={!selectedDiscoveryLeague || isImporting || isDiscovering}
                                        loading={isDiscovering}
                                    >
                                        Import
                                    </Button>
                                    <Button
                                        variant="secondary"
                                        size="sm"
                                        onClick={addToDiscoveryBatch}
                                        disabled={!selectedDiscoveryLeague}
                                        icon="➕"
                                    >
                                        Add
                                    </Button>
                                </div>

                                {discoveryBatch.length > 0 && (
                                    <div className="discovery-batch-list">
                                        <div className="discovery-batch-items">
                                            {discoveryBatch.map(item => (
                                                <div key={item.leagueId} className="discovery-batch-tag">
                                                    {item.flag && <img src={item.flag} alt="" className="mini-flag" />}
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

                                <Button
                                    variant="secondary"
                                    onClick={handleAudit}
                                    disabled={isAuditing}
                                    loading={isAuditing}
                                    icon="🔍"
                                >
                                    Discovery Scan
                                </Button>
                                <Button
                                    variant="secondary"
                                    onClick={() => api.triggerNormalization()}
                                    disabled={selectedLeagues.length === 0}
                                    icon="🧮"
                                >
                                    Compute Per-90 Metrics
                                </Button>
                            </div>
                        </div>
                    </header>

                    <div className="matrix-grid-wrapper">
                        <table className="matrix-table">
                            <thead>
                                <tr>
                                    <th style={{ width: '40px' }}>
                                        <input
                                            type="checkbox"
                                            onChange={(e) => {
                                                if (e.target.checked) setSelectedLeagues(leagues.map(l => l.id));
                                                else setSelectedLeagues([]);
                                            }}
                                            checked={selectedLeagues.length > 0 && selectedLeagues.length === leagues.length}
                                        />
                                    </th>
                                    <th style={{ width: '250px' }}>Competition</th>
                                    {years.map(year => (
                                        <th key={year}>{year}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {leagues.map(league => (
                                    <MatrixRow
                                        key={league.id}
                                        league={league}
                                        years={years}
                                        isSelected={selectedLeagues.includes(league.id)}
                                        onSelect={toggleLeagueSelection}
                                        batchQueueKeys={batchQueueKeys}
                                        onIndicatorClick={handleIndicatorClick}
                                    />
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {(batchQueue.length > 0 || selectedLeagues.length > 0) && (
                        <div className="staging-bar">
                            <div className="staging-text">Staged: <span className="staging-count">{batchQueue.length || selectedLeagues.length}</span></div>
                            {selectedLeagues.length > 0 ? (
                                <>
                                    <Button variant="primary" onClick={runBatchDeepSync}>⚡ Deep Sync</Button>
                                    <Button variant="secondary" size="sm" onClick={() => runCategoryBatch('fs')}>FS</Button>
                                    <Button variant="secondary" size="sm" onClick={() => runCategoryBatch('ps')}>PS</Button>
                                    <Button variant="secondary" size="sm" onClick={() => runCategoryBatch('core')}>Core</Button>
                                </>
                            ) : (
                                <Button variant="primary" onClick={runBatch}>Execute Batch</Button>
                            )}
                            <Button variant="ghost" size="sm" onClick={() => { setBatchQueue([]); setSelectedLeagues([]); }}>Clear</Button>
                        </div>
                    )}
                </div>
            </PageContent>
        </PageLayout>
    );
};

export default ImportMatrixPage;
