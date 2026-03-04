import React, { useState, useEffect } from 'react';
import api from '../../../../services/api';
import { Stack, Badge } from '../../../../design-system';
import './MatchDetailEvents.css';

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
            const res = await api.getFixtureEvents(fixtureId);
            setEvents(res || []);
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

    if (loading) return (
        <div className="ds-events-loading">
            <div className="ds-button-spinner mb-sm" style={{ margin: '0 auto' }}></div>
            Synchronizing event log...
        </div>
    );
    if (error) return <div className="ds-events-error">Error: {error}</div>;
    if (events.length === 0) return <div className="ds-events-empty">No strategic events recorded.</div>;

    return (
        <div className="ds-match-events-list animate-fade-in">
            {events.map((ev, idx) => {
                const isHome = Number(ev.is_home_team) === 1;
                const timeStr = `${ev.time_elapsed}${ev.extra_minute ? `+${ev.extra_minute}` : ''}${ev.extra_minute ? '' : "'"}`;

                return (
                    <div key={idx} className={`ds-ev-row ${isHome ? 'home' : 'away'}`}>
                        {/* Home Spot (40%) */}
                        <div className="ds-ev-col-home">
                            {isHome && (
                                <div className="ds-ev-data-wrap">
                                    <span className="ds-ev-player">{ev.player_name}</span>
                                    <div className="ds-ev-meta">
                                        <span className="ds-ev-detail">{ev.detail}</span>
                                        {ev.assist_name && (
                                            <Badge variant="neutral" size="xs">Ass: {ev.assist_name}</Badge>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Center Spot (10%) */}
                        <div className="ds-ev-col-center">
                            <div className="ds-ev-time-stamp">{timeStr}</div>
                            <div className="ds-ev-timeline-icon">
                                {renderEventIcon(ev.type, ev.detail)}
                            </div>
                        </div>

                        {/* Away Spot (40%) */}
                        <div className="ds-ev-col-away">
                            {!isHome && (
                                <div className="ds-ev-data-wrap">
                                    <span className="ds-ev-player">{ev.player_name}</span>
                                    <div className="ds-ev-meta">
                                        <span className="ds-ev-detail">{ev.detail}</span>
                                        {ev.assist_name && (
                                            <Badge variant="neutral" size="xs">Ass: {ev.assist_name}</Badge>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default MatchDetailEvents;
