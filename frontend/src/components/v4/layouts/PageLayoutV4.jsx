import React from 'react';
import PropTypes from 'prop-types';
import { Stack } from '../../../design-system';


/**
 * Main Layout wrapper for StatFoot V3 pages.
 * Handles responsive padding, max-width, and foundational vertical spacing.
 */
const PageLayoutV4 = ({ children, className = '', style = {}, animate = true }) => {
    return (
        <div
            className={`sf-page-layout ${animate ? 'animate-fade-in' : ''} ${className}`}
            style={{
                padding: 'var(--spacing-md)',
                maxWidth: 'var(--layout-max-width, 1400px)',
                margin: '0 auto',
                minHeight: 'calc(100vh - 80px)', // Account for possible header/sidebar
                ...style
            }}
        >
            <Stack gap="var(--spacing-md)">
                {children}
            </Stack>
        </div>
    );
};

PageLayoutV4.propTypes = {
    children: PropTypes.node.isRequired,
    className: PropTypes.string,
    style: PropTypes.object,
    animate: PropTypes.bool
};

export default PageLayoutV4;

