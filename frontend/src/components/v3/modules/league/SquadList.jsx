import React, { useState, useMemo, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import {
    Stack, Grid, Badge,
    MetricCard, PlayerCard, TeamSelector
} from '../../../../design-system';
import './SquadList.css';

const SquadList = ({
    teams,
    selectedTeamId,
    setSelectedTeamId,
    squadLoading,
    teamSquad
}) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [teamSearch, setTeamSearch] = useState('');
    const [positionFilter, setPositionFilter] = useState(null);

    useEffect(() => {
        if (!selectedTeamId && teams.length > 0) {
            setSelectedTeamId(teams[0].team_id);
        }
    }, [teams, selectedTeamId, setSelectedTeamId]);


    const filteredSquad = useMemo(() => {
        if (!searchTerm) return teamSquad;
        return teamSquad.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [teamSquad, searchTerm]);

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

    const categorizedSquad = useMemo(() => {
        const groups = {
            'Goalkeepers': [],
            'Defenders': [],
            'Midfielders': [],
            'Attackers': []
        };

        filteredSquad.forEach(p => {
            const pos = p.position?.toLowerCase();
            if (pos?.includes('goalkeeper')) groups['Goalkeepers'].push(p);
            else if (pos?.includes('defender')) groups['Defenders'].push(p);
            else if (pos?.includes('midfielder')) groups['Midfielders'].push(p);
            else if (pos?.includes('attacker') || pos?.includes('forward')) groups['Attackers'].push(p);
        });

        Object.keys(groups).forEach(key => {
            groups[key].sort((a, b) => (b.appearances || 0) - (a.appearances || 0));
        });

        return groups;
    }, [filteredSquad]);

    const activeTeam = teams.find(t => String(t.team_id) === String(selectedTeamId));

    return (
        <div className="ds-squad-explorer animate-slide-up">
            <TeamSelector
                teams={teams}
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
                        <p>Choose a competition member from the left panel.</p>
                    </div>
                ) : (
                    <>
                        <div className="ds-squad-header">
                            <Stack direction="row" gap="var(--spacing-lg)" align="center" style={{ flex: 1 }}>
                                <div className="ds-squad-header-logo">
                                    <img src={activeTeam?.team_logo} alt="" />
                                </div>
                                <div>
                                    <Link to={`/club/${selectedTeamId}`} className="ds-squad-title-link">
                                        <h2 className="ds-squad-title">{activeTeam?.team_name}</h2>
                                    </Link>
                                    <Stack direction="row" gap="var(--spacing-xs)" align="center" style={{ marginTop: 'var(--spacing-2xs)' }}>
                                        <Badge variant="primary">{counts.total} Players</Badge>
                                    </Stack>
                                </div>
                            </Stack>
                            <div className="ds-squad-search-wrap">
                                <input
                                    type="text"
                                    className="ds-squad-input"
                                    placeholder="Rechercher un joueur..."
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
                                    <p>Compiling Tactical Intelligence...</p>
                                </div>
                            ) : (
                                Object.entries(categorizedSquad).map(([category, players]) => (
                                    players.length > 0 && (!positionFilter || positionFilter === category) && (
                                        <section key={category} className="ds-squad-category">
                                            <Grid columns="repeat(auto-fill, minmax(300px, 1fr))" gap="var(--spacing-md)">
                                                {players.map(player => (
                                                    <PlayerCard
                                                        key={player.player_id}
                                                        photo={player.photo_url}
                                                        name={player.name}
                                                        position={player.position}
                                                        number={player.number}
                                                        appearances={player.appearances}
                                                        goals={player.goals}
                                                        rating={player.rating}
                                                        onClick={() => window.location.href = `/player/${player.player_id}`}
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

SquadList.propTypes = {
    teams: PropTypes.array.isRequired,
    selectedTeamId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    setSelectedTeamId: PropTypes.func.isRequired,
    squadLoading: PropTypes.bool,
    teamSquad: PropTypes.array.isRequired
};

export default SquadList;
