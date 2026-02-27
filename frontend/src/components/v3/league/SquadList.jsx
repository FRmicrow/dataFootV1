import React, { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
    Stack, Grid, Badge, Card, Button,
    MetricCard
} from '../../../design-system';
import './SquadList.css';

const SquadList = ({
    teams,
    selectedTeamId,
    setSelectedTeamId,
    squadLoading,
    teamSquad
}) => {
    const [selectedPlayer, setSelectedPlayer] = useState(null);

    useEffect(() => {
        if (!selectedTeamId && teams.length > 0) {
            setSelectedTeamId(teams[0].team_id);
        }
    }, [teams, selectedTeamId, setSelectedTeamId]);

    const counts = useMemo(() => {
        const acc = { GK: 0, DF: 0, MF: 0, FW: 0, total: teamSquad.length };
        teamSquad.forEach(p => {
            const pos = p.position?.toLowerCase();
            if (pos?.includes('goalkeeper')) acc.GK++;
            else if (pos?.includes('defender')) acc.DF++;
            else if (pos?.includes('midfielder')) acc.MF++;
            else if (pos?.includes('attacker') || pos?.includes('forward')) acc.FW++;
        });
        return acc;
    }, [teamSquad]);

    const categorizedSquad = useMemo(() => {
        const groups = {
            'Goalkeepers': [],
            'Defenders': [],
            'Midfielders': [],
            'Attackers': []
        };

        teamSquad.forEach(p => {
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
    }, [teamSquad]);

    const activeTeam = teams.find(t => String(t.team_id) === String(selectedTeamId));

    return (
        <div className="ds-squad-explorer animate-slide-up">
            <aside className="ds-squad-sidebar">
                <div className="ds-squad-sidebar-header">
                    <h3>Tactical Roster</h3>
                    <p>Selection Matrix</p>
                </div>
                <div className="ds-squad-sidebar-list">
                    {teams.map(team => {
                        const isSelected = String(team.team_id) === String(selectedTeamId);
                        return (
                            <button
                                key={team.team_id}
                                onClick={() => setSelectedTeamId(team.team_id)}
                                className={`ds-squad-team-btn ${isSelected ? 'active' : ''}`}
                            >
                                <div className="ds-squad-team-logo-wrap">
                                    <img src={team.team_logo} alt="" />
                                </div>
                                <div className="ds-squad-team-info">
                                    <span className="name">{team.team_name}</span>
                                    <span className="rank">Rank #{team.rank}</span>
                                </div>
                                {isSelected && <div className="ds-active-indicator" />}
                            </button>
                        );
                    })}
                </div>
            </aside>

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
                                    <Stack direction="row" gap="var(--spacing-xs)" align="center" style={{ marginTop: '4px' }}>
                                        <Badge variant="primary">{counts.total} Players</Badge>
                                        <Badge variant="neutral">Tier {activeTeam?.rank}</Badge>
                                    </Stack>
                                </div>
                            </Stack>
                            <Button variant="secondary" onClick={() => window.location.href = `/club/${selectedTeamId}`}>
                                Full Intelligence Profile
                            </Button>
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
                                            <h4 className="ds-category-title">{category}</h4>
                                            <Grid columns="repeat(auto-fill, minmax(280px, 1fr))" gap="var(--spacing-md)">
                                                {players.map(player => (
                                                    <Card
                                                        key={player.player_id}
                                                        interactive
                                                        onClick={() => window.location.href = `/player/${player.player_id}`}
                                                        className="ds-player-card"
                                                    >
                                                        <Stack direction="row" gap="var(--spacing-md)" align="center">
                                                            <div className="ds-player-photo-wrap">
                                                                <img src={player.photo_url} alt="" />
                                                                <div className={`ds-player-pos-tag ${category.toLowerCase()}`}>
                                                                    {category[0]}
                                                                </div>
                                                            </div>
                                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                                <p className="ds-player-name">{player.name}</p>
                                                                <Stack direction="row" gap="var(--spacing-sm)" align="center" style={{ marginTop: '4px' }}>
                                                                    <span style={{ fontSize: '10px', color: 'var(--color-text-dim)' }}>
                                                                        Apps: {player.appearances}
                                                                    </span>
                                                                    {player.goals > 0 && <Badge variant="success" size="xs">⚽ {player.goals}</Badge>}
                                                                    {player.rating && <Badge variant="primary" size="xs">⭐ {player.rating}</Badge>}
                                                                </Stack>
                                                            </div>
                                                        </Stack>
                                                    </Card>
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

export default SquadList;
