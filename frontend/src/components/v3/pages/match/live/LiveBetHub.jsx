import React from 'react';
import { useNavigate } from 'react-router-dom';
import './LiveBetHub.css';

const LiveBetHub = () => {
    const navigate = useNavigate();

    const modules = [
        {
            id: 'board',
            title: 'Intelligence Board',
            description: 'Real-time match analysis, momentum tracking, and predictive overlays.',
            icon: '🔥',
            path: '/live-bet/board',
            color: '#f59e0b',
            stats: 'Active Ingestion'
        },
        {
            id: 'monitoring',
            title: 'Infrastructure Console',
            description: 'Granular control over league monitoring protocols and ML ecosystem health.',
            icon: '📡',
            path: '/live-bet/monitoring',
            color: '#818cf8',
            stats: '124 Leagues Tracked'
        },
        {
            id: 'alpha',
            title: 'Alpha Analytics',
            description: 'Backtesting engine and model performance calibration (Institutional Grade).',
            icon: '🧠',
            path: '/live-bet/alpha',
            color: '#10b981',
            stats: 'Forge Engine Active'
        }
    ];

    return (
        <div className="lb-hub-container animate-fade-in">
            <header className="lb-hub-header">
                <div className="badge-v3">V8 Engine</div>
                <h1>Betting Intelligence Hub</h1>
                <p>Select an operational module to begin real-time market analysis.</p>
            </header>

            <div className="lb-hub-grid">
                {modules.map(mod => (
                    <div
                        key={mod.id}
                        className={`lb-hub-card ${mod.disabled ? 'disabled' : ''}`}
                        onClick={() => !mod.disabled && navigate(mod.path)}
                        onKeyDown={(e) => {
                            if (!mod.disabled && (e.key === 'Enter' || e.key === ' ')) {
                                e.preventDefault();
                                navigate(mod.path);
                            }
                        }}
                        role="button"
                        tabIndex={mod.disabled ? "-1" : "0"}
                        style={{ '--accent-color': mod.color }}
                    >
                        <div className="card-glass-glow"></div>
                        <div className="lb-hub-icon" style={{ background: `rgba(${Number.parseInt(mod.color.slice(1, 3), 16)}, ${Number.parseInt(mod.color.slice(3, 5), 16)}, ${Number.parseInt(mod.color.slice(5, 7), 16)}, 0.1)` }}>
                            {mod.icon}
                        </div>
                        <div className="lb-hub-content">
                            <h3>{mod.title}</h3>
                            <p>{mod.description}</p>
                        </div>
                        <div className="lb-hub-footer">
                            <span className="hub-stats">{mod.stats}</span>
                            {!mod.disabled && <span className="hub-arrow">→</span>}
                        </div>
                    </div>
                ))}
            </div>

            <section className="lb-hub-performance">
                <div className="perf-item">
                    <span className="perf-label">API Latency</span>
                    <span className="perf-val">42ms</span>
                </div>
                <div className="perf-item border-x">
                    <span className="perf-label">ML Confidence</span>
                    <span className="perf-val">84.2%</span>
                </div>
                <div className="perf-item">
                    <span className="perf-label">Active Signals</span>
                    <span className="perf-val">12</span>
                </div>
            </section>
        </div>
    );
};

export default LiveBetHub;
