import React from 'react';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import { Card, Stack, Grid } from '../../../../design-system';

const LeagueLeaders = ({ topScorers, topAssists, topRated, layout = 'grid' }) => {

    const LeaderCard = ({ player, rank, label, value }) => (
        <Link
            to={`/player/${player.player_id}`}
            style={{ textDecoration: 'none', color: 'inherit' }}
        >
            <div
                style={{
                    padding: 'var(--spacing-xs)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--spacing-xs)',
                    background: 'var(--glass-bg)',
                    border: '1px solid var(--glass-border)',
                    borderRadius: 'var(--radius-sm)',
                    transition: 'var(--transition-fast)',
                    cursor: 'pointer'
                }}
                className="ds-card-hover-effect"
            >
                <div style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '10px',
                    fontWeight: 'var(--font-weight-bold)',
                    background: rank === 1 ? 'var(--color-accent-500)' : rank === 2 ? '#cbd5e1' : rank === 3 ? '#94a3b8' : 'var(--color-border)',
                    color: rank === 1 ? 'black' : 'inherit'
                }}>
                    {rank}
                </div>

                <img
                    src={player.photo_url}
                    alt=""
                    style={{ width: '32px', height: '32px', borderRadius: 'var(--radius-sm)', objectFit: 'cover' }}
                />

                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 'var(--font-size-xs)', fontWeight: 'var(--font-weight-bold)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--color-text-main)' }}>
                        {player.player_name || player.name}
                    </div>
                    <div style={{ fontSize: '10px', color: 'var(--color-text-dim)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {player.team_name}
                    </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-primary-400)' }}>{value}</div>
                    <div style={{ fontSize: '10px', color: 'var(--color-text-dim)', textTransform: 'uppercase' }}>{label}</div>
                </div>
            </div>
        </Link>
    );

    LeaderCard.propTypes = {
        player: PropTypes.object.isRequired,
        rank: PropTypes.number.isRequired,
        label: PropTypes.string.isRequired,
        value: PropTypes.oneOfType([PropTypes.string, PropTypes.number])
    };

    const Section = ({ title, subtitle, data, playerLabel, dataKey }) => (
        <Card title={title} subtitle={subtitle} ghost={layout === 'vertical'}>
            <Stack gap="var(--spacing-2xs)">
                {data.slice(0, 3).map((player, idx) => (
                    <LeaderCard
                        key={player.player_id}
                        player={player}
                        rank={idx + 1}
                        label={playerLabel}
                        value={player[dataKey]}
                    />
                ))}
            </Stack>
        </Card>
    );

    Section.propTypes = {
        title: PropTypes.string.isRequired,
        subtitle: PropTypes.string,
        data: PropTypes.array.isRequired,
        playerLabel: PropTypes.string.isRequired,
        dataKey: PropTypes.string.isRequired
    };

    if (layout === 'vertical') {
        return (
            <Stack gap="var(--spacing-lg)">
                <Section title="Golden Boot" subtitle="Goal leaders" data={topScorers} playerLabel="Goals" dataKey="goals_total" />
                <Section title="Playmakers" subtitle="Assist leaders" data={topAssists} playerLabel="Assists" dataKey="goals_assists" />
                <Section title="MVP Track" subtitle="Avg Ratings" data={topRated || []} playerLabel="Rating" dataKey="games_rating" />
            </Stack>
        );
    }

    return (
        <Grid columns="repeat(auto-fit, minmax(280px, 1fr))" gap="var(--spacing-lg)">
            <Section title="Golden Boot" data={topScorers} playerLabel="Goals" dataKey="goals_total" />
            <Section title="Top Playmakers" data={topAssists} playerLabel="Assists" dataKey="goals_assists" />
            <Section title="MVP Candidates" data={topRated || []} playerLabel="Rating" dataKey="games_rating" />
        </Grid>
    );
};

LeagueLeaders.propTypes = {
    topScorers: PropTypes.arrayOf(PropTypes.shape({
        player_id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
        player_name: PropTypes.string,
        name: PropTypes.string,
        team_name: PropTypes.string,
        photo_url: PropTypes.string,
        goals_total: PropTypes.number
    })).isRequired,
    topAssists: PropTypes.arrayOf(PropTypes.shape({
        player_id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
        player_name: PropTypes.string,
        name: PropTypes.string,
        team_name: PropTypes.string,
        photo_url: PropTypes.string,
        goals_assists: PropTypes.number
    })).isRequired,
    topRated: PropTypes.arrayOf(PropTypes.shape({
        player_id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
        player_name: PropTypes.string,
        name: PropTypes.string,
        team_name: PropTypes.string,
        photo_url: PropTypes.string,
        games_rating: PropTypes.oneOfType([PropTypes.string, PropTypes.number])
    })),
    layout: PropTypes.oneOf(['grid', 'vertical'])
};


export default LeagueLeaders;
