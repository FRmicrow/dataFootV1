import React from 'react';
import { Stack, Badge } from '../../../design-system';

/**
 * Standard Header for StatFoot V3 pages.
 * @param {string} title - Page title.
 * @param {string} subtitle - Optional description/subtitle.
 * @param {React.ReactNode} actions - Optional area for buttons, filters, etc.
 * @param {React.ReactNode} breadcrumbs - Optional breadcrumb navigation.
 */
const PageHeader = ({ title, subtitle, actions, breadcrumbs, badge, extra, className = '', style = {} }) => {
    return (
        <header
            className={`sf-page-header ${className}`}
            style={{
                marginBottom: 'var(--spacing-xl)',
                borderBottom: '1px solid var(--color-border)',
                paddingBottom: 'var(--spacing-md)',
                ...style
            }}
        >
            <Stack gap="var(--spacing-sm)">
                {breadcrumbs && <div className="sf-breadcrumbs">{breadcrumbs}</div>}
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

export default PageHeader;
