import React, { useState, useMemo, useEffect } from 'react';
import PropTypes from 'prop-types';
import {
    Stack, Grid, Badge, Button,
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

    useEffect(() => {
        if (!selectedTeamId && teams.length > 0) {
            setSelectedTeamId(teams[0].team_id);
        }
    }, [teams, selectedTeamId, setSelectedTeamId]);

    const filteredTeams = useMemo(() => {
        if (!teamSearch) return teams;
        return teams.filter(t => t.team_name.toLowerCase().includes(teamSearch.toLowerCase()));
    }, [teams, teamSearch]);

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
                                    <h2 className="ds-squad-title">{activeTeam?.team_name}</h2>
                                    <Stack direction="row" gap="var(--spacing-xs)" align="center" style={{ marginTop: 'var(--spacing-2xs)' }}>
                                        <Badge variant="primary">{counts.total} Players</Badge>
                                        <Badge variant="neutral">Tier {activeTeam?.rank}</Badge>
                                    </Stack>
                                </div>
                            </Stack>
                            <Stack direction="row" gap="var(--spacing-md)" align="center">
                                <div className="ds-squad-search-wrap">
                                    <input
                                        type="text"
                                        className="ds-squad-input"
                                        placeholder="Find operative..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                </div>
                                <Button variant="secondary" onClick={() => window.location.href = `/club/${selectedTeamId}`}>
                                    Intelligence Profile
                                </Button>
                            </Stack>
                        </div>

                        <div className="ds-squad-content scrollbar-custom">
                            <Grid columns="repeat(4, 1fr)" gap="var(--spacing-md)" className="mb-xl">
                                <MetricCard label="Goalkeepers" value={counts.GK} icon="🧤" />
                                <MetricCard label="Defenders" value={counts.DF} icon="🛡️" />
                                <MetricCard label="Midfielders" value={counts.MF} icon="⚙️" />
                                <MetricCard label="Attackers" value={counts.FW} icon="⚔️" />
                            </Grid>

                            {squadLoading ? (
                                <div className="ds-squad-loader">
                                    <div className="ds-button-spinner"></div>
                                    <p>Compiling Tactical Intelligence...</p>
                                </div>
                            ) : (
                                Object.entries(categorizedSquad).map(([category, players]) => (
                                    players.length > 0 && (
                                        <section key={category} className="ds-squad-category">
                                            <h4 className="ds-category-title" data-category={category.toLowerCase()}>
                                                {category}
                                            </h4>
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
