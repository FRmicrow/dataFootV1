import React from 'react';

const SimHeader = () => (
    <header className="sim-header">
        <button onClick={() => globalThis.history.back()} className="back-link">
            ← Back to Hub
        </button>
        <div className="header-main-wrap">
            <div className="header-content">
                <span className="badge">Season Simulation</span>
                <h1>Alpha Analytics — Simulation Control Center</h1>
                <p>Run PostgreSQL-backed season replays and validate prediction accuracy on chronological match flows.</p>
            </div>
        </div>
    </header>
);

export default SimHeader;
