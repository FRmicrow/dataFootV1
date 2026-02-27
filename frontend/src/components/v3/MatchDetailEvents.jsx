import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { Stack, Badge } from '../../design-system';
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
        <div className="ds-match-events-timeline animate-fade-in">
            {events.map((ev, idx) => {
                const isHome = ev.is_home_team === 1;
                return (
                    <div key={idx} className={`ds-ev-row ${isHome ? 'home' : 'away'}`}>
                        {/* Time Column */}
                        <div className="ds-ev-time">
                            {ev.time_elapsed}{ev.extra_minute ? `+${ev.extra_minute}` : ''}'
                        </div>

                        {/* icon */}
                        <div className="ds-ev-icon-wrap">
                            {renderEventIcon(ev.type, ev.detail)}
                        </div>

                        {/* Content */}
                        <div className="ds-ev-content">
                            <Stack gap="2px">
                                <span className="ds-ev-player">{ev.player_name}</span>
                                <Stack direction="row" gap="4px" align="center">
                                    <span className="ds-ev-detail">{ev.detail}</span>
                                    {ev.assist_name && (
                                        <Badge variant="neutral" size="xs">Ass: {ev.assist_name}</Badge>
                                    )}
                                </Stack>
                            </Stack>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default MatchDetailEvents;
