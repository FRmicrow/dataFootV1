import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import api from '../../../../services/api';
import './MatchDetailEventsV4.css';

const MatchDetailEventsV4 = ({ fixtureId }) => {
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (fixtureId) fetchEvents();
    }, [fixtureId]);

    const fetchEvents = async () => {
        try {
            setLoading(true);
            const res = await api.getFixtureEventsV4(fixtureId);
            setEvents(res || []);
        } catch (e) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    const renderEventIcon = (type, detail) => {
        const t = (type || '').toLowerCase();
        const d = (detail || '').toLowerCase();
        if (t === 'goal' || t === 'normalgoal' || t === 'owngoal') {
            const isOwn = t === 'owngoal' || d.includes('own');
            return <span className={`ev-icon ev-icon--goal ${isOwn ? 'ev-icon--own' : ''}`} title={isOwn ? 'Own goal' : 'Goal'} />;
        }
        if (t === 'card' || t === 'yellowcard' || t === 'redcard' || t === 'yellowredcard') {
            if (d.includes('red') || t === 'redcard') return <span className="ev-icon ev-icon--red-card" title="Red card" />;
            if (d.includes('yellow red') || t === 'yellowredcard') return <span className="ev-icon ev-icon--yellow-red-card" title="Second yellow" />;
            return <span className="ev-icon ev-icon--yellow-card" title="Yellow card" />;
        }
        if (t === 'subst' || t === 'substitution') return <span className="ev-icon ev-icon--subst" title="Substitution" />;
        if (t === 'var') return <span className="ev-icon ev-icon--var" title="VAR" />;
        return <span className="ev-icon ev-icon--dot" />;
    };

    if (loading) return <div className="ds-events-loading">Synchronizing historical events...</div>;
    if (error) return <div className="ds-events-error">Error: {error}</div>;
    if (events.length === 0) return <div className="ds-events-empty">No strategic events recorded for this V4 match.</div>;

    return (
        <div className="ds-match-events-list animate-fade-in">
            {events.map((ev, index) => {
                const isHome = Number(ev.is_home_team) === 1;
                const timeStr = `${ev.time_elapsed}${ev.extra_minute ? `+${ev.extra_minute}` : ''}${ev.extra_minute ? '' : "'"}`;
                const eventKey = ev.id || `${index}-${ev.time_elapsed}-${ev.type}`;

                return (
                    <div key={eventKey} className={`ds-ev-row ${isHome ? 'home' : 'away'}`}>
                        <div className="ds-ev-col-home">
                            {isHome && (
                                <div className="ds-ev-data-wrap">
                                    <span className="ds-ev-player">{ev.player_name}</span>
                                    <div className="ds-ev-meta">
                                        <span className="ds-ev-detail">{ev.detail}</span>
                                        {ev.assist_name && (
                                            <span className="ds-ev-assist">{ev.assist_name}</span>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="ds-ev-col-center">
                            <div className="ds-ev-time-stamp">{timeStr}</div>
                            <div className="ds-ev-timeline-icon">
                                {renderEventIcon(ev.type, ev.detail)}
                            </div>
                        </div>

                        <div className="ds-ev-col-away">
                            {!isHome && (
                                <div className="ds-ev-data-wrap">
                                    <span className="ds-ev-player">{ev.player_name}</span>
                                    <div className="ds-ev-meta">
                                        <span className="ds-ev-detail">{ev.detail}</span>
                                        {ev.assist_name && (
                                            <span className="ds-ev-assist">{ev.assist_name}</span>
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

MatchDetailEventsV4.propTypes = {
    fixtureId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired
};

export default MatchDetailEventsV4;
