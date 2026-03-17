import React from 'react';
import PropTypes from 'prop-types';

import { Link } from 'react-router-dom';
import { Stack, Badge } from '../../../design-system';

/**
 * Standard Header for StatFoot V3 pages.
 * @param {string} title - Page title.
 * @param {string} subtitle - Optional description/subtitle.
 * @param {React.ReactNode} actions - Optional area for buttons, filters, etc.
 * @param {React.ReactNode|Array} breadcrumbs - Optional breadcrumb navigation.
 */
const PageHeader = ({ title, subtitle, actions, breadcrumbs, badge, extra, className = '', style = {} }) => {
    const renderBreadcrumbs = () => {
        if (!breadcrumbs) return null;
        if (React.isValidElement(breadcrumbs)) return breadcrumbs;

        if (Array.isArray(breadcrumbs)) {
            return (
                <div className="sf-breadcrumbs" style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--spacing-xs)',
                    fontSize: 'var(--font-size-xs)',
                    color: 'var(--color-text-dim)',
                    marginBottom: 'var(--spacing-xs)'
                }}>
                    {breadcrumbs.map((bc, idx) => (
                        <React.Fragment key={bc.path || bc.label}>
                            {idx > 0 && <span>/</span>}
                            {bc.path ? (
                                <Link to={bc.path} style={{
                                    color: 'inherit',
                                    textDecoration: 'none',
                                    transition: 'color var(--transition-fast)'
                                }} onMouseOver={e => e.target.style.color = 'var(--color-text-main)'}
                                    onMouseOut={e => e.target.style.color = 'inherit'}>
                                    {bc.label}
                                </Link>
                            ) : (
                                <span style={{ color: bc.active ? 'var(--color-text-main)' : 'inherit', fontWeight: bc.active ? 600 : 400 }}>
                                    {bc.label}
                                </span>
                            )}
                        </React.Fragment>
                    ))}
                </div>
            );
        }
        return null;
    };

    return (
        <header
            className={`sf-page-header ${className}`}
            style={{
                marginBottom: 0,
                borderBottom: '1px solid var(--color-border)',
                paddingBottom: 'var(--spacing-sm)',
                ...style
            }}
        >
            <Stack gap="var(--spacing-sm)">
                {renderBreadcrumbs()}
                <Stack direction="row" align="center" justify="space-between" wrap>
                    <Stack gap="4px">
                        <Stack direction="row" align="center" gap="var(--spacing-sm)">
                            <h1 style={{
                                fontSize: 'var(--font-size-4xl)',
                                fontWeight: 800,
                                letterSpacing: '-0.02em',
                                margin: 0
                            }}>
                                {title}
                            </h1>
                            {badge && <Badge variant={badge.variant || "primary"}>{badge.label}</Badge>}
                        </Stack>
                        {subtitle && (
                            <p style={{
                                color: 'var(--color-text-dim)',
                                fontSize: 'var(--font-size-md)',
                                margin: 0
                            }}>
                                {subtitle}
                            </p>
                        )}
                    </Stack>
                    <Stack direction="row" align="center" gap="var(--spacing-md)">
                        {actions && <div className="sf-header-actions">{actions}</div>}
                        {extra && <div className="sf-header-extra">{extra}</div>}
                    </Stack>
                </Stack>
            </Stack>
        </header>
    );
};

PageHeader.propTypes = {
    title: PropTypes.string.isRequired,
    subtitle: PropTypes.string,
    actions: PropTypes.node,
    breadcrumbs: PropTypes.oneOfType([
        PropTypes.node,
        PropTypes.arrayOf(PropTypes.shape({
            label: PropTypes.string.isRequired,
            path: PropTypes.string,
            active: PropTypes.bool
        }))
    ]),
    badge: PropTypes.shape({
        label: PropTypes.string,
        variant: PropTypes.string
    }),
    extra: PropTypes.node,
    className: PropTypes.string,
    style: PropTypes.object
};

export default PageHeader;

