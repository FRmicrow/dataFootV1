import React from 'react';
import './Card.css';

const Card = ({ children, title, subtitle, footer, extra, onClick, className = '', ghost = false }) => {
    return (
        <div
            className={`ds-card ${ghost ? 'ds-card--ghost' : ''} ${onClick ? 'ds-card--interactive' : ''} ${className}`}
            onClick={onClick}
        >
            {(title || extra) && (
                <div className="ds-card-header">
                    <div className="ds-card-header-content">
                        {title && <h3 className="ds-card-title">{title}</h3>}
                        {subtitle && <p className="ds-card-subtitle">{subtitle}</p>}
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

export default Card;
