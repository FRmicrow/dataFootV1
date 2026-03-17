import React from 'react';
import PropTypes from 'prop-types';

import { Stack, Grid } from './Grid';
import Badge from './Badge';
import './ProfileHeader.css';

const LEAGUE_COLOR_MAP = {
    '1':   '#37003c', // Premier League — purple
    '39':  '#37003c',
    '140': '#ee1d23', // La Liga — red
    '61':  '#091c3e', // Ligue 1 — navy
    '78':  '#d20222', // Bundesliga — red
    '135': '#1d3657', // Serie A — blue
    '2':   '#001d6c', // Champions League — dark blue
    '3':   '#f47b20', // Europa League — orange
    '4':   '#1a1a2e', // Europa Conference League
};

const LEAGUE_SECONDARY_MAP = {
    '1':   '#00b8e5', // Premier League — cyan
    '39':  '#00b8e5',
    '140': '#ffd700', // La Liga — gold
    '61':  '#d4af37', // Ligue 1 — gold
    '78':  '#f0c040', // Bundesliga — yellow
    '135': '#009246', // Serie A — green (Italian flag)
    '2':   '#c8a951', // Champions League — gold
    '3':   '#c8102e', // Europa League — red
    '4':   '#00a676', // Europa Conference — teal
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
    const leagueKey = leagueId ? String(leagueId) : null;
    const finalAccentColor = accentColor ||
        (leagueKey && LEAGUE_COLOR_MAP[leagueKey]) ||
        'var(--color-primary-600)';
    const finalSecondaryColor = secondaryColor ||
        (leagueKey && LEAGUE_SECONDARY_MAP[leagueKey]) ||
        finalAccentColor;

    return (
        <div
            className="ds-profile-header"
            style={{
                '--header-accent': finalAccentColor,
                '--header-secondary': finalSecondaryColor,
            }}
        >
            <div className="ds-profile-header-content">
                <div className="ds-profile-layout">
                    {/* Avatar/Logo — square, height = text block height */}
                    {image && (
                        <div className="ds-profile-avatar-container">
                            <img src={image} alt={title} className="ds-profile-avatar" />
                        </div>
                    )}

                    {/* Info Slot */}
                    <div className="ds-profile-info">
                        <Stack gap="6px">
                            <div className="ds-profile-badges">
                                {badges.map((b, i) => (
                                    <Badge key={`${b.label}-${i}`} variant={b.variant || 'neutral'} size="xs">
                                        {b.icon && <span className="ds-badge-icon-wrap">{b.icon}</span>}
                                        {b.label}
                                    </Badge>
                                ))}
                            </div>
                            <h1 className="ds-profile-title">{title}</h1>

                            <div className="ds-profile-subtitles">
                                {subtitles.map((s, i) => (
                                    <span key={`${s}-${i}`} className="ds-profile-subtitle">
                                        {i > 0 && <span className="ds-profile-separator">•</span>}
                                        {s}
                                    </span>
                                ))}
                            </div>
                        </Stack>

                        {stats.length > 0 && (
                            <div className="ds-profile-compact-stats">
                                {stats.map((st) => (
                                    <div key={st.label} className="ds-profile-stat-item">
                                        <span className="ds-profile-stat-label">{st.label}</span>
                                        <span className="ds-profile-stat-value">{st.value}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Right Slot */}
                    <div className="ds-profile-right">
                        {coverImage && (
                            <div className="ds-profile-venue-preview">
                                <img src={coverImage} alt="Venue" />
                            </div>
                        )}
                        {actions && <div className="ds-profile-actions">{actions}</div>}
                    </div>
                </div>
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
