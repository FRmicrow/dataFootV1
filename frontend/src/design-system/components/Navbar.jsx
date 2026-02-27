import React from 'react';
import { NavLink } from 'react-router-dom';
import './Navbar.css';

const Navbar = () => {
    const links = [
        { to: '/dashboard', label: 'Dashboard' },
        { to: '/leagues', label: 'Leagues' },
        { to: '/search', label: 'Search' },
        { to: '/studio', label: 'Studio' },
        { to: '/forge/lab', label: '🧪 Forge Lab', color: 'var(--color-primary-400)' },
        { to: '/import', label: 'Import' },
        { to: '/live-bet', label: '🔥 Live Bet', color: 'var(--color-accent-500)' },
        { to: '/health', label: '🛡️ Health', color: 'var(--color-success-500)' },
        { to: '/design', label: '🎨 Design', color: '#ec4899' },
    ];

    return (
        <nav className="ds-navbar">
            <div className="ds-navbar-content">
                <div className="ds-navbar-brand">⚽ StatFoot</div>
                <div className="ds-navbar-links">
                    {links.map((link) => (
                        <NavLink
                            key={link.to}
                            to={link.to}
                            className={({ isActive }) => `ds-navbar-link ${isActive ? 'ds-navbar-link--active' : ''}`}
                            style={link.color ? { '--link-color': link.color } : {}}
                        >
                            {link.label}
                        </NavLink>
                    ))}
                </div>
            </div>
        </nav>
    );
};

export default Navbar;
