import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import api from '../../../services/api';
import GameCard from './GameCard';
import LeagueSelector from './LeagueSelector';
import './LiveBet.css';

const LiveBetDashboard = () => {
    const [mode, setMode] = useState('upcoming'); // 'upcoming' | 'daily'
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedDate, setSelectedDate] = useState('');
    const [showSelector, setShowSelector] = useState(false);
    const [hasLoadedDaily, setHasLoadedDaily] = useState(false);
    const [hasLoadedUpcoming, setHasLoadedUpcoming] = useState(false);

    // Preferences: favorite_leagues, favorite_teams, tracked_leagues
    const [preferences, setPreferences] = useState({ favorite_leagues: [], favorite_teams: [], tracked_leagues: [] });

    // Upcoming mode: grouped by competition
    const [upcomingGroups, setUpcomingGroups] = useState([]);

    // Daily mode: flat list
    const [fixtures, setFixtures] = useState([]);

    // All local DB leagues for the selector panel
    const [availableLeagues, setAvailableLeagues] = useState([]);

    // ── Initial load ──
    useEffect(() => {
        const bootstrap = async () => {
            setLoading(true);
            try {
                const prefsRes = await api.getPreferences();
                const prefs = prefsRes.data || prefsRes || { favorite_leagues: [], favorite_teams: [], tracked_leagues: [] };
                setPreferences(prefs);

                // Fetch available leagues for the selector
                // getStudioLeagues returns grouped: [{ country, flag, leagues: [{id, name, logo}] }]
                // We also need importance_rank — join with country data from the service
                // Use a dedicated endpoint instead: get all leagues from local DB with rank
                const leaguesRes = await api.getStudioLeagues();
                const grouped = leaguesRes.data || leaguesRes || [];
                // Flatten: each item in grouped has { country, flag, importance_rank(?), leagues: [{id, name, logo}] }
                // The studio endpoint doesn't include importance_rank in the group, but the order is already by importance_rank ASC
                const leagueList = grouped.flatMap((group, idx) =>
                    (group.leagues || []).map(l => ({
                        id: l.id,
                        name: l.name,
                        logo: l.logo,
                        country: group.country,
                        importance_rank: idx // use group order as proxy for rank
                    }))
                );
                setAvailableLeagues(leagueList);

                if (prefs.tracked_leagues?.length > 0 && mode === 'upcoming') {
                    setHasLoadedUpcoming(true);
                    const upcomingRes = await api.getUpcomingFixtures(prefs.tracked_leagues || []);
                    setUpcomingGroups((upcomingRes.data?.groups || upcomingRes?.groups) ?? []);
                }
            } catch (err) {
                console.error('Failed to load dashboard data:', err);
            } finally {
                setLoading(false);
            }
        };
        bootstrap();
    }, []);

    // ── Re-fetch upcoming when tracked_leagues change ──
    const refreshUpcoming = async (trackedIds) => {
        setLoading(true);
        try {
            const upcomingRes = await api.getUpcomingFixtures(trackedIds);
            setUpcomingGroups((upcomingRes.data?.groups || upcomingRes?.groups) ?? []);
        } catch (err) {
            console.error('Failed to refresh upcoming:', err);
        } finally {
            setLoading(false);
        }
    };

    // ── Re-fetch daily fixtures when date or mode changes ──
    useEffect(() => {
        if (mode !== 'daily' || !hasLoadedDaily) return;
        const fetchDaily = async () => {
            setLoading(true);
            try {
                const res = await api.getLiveFixtures(selectedDate || undefined);
                const cleanData = Array.isArray(res) ? res : (res.fixtures || []);
                setFixtures(cleanData);
            } catch (err) {
                console.error('Failed to load daily fixtures:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchDaily();
    }, [mode, selectedDate]);

    // ── Toggle tracked league (AC 4: persist to backend) ──
    const toggleTrackedLeague = async (leagueId) => {
        const current = preferences.tracked_leagues || [];
        const updated = current.includes(leagueId)
            ? current.filter(id => id !== leagueId)
            : [...current, leagueId];

        const updatedPrefs = { ...preferences, tracked_leagues: updated };
        setPreferences(updatedPrefs);

        try {
            await api.updatePreferences(updatedPrefs);
            if (mode === 'upcoming') await refreshUpcoming(updated);
        } catch (err) {
            console.error('Failed to save tracked leagues:', err);
        }
    };

    // ── Toggle favorite (teams / favorite leagues) ──
    const toggleFavorite = async (type, id) => {
        const key = type === 'league' ? 'favorite_leagues' : 'favorite_teams';
        const current = preferences[key] || [];
        const updated = current.includes(id) ? current.filter(i => i !== id) : [...current, id];
        const updatedPrefs = { ...preferences, [key]: updated };
        setPreferences(updatedPrefs);
        try { await api.updatePreferences(updatedPrefs); } catch (_) { }
    };

    // ── Filtered daily fixtures (search + country/league filters) ──
    const filteredFixtures = useMemo(() => {
        const term = searchTerm.toLowerCase();
        return fixtures.filter(f => {
            const h = f.teams?.home?.name?.toLowerCase() || '';
            const a = f.teams?.away?.name?.toLowerCase() || '';
            const l = f.league?.name?.toLowerCase() || '';
            return h.includes(term) || a.includes(term) || l.includes(term);
        });
    }, [fixtures, searchTerm]);

    // ── Filtered upcoming groups (search) ──
    const filteredGroups = useMemo(() => {
        const term = searchTerm.toLowerCase();
        if (!term) return upcomingGroups;
        return upcomingGroups.map(group => ({
            ...group,
            fixtures: group.fixtures.filter(f => {
                const h = f.teams?.home?.name?.toLowerCase() || '';
                const a = f.teams?.away?.name?.toLowerCase() || '';
                return h.includes(term) || a.includes(term);
            })
        })).filter(g => g.fixtures.length > 0);
    }, [upcomingGroups, searchTerm]);

    const trackedIds = preferences.tracked_leagues || [];

    return (
        <div className="lb-dashboard animate-slide-up">
            {/* ── Title Bar ── */}
            <div className="lb-title-bar">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                    <h1 style={{ margin: 0 }}>Live Bet Central</h1>

                    {/* Mode Toggle */}
                    <div style={{ display: 'flex', background: '#1e293b', borderRadius: '8px', padding: '4px', gap: '4px' }}>
                        <button
                            onClick={() => setMode('upcoming')}
                            style={{
                                background: mode === 'upcoming' ? '#6366f1' : 'transparent',
                                border: 'none', borderRadius: '6px', color: mode === 'upcoming' ? '#fff' : '#94a3b8',
                                padding: '6px 14px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: '600', transition: 'all 0.2s'
                            }}>
                            📅 Upcoming
                        </button>
                        <button
                            onClick={() => setMode('daily')}
                            style={{
                                background: mode === 'daily' ? '#6366f1' : 'transparent',
                                border: 'none', borderRadius: '6px', color: mode === 'daily' ? '#fff' : '#94a3b8',
                                padding: '6px 14px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: '600', transition: 'all 0.2s'
                            }}>
                            🗓️ Daily
                        </button>
                    </div>

                    <Link
                        to="/live-bet/data-empowerment"
                        style={{
                            display: 'flex', alignItems: 'center', gap: '8px',
                            background: 'rgba(99, 102, 241, 0.1)',
                            border: '1px solid rgba(99, 102, 241, 0.3)',
                            borderRadius: '8px',
                            color: '#a5b4fc',
                            padding: '6px 16px',
                            fontSize: '0.85rem',
                            fontWeight: '600',
                            textDecoration: 'none',
                            transition: 'all 0.2s'
                        }}
                    >
                        💎 Data Empowerment
                    </Link>

                    <button
                        onClick={() => {
                            if (mode === 'daily') { setHasLoadedDaily(true); }
                            else { setHasLoadedUpcoming(true); refreshUpcoming(preferences.tracked_leagues); }
                        }}
                        style={{
                            background: 'rgba(16, 185, 129, 0.1)',
                            border: '1px solid #10b981',
                            borderRadius: '8px',
                            color: '#10b981',
                            padding: '6px 16px',
                            fontSize: '0.85rem',
                            fontWeight: '700',
                            cursor: 'pointer'
                        }}
                    >
                        🚀 {loading ? 'Scanning...' : 'Refresh Feed'}
                    </button>
                </div>

                {/* Controls Row */}
                <div style={{ display: 'flex', gap: '10px', marginTop: '14px', flexWrap: 'wrap', alignItems: 'center' }}>
                    <input
                        type="text"
                        placeholder="Search teams..."
                        className="lb-search-input"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        style={{ flex: '1', minWidth: '160px' }}
                    />

                    {mode === 'upcoming' && (
                        <button
                            onClick={() => setShowSelector(s => !s)}
                            style={{
                                display: 'flex', alignItems: 'center', gap: '6px',
                                background: showSelector ? 'rgba(99,102,241,0.2)' : '#1e293b',
                                border: `1px solid ${showSelector ? '#6366f1' : 'rgba(255,255,255,0.08)'}`,
                                borderRadius: '8px', color: '#a5b4fc', padding: '8px 14px',
                                cursor: 'pointer', fontSize: '0.9rem', fontWeight: '600', transition: 'all 0.2s'
                            }}>
                            ⚙️ Competitions
                            {trackedIds.length > 0 && (
                                <span style={{ background: '#6366f1', color: '#fff', borderRadius: '20px', padding: '1px 7px', fontSize: '0.75rem' }}>
                                    {trackedIds.length}
                                </span>
                            )}
                        </button>
                    )}

                    {mode === 'daily' && (
                        <input
                            type="date"
                            className="lb-search-input"
                            value={selectedDate}
                            onChange={e => setSelectedDate(e.target.value)}
                            title="Select Date"
                        />
                    )}
                </div>
            </div>

            {/* ── League Selector Panel (US_022 AC 1) ── */}
            {mode === 'upcoming' && showSelector && (
                <LeagueSelector
                    availableLeagues={availableLeagues}
                    trackedIds={trackedIds}
                    onToggle={toggleTrackedLeague}
                    onClose={() => setShowSelector(false)}
                />
            )}

            {/* ── Feed ── */}
            {loading ? (
                <div className="loading-state">
                    <div className="spinner"></div>
                    <p>Scanning Matches...</p>
                </div>
            ) : mode === 'upcoming' ? (
                /* ── Upcoming: Grouped by Competition (AC 3) ── */
                <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                    {!hasLoadedUpcoming && (
                        <div className="empty-state" style={{ textAlign: 'center', padding: '60px 20px' }}>
                            <div style={{ fontSize: '3rem', marginBottom: '12px' }}>📅</div>
                            <h2 style={{ color: '#f1f5f9' }}>Upcoming Match Analysis</h2>
                            <p style={{ color: '#94a3b8', maxWidth: '400px', margin: '0 auto 20px' }}>
                                Connect to the live market to pull the latest fixtures and pre-match stats.
                            </p>
                            <button
                                onClick={() => { setHasLoadedUpcoming(true); refreshUpcoming(preferences.tracked_leagues); }}
                                className="lb-search-input"
                                style={{ width: 'auto', background: '#6366f1', color: '#fff', border: 'none', padding: '10px 30px', cursor: 'pointer' }}
                            >
                                🚀 Load Upcoming Matches
                            </button>
                        </div>
                    )}

                    {hasLoadedUpcoming && filteredGroups.length === 0 && (
                        <div className="empty-state" style={{ textAlign: 'center', padding: '60px 20px' }}>
                            <div style={{ fontSize: '3rem', marginBottom: '12px' }}>⚽</div>
                            <div style={{ color: '#94a3b8', fontSize: '1rem' }}>
                                {trackedIds.length === 0
                                    ? 'Click ⚙️ Competitions to select leagues to track.'
                                    : 'No upcoming matches found for your selected leagues.'}
                            </div>
                        </div>
                    )}

                    {filteredGroups.map(group => (
                        <div key={group.league.id}>
                            {/* Competition header */}
                            <div style={{
                                display: 'flex', alignItems: 'center', gap: '10px',
                                padding: '10px 0', marginBottom: '12px',
                                borderBottom: '2px solid rgba(99,102,241,0.3)'
                            }}>
                                {group.league.logo && (
                                    <img src={group.league.logo} alt="" style={{ width: '28px', height: '28px', objectFit: 'contain' }} />
                                )}
                                <div>
                                    <div style={{ fontWeight: '800', fontSize: '1rem', color: '#f1f5f9' }}>{group.league.name}</div>
                                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{group.league.country}</div>
                                </div>
                                <span style={{
                                    marginLeft: 'auto', fontSize: '0.75rem', color: '#6366f1',
                                    background: 'rgba(99,102,241,0.1)', padding: '3px 10px', borderRadius: '20px', fontWeight: '600'
                                }}>
                                    {group.fixtures.length} matches
                                </span>
                            </div>

                            {/* Fixtures in this group */}
                            <div className="lb-game-feed">
                                {group.fixtures.map(f => (
                                    <GameCard
                                        key={f.fixture.id}
                                        fixture={f}
                                        preferences={preferences}
                                        onToggleFavorite={toggleFavorite}
                                    />
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                /* ── Daily Mode: Flat list ── */
                <div className="lb-game-feed">
                    {!hasLoadedDaily && (
                        <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '80px 20px', background: 'rgba(15, 23, 42, 0.4)', borderRadius: '16px', border: '1px dashed rgba(255,255,255,0.05)' }}>
                            <div style={{ fontSize: '3.5rem', marginBottom: '20px' }}>🏟️</div>
                            <h2 style={{ color: '#f1f5f9', marginBottom: '10px' }}>Live Betting Feed</h2>
                            <p style={{ color: '#64748b', maxWidth: '450px', margin: '0 auto 30px', fontSize: '0.95rem' }}>
                                Ready to scan the global markets for today's value bets?
                                This avoids automatic API usage and only pulls data when you're ready.
                            </p>
                            <button
                                onClick={() => setHasLoadedDaily(true)}
                                style={{ background: 'linear-gradient(135deg, #6366f1, #4f46e5)', color: '#fff', border: 'none', padding: '12px 40px', borderRadius: '10px', fontWeight: 'bold', fontSize: '1rem', cursor: 'pointer', boxShadow: '0 4px 15px rgba(99, 102, 241, 0.3)' }}
                            >
                                📡 Initialize Market Scan
                            </button>
                        </div>
                    )}

                    {hasLoadedDaily && filteredFixtures.length === 0 && (
                        <div className="empty-state">
                            <p>No matches found for {selectedDate || 'today'}.</p>
                        </div>
                    )}
                    {filteredFixtures.map(f => (
                        <GameCard
                            key={f.fixture.id}
                            fixture={f}
                            preferences={preferences}
                            onToggleFavorite={toggleFavorite}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

export default LiveBetDashboard;
