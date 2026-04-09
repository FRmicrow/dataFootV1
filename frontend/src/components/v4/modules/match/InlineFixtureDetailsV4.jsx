import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';

import api from '../../../../services/api';
import MatchDetailEventsV4 from './MatchDetailEventsV4';
import InlineMatchDetailTacticalV4 from './InlineMatchDetailTacticalV4';
import { Grid, Tabs, Badge } from '../../../../design-system';
import './InlineFixtureDetailsV4.css';

const InlineFixtureDetailsV4 = ({ fixtureId, homeTeamId, awayTeamId }) => {
    const [lineups, setLineups] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('events');

    useEffect(() => {
        setActiveTab('events');
        setLoading(true);
        api.getFixtureLineupsV4(fixtureId)
            .then(res => setLineups(res.lineups || []))
            .catch(() => setLineups([]))
            .finally(() => setLoading(false));
    }, [fixtureId]);

    if (loading) return (
        <div style={{ padding: 'var(--spacing-xl)', textAlign: 'center', color: 'var(--color-text-dim)' }}>
            <div className="ds-button-spinner mb-sm" style={{ margin: '0 auto' }}></div>
            Mining historical V4 data...
        </div>
    );

    let homeLineup = lineups.find(l => String(l.team_id) === String(homeTeamId)) || lineups[0];
    let awayLineup = lineups.find(l => String(l.team_id) === String(awayTeamId)) || lineups[1];

    const renderSquad = (lineup, title) => {
        if (!lineup || !lineup.starting_xi || lineup.starting_xi.length === 0) return (
            <div className="ds-inline-squad-empty">
                Squad intelligence unavailable
            </div>
        );

        const starting = lineup.starting_xi || [];
        const subs = lineup.substitutes || [];

        const PlayerRow = ({ entry }) => {
            const p = entry.player || {};
            return (
                <div className="ds-inline-player-row">
                    <span className="ds-inline-player-num">{p.number}</span>
                    <span className="ds-inline-player-name">{p.name}</span>
                    <Badge variant="neutral" size="sm" style={{ pointerEvents: 'none' }}>{p.pos || '?'}</Badge>
                </div>
            );
        };

        PlayerRow.propTypes = {
            entry: PropTypes.object.isRequired
        };

        return (
            <div className="ds-inline-squad-col">
                <div className="ds-inline-squad-header">
                    <h4>{title} XI</h4>
                    {lineup.formation && lineup.formation !== 'N/A' && <Badge variant="primary" size="xs">{lineup.formation}</Badge>}
                </div>
                <div className="ds-inline-player-list">
                    {starting.map((entry) => <PlayerRow key={entry.player?.id || entry.player_id} entry={entry} />)}
                </div>

                <h4 className="ds-inline-squad-section-title">Reserves</h4>
                <div className="ds-inline-player-list">
                    {subs.map((entry) => <PlayerRow key={entry.player?.id || entry.player_id} entry={entry} />)}
                </div>

                {lineup.coach_name && lineup.coach_name !== 'N/A' && (
                    <div className="ds-inline-coach">
                        <span>Technical Director</span>
                        <strong>{lineup.coach_name}</strong>
                    </div>
                )}
            </div>
        );
    };

    const tabItems = [
        { id: 'events',   label: 'Timeline', icon: '⏱️' },
        { id: 'tactical', label: 'Tactical',  icon: '🎯' },
    ];

    return (
        <div className="ds-inline-fixture-details animate-slide-down">
            <Grid columns="1fr 1.5fr 1fr" gap="var(--spacing-md)" className="ds-inline-grid-wrapper">
                {renderSquad(homeLineup, 'Starting')}

                <div className="ds-inline-center-panel">
                    <div className="ds-inline-tabbar">
                        <Tabs
                            items={tabItems}
                            activeId={activeTab}
                            onChange={setActiveTab}
                            variant="pills"
                        />
                    </div>

                    <div className="ds-inline-tab-content">
                        {activeTab === 'events' && (
                            <div className="ds-inline-timeline-scroll">
                                <MatchDetailEventsV4 fixtureId={fixtureId} />
                            </div>
                        )}
                        {activeTab === 'tactical' && (
                            <InlineMatchDetailTacticalV4 fixtureId={fixtureId} />
                        )}
                    </div>
                </div>

                {renderSquad(awayLineup, 'Starting')}
            </Grid>
        </div>
    );
};

InlineFixtureDetailsV4.propTypes = {
    fixtureId:  PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    homeTeamId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    awayTeamId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
};

export default InlineFixtureDetailsV4;
