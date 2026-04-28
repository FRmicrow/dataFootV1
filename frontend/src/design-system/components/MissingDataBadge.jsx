import React from 'react';
import PropTypes from 'prop-types';
import Badge from './Badge';
import './MissingDataBadge.css';

/**
 * Visible signal that a piece of data is missing in the database.
 *
 * Used by infographic templates (V48 phase 2+) to render a badge in place
 * of a real value. NEVER use this with a fake/inferred fallback value —
 * the whole point is to make the absence visible to the reader.
 *
 * Variants:
 *   - severity="critical" → red (Badge danger), icon ⚠
 *       "Donnée requise : <label>"  — blocks PNG export by default
 *   - severity="optional" → grey (Badge neutral), icon ℹ
 *       "Optionnel : <label>"       — export still allowed
 *
 * @example
 *   <MissingDataBadge label="xG saison 2025-26" severity="critical" />
 *   <MissingDataBadge label="Photo de profil"   severity="optional" />
 */
const SEVERITY_CONFIG = {
    critical: { variant: 'danger',  icon: '⚠', prefix: 'Donnée requise' },
    optional: { variant: 'neutral', icon: 'ℹ', prefix: 'Optionnel' },
};

const MissingDataBadge = ({ label, severity = 'optional', size = 'sm', className = '' }) => {
    const cfg = SEVERITY_CONFIG[severity] ?? SEVERITY_CONFIG.optional;
    return (
        <Badge
            variant={cfg.variant}
            size={size}
            className={`ds-missing-badge ds-missing-badge--${severity} ${className}`}
        >
            <span className="ds-missing-badge-icon" aria-hidden="true">{cfg.icon}</span>
            <span className="ds-missing-badge-prefix">{cfg.prefix}</span>
            <span className="ds-missing-badge-sep" aria-hidden="true">:</span>
            <span className="ds-missing-badge-label">{label}</span>
        </Badge>
    );
};

MissingDataBadge.propTypes = {
    label:     PropTypes.string.isRequired,
    severity:  PropTypes.oneOf(['critical', 'optional']),
    size:      PropTypes.oneOf(['xs', 'sm', 'md', 'lg', 'xl']),
    className: PropTypes.string,
};

export default MissingDataBadge;
