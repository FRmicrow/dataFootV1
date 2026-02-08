import React, { useState } from 'react';
import api from '../services/api';

const LeagueManager = () => {
    // 5 Major European Leagues (Hardcoded for V1, could be fetched from DB)
    const [leagues] = useState([
        { id: 39, name: "Premier League", country: "England", logo: "https://media.api-sports.io/football/leagues/39.png" },
        { id: 140, name: "La Liga", country: "Spain", logo: "https://media.api-sports.io/football/leagues/140.png" },
        { id: 78, name: "Bundesliga", country: "Germany", logo: "https://media.api-sports.io/football/leagues/78.png" },
        { id: 135, name: "Serie A", country: "Italy", logo: "https://media.api-sports.io/football/leagues/135.png" },
        { id: 61, name: "Ligue 1", country: "France", logo: "https://media.api-sports.io/football/leagues/61.png" }
    ]);

    const [activeImport, setActiveImport] = useState(null);
    const [logs, setLogs] = useState([]);
    const [season, setSeason] = useState(2023); // Default season

    const handleSync = async (league) => {
        if (activeImport) return; // Prevent multiple imports

        setActiveImport(league.id);
        setLogs(prev => [...prev, { type: 'info', message: `🚀 Starting Full Sync for ${league.name} (${season})...` }]);

        try {
            // We use fetch directly to handle the ReadableStream for real-time logs
            const response = await fetch('/api/admin/import-league-optimized', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ leagueId: league.id, season })
            });

            const reader = response.body.getReader();
            const decoder = new TextDecoder();

            while (true) {
                const { value, done } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value);
                const lines = chunk.split('\n\n');

                lines.forEach(line => {
                    if (line.startsWith('data: ')) {
                        try {
                            const data = JSON.parse(line.slice(6));
                            setLogs(prev => {
                                // Keep only last 50 logs to prevent memory issues
                                const newLogs = [...prev, data];
                                return newLogs.slice(-50);
                            });

                            if (data.type === 'complete' || data.type === 'error') {
                                setActiveImport(null);
                            }
                        } catch (e) {
                            console.error("Error parsing SSE log", e);
                        }
                    }
                });
            }

        } catch (error) {
            console.error(error);
            setLogs(prev => [...prev, { type: 'error', message: "Fatal connection error." }]);
            setActiveImport(null);
        }
    };

    return (
        <div className="container">
            <h1 className="page-title">League Command Center</h1>

            {/* Season Selector */}
            <div className="glass-panel" style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <span className="text-secondary">Select Season to Sync:</span>
                <select
                    value={season}
                    onChange={(e) => setSeason(Number(e.target.value))}
                    style={{ width: '150px' }}
                >
                    <option value={2023}>2023-2024</option>
                    <option value={2022}>2022-2023</option>
                    <option value={2021}>2021-2022</option>
                </select>
                <div style={{ marginLeft: 'auto', fontSize: '0.9rem', color: 'var(--text-accent)' }}>
                    ✨ Pro Plan Active: 450 req/min
                </div>
            </div>

            {/* League Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '2rem' }}>
                {leagues.map(league => (
                    <div key={league.id} className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                        <div style={{
                            width: '80px', height: '80px', background: 'rgba(255,255,255,0.1)',
                            borderRadius: '50%', display: 'flex', alignItems: 'center',
                            justifyContent: 'center', marginBottom: '1rem'
                        }}>
                            <img src={league.logo} alt={league.name} style={{ maxWidth: '60%', maxHeight: '60%' }} />
                        </div>

                        <h3 style={{ marginBottom: '0.5rem' }}>{league.name}</h3>
                        <p className="text-secondary" style={{ marginBottom: '1.5rem', fontSize: '0.9rem' }}>{league.country}</p>

                        <button
                            className="btn btn-primary"
                            style={{ width: '100%' }}
                            onClick={() => handleSync(league)}
                            disabled={activeImport !== null}
                        >
                            {activeImport === league.id ? 'Syncing...' : 'Sync League Data'}
                        </button>
                    </div>
                ))}
            </div>

            {/* Live Terminal */}
            <div className="card" style={{ marginTop: '3rem', background: '#000', fontFamily: 'monospace', minHeight: '300px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', borderBottom: '1px solid #333', paddingBottom: '0.5rem' }}>
                    <span style={{ color: '#22c55e' }}>● Live Import Console</span>
                    <span className="text-secondary">{activeImport ? 'Connection Active' : 'Idle'}</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '400px', overflowY: 'auto' }}>
                    {logs.length === 0 && <span className="text-secondary">Waiting for commands...</span>}
                    {logs.map((log, idx) => (
                        <div key={idx} style={{
                            color: log.type === 'error' ? '#ef4444' : log.type === 'success' ? '#22c55e' : log.type === 'warning' ? '#eab308' : '#e2e8f0',
                            fontSize: '0.9rem'
                        }}>
                            <span style={{ opacity: 0.5, marginRight: '1rem' }}>[{new Date().toLocaleTimeString()}]</span>
                            {log.message}
                        </div>
                    ))}
                    {activeImport && (
                        <div style={{ animation: 'blink 1s infinite', color: '#22c55e' }}>_</div>
                    )}
                </div>
            </div>

            <style>{`
                @keyframes blink { 50% { opacity: 0; } }
            `}</style>
        </div>
    );
};

export default LeagueManager;
