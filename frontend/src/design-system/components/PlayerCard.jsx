import React from 'react';
import { Card, Stack, Badge } from '../index';
import './PlayerCard.css';

/**
 * Reusable PlayerCard for squad lists and rosters.
 */
const PlayerCard = ({
    photo,
    name,
    position,
    number,
    appearances,
    goals,
    rating,
    onClick,
    variant = 'default'
}) => {
    const getPosColor = (pos = '') => {
        const lower = pos.toLowerCase();
        if (lower.includes('goalkeeper')) return 'var(--color-accent-600)';
        if (lower.includes('defender')) return 'var(--color-primary-600)';
        if (lower.includes('midfielder')) return 'var(--color-success-600)';
        if (lower.includes('attacker') || lower.includes('forward')) return 'var(--color-danger-600)';
        return 'var(--color-text-dim)';
    };

    return (
        <Card
            interactive
            onClick={onClick}
            className={`ds-player-card ds-player-card--${variant}`}
        >
            <Stack direction="row" gap="var(--spacing-md)" align="center">
                <div className="ds-player-media">
                    <img src={photo} alt={name} className="ds-player-photo" loading="lazy" />
                    <div
                        className="ds-player-pos-badge"
                        style={{ backgroundColor: getPosColor(position) }}
                        title={position}
                    >
                        {position?.charAt(0).toUpperCase()}
                    </div>
                </div>
                <div className="ds-player-info">
                    <div className="ds-player-main-info">
                        <span className="ds-player-number">#{number || '--'}</span>
                        <h4 className="ds-player-name">{name}</h4>
                    </div>
                    <Stack direction="row" gap="var(--spacing-xs)" align="center" style={{ marginTop: 'var(--spacing-3xs)' }}>
                        <div className="ds-player-stat-pill">
                            <span className="label">Apps</span>
                            <span className="value">{appearances || 0}</span>
                        </div>
                        {goals > 0 && (
                            <Badge variant="success" size="xs">⚽ {goals}</Badge>
                        )}
                        {rating && (
                            <Badge variant="primary" size="xs">⭐ {rating}</Badge>
                        )}
                    </Stack>
                </div>
            </Stack>
        </Card>
    );
};

export default PlayerCard;
