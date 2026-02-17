import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './ImportEventsPage.css'; // Reusing styles as requested "exactly the same way"

const ImportLineupsPage = () => {
    const [candidates, setCandidates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState({}); // Map of leagueId -> boolean

    useEffect(() => {
        fetchCandidates();
    }, []);

    const fetchCandidates = async () => {
        setLoading(true);
        try {
            const res = await axios.get('/api/v3/fixtures/lineups/candidates');
            setCandidates(res.data);
        } catch (error) {
            console.error("Error fetching lineup candidates", error);
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
        const isComplete = curr.missing_lineups === 0;

        acc[id].seasons.push({
            year: seasonYear,
            missing: curr.missing_lineups,
            complete: isComplete,
            raw: curr
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
            for (const s of incompleteSeasons) {
                try {
                    await axios.post('/api/v3/fixtures/lineups/import', {
                        league_id: leagueId,
                        season_year: s.year,
                        limit: 500 // Full season coverage
                    });

                    // Optimistic update
                    setCandidates(prev => prev.map(c => {
                        const cSeason = c.season_year || c.season;
                        if (c.league_id === leagueId && cSeason === s.year) {
                            return { ...c, missing_lineups: 0 };
                        }
                        return c;
                    }));

                } catch (e) {
                    console.error(`Failed to sync lineups for ${leagueId} season ${s.year}`, e);
                }
            }
        } catch (error) {
            console.error("Group sync failed", error);
            alert("Some syncs failed.");
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
                <h1>Fixture Lineups Import Manager</h1>
                <p>Select leagues below to sync team compositions (Lineups, Formations, Coaches, Subs).</p>
                <div className="sub-nav-links" style={{ marginTop: '10px', display: 'flex', gap: '10px' }}>
                    <a href="/v3/import" className="btn-v3-secondary btn-sm">League Import</a>
                    <a href="/v3/events" className="btn-v3-secondary btn-sm">Events Import</a>
                </div>
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
                        <div className="empty-state">No incomplete leagues found. All lineups caught up!</div>
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
                                                {isProcessing ? 'Syncing...' : `Sync All`}
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

export default ImportLineupsPage;
