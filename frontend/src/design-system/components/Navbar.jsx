import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import './Navbar.css';

const Navbar = () => {
    const [debugMode, setDebugMode] = useState(() => {
        return localStorage.getItem('statfoot-debug-ui') === 'true';
    });

    useEffect(() => {
        if (debugMode) {
            document.body.classList.add('ds-debug-active');
        } else {
            document.body.classList.remove('ds-debug-active');
        }
        localStorage.setItem('statfoot-debug-ui', debugMode);
    }, [debugMode]);

    const links = [
        { to: '/dashboard', label: 'Dashboard' },
        { to: '/leagues', label: 'Leagues' },
        { to: '/search', label: 'Search' },
        { to: '/studio', label: 'Studio' },
        { to: '/machine-learning', label: '🤖 ML Hub', color: 'var(--color-primary-400)' },
        { to: '/import', label: 'Import' },
    ];

    return (
        <nav className="ds-navbar">
            <div className="ds-navbar-content">
                <div className="ds-navbar-brand">
                    <NavLink to="/dashboard" style={{ textDecoration: 'none', color: 'inherit' }}>
                        statFoot<span style={{ color: 'var(--color-primary-400)' }}>V3</span>
                    </NavLink>
                </div>
                
                <div className="ds-navbar-links">
                    {links.map(link => (
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

                <button
                    className={`ds-debug-toggle ${debugMode ? 'active' : ''}`}
                    onClick={() => setDebugMode(!debugMode)}
                    title="Toggle Design System Debug Mode"
                >
                    🛠️ Debug
                </button>
            </div>
        </nav>
    );
};

export default Navbar;