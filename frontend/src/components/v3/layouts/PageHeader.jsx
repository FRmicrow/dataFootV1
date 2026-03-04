import React from 'react';
import { Stack } from '../../../design-system';

/**
 * Standard Header for StatFoot V3 pages.
 * @param {string} title - Page title.
 * @param {string} subtitle - Optional description/subtitle.
 * @param {React.ReactNode} actions - Optional area for buttons, filters, etc.
 * @param {React.ReactNode} breadcrumbs - Optional breadcrumb navigation.
 */
const PageHeader = ({ title, subtitle, actions, breadcrumbs, className = '' }) => {
    return (
        <header
            className={`sf-page-header ${className}`}
            style={{
                marginBottom: 'var(--spacing-xl)',
                borderBottom: '1px solid var(--color-border)',
                paddingBottom: 'var(--spacing-md)'
            }}
        >
            <Stack gap="var(--spacing-sm)">
                {breadcrumbs && <div className="sf-breadcrumbs">{breadcrumbs}</div>}
                <Stack direction="row" align="center" justify="space-between" wrap>
                    <Stack gap="4px">
                        <h1 style={{
                            fontSize: 'var(--font-size-4xl)',
                            fontWeight: 800,
                            letterSpacing: '-0.02em',
                            margin: 0
                        }}>
                            {title}
                        </h1>
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
                    {actions && <div className="sf-header-actions">{actions}</div>}
                </Stack>
            </Stack>
        </header>
    );
};

export default PageHeader;
