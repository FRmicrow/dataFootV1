import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import './Admin.css';
import '../ImportModal.css';

const ImportLeagueOptimized = () => {
    const [countries, setCountries] = useState([]);
    const [selectedCountry, setSelectedCountry] = useState('');
    const [leagues, setLeagues] = useState([]);
    const [selectedLeague, setSelectedLeague] = useState('');
    const [selectedSeason, setSelectedSeason] = useState('2024');
    const [loading, setLoading] = useState(false);
    const [logs, setLogs] = useState([]);
    const logsEndRef = useRef(null);

    const yearOptions = [];
    for (let year = 2024; year >= 2010; year--) {
        yearOptions.push(year);
    }

    const scrollToBottom = () => {
        logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [logs]);

    useEffect(() => {
        fetchCountries();
    }, []);

    useEffect(() => {
        if (selectedCountry) {
            fetchLeagues(selectedCountry);
        } else {
            setLeagues([]);
            setSelectedLeague('');
        }
    }, [selectedCountry]);

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

    const handleImport = async () => {
        if (!selectedLeague || !selectedSeason) {
            alert("Please select both league and season");
            return;
        }

        const leagueName = leagues.find(l => l.league.id === parseInt(selectedLeague))?.league.name || selectedLeague;

        if (!window.confirm(`Start optimized import for ${leagueName} (${selectedSeason})? This will sync all teams and players for this specific season.`)) {
            return;
        }

        setLoading(true);
        setLogs([{ message: `🚀 Starting Optimized Import for ${leagueName}...`, type: 'info' }]);

        try {
            const response = await fetch('http://localhost:3001/api/admin/import-league-optimized', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    leagueId: selectedLeague,
                    season: parseInt(selectedSeason)
                })
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
                            if (data.type === 'complete' || data.type === 'error') {
                                setLoading(false);
                            }
                        } catch (e) {
                            console.error("Error parsing SSE line", e);
                        }
                    }
                });
            }
        } catch (err) {
            setLogs(prev => [...prev, { message: `❌ Fatal Error: ${err.message}`, type: 'error' }]);
            setLoading(false);
        }
    };

    return (
        <div style={{ padding: '2rem' }}>
            <h1 style={{ marginBottom: '1rem', color: '#1e293b' }}>🚀 Optimized League Import</h1>
            <p className="page-description">
                Hierarchical sync: League → Teams → Players. This is the fastest way to populate the database for a specific competition and season.
            </p>

            <div className="card" style={{ padding: '2rem', background: 'white', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
                    <div>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#475569' }}>1. Country</label>
                        <select
                            value={selectedCountry}
                            onChange={(e) => setSelectedCountry(e.target.value)}
                            style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #e2e8f0' }}
                            disabled={loading}
                        >
                            <option value="">-- Select Country --</option>
                            {countries.map(c => (
                                <option key={c.country_id} value={c.country_name}>{c.country_name}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#475569' }}>2. League</label>
                        <select
                            value={selectedLeague}
                            onChange={(e) => setSelectedLeague(e.target.value)}
                            disabled={!selectedCountry || loading}
                            style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #e2e8f0' }}
                        >
                            <option value="">-- Select League --</option>
                            {leagues.map(item => (
                                <option key={item.league.id} value={item.league.id}>
                                    {item.league.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#475569' }}>3. Season</label>
                        <select
                            value={selectedSeason}
                            onChange={(e) => setSelectedSeason(e.target.value)}
                            disabled={loading}
                            style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #e2e8f0' }}
                        >
                            {yearOptions.map(year => (
                                <option key={year} value={year}>{year - 1}/{year}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <button
                    onClick={handleImport}
                    disabled={loading || !selectedLeague}
                    className="btn-sync"
                    style={{ width: '100%', justifyContent: 'center', height: '48px', fontSize: '1.1rem' }}
                >
                    {loading ? (
                        <>
                            <div className="sync-spinner"></div>
                            Importing Data...
                        </>
                    ) : (
                        'Start Optimized Import'
                    )}
                </button>

                {logs.length > 0 && (
                    <div className="import-modal-body" style={{ marginTop: '2rem', borderRadius: '8px', height: '400px', background: '#020617' }}>
                        {logs.map((log, i) => (
                            <div key={i} className={`log-entry log-${log.type}`}>
                                {log.type === 'info' && '🔹 '}
                                {log.type === 'success' && '✅ '}
                                {log.type === 'warning' && '⚠️ '}
                                {log.type === 'error' && '❌ '}
                                {log.type === 'complete' && '🏁 '}
                                {log.message}
                            </div>
                        ))}
                        <div ref={logsEndRef} />
                    </div>
                )}
            </div>
        </div>
    );
};

export default ImportLeagueOptimized;
