import React, { useState, useMemo, useEffect } from 'react';
import PropTypes from 'prop-types';
import api from '../../../../services/api';
import {
    Stack, Grid, Badge,
    PlayerCard, TeamSelector
} from '../../../../design-system';
import '../../../v3/modules/league/SquadList.css';

const DEFAULT_PHOTO = 'https://tmssl.akamaized.net//images/foto/normal/default.jpg?lm=1';

const SquadListV4 = ({ league, season, teams }) => {
    const [selectedTeamId, setSelectedTeamId] = useState(null);
    const [squadLoading, setSquadLoading] = useState(false);
    const [teamSquad, setTeamSquad] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [teamSearch, setTeamSearch] = useState('');
    const [positionFilter, setPositionFilter] = useState(null);

    // Auto-select first team
    useEffect(() => {
        if (!selectedTeamId && teams.length > 0) {
            setSelectedTeamId(teams[0].team_id);
        }
    }, [teams, selectedTeamId]);

    // Fetch squad when team changes
    useEffect(() => {
        const fetchSquad = async () => {
            if (!selectedTeamId || !league || !season) return;
            setSquadLoading(true);
            try {
                const data = await api.getTeamSquadV4(league, season, selectedTeamId);
                setTeamSquad(data || []);
            } catch (err) {
                setTeamSquad([]);
            } finally {
                setSquadLoading(false);
            }
        };
        fetchSquad();
    }, [selectedTeamId, league, season]);

    // Filter players by search
    const filteredSquad = useMemo(() => {
        if (!searchTerm) return teamSquad;
        return teamSquad.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [teamSquad, searchTerm]);

    // Count by position
    const counts = useMemo(() => {
        const acc = { GK: 0, DF: 0, MF: 0, FW: 0, total: filteredSquad.length };
        filteredSquad.forEach(p => {
            const pos = p.position?.toLowerCase();
            if (pos?.includes('goalkeeper')) acc.GK++;
            else if (pos?.includes('defender')) acc.DF++;
            else if (pos?.includes('midfielder')) acc.MF++;
            else if (pos?.includes('attacker') || pos?.includes('forward')) acc.FW++;
        });
        return acc;
    }, [filteredSquad]);

    // Categorize
    const categorizedSquad = useMemo(() => {
        const groups = { 'Goalkeepers': [], 'Defenders': [], 'Midfielders': [], 'Attackers': [] };
        filteredSquad.forEach(p => {
            const pos = p.position?.toLowerCase();
            if (pos?.includes('goalkeeper')) groups['Goalkeepers'].push(p);
            else if (pos?.includes('defender')) groups['Defenders'].push(p);
            else if (pos?.includes('midfielder')) groups['Midfielders'].push(p);
            else if (pos?.includes('attacker') || pos?.includes('forward')) groups['Attackers'].push(p);
            // Ignore "Unknown" — they're subs with no position data
        });
        Object.keys(groups).forEach(key => {
            groups[key].sort((a, b) => (b.appearances || 0) - (a.appearances || 0));
        });
        return groups;
    }, [filteredSquad]);

    const activeTeam = teams.find(t => String(t.team_id) === String(selectedTeamId));

    // Filter teams by search in TeamSelector
    const filteredTeams = useMemo(() => {
        if (!teamSearch) return teams;
        return teams.filter(t => t.team_name.toLowerCase().includes(teamSearch.toLowerCase()));
    }, [teams, teamSearch]);

    return (
        <div className="ds-squad-explorer animate-slide-up">
            <TeamSelector
                teams={filteredTeams}
                selectedTeamId={selectedTeamId}
                onSelect={setSelectedTeamId}
                searchTerm={teamSearch}
                onSearchChange={setTeamSearch}
            />

            <main className="ds-squad-main">
                {!selectedTeamId ? (
                    <div className="ds-squad-empty-state">
                        <span>🔍</span>
                        <h3>No Squad Selected</h3>
                        <p>Choose a team from the left panel.</p>
                    </div>
                ) : (
                    <>
                        <div className="ds-squad-header">
                            <Stack direction="row" gap="var(--spacing-lg)" align="center" style={{ flex: 1 }}>
                                <div className="ds-squad-header-logo">
                                    <img src={activeTeam?.team_logo} alt="" />
                                </div>
                                <div>
                                    <h2 className="ds-squad-title">{activeTeam?.team_name}</h2>
                                    <Stack direction="row" gap="var(--spacing-xs)" align="center" style={{ marginTop: 'var(--spacing-2xs)' }}>
                                        <Badge variant="primary">{counts.total} Players</Badge>
                                    </Stack>
                                </div>
                            </Stack>
                            <div className="ds-squad-search-wrap">
                                <input
                                    type="text"
                                    className="ds-squad-input"
                                    placeholder="Search player..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="ds-squad-content scrollbar-custom">
                            <div className="ds-squad-position-filters">
                                <button
                                    className={`ds-pos-filter ${positionFilter === 'Goalkeepers' ? 'active' : ''}`}
                                    data-category="goalkeepers"
                                    onClick={() => setPositionFilter(p => p === 'Goalkeepers' ? null : 'Goalkeepers')}
                                >🧤 GK <span>{counts.GK}</span></button>
                                <button
                                    className={`ds-pos-filter ${positionFilter === 'Defenders' ? 'active' : ''}`}
                                    data-category="defenders"
                                    onClick={() => setPositionFilter(p => p === 'Defenders' ? null : 'Defenders')}
                                >🛡️ DF <span>{counts.DF}</span></button>
                                <button
                                    className={`ds-pos-filter ${positionFilter === 'Midfielders' ? 'active' : ''}`}
                                    data-category="midfielders"
                                    onClick={() => setPositionFilter(p => p === 'Midfielders' ? null : 'Midfielders')}
                                >⚙️ MF <span>{counts.MF}</span></button>
                                <button
                                    className={`ds-pos-filter ${positionFilter === 'Attackers' ? 'active' : ''}`}
                                    data-category="attackers"
                                    onClick={() => setPositionFilter(p => p === 'Attackers' ? null : 'Attackers')}
                                >⚔️ FW <span>{counts.FW}</span></button>
                            </div>

                            {squadLoading ? (
                                <div className="ds-squad-loader">
                                    <div className="ds-button-spinner"></div>
                                    <p>Loading squad data...</p>
                                </div>
                            ) : (
                                Object.entries(categorizedSquad).map(([category, players]) => (
                                    players.length > 0 && (!positionFilter || positionFilter === category) && (
                                        <section key={category} className="ds-squad-category">
                                            <Grid columns="repeat(auto-fill, minmax(300px, 1fr))" gap="var(--spacing-md)">
                                                {players.map(player => (
                                                    <PlayerCard
                                                        key={player.player_id}
                                                        photo={player.photo_url || DEFAULT_PHOTO}
                                                        name={player.name}
                                                        position={player.position}
                                                        number={player.number}
                                                        appearances={player.appearances}
                                                        goals={player.goals}
                                                    />
                                                ))}
                                            </Grid>
                                        </section>
                                    )
                                ))
                            )}
                        </div>
                    </>
                )}
            </main>
        </div>
    );
};

SquadListV4.propTypes = {
    league: PropTypes.string.isRequired,
    season: PropTypes.string.isRequired,
    teams: PropTypes.array.isRequired,
};

export default SquadListV4;
