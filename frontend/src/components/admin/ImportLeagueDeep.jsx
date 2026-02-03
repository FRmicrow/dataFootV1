import React, { useState, useEffect } from 'react';
import axios from 'axios';

const ImportLeagueDeep = () => {
    const [countries, setCountries] = useState([]);
    const [selectedCountry, setSelectedCountry] = useState('');
    const [leagues, setLeagues] = useState([]);
    const [selectedLeague, setSelectedLeague] = useState('');
    const [yearStart, setYearStart] = useState('2020');
    const [yearEnd, setYearEnd] = useState('2024');
    const [loading, setLoading] = useState(false);
    const [logs, setLogs] = useState([]);

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
            const res = await axios.get('/api/admin/countries?region=Europe'); // Or widen if needed
            setCountries(res.data);
        } catch (error) {
            console.error(error);
        }
    };

    const fetchLeagues = async (countryName) => {
        try {
            // Reusing the getApiLeagues endpoint which filters by country
            const res = await axios.get(`/api/admin/api-leagues?country=${encodeURIComponent(countryName)}`);
            setLeagues(res.data.response); // API-Football structure
        } catch (error) {
            console.error(error);
        }
    };

    const addLog = (msg) => {
        setLogs(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev]);
    };

    const handleImport = async () => {
        if (!selectedLeague || !yearStart || !yearEnd) {
            alert("Please select a league and year range");
            return;
        }

        if (!window.confirm("WARNING: Deep Import takes a LONG time. It will fetch the ENTIRE career history for every player found in this league during the selected years. Are you sure?")) {
            return;
        }

        setLoading(true);
        setLogs([]);
        addLog(`Starting Deep Import for League ID ${selectedLeague} (${yearStart} - ${yearEnd})...`);
        addLog(`Please wait. Do not close this tab.`);

        try {
            const res = await axios.post('/api/admin/import-deep-league-players', {
                leagueId: selectedLeague,
                startYear: yearStart,
                endYear: yearEnd
            });

            if (res.data.success) {
                addLog(`✅ COMPLETE! Scanned ${res.data.scannedPlayers} unique players.`);
                addLog(`Process finished successfully.`);
            } else {
                addLog(`❌ Import finished but reported failure.`);
            }
        } catch (error) {
            console.error(error);
            addLog(`❌ Error: ${error.response?.data?.error || error.message}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ padding: '2rem', maxWidth: '800px' }}>
            <h2>Deep Import: Full Career History</h2>
            <p style={{ color: '#666', marginBottom: '1rem' }}>
                Select a league and a date range. The system will identify all players who played in that league during those years,
                and then fetch their <strong>entire available career history</strong> (all seasons, all competitions).
                <br />
                <strong>Warning:</strong> This is a very heavy operation.
            </p>

            <div style={{ background: '#fff', padding: '1.5rem', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '1rem' }}>

                <div>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>1. Select Country</label>
                    <select
                        value={selectedCountry}
                        onChange={(e) => setSelectedCountry(e.target.value)}
                        style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                    >
                        <option value="">-- Choose Country --</option>
                        {countries.map(c => (
                            <option key={c.country_id} value={c.country_name}>{c.country_name}</option>
                        ))}
                    </select>
                </div>

                <div>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>2. Select League</label>
                    <select
                        value={selectedLeague}
                        onChange={(e) => setSelectedLeague(e.target.value)}
                        disabled={!selectedCountry}
                        style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                    >
                        <option value="">-- Choose League --</option>
                        {leagues.map(item => (
                            <option key={item.league.id} value={item.league.id}>
                                {item.league.name}
                            </option>
                        ))}
                    </select>
                </div>

                <div style={{ display: 'flex', gap: '1rem' }}>
                    <div style={{ flex: 1 }}>
                        <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Start Year</label>
                        <input
                            type="number"
                            value={yearStart}
                            onChange={(e) => setYearStart(e.target.value)}
                            style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                        />
                    </div>
                    <div style={{ flex: 1 }}>
                        <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>End Year</label>
                        <input
                            type="number"
                            value={yearEnd}
                            onChange={(e) => setYearEnd(e.target.value)}
                            style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                        />
                    </div>
                </div>

                <button
                    onClick={handleImport}
                    disabled={loading || !selectedLeague}
                    style={{
                        padding: '12px', background: loading ? '#94a3b8' : '#ef4444', color: 'white',
                        border: 'none', borderRadius: '6px', cursor: loading ? 'not-allowed' : 'pointer', fontWeight: 'bold', fontSize: '1rem'
                    }}
                >
                    {loading ? 'Processing Deep Import...' : 'Start Deep Import'}
                </button>
            </div>

            {logs.length > 0 && (
                <div style={{ marginTop: '2rem', background: '#1e293b', color: '#10b981', padding: '1rem', borderRadius: '8px', fontFamily: 'monospace', maxHeight: '300px', overflowY: 'auto' }}>
                    {logs.map((log, i) => <div key={i}>{log}</div>)}
                </div>
            )}
        </div>
    );
};

export default ImportLeagueDeep;
