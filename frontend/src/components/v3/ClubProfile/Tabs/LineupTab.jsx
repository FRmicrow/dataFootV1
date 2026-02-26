import React, { useState, useEffect, useMemo } from 'react';
import api from '../../../../services/api';

const LineupTab = ({ clubId, year, competitionId, roster }) => {
    const [lineup, setLineup] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchLineup = async () => {
            setLoading(true);
            try {
                const data = await api.getTypicalLineup(clubId, {
                    year,
                    competition: competitionId !== 'all' ? competitionId : undefined
                });
                setLineup(data);
            } catch (error) {
                console.error("Failed to fetch lineup:", error);
            }
            setLoading(false);
        };

        if (year) fetchLineup();
    }, [clubId, year, competitionId]);



    const [searchQuery, setSearchQuery] = useState('');
    const [showNames, setShowNames] = useState(true);

    const formationCoords = useMemo(() => {
        const formation = lineup?.formation || '4-3-3';
        // Handle both 4.3.3 and 4-3-3
        const parts = formation.includes('.') ? formation.split('.') : formation.split('-');
        const coords = [];

        // Always 11 players. Row 1 is always GK.
        // Pitch: Left (10%) to Right (90%)

        // GK
        coords.push({ left: '8%', top: '50%' });

        const rows = parts.map(Number);
        const rowCount = rows.length;

        // Distribute rows between 28% and 88%
        const startX = 28;
        const endX = 88;
        const xStep = rowCount > 1 ? (endX - startX) / (rowCount - 1) : 0;

        rows.forEach((count, rowIndex) => {
            const currentX = startX + (xStep * rowIndex);
            for (let i = 0; i < count; i++) {
                const verticalSpace = 100 / (count + 1);
                coords.push({
                    left: `${currentX}%`,
                    top: `${verticalSpace * (i + 1)}%`
                });
            }
        });

        return coords.slice(0, 11);
    }, [lineup]);

    const activeStarters = useMemo(() => {
        const raw = (lineup?.roster || []).slice(0, 11);
        const getPriority = (pos) => {
            if (!pos) return 99;
            const p = pos.toUpperCase();
            if (p.includes('GK') || p.includes('GOAL') || p === 'G') return 0;
            if (p.includes('MID') || p === 'M') return 2;
            if (p.includes('DEF') || p.includes('BACK') || p === 'D') return 1;
            if (p.includes('ATT') || p.includes('STRI') || p.includes('FORW') || p.includes('FW') || p.includes('ST') || p === 'A') return 3;
            return 4;
        };
        return [...raw].sort((a, b) => getPriority(a.position) - getPriority(b.position));
    }, [lineup]);

    const bench = (lineup?.roster || []).slice(11, 16); // Top 5 subs

    const groupedRoster = useMemo(() => {
        if (!roster) return {};
        const filtered = roster.filter(p =>
            p.name.toLowerCase().includes(searchQuery.toLowerCase())
        );
        return filtered.reduce((acc, p) => {
            acc[p.position] = acc[p.position] || [];
            acc[p.position].push(p);
            return acc;
        }, {});
    }, [roster, searchQuery]);

    if (loading) return (
        <div className="tab-loading">
            <div className="spinner-v3 small"></div>
            <span>Analyzing tactical formations...</span>
        </div>
    );

    return (
        <div className="lineup-tab-v4">
            <h2 className="section-title">Tactical Hub</h2>

            <div className="lineup-split-container">
                {/* Left 30%: Optimized Roster Sidebar */}
                <aside className="lineup-roster-sidebar">
                    <div className="sidebar-header">
                        <div className="s-head-main">
                            <h4>Squad Personnel</h4>
                            <span className="count-pill">{roster?.length}</span>
                        </div>
                        <input
                            type="text"
                            className="sidebar-search"
                            placeholder="Find player..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                        />
                    </div>

                    <div className="roster-grouped-list">
                        {Object.keys(groupedRoster).map(pos => (
                            <div key={pos} className="pos-group-mini">
                                <label>{pos}s</label>
                                {groupedRoster[pos].map(p => {
                                    const starter = activeStarters.find(r => r.id === p.player_id);
                                    return (
                                        <div key={p.player_id} className={`mini-player-card ${starter ? 'is-starter' : ''}`}>
                                            <img src={p.photo_url} alt="" className="p-avatar" />
                                            <div className="p-details">
                                                <span className="p-name">{p.name}</span>
                                                <span className="p-stats">{p.appearances || 0} apps</span>
                                            </div>
                                            {starter && <div className="starter-glyph">11</div>}
                                        </div>
                                    );
                                })}
                            </div>
                        ))}
                    </div>
                </aside>

                {/* Right 70%: Professional Tactical Pitch */}
                <main className="lineup-pitch-main">
                    <header className="tactical-header-premium">
                        <div className="t-head-left">
                            <span className="t-label">Most Common Formation</span>
                            <h2 className="t-value">{lineup?.formation || '4-3-3'} <span className="t-badge">PRIMARY SYSTEM</span></h2>
                        </div>
                        <div className="t-head-right">
                            <div className="t-stat">
                                <span className="s-val">{lineup?.usage || 0}</span>
                                <span className="s-lab">Matches</span>
                            </div>
                            <div className="t-stat win">
                                <span className="s-val">{lineup?.win_rate || 0}%</span>
                                <span className="s-lab">Win Rate</span>
                            </div>
                            <div className="t-toggle">
                                <button onClick={() => setShowNames(!showNames)}>
                                    {showNames ? 'Hide Names' : 'Show Names'}
                                </button>
                            </div>
                        </div>
                    </header>

                    <div className="pitch-canvas-outer premium">
                        <div className="football-pitch v4">
                            <div className="pitch-lines-v4">
                                <div className="p-penalty home"></div>
                                <div className="p-penalty away"></div>
                                <div className="p-circle"></div>
                                <div className="p-half"></div>
                            </div>

                            <div className="starters-layer">
                                {activeStarters.map((p, idx) => (
                                    <div
                                        key={p.id}
                                        className="pitch-player-v4"
                                        style={{
                                            left: formationCoords[idx]?.left || '50%',
                                            top: formationCoords[idx]?.top || '50%',
                                            transform: 'translate(-50%, -50%)'
                                        }}
                                    >
                                        <div className="p-marker" title={p.name}>
                                            <img src={p.photo_url || p.photo} alt={p.name} className="p-photo" />
                                            {p.number && <span className="p-num">{p.number}</span>}
                                        </div>
                                        {showNames && <span className="p-name-ribbon">{p.name}</span>}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* BENCH SECTION */}
                    {bench.length > 0 && (
                        <div className="bench-section-v4">
                            <label>Most Frequent Substitutes</label>
                            <div className="bench-list">
                                {bench.map(p => (
                                    <div key={p.id} className="bench-player">
                                        <img src={p.photo_url || p.photo} alt="" />
                                        <span>{p.name}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
};

export default LineupTab;
