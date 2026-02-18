
import React from 'react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Legend, Tooltip } from 'recharts';
import './BettingLabsDetail.css';

const BettingLabsDetail = ({ prediction, onClose }) => {
    if (!prediction) return null;

    // Parse data from JSON strings if needed, though they might come as objects depending on axios transform
    // But our backend stores them as JSON strings. SQLite doesn't autoparse.
    // Let's safe parse.
    const parseJSON = (str) => {
        try {
            if (!str) return {};
            return typeof str === 'string' ? JSON.parse(str) : str;
        } catch (e) {
            return {};
        }
    };

    const comparison = parseJSON(prediction.comparison_data) || {};
    const teams = parseJSON(prediction.teams_data) || {};
    const h2h = parseJSON(prediction.h2h_data) || {};

    // Transform Comparison Data for Radar Chart
    // API returns object like { form: { home: "50%", away: "80%" }, att: ... }
    // We need array: [{ subject: 'Form', A: 50, B: 80 }, ...]

    const radarData = [
        { subject: 'Form', A: parseInt((comparison.form?.home || "0").replace('%', '')), B: parseInt((comparison.form?.away || "0").replace('%', '')), fullMark: 100 },
        { subject: 'Attack', A: parseInt((comparison.att?.home || "0").replace('%', '')), B: parseInt((comparison.att?.away || "0").replace('%', '')), fullMark: 100 },
        { subject: 'Defense', A: parseInt((comparison.def?.home || "0").replace('%', '')), B: parseInt((comparison.def?.away || "0").replace('%', '')), fullMark: 100 },
        { subject: 'Poisson', A: parseInt((comparison.poisson_distribution?.home || "0").replace('%', '')), B: parseInt((comparison.poisson_distribution?.away || "0").replace('%', '')), fullMark: 100 },
        { subject: 'H2H', A: parseInt((comparison.h2h?.home || "0").replace('%', '')), B: parseInt((comparison.h2h?.away || "0").replace('%', '')), fullMark: 100 },
        { subject: 'Goals', A: parseInt((comparison.goals?.home || "0").replace('%', '')), B: parseInt((comparison.goals?.away || "0").replace('%', '')), fullMark: 100 },
    ];

    const hasData = radarData.some(d => d.A > 0 || d.B > 0);

    const homeTeam = prediction.home_team;
    const awayTeam = prediction.away_team;

    return (
        <div className="labs-detail-overlay" onClick={onClose}>
            <div className="labs-detail-modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>Match Analysis: {homeTeam} vs {awayTeam}</h2>
                    <button className="close-btn" onClick={onClose}>&times;</button>
                </div>

                <div className="teams-legend" style={{ padding: '0 20px', marginTop: '20px' }}>
                    <div className="legend-item">
                        <div className="color-dot color-home"></div> {homeTeam}
                    </div>
                    <div className="legend-item">
                        <div className="color-dot color-away"></div> {awayTeam}
                    </div>
                </div>

                <div className="modal-content">
                    {/* Radar Chart Section */}
                    <div className="radar-section">
                        <h3 style={{ color: '#cbd5e1', marginBottom: '10px' }}>Team Comparison Radar</h3>

                        {!hasData ? (
                            <div className="no-data-msg" style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                                <p>No detailed statistical comparison available for this match.</p>
                                <p style={{ fontSize: '0.8rem' }}>Try re-syncing to fetch latest data.</p>
                            </div>
                        ) : (
                            <div style={{ width: '100%', height: '400px', display: 'flex', justifyContent: 'center' }}>
                                {/* Using fixed dimensions to avoid ResponsiveContainer measure issues in Modal */}
                                <RadarChart width={450} height={350} cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                                    <PolarGrid stroke="#334155" />
                                    <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />

                                    <Radar
                                        name={homeTeam}
                                        dataKey="A"
                                        stroke="#3b82f6"
                                        strokeWidth={2}
                                        fill="#3b82f6"
                                        fillOpacity={0.4}
                                    />
                                    <Radar
                                        name={awayTeam}
                                        dataKey="B"
                                        stroke="#84cc16"
                                        strokeWidth={2}
                                        fill="#84cc16"
                                        fillOpacity={0.4}
                                    />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#fff' }}
                                        itemStyle={{ color: '#fff' }}
                                    />
                                </RadarChart>
                            </div>
                        )}
                    </div>

                    {/* Stats Bars Section */}
                    <div className="stats-section">
                        <div className="stat-group">
                            <h3>Comparison Metrics</h3>
                            {radarData.map((d) => (
                                <div key={d.subject} className="stat-bar-row">
                                    <div className="stat-labels">
                                        <span>{d.A}%</span>
                                        <span style={{ fontWeight: 600, color: '#e2e8f0' }}>{d.subject.toUpperCase()}</span>
                                        <span>{d.B}%</span>
                                    </div>
                                    <div className="progress-container">
                                        <div className="progress-home" style={{ width: `${d.A}%` }}></div>
                                        <div style={{ flex: 1, background: '#1e293b' }}></div> {/* Spacer */}
                                        <div className="progress-away" style={{ width: `${d.B}%`, marginLeft: 'auto' }}></div>
                                        {/* 
                                           Alternative visualization: stacked bar 
                                           But user asked for specific component style. 
                                           Let's do a simple stacked bar normalized to 100% total width?
                                           Or just absolute values?
                                           The provided image shows bars starting from center or side.
                                           Let's do a split bar: Blue from left, Green from right.
                                        */}
                                    </div>
                                    <div style={{ display: 'flex', height: '6px', background: '#334155', borderRadius: '3px', marginTop: '4px', overflow: 'hidden' }}>
                                        <div style={{ width: `${d.A}%`, background: '#3b82f6' }}></div>
                                        <div style={{ flex: 1 }}></div>
                                        <div style={{ width: `${d.B}%`, background: '#84cc16' }}></div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="stat-group">
                            <h3>Prediction Advice</h3>
                            <p style={{ color: '#fff', fontSize: '1rem', fontStyle: 'italic', background: 'rgba(59, 130, 246, 0.1)', padding: '10px', borderRadius: '8px' }}>
                                💡 {prediction.advice}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BettingLabsDetail;
