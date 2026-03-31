import React from 'react';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import { Grid } from '../../../../design-system';
import '../../../v3/modules/league/LeagueLeaders.css';

const RANK_COLORS = {
    1: { bg: 'var(--color-accent-500)', color: '#000' },
    2: { bg: 'rgba(203,213,225,0.18)', color: 'var(--color-text-muted)' },
    3: { bg: 'rgba(148,163,184,0.12)', color: 'var(--color-text-dim)' }
};

const LeaderRow = ({ player, rank, value, secondaryLabel, secondaryValue }) => {
    const rankStyle = RANK_COLORS[rank] || { bg: 'transparent', color: 'var(--color-text-dim)' };
    return (
        <Link to={`/v4/player/${player.player_id}`} className="ll-row">
            <span className="ll-rank" style={{ background: rankStyle.bg, color: rankStyle.color }}>
                {rank}
            </span>
            <img
                src={player.photo_url}
                alt=""
                className="ll-photo"
                onError={(e) => { e.target.style.display = 'none'; }}
            />
            <div className="ll-info">
                <span className="ll-name">{player.player_name || player.name}</span>
                <span className="ll-club">{player.team_name}</span>
            </div>
            <div className="ll-stat">
                <span className="ll-value">{value}</span>
                {secondaryValue !== undefined && (
                    <span className="ll-secondary">
                        {typeof secondaryValue === 'number' ? secondaryValue.toFixed(2) : secondaryValue}
                        <span className="ll-secondary-label"> {secondaryLabel}</span>
                    </span>
                )}
            </div>
        </Link>
    );
};

const LeaderSection = ({ icon, title, data, dataKey, secondaryLabel, secondaryKey }) => (
    <div className="ll-section">
        <div className="ll-section-header">
            <span className="ll-section-icon">{icon}</span>
            <span className="ll-section-title">{title}</span>
        </div>
        <div className="ll-section-body">
            {(data || []).slice(0, 3).map((player, idx) => (
                <LeaderRow
                    key={player.player_id}
                    player={player}
                    rank={idx + 1}
                    value={player[dataKey]}
                    secondaryLabel={secondaryLabel}
                    secondaryValue={secondaryKey ? player[secondaryKey] : undefined}
                />
            ))}
        </div>
    </div>
);

const LeagueLeadersV4 = ({ topScorers, topAssists, topRated, layout = 'grid' }) => {
    if (layout === 'vertical') {
        return (
            <div className="ll-vertical">
                <LeaderSection icon="🎯" title="Golden Boot" data={topScorers} dataKey="goals_total" secondaryLabel="xG" secondaryKey="xg" />
                <LeaderSection icon="👟" title="Top Assists" data={topAssists} dataKey="goals_assists" secondaryLabel="xA" secondaryKey="xa" />
                <LeaderSection icon="⭐" title="MVP Track" data={topRated || []} dataKey="games_rating" />
            </div>
        );
    }

    return (
        <Grid columns="repeat(3, 1fr)" gap="var(--spacing-md)">
            <LeaderSection icon="🎯" title="Golden Boot" data={topScorers} dataKey="goals_total" secondaryLabel="xG" secondaryKey="xg" />
            <LeaderSection icon="👟" title="Top Assists" data={topAssists} dataKey="goals_assists" secondaryLabel="xA" secondaryKey="xa" />
            <LeaderSection icon="⭐" title="MVP Track" data={topRated || []} dataKey="games_rating" />
        </Grid>
    );
};

LeagueLeadersV4.propTypes = {
    topScorers: PropTypes.array.isRequired,
    topAssists: PropTypes.array.isRequired,
    topRated: PropTypes.array,
    layout: PropTypes.oneOf(['grid', 'vertical'])
};

export default LeagueLeadersV4;
