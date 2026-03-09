import React from 'react';
import PropTypes from 'prop-types';


/**
 * Grid component for 2D layouts.
 * @param {string} columns - CSS grid-template-columns value.
 * @param {string} gap - Spacing between items (defaults to var(--spacing-sm) = 24px).
 */
export const Grid = ({ children, columns = 'repeat(auto-fill, minmax(300px, 1fr))', gap = 'var(--spacing-sm)', className = '', style = {} }) => {
    return (
        <div
            className={`ds-grid ${className}`}
            style={{
                display: 'grid',
                gridTemplateColumns: columns,
                gap,
                ...style
            }}
        >
            {children}
        </div>
    );
};

Grid.propTypes = {
    children: PropTypes.node,
    columns: PropTypes.string,
    gap: PropTypes.string,
    className: PropTypes.string,
    style: PropTypes.object
};


/**
 * Stack component for flex-based 1D layouts.
 * @param {string} direction - flex-direction (row/column).
 * @param {string} gap - Spacing between items (defaults to var(--spacing-xs) = 12px).
 */
export const Stack = ({
    children,
    direction = 'column',
    gap = 'var(--spacing-xs)',
    align = 'stretch',
    justify = 'flex-start',
    row = false,
    dense = false,
    className = '',
    style = {}
}) => {
    const finalDirection = row ? 'row' : direction;
    const finalGap = dense ? 'var(--spacing-2xs)' : gap;

    return (
        <div
            className={`ds-stack ${className}`}
            style={{
                display: 'flex',
                flexDirection: finalDirection,
                gap: finalGap,
                alignItems: align,
                justifyContent: justify,
                ...style
            }}
        >
            {children}
        </div>
    );
};


Stack.propTypes = {
    children: PropTypes.node,
    direction: PropTypes.oneOf(['row', 'column']),
    gap: PropTypes.string,
    align: PropTypes.string,
    justify: PropTypes.string,
    row: PropTypes.bool,
    dense: PropTypes.bool,
    className: PropTypes.string,
    style: PropTypes.object
};

