import React, { useState, useEffect, useMemo } from 'react';
import api from '../../../../services/api';
import { useNavigate } from 'react-router-dom';

const MatchesTab = ({ clubId, year, competitionId }) => {
    const navigate = useNavigate();
    const [matches, setMatches] = useState([]);
    const [loading, setLoading] = useState(true);
    const [venueFilter, setVenueFilter] = useState('all');
    const [winsOnly, setWinsOnly] = useState(false);
    const [defeatOnly, setDefeatOnly] = useState(false);
    const [selectedCompName, setSelectedCompName] = useState('all');

    useEffect(() => {
        const fetchMatches = async () => {
            setLoading(true);
            try {
                const data = await api.getClubMatches(clubId, {
                    year,
                    competition: competitionId !== 'all' ? competitionId : undefined,
                    venue_type: venueFilter !== 'all' ? venueFilter : undefined
                });
                setMatches(data);
            } catch (error) {
                console.error("Failed to fetch matches:", error);
            }
            setLoading(false);
        };

        if (year) fetchMatches();
    }, [clubId, year, competitionId, venueFilter]);

    const { finished, scheduled, competitionList } = useMemo(() => {
        const finishedStatuses = ['FT', 'AET', 'PEN'];

        // Extract unique competitions from matches
        const comps = Array.from(new Set(matches.map(m => m.league_name || m.competition?.name))).filter(Boolean);

        let filtered = [...matches];
        if (winsOnly) {
            filtered = filtered.filter(m => {
                const isHome = String(m.home_id || m.home?.id) === String(clubId);
                const [hg, ag] = (m.score || `${m.home_goals}-${m.away_goals}`).split('-').map(Number);
                return isHome ? (hg > ag) : (ag > hg);
            });
        }
        if (defeatOnly) {
            filtered = filtered.filter(m => {
                const isHome = String(m.home_id || m.home?.id) === String(clubId);
                const [hg, ag] = (m.score || `${m.home_goals}-${m.away_goals}`).split('-').map(Number);
                return isHome ? (ag > hg) : (hg > ag);
            });
        }
        if (selectedCompName !== 'all') {
            filtered = filtered.filter(m => (m.league_name || m.competition?.name) === selectedCompName);
        }

        const sorted = filtered.sort((a, b) => new Date(b.date) - new Date(a.date));

        return {
            finished: sorted.filter(m => finishedStatuses.includes(m.status)),
            scheduled: sorted.filter(m => !finishedStatuses.includes(m.status)).reverse().slice(0, 5),
            competitionList: comps
        };
    }, [matches, clubId, winsOnly, defeatOnly, selectedCompName]);

    if (loading) return (
        <div className="tab-loading">
            <div className="spinner-v3 small"></div>
            <span>Synchronizing fixtures...</span>
        </div>
    );

    const MatchCard = ({ m }) => {
        const isHome = String(m.home_id || m.home?.id) === String(clubId);
        const [hg, ag] = (m.score || `${m.home_goals}-${m.away_goals}`).split('-').map(Number);
        const result = hg === ag ? 'D' : (isHome ? (hg > ag ? 'W' : 'L') : (ag > hg ? 'W' : 'L'));

        return (
            <div className="v4-match-row" onClick={() => navigate(`/match/${m.match_id || m.fixture_id}`)}>
                <div className="match-time-v4">
                    <span className="m-day">{new Date(m.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</span>
                    <span className="m-year">{new Date(m.date).getFullYear()}</span>
                </div>

                <div className="match-body-v4">
                    <div className="match-header-row">
                        <div className="comp-tag">
                            <img src={m.league_logo || m.competition?.logo} alt="" className="tiny-logo" />
                            {m.league_name || m.competition?.name}
                        </div>
                        <span className="match-venue">{m.venue_name || 'Ground TBD'}</span>
                    </div>

                    <div className="match-main-row">
                        <div className={`m-team ${isHome ? 'is-subject' : ''}`}>
                            <span className="m-name">{isHome ? 'Home' : (m.home_name || m.home?.name)}</span>
                            <img src={m.home_logo || m.home?.logo} alt="" />
                        </div>

                        <div className="m-result-box">
                            {m.status === 'NS' || m.status === 'TBD' ? (
                                <div className="m-time-pill">
                                    {new Date(m.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </div>
                            ) : (
                                <div className={`m-score-pill ${result.toLowerCase()}`}>
                                    <span className="s-hg">{hg}</span>
                                    <span className="s-sep">-</span>
                                    <span className="s-ag">{ag}</span>
                                </div>
                            )}
                        </div>

                        <div className={`m-team right ${!isHome ? 'is-subject' : ''}`}>
                            <img src={m.away_logo || m.away?.logo} alt="" />
                            <span className="m-name">{!isHome ? 'Away' : (m.away_name || m.away?.name)}</span>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="matches-tab-v4">

            <div className="matches-toolbar-v4">
                <div className="toolbar-top">
                    <div className="venue-filters-v4">
                        {['all', 'home', 'away'].map(v => (
                            <button
                                key={v}
                                className={`pill-btn ${venueFilter === v ? 'active' : ''}`}
                                onClick={() => setVenueFilter(v)}
                            >
                                {v}
                            </button>
                        ))}
                    </div>

                    <div className="comp-selector-v4">
                        <button
                            className={`pill-btn ${selectedCompName === 'all' ? 'active' : ''}`}
                            onClick={() => setSelectedCompName('all')}
                        >
                            All Comps
                        </button>
                        {competitionList.map(c => (
                            <button
                                key={c}
                                className={`pill-btn ${selectedCompName === c ? 'active' : ''}`}
                                onClick={() => setSelectedCompName(c)}
                            >
                                {c}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="toolbar-bottom">
                    <button
                        className={`toggle-v4 win ${winsOnly ? 'active' : ''}`}
                        onClick={() => { setWinsOnly(!winsOnly); setDefeatOnly(false); }}
                    >
                        Wins Only
                    </button>
                    <button
                        className={`toggle-v4 loss ${defeatOnly ? 'active' : ''}`}
                        onClick={() => { setDefeatOnly(!defeatOnly); setWinsOnly(false); }}
                    >
                        Defeats Only
                    </button>
                </div>
            </div>

            <div className="match-timeline-v4">
                {scheduled.length > 0 && (
                    <section className="timeline-section">
                        <label className="timeline-label upcoming">Upcoming Fixtures</label>
                        <div className="matches-list-v4">
                            {scheduled.map(m => <MatchCard key={m.fixture_id || m.match_id} m={m} />)}
                        </div>
                    </section>
                )}

                <section className="timeline-section">
                    <label className="timeline-label">Match History</label>
                    <div className="matches-list-v4">
                        {finished.map(m => <MatchCard key={m.fixture_id || m.match_id} m={m} />)}
                    </div>
                    {finished.length === 0 && (
                        <div className="empty-matches">
                            <div className="icon">🏟️</div>
                            <h3>No matches recorded</h3>
                            <p>Try clearing your active filters.</p>
                        </div>
                    )}
                </section>
            </div>
        </div>
    );
};

export default MatchesTab;
