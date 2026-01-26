import React, { useState } from 'react';
import api from '../services/api';

const ImportPage = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [searchNationality, setSearchNationality] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [loading, setSearchLoading] = useState(false);

    // Team search states
    const [teamSearchTerm, setTeamSearchTerm] = useState('');
    const [teamSearchResults, setTeamSearchResults] = useState([]);
    const [teamLoading, setTeamLoading] = useState(false);

    // Team players research states
    const [teamResearchName, setTeamResearchName] = useState('');
    const [startSeason, setStartSeason] = useState('2018');
    const [endSeason, setEndSeason] = useState('');
    const [researchResults, setResearchResults] = useState([]);
    const [researchLoading, setResearchLoading] = useState(false);
    const [batchImportInProgress, setBatchImportInProgress] = useState(false);

    const [error, setError] = useState(null);
    const [importing, setImporting] = useState({});
    const [importStatus, setImportStatus] = useState({});
    const [currentImportProgress, setCurrentImportProgress] = useState(null);

    const handleSearch = async (e) => {
        e.preventDefault();
        if (searchTerm.trim().length < 2) {
            setError('Please enter at least 2 characters');
            return;
        }
        setSearchLoading(true);
        setError(null);
        setSearchResults([]);
        try {
            const data = await api.searchPlayers(searchTerm, searchNationality);
            setSearchResults(data.players || []);
            if (data.players.length === 0) {
                setError(`No players found for "${searchTerm}"${searchNationality ? ` with nationality "${searchNationality}"` : ""}.`);
            }
        } catch (err) {
            setError('Failed to search players. Please try again.');
            console.error(err);
        } finally {
            setSearchLoading(false);
        }
    };

    const handleTeamSearch = async (e) => {
        e.preventDefault();
        if (teamSearchTerm.trim().length < 2) {
            setError('Please enter at least 2 characters');
            return;
        }
        setTeamLoading(true);
        setError(null);
        setTeamSearchResults([]);
        try {
            const data = await api.searchTeams(teamSearchTerm);
            setTeamSearchResults(data.teams || []);
            if (data.teams.length === 0) {
                setError(`No teams found for "${teamSearchTerm}".`);
            }
        } catch (err) {
            setError('Failed to search teams. Please try again.');
            console.error(err);
        } finally {
            setTeamLoading(false);
        }
    };

    const handleTeamPlayersResearch = async (e) => {
        e.preventDefault();
        if (!teamResearchName || teamResearchName.trim().length < 2) {
            setError('Please enter a Team Name (at least 2 characters)');
            return;
        }
        setResearchLoading(true);
        setError(null);
        setResearchResults([]);
        try {
            const data = await api.searchPlayersByTeam(teamResearchName, startSeason, endSeason || undefined);
            setResearchResults(data.players || []);
            if (data.players.length === 0) {
                setError(`No players found for "${teamResearchName}" in the selected period.`);
            }
        } catch (err) {
            const errorMessage = err.response?.data?.error || 'Failed to research players by team';
            setError(errorMessage);
            console.error(err);
        } finally {
            setResearchLoading(false);
        }
    };

    const handleImport = async (playerId) => {
        setImporting(prev => ({ ...prev, [playerId]: true }));
        setImportStatus(prev => ({ ...prev, [playerId]: null }));
        setCurrentImportProgress({
            playerId,
            status: 'importing',
            steps: [],
            errors: []
        });

        try {
            const result = await api.importPlayer(playerId);
            setImportStatus(prev => ({
                ...prev,
                [playerId]: { success: true, message: "Imported successfuly" }
            }));
            setCurrentImportProgress({
                playerId,
                status: 'completed',
                steps: result.progress || [],
                errors: result.errors || []
            });
        } catch (err) {
            const errorMessage = err.response?.data?.error || 'Failed to import player';
            const detailedError = err.response?.data?.details || err.message;
            setImportStatus(prev => ({
                ...prev,
                [playerId]: { success: false, message: errorMessage, details: detailedError }
            }));
            setCurrentImportProgress({
                playerId,
                status: 'failed',
                steps: [],
                errors: [{ step: 'global', error: errorMessage, details: detailedError }]
            });
        } finally {
            setImporting(prev => ({ ...prev, [playerId]: false }));
        }
    };

    const handleTeamImport = async (teamId) => {
        setImporting(prev => ({ ...prev, [teamId]: true }));
        setImportStatus(prev => ({ ...prev, [teamId]: null }));
        setCurrentImportProgress({
            teamId,
            status: 'importing',
            steps: [],
            errors: []
        });

        try {
            const result = await api.importTeam(teamId);
            setImportStatus(prev => ({
                ...prev,
                [teamId]: { success: true, message: "Team imported successfuly" }
            }));
            setCurrentImportProgress({
                teamId,
                status: 'completed',
                steps: result.progress || [],
                errors: result.errors || []
            });
        } catch (err) {
            const errorMessage = err.response?.data?.error || 'Failed to import team';
            const detailedError = err.response?.data?.details || err.message;
            setImportStatus(prev => ({
                ...prev,
                [teamId]: { success: false, message: errorMessage, details: detailedError }
            }));
            setCurrentImportProgress({
                teamId,
                status: 'failed',
                steps: [],
                errors: [{ step: 'global', error: errorMessage, details: detailedError }]
            });
        } finally {
            setImporting(prev => ({ ...prev, [teamId]: false }));
        }
    };

    const handleRetry = async (playerId) => {
        // Keeping it for players, teams could have one too but handleTeamImport is basically a retry if failed
        handleImport(playerId);
    };

    const handleImportAllFound = async () => {
        if (!researchResults.length || batchImportInProgress) return;

        if (!window.confirm(`Import all ${researchResults.length} players using multi-threaded batch import?`)) {
            return;
        }

        setBatchImportInProgress(true);
        setError(null);

        try {
            // Get player IDs
            const playerIds = researchResults
                .filter(p => !importStatus[p.id]?.success)
                .map(p => p.id);

            if (playerIds.length === 0) {
                alert('All players already imported!');
                setBatchImportInProgress(false);
                return;
            }

            // Start batch import
            const batchResponse = await api.importBatch(playerIds, 5);
            const { batchId } = batchResponse;

            // Poll for progress
            const pollInterval = setInterval(async () => {
                try {
                    const progress = await api.getBatchProgress(batchId);

                    console.log(`Batch progress: ${progress.completed}/${progress.total}`);

                    // Update import status for completed players
                    progress.results.forEach(result => {
                        setImportStatus(prev => ({
                            ...prev,
                            [result.playerId]: {
                                success: result.status === 'success',
                                message: result.error || 'Imported successfully'
                            }
                        }));
                    });

                    if (progress.status === 'completed') {
                        clearInterval(pollInterval);
                        setBatchImportInProgress(false);
                        alert(`Batch import complete! ${progress.completed} success, ${progress.failed} failed`);
                    }
                } catch (err) {
                    console.error('Error polling batch progress:', err);
                }
            }, 2000); // Poll every 2 seconds

        } catch (err) {
            setError(err.response?.data?.error || 'Batch import failed');
            setBatchImportInProgress(false);
        }
    };

    const getStepIcon = (status) => {
        switch (status) {
            case 'running': return '⏳';
            case 'success': return '✅';
            case 'failed': return '❌';
            case 'skipped': return '⏭️';
            default: return '⚪';
        }
    };

    const getStepLabel = (step) => {
        const labels = {
            'fetch_profile': '1. Saving profile to database',
            'fetch_seasons': '2. Fetching available seasons (Discovery)',
            'fetch_statistics': '3. Fetching all statistics (per season)',
            'fetch_trophies': '4. Fetching trophies and awards',
            'fetch_standings': '3. Fetching standings (per season)'
        };

        if (step.startsWith('fetch_season_') || step.startsWith('fetch_team_data_')) {
            const season = step.replace('fetch_season_', '').replace('fetch_team_data_', '');
            return `Fetching season ${season}`;
        }
        return labels[step] || step;
    };

    return (
        <div className="container">
            <h1 className="page-title">Import Data</h1>

            <div className="card" style={{ marginBottom: '2rem' }}>
                <h2 style={{ marginBottom: '1rem', fontSize: '1.25rem' }}>🔍 Search Players</h2>
                <form onSubmit={handleSearch} className="search-form">
                    <div style={{ display: 'flex', gap: '1rem', flex: 1 }}>
                        <input
                            type="text"
                            className="search-input"
                            placeholder="Player name (e.g., Messi)..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{ flex: 2 }}
                        />
                        <input
                            type="text"
                            className="search-input"
                            placeholder="Nationality (e.g., Argentina)..."
                            value={searchNationality}
                            onChange={(e) => setSearchNationality(e.target.value)}
                            style={{ flex: 1 }}
                        />
                    </div>
                    <button type="submit" className="btn btn-primary" disabled={loading}>
                        {loading ? 'Searching...' : 'Search Players'}
                    </button>
                </form>

                {loading && <div className="loading">Searching players...</div>}

                {!loading && searchResults.length > 0 && (
                    <table className="table" style={{ marginTop: '1rem' }}>
                        <thead>
                            <tr>
                                <th>Photo</th>
                                <th>Name</th>
                                <th>Age</th>
                                <th>Nationality</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {searchResults.map((player) => (
                                <React.Fragment key={player.id}>
                                    <tr className="search-result-row">
                                        <td>
                                            <img
                                                src={player.photo}
                                                alt={`${player.firstName} ${player.lastName}`}
                                                className="player-photo"
                                            />
                                        </td>
                                        <td>
                                            <strong>{player.firstName} {player.lastName}</strong>
                                        </td>
                                        <td>{player.age || 'N/A'}</td>
                                        <td>{player.nationality || 'N/A'}</td>
                                        <td>
                                            {importStatus[player.id]?.success ? (
                                                <div className="success" style={{ padding: '0.5rem', marginBottom: 0 }}>
                                                    Imported ✓
                                                </div>
                                            ) : (
                                                <button
                                                    className="btn btn-success btn-small"
                                                    onClick={() => handleImport(player.id)}
                                                    disabled={importing[player.id]}
                                                >
                                                    {importing[player.id] ? 'Importing...' : 'Direct Import'}
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                    {importStatus[player.id]?.success === false && (
                                        <tr key={`error-${player.id}`}>
                                            <td colSpan="5">
                                                <div className="error" style={{ fontSize: '0.8rem', padding: '0.5rem', marginTop: 0 }}>
                                                    <strong>Error:</strong> {importStatus[player.id].message}
                                                    {importStatus[player.id].details && (
                                                        <details style={{ marginTop: '0.5rem' }}>
                                                            <summary style={{ cursor: 'pointer', color: '#e53e3e' }}>View API Log</summary>
                                                            <pre style={{ background: '#fff5f5', padding: '0.5rem', borderRadius: '4px', overflow: 'auto', whiteSpace: 'pre-wrap', marginTop: '0.5rem' }}>
                                                                {typeof importStatus[player.id].details === 'object'
                                                                    ? JSON.stringify(importStatus[player.id].details, null, 2)
                                                                    : importStatus[player.id].details}
                                                            </pre>
                                                        </details>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            <div className="card" style={{ marginBottom: '2rem' }}>
                <h2 style={{ marginBottom: '1rem', fontSize: '1.25rem' }}>🔍 Search Teams</h2>
                <form onSubmit={handleTeamSearch} className="search-form">
                    <input
                        type="text"
                        className="search-input"
                        placeholder="Team name (e.g., Manchester United)..."
                        value={teamSearchTerm}
                        onChange={(e) => setTeamSearchTerm(e.target.value)}
                        style={{ flex: 1 }}
                    />
                    <button type="submit" className="btn btn-primary" disabled={teamLoading}>
                        {teamLoading ? 'Searching...' : 'Search Teams'}
                    </button>
                </form>

                {teamLoading && <div className="loading">Searching teams...</div>}

                {!teamLoading && teamSearchResults.length > 0 && (
                    <table className="table" style={{ marginTop: '1rem' }}>
                        <thead>
                            <tr>
                                <th>Logo</th>
                                <th>Name</th>
                                <th>Country</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {teamSearchResults.map((team) => (
                                <React.Fragment key={team.id}>
                                    <tr className="search-result-row">
                                        <td>
                                            <img
                                                src={team.logo}
                                                alt={team.name}
                                                className="player-photo"
                                                style={{ borderRadius: '4px' }}
                                            />
                                        </td>
                                        <td>
                                            <strong>{team.name}</strong>
                                        </td>
                                        <td>{team.country}</td>
                                        <td>
                                            {importStatus[team.id]?.success ? (
                                                <div className="success" style={{ padding: '0.5rem', marginBottom: 0 }}>
                                                    Imported ✓
                                                </div>
                                            ) : (
                                                <button
                                                    className="btn btn-success btn-small"
                                                    onClick={() => handleTeamImport(team.id)}
                                                    disabled={importing[team.id]}
                                                >
                                                    {importing[team.id] ? 'Importing...' : 'Direct Import'}
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                    {importStatus[team.id]?.success === false && (
                                        <tr key={`error-team-${team.id}`}>
                                            <td colSpan="4">
                                                <div className="error" style={{ fontSize: '0.8rem', padding: '0.5rem', marginTop: 0 }}>
                                                    <strong>Error:</strong> {importStatus[team.id].message}
                                                    {importStatus[team.id].details && (
                                                        <details style={{ marginTop: '0.5rem' }}>
                                                            <summary style={{ cursor: 'pointer', color: '#e53e3e' }}>View API Log</summary>
                                                            <pre style={{ background: '#fff5f5', padding: '0.5rem', borderRadius: '4px', overflow: 'auto', whiteSpace: 'pre-wrap', marginTop: '0.5rem' }}>
                                                                {typeof importStatus[team.id].details === 'object'
                                                                    ? JSON.stringify(importStatus[team.id].details, null, 2)
                                                                    : importStatus[team.id].details}
                                                            </pre>
                                                        </details>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            <div className="card" style={{ marginBottom: '2rem' }}>
                <h2 style={{ marginBottom: '1rem', fontSize: '1.25rem' }}>👥 Research Players by Team</h2>
                <form onSubmit={handleTeamPlayersResearch} className="search-form-complex">
                    <div className="search-group" style={{ flex: 1 }}>
                        <label>Team Name</label>
                        <input
                            type="text"
                            className="search-input"
                            placeholder="e.g. Manchester United"
                            value={teamResearchName}
                            onChange={(e) => setTeamResearchName(e.target.value)}
                        />
                    </div>
                    <div className="search-group" style={{ width: '120px' }}>
                        <label>Starting Season</label>
                        <input
                            type="number"
                            className="search-input"
                            placeholder="2018"
                            value={startSeason}
                            onChange={(e) => setStartSeason(e.target.value)}
                        />
                    </div>
                    <div className="search-group" style={{ width: '120px' }}>
                        <label>Ending Season</label>
                        <input
                            type="number"
                            className="search-input"
                            placeholder="Optional"
                            value={endSeason}
                            onChange={(e) => setEndSeason(e.target.value)}
                        />
                    </div>
                    <div className="action-group" style={{ marginTop: 'auto' }}>
                        <button type="submit" className="btn btn-primary" disabled={researchLoading}>
                            {researchLoading ? 'Researching...' : 'Research Players'}
                        </button>
                    </div>
                </form>

                {researchLoading && <div className="loading" style={{ color: '#4a5568' }}>Researching all players from this team (this may take a few seconds)...</div>}

                {!researchLoading && researchResults.length > 0 && (
                    <div style={{ marginTop: '1.5rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                            <h3 style={{ fontSize: '1rem', margin: 0 }}>Found {researchResults.length} players:</h3>
                            <button
                                className="btn btn-success btn-small"
                                onClick={handleImportAllFound}
                                disabled={batchImportInProgress}
                            >
                                {batchImportInProgress ? 'Batch Import Running...' : `Import All ${researchResults.length} Players`}
                            </button>
                        </div>
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Photo</th>
                                    <th>Name</th>
                                    <th>Age</th>
                                    <th>Nationality</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {researchResults.map((player) => (
                                    <React.Fragment key={player.id}>
                                        <tr className="search-result-row">
                                            <td>
                                                <img
                                                    src={player.photo}
                                                    alt={`${player.firstName} ${player.lastName}`}
                                                    className="player-photo"
                                                />
                                            </td>
                                            <td>
                                                <strong>{player.firstName} {player.lastName}</strong>
                                            </td>
                                            <td>{player.age || 'N/A'}</td>
                                            <td>{player.nationality || 'N/A'}</td>
                                            <td>
                                                {importStatus[player.id]?.success ? (
                                                    <div className="success" style={{ padding: '0.5rem', marginBottom: 0 }}>
                                                        Imported ✓
                                                    </div>
                                                ) : (
                                                    <button
                                                        className="btn btn-success btn-small"
                                                        onClick={() => handleImport(player.id)}
                                                        disabled={importing[player.id]}
                                                    >
                                                        {importing[player.id] ? 'Importing...' : 'Direct Import'}
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                        {importStatus[player.id]?.success === false && (
                                            <tr key={`error-research-${player.id}`}>
                                                <td colSpan="5">
                                                    <div className="error" style={{ fontSize: '0.8rem', padding: '0.5rem', marginTop: 0 }}>
                                                        <strong>Error:</strong> {importStatus[player.id].message}
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {currentImportProgress && currentImportProgress.status === 'importing' && (
                <div className="card" style={{ borderLeft: '4px solid #3182ce', position: 'fixed', bottom: '20px', right: '20px', width: '350px', zIndex: 1000, boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
                    <h3 style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>⏳ Import in Progress...</h3>
                    <p style={{ fontSize: '0.85rem', color: '#718096', marginBottom: '1rem' }}>
                        Fetching data from API. No rate limit applied.
                    </p>
                    <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                        {currentImportProgress.steps.map((step, idx) => (
                            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', padding: '0.25rem 0' }}>
                                <span>{getStepIcon(step.status)}</span>
                                <span style={{ color: step.status === 'failed' ? '#e53e3e' : '#4a5568' }}>
                                    {getStepLabel(step.id)}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {error && !loading && !teamLoading && <div className="error">{error}</div>}
        </div>
    );
};

export default ImportPage;
