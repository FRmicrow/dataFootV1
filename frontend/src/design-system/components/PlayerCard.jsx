import React from 'react';
import PropTypes from 'prop-types';
import { Card, Stack, Badge } from '../index';
import './PlayerCard.css';

const DEFAULT_FALLBACK = 'https://tmssl.akamaized.net//images/foto/normal/default.jpg?lm=1';

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
                    <img
                        src={photo || DEFAULT_FALLBACK}
                        alt={name}
                        className="ds-player-photo"
                        loading="lazy"
                        onError={(e) => { e.currentTarget.src = DEFAULT_FALLBACK; e.currentTarget.onerror = null; }}
                    />
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

PlayerCard.propTypes = {
    photo: PropTypes.string,
    name: PropTypes.string.isRequired,
    position: PropTypes.string,
    number: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    appearances: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    goals: PropTypes.number,
    rating: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    onClick: PropTypes.func,
    variant: PropTypes.oneOf(['default', 'featured'])
};

export default PlayerCard;
