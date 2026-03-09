import React from 'react';
import PropTypes from 'prop-types';

import { Stack, Grid } from './Grid';
import Badge from './Badge';
import './ProfileHeader.css';

const LEAGUE_COLOR_MAP = {
    '1': '#37003c', // Premier League
    '39': '#37003c', // Premier League api-id
    '140': '#ee1d23', // La Liga
    '61': '#dae025', // Ligue 1
    '78': '#d20222', // Bundesliga
    '135': '#008fd7', // Serie A
    '2': '#003399', // Champions League
    '3': '#003399', // Europa League
};

/**
 * Reusable ProfileHeader for leagues, clubs, and players.
 * Supports dynamic color themes and cover images.
 */
const ProfileHeader = ({
    title,
    subtitles = [],
    image,
    coverImage,
    accentColor,
    secondaryColor,
    tertiaryColor,
    leagueId,
    badges = [],
    actions,
    stats = [],
    genericData = []
}) => {
    const finalAccentColor = accentColor ||
        (leagueId && LEAGUE_COLOR_MAP[String(leagueId)]) ||
        'var(--color-primary-500)';

    return (
        <div
            className="ds-profile-header"
            style={{
                '--header-accent': finalAccentColor,
                '--header-accent-alpha': `${finalAccentColor}33`,
                '--header-secondary': secondaryColor || finalAccentColor,
                '--header-tertiary': tertiaryColor || secondaryColor || finalAccentColor
            }}
        >
            <div className="ds-profile-header-content">
                <Grid columns="auto 1fr auto" gap="var(--spacing-md)" align="center">
                    {/* Avatar/Logo Slot */}
                    {image && (
                        <div className="ds-profile-avatar-container">
                            <img src={image} alt={title} className="ds-profile-avatar" />
                        </div>
                    )}

                    {/* Info Slot - Compact Column */}
                    <div className="ds-profile-info">
                        <Stack gap="2px">
                            <div className="ds-profile-badges">
                                {badges.map((b, i) => (
                                    <Badge key={i} variant={b.variant || 'neutral'} size="xs">
                                        {b.icon && <span className="ds-badge-icon-wrap">{b.icon}</span>}
                                        {b.label}
                                    </Badge>
                                ))}
                            </div>
                            <h1 className="ds-profile-title">{title}</h1>

                            <div className="ds-profile-subtitles">
                                {subtitles.map((s, i) => (
                                    <span key={i} className="ds-profile-subtitle">
                                        {i > 0 && <span className="ds-profile-separator">•</span>}
                                        {s}
                                    </span>
                                ))}
                            </div>
                        </Stack>

                        {/* Integrated Stats for density */}
                        {stats.length > 0 && (
                            <div className="ds-profile-compact-stats">
                                {stats.map((st, i) => (
                                    <div key={i} className="ds-profile-stat-item">
                                        <span className="ds-profile-stat-label">{st.label}</span>
                                        <span className="ds-profile-stat-value">{st.value}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Venue/Right Slot */}
                    <Stack direction="row" gap="var(--spacing-md)" align="center">
                        {coverImage && (
                            <div className="ds-profile-venue-preview">
                                <img src={coverImage} alt="Venue" />
                            </div>
                        )}
                        {actions && <div className="ds-profile-actions">{actions}</div>}
                    </Stack>
                </Grid>
            </div>
        </div>
    );
};

ProfileHeader.propTypes = {
    title: PropTypes.string.isRequired,
    subtitles: PropTypes.arrayOf(PropTypes.string),
    image: PropTypes.string,
    coverImage: PropTypes.string,
    accentColor: PropTypes.string,
    secondaryColor: PropTypes.string,
    tertiaryColor: PropTypes.string,
    leagueId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    badges: PropTypes.arrayOf(PropTypes.shape({
        label: PropTypes.string.isRequired,
        variant: PropTypes.string,
        icon: PropTypes.node
    })),
    actions: PropTypes.node,
    stats: PropTypes.arrayOf(PropTypes.shape({
        label: PropTypes.string.isRequired,
        value: PropTypes.oneOfType([PropTypes.string, PropTypes.number])
    })),
    genericData: PropTypes.arrayOf(PropTypes.string)
};


export default ProfileHeader;
