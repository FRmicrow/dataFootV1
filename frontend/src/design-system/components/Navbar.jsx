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
        { to: '/forge/lab', label: '🧪 Forge Lab', color: 'var(--color-primary-400)' },
        { to: '/import', label: 'Import' },
        { to: '/live-bet', label: '🔥 Live Bet', color: 'var(--color-accent-500)' },