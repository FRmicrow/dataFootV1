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

    const renderEventIcon = (type) => {
        const t = (type || '').toLowerCase();
        if (t === 'owngoal')         return <span className="ev-icon ev-icon--goal ev-icon--own"   title="Own goal" />;
        if (t === 'goal')            return <span className="ev-icon ev-icon--goal"                 title="Goal" />;
        if (t === 'penalty_missed')  return <span className="ev-icon ev-icon--penalty-missed"       title="Missed penalty" />;
        if (t === 'redcard')         return <span className="ev-icon ev-icon--red-card"             title="Red card" />;
        if (t === 'yellowred')       return <span className="ev-icon ev-icon--yellow-red-card"      title="Second yellow" />;
        if (t === 'yellowcard')      return <span className="ev-icon ev-icon--yellow-card"          title="Yellow card" />;
        if (t === 'substitution' || t === 'subst') return <span className="ev-icon ev-icon--subst" title="Substitution" />;
        if (t === 'var')             return <span className="ev-icon ev-icon--var"                  title="VAR" />;
        return <span className="ev-icon ev-icon--dot" />;
    };

    if (loading) return <div className="ds-events-loading">Chargement des événements...</div>;
    if (error)   return <div className="ds-events-error">Erreur : {error}</div>;
    if (events.length === 0) return <div className="ds-events-empty">Aucun événement enregistré pour ce match.</div>;

    return (
        <div className="ds-match-events-list animate-fade-in">
            {events.map((ev, index) => {
                const isHome = Number(ev.is_home_team) === 1;
                const rawTime = String(ev.time_elapsed || '').replace(/'$/, '');
                const timeStr = `${rawTime}${ev.extra_minute ? `+${ev.extra_minute}` : ''}'`;
                const eventKey = ev.id || `${index}-${ev.time_elapsed}-${ev.type}`;

                // Primary actor: resolved person name OR first part of detail fallback
                // For Flashscore-scraped events player_name is null, detail = "Name1 | Name2"
                const detailParts = (ev.detail || '').split(' | ');
                const primaryName  = ev.player_name  || detailParts[0] || null;
                const secondaryName = ev.assist_name || detailParts[1] || null;

                const renderPlayerBlock = () => (
                    <div className="ds-ev-data-wrap">
                        <span className="ds-ev-player">{primaryName}</span>
                        {secondaryName && (
                            <span className={`ds-ev-assist ${ev.type === 'substitution' ? 'ds-ev-sub-on' : ''}`}>
                                {ev.type === 'substitution' ? `↑ ${secondaryName}` : secondaryName}
                            </span>
                        )}
                    </div>
                );

                return (
                    <div key={eventKey} className={`ds-ev-row ${isHome ? 'home' : 'away'}`}>
                        <div className="ds-ev-col-home">
                            {isHome && renderPlayerBlock()}
                        </div>

                        <div className="ds-ev-col-center">
                            <div className="ds-ev-time-stamp">{timeStr}</div>
                            <div className="ds-ev-timeline-icon">
                                {renderEventIcon(ev.type)}
                            </div>
                        </div>

                        <div className="ds-ev-col-away">
                            {!isHome && renderPlayerBlock()}
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
