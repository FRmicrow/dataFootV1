import React from 'react';

const SimulationSkeleton = () => {
    return (
        <div className="results-container" style={{ opacity: 0.6 }}>
            <div className="metrics-row">
                {[1, 2, 3, 4].map(i => (
                    <div key={i} className="metric-card skeleton metric-skeleton"></div>
                ))}
            </div>
            <div className="charts-grid">
                <div className="chart-card skeleton chart-skeleton" style={{ gridColumn: 'span 2' }}></div>
                <div className="chart-card skeleton chart-skeleton" style={{ height: '240px' }}></div>
                <div className="chart-card skeleton chart-skeleton" style={{ height: '240px' }}></div>
            </div>
        </div>
    );
};

export default SimulationSkeleton;
