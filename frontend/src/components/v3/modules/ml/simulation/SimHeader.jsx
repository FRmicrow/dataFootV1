import React from 'react';

const SimHeader = () => (
    <header className="sim-header">
        <button onClick={() => globalThis.history.back()} className="back-link">
            ← Back to Hub
        </button>
        <div className="header-main-wrap">
            <div className="header-content">
                <span className="badge">V10 Forge Optimization</span>
                <h1>Alpha Analytics — Forge Control Center</h1>
                <p>Build league-scoped ML models and run chronological backtesting to validate prediction accuracy.</p>
            </div>
        </div>
    </header>
);

export default SimHeader;
