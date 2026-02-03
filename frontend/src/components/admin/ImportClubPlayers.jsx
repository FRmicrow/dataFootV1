import React, { useState, useEffect } from 'react';
import axios from 'axios';

const ImportClubPlayers = () => {
    const [countries, setCountries] = useState([]);
    const [selectedCountry, setSelectedCountry] = useState('');
    const [clubs, setClubs] = useState([]);
    const [selectedClub, setSelectedClub] = useState('');
    const [yearStart, setYearStart] = useState('2020');
    const [yearEnd, setYearEnd] = useState('2024');
    const [loading, setLoading] = useState(false);
    const [logs, setLogs] = useState([]);

    useEffect(() => {
        fetchCountries();
    }, []);

    useEffect(() => {
        if (selectedCountry) {
            fetchClubs(selectedCountry);
        } else {
            setClubs([]);
            setSelectedClub('');
        }
    }, [selectedCountry]);

    const fetchCountries = async () => {
        try {
            const res = await axios.get('/api/admin/countries?region=Europe'); // Or just all? User said "filter by country".
            setCountries(res.data);
        } catch (error) {
            console.error(error);
        }
    };

    const fetchClubs = async (countryName) => {
        try {
            const res = await axios.get(`/api/admin/clubs-by-country?country=${encodeURIComponent(countryName)}`);
            setClubs(res.data);
        } catch (error) {
            console.error(error);
        }
    };

    const addLog = (msg) => {
        setLogs(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev]);
    };

    const handleImport = async () => {
        if (!selectedClub || !yearStart || !yearEnd) {
            alert("Please select a club and year range");
            return;
        }

        setLoading(true);
        addLog(`Starting import for Club ID ${selectedClub} (${yearStart} - ${yearEnd})...`);

        try {
            const res = await axios.post('/api/admin/import-club-players', {
                clubId: selectedClub,
                yearStart,
                yearEnd
            });

            if (res.data.success) {
                addLog(`✅ Success! Imported ${res.data.importedCount} player records.`);
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
            <h2>Import Players by Club</h2>
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
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>2. Select Club</label>
                    <select
                        value={selectedClub}
                        onChange={(e) => setSelectedClub(e.target.value)}
                        disabled={!selectedCountry}
                        style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                    >
                        <option value="">-- Choose Club --</option>
                        {clubs.map(c => (
                            <option key={c.club_id} value={c.club_id}>{c.club_name}</option>
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
                    disabled={loading || !selectedClub}
                    style={{
                        padding: '12px', background: loading ? '#94a3b8' : '#3b82f6', color: 'white',
                        border: 'none', borderRadius: '6px', cursor: loading ? 'not-allowed' : 'pointer', fontWeight: 'bold', fontSize: '1rem'
                    }}
                >
                    {loading ? 'Importing...' : 'Start Import'}
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

export default ImportClubPlayers;
