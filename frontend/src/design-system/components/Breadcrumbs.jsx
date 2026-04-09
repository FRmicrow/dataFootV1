import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import './Breadcrumbs.css';

/**
 * Static route mapping for user-friendly labels.
 * If a segment is not in this map, it will be displayed as-is (useful for IDs).
 */
const ROUTE_LABELS = {
    'dashboard':        'Dashboard',
    'leagues':          'Leagues',
    'league':           'League',
    'player':           'Athlete',
    'search':           'Intelligence',
    'machine-learning': 'ML Hub',
    'studio':           'Studio',
    'import':           'Acquisition',
    'design':           'System',
    'season':           'Season',
    'events':           'Events',
    'lineups-import':   'Lineups',
    'match':            'Match Analytics',
    'club':             'Club Profile',
};

const Breadcrumbs = () => {
    const location = useLocation();
    const pathnames = location.pathname.split('/').filter((x) => x);

    // Don't show breadcrumbs on root dashboard
    if (pathnames.length === 0 || (pathnames.length === 1 && pathnames[0] === 'dashboard')) {
        return (
            <nav className="ds-breadcrumb" aria-label="Breadcrumb">
                <div className="ds-breadcrumb__item ds-breadcrumb__item--active">
                    <span className="ds-breadcrumb__icon">📊</span>
                    <span className="ds-breadcrumb__label">Performance Dashboard</span>
                </div>
            </nav>
        );
    }

    return (
        <nav className="ds-breadcrumb" aria-label="Breadcrumb">
            <ol className="ds-breadcrumb__list">
                {/* Always start with Dashboard/Home icon */}
                <li className="ds-breadcrumb__item">
                    <Link to="/dashboard" className="ds-breadcrumb__link">
                        <span className="ds-breadcrumb__icon">📊</span>
                        <span className="ds-breadcrumb__label">Dashboard</span>
                    </Link>
                </li>

                {pathnames.map((value, index) => {
                    const last = index === pathnames.length - 1;
                    const to = `/${pathnames.slice(0, index + 1).join('/')}`;
                    const label = ROUTE_LABELS[value] || value;

                    return (
                        <li key={to} className="ds-breadcrumb__item">
                            <span className="ds-breadcrumb__separator" aria-hidden="true">/</span>
                            {last ? (
                                <span className="ds-breadcrumb__item--active" aria-current="page">
                                    {label}
                                </span>
                            ) : (
                                <Link to={to} className="ds-breadcrumb__link">
                                    {label}
                                </Link>
                            )}
                        </li>
                    );
                })}
            </ol>
        </nav>
    );
};

export default Breadcrumbs;
