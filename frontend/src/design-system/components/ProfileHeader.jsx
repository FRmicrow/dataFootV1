import React from 'react';
import { Stack, Badge, Grid } from '../index';
import './ProfileHeader.css';

const ProfileHeader = ({
    title,
    subtitles = [],
    image,
    coverImage,
    accentColor,
    badges = [],
    actions,
    stats = []
}) => {
    const headerStyle = coverImage
        ? {
            backgroundImage: `linear-gradient(to bottom, rgba(15, 23, 42, 0.4), var(--color-bg-main)), url(${coverImage})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center'
        }
        : {
            background: `linear-gradient(135deg, ${accentColor ? accentColor + '33' : 'var(--color-primary-900)'} 0%, var(--color-bg-main) 100%)`,
            borderBottom: `2px solid ${accentColor || 'var(--color-primary-500)'}`
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
                                    <Badge key={i} variant={b.variant || 'neutral'} size="sm">
                                        {b.icon && <span className="mr-xs">{b.icon}</span>}
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
                    </div>

                    {/* Actions Slot */}
                    {actions && <div className="ds-profile-actions">{actions}</div>}
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
