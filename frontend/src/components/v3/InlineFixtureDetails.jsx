
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import MatchDetailEvents from './MatchDetailEvents';
import './InlineFixtureDetails.css';

const InlineFixtureDetails = ({ fixtureId, homeTeamId, awayTeamId }) => {
    const [lineups, setLineups] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchLineups();
    }, [fixtureId]);

    const fetchLineups = async () => {
        setLoading(true);
        try {
            const res = await axios.get(`/api/v3/fixtures/${fixtureId}/lineups`);
            // The API returns { source: ..., lineups: [...] }
            setLineups(res.data.lineups || []);
        } catch (error) {
            console.error("Failed to load lineups", error);
        } finally {
            setLoading(false);
        }
    };

    const getParsed = (data) => {
        if (!data) return [];
        return typeof data === 'string' ? JSON.parse(data) : data;
    };

    if (loading) return <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8' }}>Loading squads...</div>;

    // Identify Home vs Away based on team IDs passed or default order
    // Typically index 0 is Home if sorted by controller, but matching ID is safer
    let homeLineup = lineups.find(l => l.team_id === homeTeamId);
    let awayLineup = lineups.find(l => l.team_id === awayTeamId);

    // Fallback if IDs not provided or mismatch
    if (!homeLineup && lineups.length > 0) homeLineup = lineups[0];
    if (!awayLineup && lineups.length > 1) awayLineup = lineups[1];

    const getRole = (pos) => {
        if (pos === 'F') return 'A';
        return pos;
    };

    const renderSquad = (lineup, side) => {
        if (!lineup) return (
            <div className={`inline-lineup-column ${side}`}>
                <div style={{ padding: '20px', color: '#64748b', fontStyle: 'italic', fontSize: '12px' }}>
                    Lineup not available
                </div>
            </div>
        );

        const starting = getParsed(lineup.starting_xi);
        const subs = getParsed(lineup.substitutes);

        const renderPlayer = (entry, idx) => {
            const p = entry.player || {};
            return (
                <div key={p.id || idx} className="inline-player-row">
                    <span className="inline-player-number" style={{ fontSize: '12px' }}>{p.number}</span>
                    <span className="inline-player-name" style={{ fontSize: '12px' }}>{p.name}</span>
                    <span className="inline-player-role" style={{ fontSize: '11px' }}>{getRole(p.pos)}</span>
                </div>
            );
        };

        return (
            <div className={`inline-lineup-column ${side}`}>
                <div className="inline-lineup-header">
                    <h3>Starting XI</h3>
                    <div className="inline-lineup-meta">
                        {lineup.formation && <span>{lineup.formation}</span>}
                    </div>
                </div>

                <div className="inline-player-list">
                    {starting.map(renderPlayer)}
                </div>

                <div className="inline-lineup-header" style={{ marginTop: '20px' }}>
                    <h3>Substitutes</h3>
                </div>

                <div className="inline-player-list">
                    {subs.map(renderPlayer)}
                </div>

                <div className="inline-lineup-header" style={{ marginTop: '20px', border: 'none' }}>
                    <div className="inline-lineup-meta" style={{ fontSize: '12px' }}>
                        Coach: <strong style={{ color: '#e2e8f0' }}>{lineup.coach_name}</strong>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="inline-fixture-details">
            {renderSquad(homeLineup, 'home')}

            <div className="timeline-column">
                <MatchDetailEvents fixtureId={fixtureId} />
            </div>

            {renderSquad(awayLineup, 'away')}
        </div>
    );
};

export default InlineFixtureDetails;
