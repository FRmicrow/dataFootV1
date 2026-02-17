import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './MatchDetailEvents.css'; // Will create this

const MatchDetailEvents = ({ fixtureId }) => {
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (fixtureId) fetchEvents();
    }, [fixtureId]);

    const fetchEvents = async () => {
        try {
            setLoading(true);
            const res = await axios.get(`/api/v3/fixtures/${fixtureId}/events`);
            setEvents(res.data || []);
        } catch (e) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    const renderEventIcon = (type, detail) => {
        if (type === 'Goal') return '⚽';
        if (type === 'Card') {
            if (detail === 'Yellow Card') return '🟨';
            if (detail === 'Red Card') return '🟥';
            return '🎴';
        }
        if (type === 'subst') return '⇄';
        if (type === 'Var') return '📺';
        return '•';
    };

    if (loading) return <div className="events-loading">Loading Events...</div>;
    if (error) return <div className="events-error">Error: {error}</div>;
    if (events.length === 0) return <div className="events-empty">No events recorded.</div>;

    return (
        <div className="match-events-timeline">
            {events.map((ev, idx) => {
                const isHome = ev.is_home_team === 1;
                return (
                    <div key={idx} className="event-timeline-row">
                        {/* Home Side */}
                        <div className={`event-side home-side ${isHome ? 'active' : ''}`}>
                            {isHome && (
                                <>
                                    <div className="ev-detail">
                                        <span className="ev-player">{ev.player_name}</span>
                                        {ev.assist_name && <span className="ev-assist">({ev.assist_name})</span>}
                                        <span className="ev-type-text">{ev.detail}</span>
                                    </div>
                                    <div className="ev-icon">{renderEventIcon(ev.type, ev.detail)}</div>
                                </>
                            )}
                        </div>

                        {/* Center Axis */}
                        <div className="event-time-axis">
                            <div className="ev-time-badge">
                                {ev.time_elapsed}{ev.extra_minute ? `+${ev.extra_minute}` : ''}'
                            </div>
                        </div>

                        {/* Away Side */}
                        <div className={`event-side away-side ${!isHome ? 'active' : ''}`}>
                            {!isHome && (
                                <>
                                    <div className="ev-icon">{renderEventIcon(ev.type, ev.detail)}</div>
                                    <div className="ev-detail">
                                        <span className="ev-player">{ev.player_name}</span>
                                        {ev.assist_name && <span className="ev-assist">({ev.assist_name})</span>}
                                        <span className="ev-type-text">{ev.detail}</span>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default MatchDetailEvents;
