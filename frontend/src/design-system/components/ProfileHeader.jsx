import React from 'react';
import { Stack, Badge, Grid } from '../index';
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
    leagueId,
    badges = [],
    actions,
    stats = [],
    genericData = [] // New prop for generic league information
}) => {
    const finalAccentColor = accentColor || (leagueId ? LEAGUE_COLOR_MAP[String(leagueId)] : null);

    const headerStyle = {
        background: `linear-gradient(135deg, ${finalAccentColor ? finalAccentColor + '33' : 'var(--color-primary-900)'} 0%, var(--color-bg-main) 100%)`,
        borderBottom: `2px solid ${finalAccentColor || 'var(--color-primary-500)'}`
    };

    return (
        <div className="ds-profile-header" style={headerStyle}>
            <div className="ds-profile-header-content">
                <Grid columns="auto 1fr auto" gap="var(--spacing-lg)" align="center">
                    {/* Avatar/Logo Slot */}
                    {image && (
                        <div className="ds-profile-avatar-container">
                            <img src={image} alt={title} className="ds-profile-avatar" />
                        </div>
                    )}

                    {/* Info Slot */}
                    <div className="ds-profile-info">
                        <Stack gap="var(--spacing-2xs)">
                            <div className="ds-profile-badges">
                                {badges.map((b, i) => (
                                    <Badge key={i} variant={b.variant || 'neutral'} size="xs">
                                        {b.icon && <span style={{ marginRight: '4px' }}>{b.icon}</span>}
                                        {b.label}
                                    </Badge>
                                ))}
                            </div>
                            <h1 className="ds-profile-title">{title}</h1>

                            <Stack direction="row" gap="var(--spacing-md)" align="center" wrap>
                                <div className="ds-profile-subtitles">
                                    {subtitles.map((s, i) => (
                                        <span key={i} className="ds-profile-subtitle">
                                            {i > 0 && <span className="ds-profile-separator">•</span>}
                                            {s}
                                        </span>
                                    ))}
                                </div>
                                {genericData.length > 0 && (
                                    <div className="ds-profile-generic-data">
                                        {genericData.map((d, i) => (
                                            <span key={i} className="ds-profile-generic-item">
                                                <Badge variant="neutral" size="xs">{d}</Badge>
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </Stack>
                        </Stack>
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

                {/* Stats Grid */}
                {stats.length > 0 && (
                    <div className="ds-profile-stats-bar">
                        <Grid columns={`repeat(${stats.length}, 1fr)`} gap="var(--spacing-md)">
                            {stats.map((st, i) => (
                                <div key={i} className="ds-profile-stat-item">
                                    <span className="ds-profile-stat-label">{st.label}</span>
                                    <span className="ds-profile-stat-value">{st.value}</span>
                                </div>
                            ))}
                        </Grid>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ProfileHeader;
