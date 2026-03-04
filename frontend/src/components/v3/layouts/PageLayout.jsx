import React from 'react';
import { Stack } from '../../../design-system';

/**
 * Main Layout wrapper for StatFoot V3 pages.
 * Handles responsive padding, max-width, and foundational vertical spacing.
 */
const PageLayout = ({ children, className = '', style = {}, animate = true }) => {
    return (
        <div
            className={`sf-page-layout ${animate ? 'animate-fade-in' : ''} ${className}`}
            style={{
                padding: 'var(--spacing-xl)',
                maxWidth: '1400px',
                margin: '0 auto',
                minHeight: 'calc(100vh - 80px)', // Account for possible header/sidebar
                ...style
            }}
        >
            <Stack gap="var(--spacing-xl)">
                {children}
            </Stack>
        </div>
    );
};

export default PageLayout;
