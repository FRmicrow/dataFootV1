import React from 'react';
import PropTypes from 'prop-types';


/**
 * Standard content container for StatFoot V3 pages.
 */
const PageContentV4 = ({ children, className = '', style = {} }) => {
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

PageContentV4.propTypes = {
    children: PropTypes.node.isRequired,
    className: PropTypes.string,
    style: PropTypes.object
};

export default PageContentV4;

