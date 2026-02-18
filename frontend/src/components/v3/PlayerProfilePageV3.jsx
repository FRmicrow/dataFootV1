import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import './PlayerProfilePageV3.css';

const PlayerProfilePageV3 = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [syncStatus, setSyncStatus] = useState('idle'); // 'idle', 'syncing', 'complete', 'resolving'
    const [syncStats, setSyncStats] = useState({ updated: 0, new: 0 });
    const [syncProgress, setSyncProgress] = useState(0);
    const [unresolvedCompetitions, setUnresolvedCompetitions] = useState([]);
    const [allLeagues, setAllLeagues] = useState([]);
    const [syncLogs, setSyncLogs] = useState([]);
    const [trophies, setTrophies] = useState([]);

    useEffect(() => {
        const fetchPlayerProfile = async () => {
            setLoading(true);
            try {
                const [playerRes, leaguesRes, trophiesRes] = await Promise.all([
                    axios.get(`/api/player/${id}`),
                    axios.get('/api/leagues'),
                    axios.get(`/api/player/${id}/trophies`)
                ]);
                setData(playerRes.data);
                setAllLeagues(leaguesRes.data || []);
                setTrophies(trophiesRes.data || []);
            } catch (err) {
                console.error("Error fetching player profile:", err);
                setError(err.response?.data?.error || "Failed to load player profile.");
            } finally {
                setLoading(false);
            }
        };

        if (id) {
            fetchPlayerProfile();
        }
    }, [id]);

    const handleDeepSync = async () => {
        setSyncStatus('syncing');
        setSyncLogs([]);
        setSyncStats({ updated: 0, new: 0 });
        setSyncProgress(0);
        setUnresolvedCompetitions([]);

        try {
            const response = await fetch(`/api/player/${id}/sync-career`, {
                method: 'POST',
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
                            const eventData = JSON.parse(line.slice(6));
                            setSyncLogs(prev => [...prev, eventData]);

                            if (eventData.type === 'stat_updated') {
                                setSyncStats(prev => ({ ...prev, updated: prev.updated + 1 }));
                            } else if (eventData.type === 'stat_new') {
                                setSyncStats(prev => ({ ...prev, new: prev.new + 1 }));
                            } else if (eventData.type === 'fetching') {
                                const pct = Math.round((eventData.current / eventData.total) * 100);
                                setSyncProgress(pct);
                            } else if (eventData.type === 'unresolved') {
                                setUnresolvedCompetitions(eventData.competitions || []);
                            } else if (eventData.type === 'complete') {
                                setSyncProgress(100);
                                if (eventData.unresolved?.length > 0) {
                                    setUnresolvedCompetitions(eventData.unresolved);
                                    setSyncStatus('resolving');
                                } else {
                                    setSyncStatus('complete');
                                    setTimeout(() => setSyncStatus('idle'), 5000);
                                }
                                // Trigger refresh of the page data
                                axios.get(`/api/player/${id}`).then(res => setData(res.data));
                            }
                        } catch (e) {
                            console.error("SSE Parse Error", e);
                        }
                    }
                });
            }
        } catch (err) {
            console.error("Deep Sync Failed:", err);
            setSyncStatus('idle');
        }
    };


    const [careerView, setCareerView] = useState('year'); // 'year', 'club', 'country'

    if (loading) return (
        <div className="v3-player-profile loading-state">
            <div className="spinner"></div>
            <p>Scanning V3 Biological Data...</p>
        </div>
    );

    if (error) return (
        <div className="v3-player-profile error-state">
            <h2>⚠️ Data Link Lost</h2>
            <p>{error}</p>
            <button onClick={() => navigate(-1)} className="btn-v3">Return</button>
        </div>
    );

    if (!data) return null;

    const { player, career, clubTotals } = data;
    const careerList = Array.isArray(career) ? career : [];

    // View Logic (US-010)
    let groupedCareer = {};
    let sortedKeys = [];

    if (careerView === 'year') {
        groupedCareer = careerList.reduce((acc, curr) => {
            const key = curr.season_year;
            if (!acc[key]) acc[key] = [];
            acc[key].push(curr);
            return acc;
        }, {});
        sortedKeys = Object.keys(groupedCareer).sort((a, b) => b - a);
    } else if (careerView === 'club') {
        groupedCareer = careerList.reduce((acc, curr) => {
            const key = curr.team_name;
            if (!acc[key]) acc[key] = { rows: [], logo: curr.team_logo, id: curr.team_id, latest: 0 };
            acc[key].rows.push(curr);
            if (curr.season_year > acc[key].latest) acc[key].latest = curr.season_year;
            return acc;
        }, {});
        sortedKeys = Object.keys(groupedCareer).sort((a, b) => groupedCareer[b].latest - groupedCareer[a].latest);
    } else if (careerView === 'country') {
        groupedCareer = careerList.reduce((acc, curr) => {
            const key = curr.country_name || 'International';
            if (!acc[key]) acc[key] = { rows: [], flag: curr.country_flag, latest: 0 };
            acc[key].rows.push(curr);
            if (curr.season_year > acc[key].latest) acc[key].latest = curr.season_year;
            return acc;
        }, {});
        sortedKeys = Object.keys(groupedCareer).sort((a, b) => groupedCareer[b].latest - groupedCareer[a].latest);
    }

    const renderTrophies = () => {
        if (!trophies || trophies.length === 0) return null;

        // Step 1: Initial Grouping by Country
        const countryGroups = trophies.reduce((acc, t) => {
            const country = t.country || 'International';
            if (!acc[country]) {
                acc[country] = {
                    name: country,
                    flag: t.country_flag,
                    rank: (t.importance_rank !== undefined && t.importance_rank !== null) ? t.importance_rank : 999,
                    leagues: {}
                };
            }

            // Step 2: Group by League within Country
            const leagueName = t.league_name || t.trophy;
            if (!acc[country].leagues[leagueName]) {
                acc[country].leagues[leagueName] = {
                    name: leagueName,
                    items: []
                };
            }
            acc[country].leagues[leagueName].items.push(t);
            return acc;
        }, {});

        // Step 3: Sort Countries by Rank
        const sortedCountries = Object.values(countryGroups).sort((a, b) => a.rank - b.rank);

        // Process internal structure for each country
        const processedList = sortedCountries.map(country => {
            const leaguesList = Object.values(country.leagues).map(league => {
                // Step 4: Group items by Place within League
                const placeMap = league.items.reduce((pAcc, item) => {
                    const place = item.place || 'Winner';
                    if (!pAcc[place]) pAcc[place] = { place, seasons: [], count: 0 };
                    if (item.season && String(item.season).trim() !== '') {
                        pAcc[place].seasons.push(item.season);
                    }
                    pAcc[place].count++;
                    return pAcc;
                }, {});

                // Helper for Ranking Places
                const getRank = (place) => {
                    const p = (place || '').toLowerCase();
                    if (p.includes('winner') || p.includes('1st') || p.includes('champion')) return 1;
                    if (p.includes('2nd') || p.includes('runner') || p.includes('finalist')) return 2;
                    if (p.includes('3rd')) return 3;
                    return 99;
                };

                // Create sorted array of place groups
                const placeGroups = Object.values(placeMap).map(pg => {
                    // Sort seasons desc
                    pg.seasons.sort((a, b) => String(b).localeCompare(String(a)));
                    return pg;
                }).sort((a, b) => getRank(a.place) - getRank(b.place));

                return {
                    name: league.name,
                    placeGroups: placeGroups
                };
            });

            // Sort Leagues Alphabetically (or by count if preferred, utilizing US: League ASC)
            leaguesList.sort((a, b) => a.name.localeCompare(b.name));

            return { ...country, leagues: leaguesList };
        });

        return (
            <div className="dash-card" style={{ marginBottom: '20px' }}>
                <div className="card-title">🏆 Honours</div>
                <div className="trophy-list-container">
                    {processedList.map((country) => (
                        <div key={country.name} className="country-group">
                            <div className="country-group-header">
                                {country.flag && <img src={country.flag} alt={country.name} className="country-header-flag" />}
                                <span className="country-header-name">{country.name}</span>
                            </div>
                            <div className="country-trophies-list">
                                {country.leagues.map((comp) => (
                                    <div key={comp.name} className="trophy-competition-block" style={{ marginBottom: '12px', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '8px' }}>
                                        <div className="trophy-name-header" style={{ marginBottom: '6px', fontSize: '0.95rem', fontWeight: '700', color: '#f1f5f9' }}>
                                            {comp.name}
                                        </div>
                                        {comp.placeGroups.map((pg) => {
                                            const getBadgeClass = (place) => {
                                                const p = (place || '').toLowerCase();
                                                if (p.includes('2nd') || p.includes('runner') || p.includes('finalist')) return 'silver';
                                                if (p.includes('3rd')) return 'bronze';
                                                return 'gold';
                                            };
                                            const badgeClass = getBadgeClass(pg.place);
                                            const uniqueKey = `${comp.name}-${pg.place}`;

                                            return (
                                                <div key={uniqueKey} className="trophy-place-row" style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px' }}>
                                                    <span className={`trophy-count-badge ${badgeClass}`} style={{ minWidth: '80px' }}>
                                                        {pg.count}x {pg.place}
                                                    </span>
                                                    <span className="trophy-years-list" style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                                                        {pg.seasons.join(', ')}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    return (
        <div className="v3-player-profile animate-fade-in">
            {/* Premium Hero Section */}
            <header className="player-hero">
                <div className="hero-content">
                    <div className="player-photo-container">
                        <img src={player.photo_url} alt={player.name} className="hero-photo" />
                        <div className="photo-glow"></div>
                    </div>

                    <div className="player-main-info">
                        <div className="v3-badge">V3 PLAYER PROFILE</div>
                        <h1 className="player-name">{player.name}</h1>
                        <div className="player-meta-badges">
                            <span className="meta-badge">
                                <span className="label">Nationality</span>
                                <span className="value nationality-val">
                                    {player.nationality_flag && <img src={player.nationality_flag} alt="" className="mini-flag" />}
                                    {player.nationality}
                                </span>
                            </span>
                            <span className="meta-badge">
                                <span className="label">Age</span>
                                <span className="value">{player.age}</span>
                            </span>
                            <span className="meta-badge">
                                <span className="label">Height</span>
                                <span className="value">{player.height || 'N/A'}</span>
                            </span>
                            <span className="meta-badge">
                                <span className="label">Weight</span>
                                <span className="value">{player.weight || 'N/A'}</span>
                            </span>
                            <span className="meta-badge">
                                <span className="label">Foot</span>
                                <span className="value foot-val">{player.preferred_foot || 'N/A'}</span>
                            </span>
                        </div>

                        <div className="sync-container-inline">
                            {syncStatus === 'idle' && (
                                <button className="btn-deep-sync-v2" onClick={handleDeepSync}>
                                    <span className="icon">🔄</span>
                                    Deep Sync History
                                </button>
                            )}
                            {syncStatus === 'syncing' && (
                                <div className="sync-active-strip">
                                    <div className="sync-progress-info">
                                        <span className="status-label">Synchronizing...</span>
                                        <div className="dynamic-counters">
                                            <span className="counter updated">Updated: {syncStats.updated}</span>
                                            <span className="counter new">New: {syncStats.new}</span>
                                        </div>
                                    </div>
                                    <div className="sync-bar-container">
                                        <div className="sync-bar-fill"></div>
                                    </div>
                                    <div className="sync-mini-log">
                                        {syncLogs.length > 0 && syncLogs[syncLogs.length - 1].message}
                                    </div>
                                </div>
                            )}

                            {syncStatus === 'complete' && (
                                <div className="sync-complete-strip">
                                    <span className="icon">✅</span>
                                    <span className="msg">Bio-History Synchronized!</span>
                                    <div className="final-stats">
                                        {syncStats.updated} records updated, {syncStats.new} new added.
                                    </div>
                                </div>
                            )}

                            {syncStatus === 'resolving' && (
                                <div className="sync-alert-strip">
                                    <span className="icon">⚠️</span>
                                    <span className="msg">Unknown Competitions Found</span>
                                    <button className="btn-resolve-now" onClick={() => {
                                        const resolver = document.getElementById('entity-resolver-anchor');
                                        resolver?.scrollIntoView({ behavior: 'smooth' });
                                    }}>Resolve Mapping Now</button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="hero-stats-overview">
                    <div className="overview-stat">
                        <span className="val">{careerList.reduce((sum, s) => sum + (s.games_appearences || 0), 0)}</span>
                        <span className="lbl">Appearances</span>
                    </div>
                    <div className="overview-stat">
                        <span className="val">{careerList.reduce((sum, s) => sum + (s.goals_total || 0), 0)}</span>
                        <span className="lbl">Total Goals</span>
                    </div>
                    <div className="overview-stat highlight">
                        <span className="val">{(careerList.reduce((sum, s) => sum + (parseFloat(s.games_rating) || 0), 0) / (careerList.filter(s => s.games_rating).length || 1)).toFixed(2)}</span>
                        <span className="lbl">Avg Rating</span>
                    </div>
                </div>
            </header>

            {/* Entity Resolver Section (RESTORED) */}
            {syncStatus === 'resolving' && unresolvedCompetitions.length > 0 && (
                <section id="entity-resolver-anchor" className="entity-resolver-dashboard animate-slide-up">
                    <div className="resolver-header">
                        <div className="title-wrap">
                            <span className="icon">🧠</span>
                            <div>
                                <h2>Entity Resolution Required</h2>
                                <p>We found {unresolvedCompetitions.length} competition(s) not yet in our V3 taxonomy. Map them to maintain clean data.</p>
                            </div>
                        </div>
                        <button className="btn-close-resolver" onClick={() => setSyncStatus('idle')}>✕</button>
                    </div>

                    <div className="unresolved-list">
                        {unresolvedCompetitions.map((comp, idx) => (
                            <div key={idx} className="resolver-row">
                                <div className="source-info">
                                    <div className="source-label">API-Football Entry:</div>
                                    <div className="source-name">{comp.name}</div>
                                    <div className="source-meta">ID: {comp.api_id}</div>
                                </div>
                                <div className="mapping-action">
                                    <div className="mapping-input-wrap">
                                        <input
                                            type="text"
                                            placeholder="Search existing V3 Competition..."
                                            className="v3-autocomplete-input"
                                            list={`leagues-list-${idx}`}
                                        />
                                        <datalist id={`leagues-list-${idx}`}>
                                            {allLeagues.map(l => (
                                                <option key={l.api_id} value={l.name} />
                                            ))}
                                        </datalist>
                                    </div>
                                    <button className="btn-v3-map" onClick={() => {
                                        // TODO: Implement actual mapping API call
                                        alert(`Mapping ${comp.name} to existing league...`);
                                        setUnresolvedCompetitions(prev => prev.filter((_, i) => i !== idx));
                                        if (unresolvedCompetitions.length === 1) setSyncStatus('complete');
                                    }}>Link Entity</button>
                                    <button className="btn-v3-create" onClick={() => {
                                        // TODO: Implement actual creation API call
                                        const confirmCreate = window.confirm(`Create '${comp.name}' as a new V3 Competition?`);
                                        if (confirmCreate) {
                                            alert(`Created ${comp.name} as new V3 Competition.`);
                                            setUnresolvedCompetitions(prev => prev.filter((_, i) => i !== idx));
                                            if (unresolvedCompetitions.length === 1) setSyncStatus('complete');
                                        }
                                    }}>Create New</button>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            <div className="profile-grid">
                {/* Career History Table */}
                <main className="career-history">
                    {/* Club Totals Section */}
                    <div className="dash-card club-totals-card animate-slide-up">
                        <div className="card-title">🛡️ Club Career Totals</div>
                        <table className="club-totals-table">
                            <thead>
                                <tr>
                                    <th>Club</th>
                                    <th className="center">Matches</th>
                                    <th className="center">Goals</th>
                                    <th className="center">Assists</th>
                                    <th className="center">Avg Rating</th>
                                </tr>
                            </thead>
                            <tbody>
                                {clubTotals.sort((a, b) => b.total_matches - a.total_matches).map(club => (
                                    <tr key={club.team_id}>
                                        <td className="team-cell">
                                            <img src={club.team_logo} alt="" className="mini-logo" />
                                            <span>{club.team_name}</span>
                                        </td>
                                        <td className="center">{club.total_matches}</td>
                                        <td className="center highlight-goals">{club.total_goals}</td>
                                        <td className="center">{club.total_assists}</td>
                                        <td className="center">
                                            <span className="rating-badge-mini">{club.avg_rating}</span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="section-header-flex">
                        <div className="section-title">
                            <span className="icon">🏟️</span>
                            <h2>Career History</h2>
                        </div>
                        <div className="view-switcher">
                            <button className={careerView === 'year' ? 'active' : ''} onClick={() => setCareerView('year')}>By Year</button>
                            <button className={careerView === 'club' ? 'active' : ''} onClick={() => setCareerView('club')}>By Club</button>
                            <button className={careerView === 'country' ? 'active' : ''} onClick={() => setCareerView('country')}>By Country</button>
                        </div>
                    </div>

                    {sortedKeys.map(key => {
                        const content = groupedCareer[key];
                        const rows = Array.isArray(content) ? content : content.rows;

                        return (
                            <div key={key} className="career-group-block">
                                <div className="group-header">
                                    {careerView === 'year' && <span className="key-val">{key} / {parseInt(key) + 1}</span>}
                                    {careerView === 'club' && (
                                        <div className="club-key">
                                            <img src={content.logo} alt="" className="key-img" />
                                            <span className="key-val">{key}</span>
                                        </div>
                                    )}
                                    {careerView === 'country' && (
                                        <div className="country-key">
                                            {content.flag && <img src={content.flag} alt="" className="key-img-flag" />}
                                            <span className="key-val">{key}</span>
                                        </div>
                                    )}
                                </div>

                                <div className="career-table-container">
                                    <table className="career-table">
                                        <thead>
                                            <tr>
                                                {careerView !== 'club' && <th>Team</th>}
                                                <th>Competition</th>
                                                {careerView !== 'year' && <th>Season</th>}
                                                <th className="center">Apps</th>
                                                <th className="center">G</th>
                                                <th className="center">A</th>
                                                <th className="center">Rating</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {rows.sort((a, b) => b.season_year - a.season_year).map((row, idx) => (
                                                <tr key={`${key}-${idx}`}>
                                                    {careerView !== 'club' && (
                                                        <td className="team-cell">
                                                            <img src={row.team_logo} alt="" className="mini-logo" />
                                                            <span>{row.team_name}</span>
                                                        </td>
                                                    )}
                                                    <td className="league-cell">
                                                        <Link to={`/league/${row.league_id}/season/${row.season_year}`} className="league-link">
                                                            {row.league_name}
                                                        </Link>
                                                    </td>
                                                    {careerView !== 'year' && <td className="season-cell">{row.season_year}</td>}
                                                    <td className="center stat-important">{row.games_appearences}</td>
                                                    <td className="center stat-important goals">{row.goals_total}</td>
                                                    <td className="center">{row.goals_assists}</td>
                                                    <td className="center">
                                                        <span className="rating-badge" style={{
                                                            background: parseFloat(row.games_rating) > 7.5 ? 'rgba(16, 185, 129, 0.2)' :
                                                                parseFloat(row.games_rating) > 6.8 ? 'rgba(59, 130, 246, 0.2)' : 'rgba(100, 116, 139, 0.2)',
                                                            color: parseFloat(row.games_rating) > 7.5 ? '#10b981' :
                                                                parseFloat(row.games_rating) > 6.8 ? '#3b82f6' : '#94a3b8'
                                                        }}>
                                                            {row.games_rating || 'N/A'}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        );
                    })}
                </main>

                {/* Sidebar Info */}
                <aside className="player-sidebar">
                    {renderTrophies()}
                    <div className="dash-card">
                        <div className="card-title">Bio Details</div>
                        <div className="bio-list">
                            <div className="bio-item">
                                <span className="lbl">Birth Date</span>
                                <span className="val">{player.birth_date || 'Unknown'}</span>
                            </div>
                            <div className="bio-item">
                                <span className="lbl">Birth Place</span>
                                <span className="val">{player.birth_place ? `${player.birth_place}, ${player.birth_country}` : 'Unknown'}</span>
                            </div>
                            <div className="bio-item">
                                <span className="lbl">Nationality</span>
                                <span className="val">{player.nationality}</span>
                            </div>
                            <div className="bio-item">
                                <span className="lbl">Height</span>
                                <span className="val">{player.height}</span>
                            </div>
                            <div className="bio-item">
                                <span className="lbl">Weight</span>
                                <span className="val">{player.weight}</span>
                            </div>
                            <div className="bio-item">
                                <span className="lbl">Preferred Foot</span>
                                <span className="val">{player.preferred_foot || 'N/A'}</span>
                            </div>
                        </div>
                    </div>
                </aside>
            </div>
        </div>
    );
};

export default PlayerProfilePageV3;
