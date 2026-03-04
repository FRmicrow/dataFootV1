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
            <div className="navbar-links">
                {links.map(link => (
                    <NavLink
                        key={link.to}
                        to={link.to}
                        className={({ isActive }) => `ds-button ds-button--md ${isActive ? 'ds-button--primary active' : 'ds-button--ghost'}`}
                        style={link.color ? { color: link.color, borderColor: link.color } : {}}
                    >
                        <span className="ds-button-text">{link.label}</span>
                    </NavLink>
                ))}
                <button
                    className={`ds-button ds-button--md ds-button--ghost ${debugMode ? 'active' : ''}`}
                    onClick={() => setDebugMode(!debugMode)}
                    title="Toggle Design System Debug Mode"
                >
                    <span className="ds-button-text">🛠️</span>
                </button>
            </div>
        </nav>
    );
};

export default Navbar;