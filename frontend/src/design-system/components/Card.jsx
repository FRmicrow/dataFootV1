import React from 'react';
import PropTypes from 'prop-types';
import './Card.css';

const Card = ({
    children,
    title,
    subtitle,
    titleLogo,
    footer,
    extra,
    onClick,
    className = '',
    style = {},
    ghost = false
}) => {
    return (
        <div
            className={`ds-card ${ghost ? 'ds-card--ghost' : ''} ${onClick ? 'ds-card--interactive' : ''} ${className}`}
            onClick={onClick}
            onKeyDown={(e) => {
                if (onClick && (e.key === 'Enter' || e.key === ' ')) {
                    e.preventDefault();
                    onClick(e);
                }
            }}
            role={onClick ? "button" : undefined}
            tabIndex={onClick ? 0 : undefined}
            style={style}
        >
            {(title || extra) && (
                <div className="ds-card-header">
                    <div className="ds-card-header-content" style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)' }}>
                        {titleLogo && <div className="ds-card-title-logo">{titleLogo}</div>}
                        <div style={{ flex: 1 }}>
                            {title && <h3 className="ds-card-title">{title}</h3>}
                            {subtitle && <p className="ds-card-subtitle">{subtitle}</p>}
                        </div>
                    </div>
                    {extra && <div className="ds-card-extra">{extra}</div>}
                </div>
            )}
            <div className="ds-card-body">
                {children}
            </div>
            {footer && <div className="ds-card-footer">{footer}</div>}
        </div>
    );
};

Card.propTypes = {
    children: PropTypes.node,
    title: PropTypes.node,
    subtitle: PropTypes.string,
    titleLogo: PropTypes.node,
    footer: PropTypes.node,
    extra: PropTypes.node,
    onClick: PropTypes.func,
    className: PropTypes.string,
    style: PropTypes.object,
    ghost: PropTypes.bool
};

export default Card;
