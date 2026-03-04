import React from 'react';

/**
 * Standard content container for StatFoot V3 pages.
 */
const PageContent = ({ children, className = '', style = {} }) => {
    return (
        <div
            className={`sf-page-content ${className}`}
            style={{
                width: '100%',
                ...style
            }}
        >
            {children}
        </div>
    );
};

export default PageContent;
