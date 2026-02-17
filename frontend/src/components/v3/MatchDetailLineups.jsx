import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './MatchDetailLineups.css';

const MatchDetailLineups = ({ fixtureId }) => {
    const [lineups, setLineups] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (fixtureId) fetchLineups();
    }, [fixtureId]);

    const fetchLineups = async () => {
        try {
            setLoading(true);
            const res = await axios.get(`/api/v3/fixtures/${fixtureId}/lineups`);
            // res.data.lineups is array of 2
            setLineups(res.data.lineups || []);
        } catch (e) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="lineups-loading">Loading Lineups...</div>;
    if (error) return <div className="lineups-error">Error loading lineups: {error}</div>;
    if (lineups.length === 0) return <div className="lineups-empty">No lineups available.</div>;

    // Identify Home/Away
    // Usually index 0 is Home, 1 is Away in API Response, BUT we stored them.
    // We should ideally check against team_id if we have match context.
    // For now, let's assume index 0/1 are distinct. 
    // Usually API Football returns Home first.
    const home = lineups[0];
    const away = lineups[1] || null;

    const renderTeamLineup = (team, side) => {
        if (!team) return null;

        // Parse if string (though controller parses it)
        const starters = typeof team.starting_xi === 'string' ? JSON.parse(team.starting_xi) : team.starting_xi;
        const subs = typeof team.substitutes === 'string' ? JSON.parse(team.substitutes) : team.substitutes;

        return (
            <div className={`team-lineup-col ${side}`}>
                <div className="lineup-header">
                    <h3>{team.team_name || (side === 'home' ? 'Home Team' : 'Away Team')}</h3>
                    <div className="formation-badge">{team.formation}</div>
                    <div className="coach-name">Coach: {team.coach_name}</div>
                </div>

                <div className="lineup-list starters">
                    <h4>Starting XI</h4>
                    {starters.map(p => (
                        <div key={p.player.id} className="player-row">
                            <span className="player-num">{p.player.number}</span>
                            <span className="player-name">{p.player.name}</span>
                            <span className="player-pos">{p.player.pos}</span>
                        </div>
                    ))}
                </div>

                <div className="lineup-list subs">
                    <h4>Substitutes</h4>
                    {subs.map(p => (
                        <div key={p.player.id} className="player-row sub">
                            <span className="player-num">{p.player.number}</span>
                            <span className="player-name">{p.player.name}</span>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    return (
        <div className="match-lineups-container">
            {renderTeamLineup(home, 'home')}
            <div className="lineup-divider">VS</div>
            {renderTeamLineup(away, 'away')}
        </div>
    );
};

export default MatchDetailLineups;
