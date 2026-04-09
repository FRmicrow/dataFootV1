import React, { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { CollapsibleSidebar } from '../../../design-system';
import ImportLogPanel from '../modules/import/ImportLogPanel.jsx';
import './V4Layout.css';

const navItems = [
    { to: "/dashboard",        label: "Dashboard",       icon: "📊" },
    { to: "/leagues",          label: "Leagues",         icon: "🏆" },
    { to: "/search",           label: "Search",          icon: "🔍" },
    { to: "/machine-learning", label: "ML Hub",          icon: "🤖" },
    { to: "/studio",           label: "Studio",          icon: "✏️" },
    { to: "/import",           label: "Import",          icon: "⬇️" },
    { to: "/design",           label: "Design System",   icon: "🎨" },
];

const V4Layout = () => {
    const location = useLocation();

    // US-205: Ensure scroll to top on navigation
    useEffect(() => {
        globalThis.scrollTo(0, 0);
    }, [location.pathname]);

    return (
        <div className="v3-layout">
            <CollapsibleSidebar navItems={navItems} />
            <main className="v3-main-content">
                <ImportLogPanel />
                <Outlet />
            </main>
        </div>
    );
};

export default V4Layout;
