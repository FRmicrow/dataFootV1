import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../../../services/api';
import { Button, Stack, Card } from '../../../../design-system';
import { PageLayout, PageHeader, PageContent } from '../../layouts';
import LeagueSelector from '../../modules/import/LeagueSelector';
import SeasonSelector from '../../modules/import/SeasonSelector';
import './ImportV3Page.css';

const getSeasonPillClass = (s) => {
    if (s.isFull) return 'import-v3__season-pill import-v3__season-pill--full';
    if (s.isPartial) return 'import-v3__season-pill import-v3__season-pill--partial';
    return 'import-v3__season-pill import-v3__season-pill--new';
};

const getLogColor = (type) => {
    switch (type) {
        case 'error': return 'var(--color-danger-400)';
        case 'success': return 'var(--color-success-400)';
        case 'warning': return 'var(--color-warning-400)';
        case 'complete': return 'var(--color-success-300)';
        default: return 'var(--color-text-muted)';
    }
};

const getLogIcon = (type) => {
    switch (type) {
        case 'error': return '✗';
        case 'success': return '✓';
        case 'warning': return '⚠';
        case 'info': return 'ℹ';
        default: return '·';
    }
};

const ImportV3Page = () => {
    const navigate = useNavigate();

    const [countries, setCountries] = useState([]);
    const [selectedCountry, setSelectedCountry] = useState('');
    const [leagues, setLeagues] = useState([]);
    const [selectedLeague, setSelectedLeague] = useState('');
    const [availableSeasons, setAvailableSeasons] = useState([]);
    const [fromYear, setFromYear] = useState('');
    const [toYear, setToYear] = useState('');
    const [skipExisting, setSkipExisting] = useState(true);
    const [leagueSyncStatus, setLeagueSyncStatus] = useState([]);
    const [importQueue, setImportQueue] = useState([]);
    const [isImporting, setIsImporting] = useState(false);
    const [logs, setLogs] = useState([]);
    const [autoScroll, setAutoScroll] = useState(true);

    const logsEndRef = useRef(null);

    useEffect(() => { fetchCountries(); }, []);

    useEffect(() => {
        if (selectedCountry) {
            fetchLeagues(selectedCountry);
            setSelectedLeague('');
        } else {
            setLeagues([]);
        }
    }, [selectedCountry]);

    useEffect(() => {
        if (autoScroll) logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [logs, autoScroll]);

    useEffect(() => {
        if (selectedLeague && leagues.length > 0) {
            fetchSyncStatus(selectedLeague);
        } else {
            setAvailableSeasons([]);
            setFromYear('');
            setToYear('');
            setLeagueSyncStatus([]);
        }
    }, [selectedLeague]);

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
            const seasons = data.seasons || [];
            setLeagueSyncStatus(seasons);
            const years = seasons.map(s => s.year).sort((a, b) => b - a);
            setAvailableSeasons(years);
            if (years.length > 0) {
                setFromYear(years[years.length - 1]);
                setToYear(years[0]);
            }
        } catch (error) {
            console.error("Failed to fetch sync status", error);
        }
    };

    const filterSeasonsRange = (start, end, skipEx, syncStatus) => {
        const selected = [];
        for (let y = start; y <= end; y++) {
            if (skipEx) {
                const statusObj = syncStatus.find(s => s.year === y);
                if (statusObj?.status !== 'FULL') selected.push(y);
            } else {
                selected.push(y);
            }
        }
        return selected;
    };

    const handleAddToQueue = () => {
        if (!selectedLeague || !selectedCountry) {
            alert("Please select a country and a league.");
            return;
        }
        const leagueObj = leagues.find(l => l.league.id === Number.parseInt(selectedLeague));
        if (!leagueObj) return;

        const selectedSeasons = filterSeasonsRange(
            Number.parseInt(fromYear),
            Number.parseInt(toYear),
            skipExisting,
            leagueSyncStatus
        );

        if (selectedSeasons.length === 0) {
            alert("No new seasons to add (all already imported or skipped).");
            return;
        }

        const queueSeasons = selectedSeasons.map(y => {
            const statusObj = leagueSyncStatus.find(s => s.year === y);
            const status = statusObj ? statusObj.status : 'NOT_IMPORTED';
            return {
                year: y,
                isCurrent: statusObj?.is_current || false,
                isFull: status === 'FULL',
                isPartial: status === 'PARTIAL' || status === 'PARTIAL_DISCOVERY'
            };
        });

        setImportQueue(prev => [...prev, {
            id: Date.now(),
            country: selectedCountry,
            leagueId: Number.parseInt(selectedLeague),
            leagueName: leagueObj.league.name || 'Unknown League',
            seasons: queueSeasons
        }]);
    };

    const handleRemoveFromQueue = (id) => {
        setImportQueue(prev => prev.filter(item => item.id !== id));
    };

    const processImportStream = async (reader, decoder) => {
        while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            decoder.decode(value).split('\n').forEach(line => {
                if (line.startsWith('data: ')) {
                    try {
                        const data = JSON.parse(line.slice(6));
                        setLogs(prev => [...prev, { ...data, id: `log-${Date.now()}-${prev.length}` }]);
                        if (data.type === 'complete') {
                            setLogs(prev => [...prev, {
                                id: `success-${data.leagueId}-${data.season}`,
                                type: 'success',
                                message: `Import Finished — /league/${data.leagueId}/season/${data.season}`,
                                link: `/league/${data.leagueId}/season/${data.season}`
                            }]);
                            if (selectedLeague) fetchSyncStatus(selectedLeague);
                        }
                    } catch (e) {
                        console.error("SSE Parse Error", e);
                    }
                }
            });
        }
    };

    const handleBatchImport = async () => {
        if (importQueue.length === 0) return;
        setIsImporting(true);
        setLogs([{ id: 'start-batch', type: 'info', message: `Starting Batch Import with ${importQueue.length} item(s)...` }]);

        const selection = importQueue.map(item => ({
            leagueId: item.leagueId,
            seasons: item.seasons.map(s => ({
                year: s.year,
                forceRefresh: s.isCurrent || false
            })),
            forceApiId: true
        }));

        try {
            const response = await fetch('/api/import/batch', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ selection })
            });
            await processImportStream(response.body.getReader(), new TextDecoder());
            setIsImporting(false);
            setImportQueue([]);
        } catch (error) {
            console.error("Import failed", error);
            setLogs(prev => [...prev, { id: `error-${Date.now()}`, type: 'error', message: `Fatal Error: ${error.message}` }]);
            setIsImporting(false);
        }
    };

    return (
        <PageLayout>
            <PageHeader
                title="Data Acquisition"
                subtitle="Multi-criteria batch import system"
                badge={{ label: 'IMPORT', variant: 'warning' }}
                extra={
                    <Stack direction="row" gap="var(--spacing-sm)">
                        <Button variant="secondary" size="sm" onClick={() => navigate('/events')}>Events Sync</Button>
                        <Button variant="secondary" size="sm" onClick={() => navigate('/lineups-import')}>Lineups Sync</Button>
                    </Stack>
                }
            />
            <PageContent>
                <div className="import-v3__grid">

                    {/* Left: Configuration Panel */}
                    <div className="import-v3__config">
                        <Card title="Configuration">
                            <Stack gap="var(--spacing-md)">
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
                                <Button
                                    variant="secondary"
                                    onClick={handleAddToQueue}
                                    disabled={isImporting || !selectedLeague}
                                    style={{ width: '100%' }}
                                >
                                    + Add to Batch Queue
                                </Button>
                            </Stack>
                        </Card>

                        <div className="import-v3__queue">
                            <h3 className="import-v3__queue-title">Staging Queue ({importQueue.length})</h3>
                            {importQueue.length === 0 ? (
                                <div className="import-v3__queue-empty">Queue is empty</div>
                            ) : (
                                <ul className="import-v3__queue-list">
                                    {importQueue.map(item => (
                                        <li key={item.id} className="import-v3__queue-item">
                                            <div>
                                                <div className="import-v3__queue-league">{item.leagueName}</div>
                                                <div className="import-v3__queue-country">{item.country}</div>
                                                <div className="import-v3__queue-seasons">
                                                    {item.seasons.map(s => (
                                                        <span key={s.year} className={getSeasonPillClass(s)}>
                                                            {s.year} {s.isFull ? '✓' : s.isPartial ? '!' : ''}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                            <button
                                                className="import-v3__remove-btn"
                                                onClick={() => handleRemoveFromQueue(item.id)}
                                                disabled={isImporting}
                                                aria-label={`Remove ${item.leagueName}`}
                                            >
                                                ✕
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>

                        <Button
                            variant="primary"
                            onClick={handleBatchImport}
                            disabled={isImporting || importQueue.length === 0}
                            style={{ width: '100%' }}
                        >
                            {isImporting ? 'Processing Batch...' : 'Start Batch Import'}
                        </Button>
                    </div>

                    {/* Right: Terminal Log */}
                    <div className="import-v3__terminal">
                        <div className="import-v3__terminal-bar">
                            <div className="import-v3__terminal-dots">
                                <span className="import-v3__terminal-dot" style={{ background: 'rgba(239,68,68,0.5)' }} />
                                <span className="import-v3__terminal-dot" style={{ background: 'rgba(234,179,8,0.5)' }} />
                                <span className="import-v3__terminal-dot" style={{ background: 'rgba(16,185,129,0.5)' }} />
                                <span className="import-v3__terminal-label">import-cli — v3.0.1</span>
                            </div>
                            <label className="import-v3__terminal-autoscroll">
                                <input
                                    type="checkbox"
                                    checked={autoScroll}
                                    onChange={(e) => setAutoScroll(e.target.checked)}
                                />
                                Auto-scroll
                            </label>
                        </div>
                        <div className="import-v3__terminal-body">
                            {logs.length === 0 ? (
                                <div className="import-v3__terminal-empty">
                                    <span className="import-v3__terminal-empty-icon">⌨️</span>
                                    <span>Ready for input...</span>
                                </div>
                            ) : (
                                logs.map((log) => (
                                    <div key={log.id} className="import-v3__log-line">
                                        <span className="import-v3__log-time">
                                            [{new Date().toLocaleTimeString()}]
                                        </span>
                                        <span className="import-v3__log-icon" style={{ color: getLogColor(log.type) }}>
                                            {getLogIcon(log.type)}
                                        </span>
                                        <span style={{ color: getLogColor(log.type), wordBreak: 'break-all' }}>
                                            {log.message}
                                            {log.link && (
                                                <a
                                                    href={log.link}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    style={{ marginLeft: '8px', color: 'var(--color-primary-400)', textDecoration: 'underline' }}
                                                >
                                                    Open ↗
                                                </a>
                                            )}
                                        </span>
                                    </div>
                                ))
                            )}
                            <div ref={logsEndRef} />
                        </div>
                    </div>

                </div>
            </PageContent>
        </PageLayout>
    );
};

export default ImportV3Page;
