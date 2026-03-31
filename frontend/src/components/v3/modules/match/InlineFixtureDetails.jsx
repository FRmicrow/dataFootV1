import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';

import api from '../../../../services/api';
import MatchDetailEvents from './MatchDetailEvents';
import InlineMatchDetailTactical from './InlineMatchDetailTactical';
import TacticalField from './TacticalField';
import InlinePlayerStatCard from '../shared/InlinePlayerStatCard';
import { Grid, Tabs, Badge } from '../../../../design-system';
import './InlineFixtureDetails.css';

const InlineFixtureDetails = ({ fixtureId, homeTeamId, awayTeamId }) => {
    const [lineups, setLineups] = useState([]);
    const [playerStats, setPlayerStats] = useState([]);
    const [selectedPlayer, setSelectedPlayer] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('events');

    useEffect(() => {
        fetchAllData();
    }, [fixtureId]);

    const fetchAllData = async () => {
        setLoading(true);
        try {
            const [lineupRes, pStatsRes] = await Promise.all([
                api.getFixtureLineups(fixtureId),
                api.getFixturePlayerStats(fixtureId)
            ]);

            setLineups(lineupRes.lineups || []);
            setPlayerStats(pStatsRes || []);

            if (pStatsRes && pStatsRes.length > 0) {
                const best = [...pStatsRes].sort((a, b) => Number.parseFloat(b.rating) - Number.parseFloat(a.rating))[0];
                setSelectedPlayer(best);
                // setActiveTab('player_intel'); // Only if needed
            }
        } catch (error) {
            console.error("Failed to load match details", error);
        } finally {
            setLoading(false);
        }
    };

    const getParsed = (data) => {
        if (!data) return [];
        return typeof data === 'string' ? JSON.parse(data) : data;
    };

    if (loading) return (
        <div style={{ padding: 'var(--spacing-xl)', textAlign: 'center', color: 'var(--color-text-dim)' }}>
            <div className="ds-button-spinner mb-sm" style={{ margin: '0 auto' }}></div>
            Mining tactical data...
        </div>
    );

    let homeLineup = lineups.find(l => Number(l.team_id) === Number(homeTeamId)) || lineups[0];
    let awayLineup = lineups.find(l => Number(l.team_id) === Number(awayTeamId)) || lineups[1];

    const renderSquad = (lineup, title) => {
        if (!lineup) return (
            <div className="ds-inline-squad-empty">
                Squad intelligence unavailable
            </div>
        );

        const starting = getParsed(lineup.starting_xi);
        const subs = getParsed(lineup.substitutes);

        const handlePlayerClick = (pApiId) => {
            const fullStat = playerStats.find(s => s.player_id === pApiId || s.player_api_id === pApiId);
            if (fullStat) {
                setSelectedPlayer(fullStat);
                setActiveTab('player_intel');
            }
        };

        const PlayerRow = ({ entry }) => {
            const p = entry.player || {};
            const isSelected = selectedPlayer?.player_id === p.id || selectedPlayer?.player_api_id === p.id;
            return (
                <button
                    className={`ds-inline-player-row ${isSelected ? 'active' : ''}`}
                    onClick={() => handlePlayerClick(p.id)}
                    type="button"
                >
                    <span className="ds-inline-player-num">{p.number}</span>
                    <span className="ds-inline-player-name">{p.name}</span>
                    <Badge variant="neutral" size="sm" style={{ pointerEvents: 'none' }}>{p.pos === 'F' ? 'A' : p.pos}</Badge>
                </button>
            );
        };

        PlayerRow.propTypes = {
            entry: PropTypes.object.isRequired
        };

        return (
            <div className="ds-inline-squad-col">
                <div className="ds-inline-squad-header">
                    <h4>Starting XI</h4>
                    {lineup.formation && <Badge variant="primary" size="xs">{lineup.formation}</Badge>}
                </div>
                
                <div className="ds-inline-coach">
                    <span>Technical Director</span>
                    <strong>{lineup.coach_name}</strong>
                </div>

                <div className="ds-inline-player-list">
                    {starting.map((entry) => <PlayerRow key={entry.player_id} entry={entry} />)}
                </div>

                <h4 className="ds-inline-squad-section-title">Reserves</h4>
                <div className="ds-inline-player-list">
                    {subs.map((entry) => <PlayerRow key={entry.player_id} entry={entry} />)}
                </div>
            </div>
        );
    };

    const tabItems = [
        { id: 'events', label: 'Timeline', icon: '⏱️' },
        { id: 'tactical', label: 'Tactical', icon: '🎯' },
        { id: 'player_intel', label: 'Intelligence', icon: '🧠' }
    ];

    return (
        <div className="ds-inline-fixture-details animate-slide-down">
            <Grid columns="1fr 1.5fr 1fr" gap="var(--spacing-md)" className="ds-inline-grid-wrapper">
                {/* Home Squad */}
                {renderSquad(homeLineup, 'Home')}

                {/* Center Content */}
                <div className="ds-inline-center-panel">
                    <Tabs
                        items={tabItems}
                        activeId={activeTab}
                        onChange={setActiveTab}
                        variant="pills"
                        className="mb-md"
                    />

                    <div className="ds-inline-tab-content">
                        {activeTab === 'events' && (
                            <div className="ds-inline-timeline-scroll">
                                <MatchDetailEvents fixtureId={fixtureId} />
                            </div>
                        )}
                        {activeTab === 'tactical' && (
                            <div className="ds-inline-tactical-wrapper">
                                <TacticalField lineups={lineups} />
                                <InlineMatchDetailTactical fixtureId={fixtureId} />
                            </div>
                        )}
                        {activeTab === 'player_intel' && (
                            <InlinePlayerStatCard player={selectedPlayer} />
                        )}
                    </div>
                </div>

                {/* Away Squad */}
                {renderSquad(awayLineup, 'Away')}
            </Grid>
        </div>
    );
};

InlineFixtureDetails.propTypes = {
    fixtureId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    homeTeamId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    awayTeamId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired
};

export default InlineFixtureDetails;

