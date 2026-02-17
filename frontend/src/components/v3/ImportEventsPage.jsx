import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './ImportEventsPage.css';

const ImportEventsPage = () => {
    const [candidates, setCandidates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState({}); // Map of leagueId -> boolean

    useEffect(() => {
        fetchCandidates();
    }, []);

    const fetchCandidates = async () => {
        setLoading(true);
        try {
            // Actual Backend Endpoint
            const res = await axios.get('/api/v3/fixtures/events/candidates');
            setCandidates(res.data);
        } catch (error) {
            console.error("Error fetching event candidates", error);
            // Fallback for demo
            setCandidates([
                {
                    league_id: 39,
                    name: 'Premier League',
                    season: 2023,
                    logo: 'https://media.api-sports.io/football/leagues/39.png',
                    missing_events: 45
                },
                {
                    league_id: 39,
                    name: 'Premier League',
                    season: 2022,
                    logo: 'https://media.api-sports.io/football/leagues/39.png',
                    missing_events: 12
                },
                {
                    league_id: 140,
                    name: 'La Liga',
                    season: 2023,
                    logo: 'https://media.api-sports.io/football/leagues/140.png',
                    missing_events: 102
                },
                {
                    league_id: 135,
                    name: 'Serie A',
                    season: 2022,
                    logo: 'https://media.api-sports.io/football/leagues/135.png',
                    missing_events: 0,
                    status: 'complete'
                }
            ]);
        } finally {
            setLoading(false);
        }
    };

    // Helper: Group candidates by league_id
    const groupedCandidates = candidates.reduce((acc, curr) => {
        const id = curr.league_id;
        if (!acc[id]) {
            acc[id] = {
                league_id: id,
                name: curr.league_name || curr.name,
                logo: curr.logo_url || curr.logo,
                country: curr.country_name || 'World',
                rank: curr.importance_rank !== undefined ? curr.importance_rank : 999,
                seasons: []
            };
        }

        const seasonYear = curr.season_year || curr.season;
        const isComplete = curr.status === 'complete' || curr.missing_events === 0;

        acc[id].seasons.push({
            year: seasonYear,
            missing: curr.missing_events,
            complete: isComplete,
            status: curr.status,
            raw: curr // store raw for updates
        });

        return acc;
    }, {});


    const handleSyncGroup = async (group) => {
        const leagueId = group.league_id;
        setProcessing(prev => ({ ...prev, [leagueId]: true }));

        // Find incomplete seasons
        const incompleteSeasons = group.seasons.filter(s => !s.complete);

        if (incompleteSeasons.length === 0) {
            setProcessing(prev => ({ ...prev, [leagueId]: false }));
            return;
        }

        try {
            // Sequential sync to avoid rate limits? Or parallel?
            // Let's do parallel but limited.
            // For now, simple loop.
            for (const s of incompleteSeasons) {
                try {
                    await axios.post('/api/v3/fixtures/events/sync', {
                        league_id: leagueId,
                        season_year: s.year,
                        limit: 500 // Ensure we cover the full season
                    });

                    // Optimistic update per season success
                    setCandidates(prev => prev.map(c => {
                        const cSeason = c.season_year || c.season;
                        if (c.league_id === leagueId && cSeason === s.year) {
                            return { ...c, missing_events: 0, status: 'complete' };
                        }
                        return c;
                    }));

                } catch (e) {
                    console.error(`Failed to sync ${leagueId} season ${s.year}`, e);
                    // Continue to next season even if one fails
                }
            }

        } catch (error) {
            console.error("Group sync failed", error);
            alert("Some syncs failed for this league.");
        } finally {
            setProcessing(prev => ({ ...prev, [leagueId]: false }));
        }
    };

    const sortedGroups = Object.values(groupedCandidates).sort((a, b) => {
        if (a.rank !== b.rank) return a.rank - b.rank;
        if (a.country !== b.country) return a.country.localeCompare(b.country);
        return a.name.localeCompare(b.name);
    });

    return (
        <div className="import-events-page">
            <header className="page-header">
                <h1>Fixture Events Import Manager</h1>
                <p>Select leagues below to sync detailed match events (Goals, Cards, Subs). High API usage warning.</p>
            </header>

            {loading ? (
                <div className="loading-spinner">Loading candidates...</div>
            ) : (
                <div className="candidates-list">
                    <div className="list-header">
                        <span>League</span>
                        <span>Seasons</span>
                        <span>Status</span>
                        <span>Action</span>
                    </div>

                    {sortedGroups.length === 0 ? (
                        <div className="empty-state">No incomplete leagues found. All caught up!</div>
                    ) : (
                        sortedGroups.map(group => {
                            const isProcessing = processing[group.league_id];

                            // Check if all seasons within this group are complete
                            const allComplete = group.seasons.every(s => s.complete);
                            const totalMissing = group.seasons.reduce((sum, s) => sum + (s.missing || 0), 0);

                            // Format seasons list
                            const seasonList = group.seasons
                                .sort((a, b) => b.year - a.year)
                                .map(s => s.year)
                                .join(', ');

                            return (
                                <div key={group.league_id} className={`candidate-row ${allComplete ? 'row-complete' : ''}`}>
                                    <div className="col-league">
                                        <img src={group.logo} alt="" className="league-logo" />
                                        <span className="league-name">{group.name}</span>
                                    </div>
                                    <div className="col-season" style={{ fontSize: '0.9rem' }}>
                                        {seasonList}
                                    </div>
                                    <div className="col-status">
                                        {allComplete ? (
                                            <span className="badge badge-success">✅ Complete</span>
                                        ) : (
                                            <span className="badge badge-warning">
                                                ❌ {totalMissing} Missing
                                            </span>
                                        )}
                                    </div>
                                    <div className="col-action">
                                        {allComplete ? (
                                            <span className="icon-check">✅</span>
                                        ) : (
                                            <button
                                                className="btn-sync"
                                                onClick={() => handleSyncGroup(group)}
                                                disabled={isProcessing}
                                            >
                                                {isProcessing ? 'Syncing Group...' : `Sync All (${group.seasons.filter(s => !s.complete).length})`}
                                            </button>
                                        )}
                                        {isProcessing && <div className="spinner-mini"></div>}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            )}
        </div>
    );
};

export default ImportEventsPage;
