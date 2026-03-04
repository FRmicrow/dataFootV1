import React, { useState, useMemo } from 'react';

/**
 * LeagueSelector (US_022 AC 1 & 4)
 * Panel to search and manage tracked competitions.
 * Props:
 *   - availableLeagues: [{ id, name, country, logo, importance_rank }]
 *   - trackedIds: number[]
 *   - onToggle: (leagueId: number) => void
 *   - onClose: () => void
 */
const LeagueSelector = ({ availableLeagues = [], trackedIds = [], onToggle, onClose }) => {
    const [search, setSearch] = useState('');

    const filtered = useMemo(() => {
        const q = search.toLowerCase().trim();
        return availableLeagues.filter(l =>
            !q || l.name?.toLowerCase().includes(q) || l.country?.toLowerCase().includes(q)
        );
    }, [availableLeagues, search]);

    const tracked = availableLeagues.filter(l => trackedIds.includes(l.id));

    return (
        <div style={{
            background: '#0f172a',
            border: '1px solid rgba(99,102,241,0.4)',
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
            animation: 'fadeIn 0.2s ease'
        }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2 style={{ margin: 0, fontSize: '1.2rem', color: '#a5b4fc', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    ⚙️ Configure Competitions
                    <span style={{ fontSize: '0.75rem', fontWeight: '400', color: '#64748b', background: '#1e293b', padding: '3px 8px', borderRadius: '20px' }}>
                        {trackedIds.length} selected
                    </span>
                </h2>
                <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '1.2rem' }}>✕</button>
            </div>

            {/* Currently Tracked Chips */}
            {tracked.length > 0 && (
                <div style={{ marginBottom: '16px' }}>
                    <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Tracked</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                        {tracked.map(l => (
                            <div key={l.id} style={{
                                display: 'flex', alignItems: 'center', gap: '6px',
                                background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.4)',
                                padding: '4px 10px', borderRadius: '20px', fontSize: '0.85rem', color: '#c7d2fe'
                            }}>
                                {l.logo && <img src={l.logo} alt="" style={{ width: '14px', height: '14px', objectFit: 'contain' }} />}
                                {l.name}
                                <button onClick={() => onToggle(l.id)} style={{ background: 'none', border: 'none', color: '#a5b4fc', cursor: 'pointer', padding: '0 2px', fontSize: '0.8rem', lineHeight: 1 }}>✕</button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Search input */}
            <input
                type="text"
                placeholder="Search leagues by name or country..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{
                    width: '100%', boxSizing: 'border-box',
                    background: '#1e293b', border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '8px', padding: '10px 14px', color: '#f1f5f9',
                    fontSize: '0.9rem', marginBottom: '12px', outline: 'none'
                }}
            />

            {/* League List (sorted by importance_rank — already sorted from parent) */}
            <div style={{ maxHeight: '280px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {filtered.length === 0 && (
                    <div style={{ color: '#64748b', textAlign: 'center', padding: '20px', fontSize: '0.9rem' }}>
                        No competitions found
                    </div>
                )}
                {filtered.map(l => {
                    const isTracked = trackedIds.includes(l.id);
                    return (
                        <button
                            key={l.id}
                            onClick={() => onToggle(l.id)}
                            style={{
                                display: 'flex', alignItems: 'center', gap: '10px',
                                background: isTracked ? 'rgba(99,102,241,0.1)' : 'transparent',
                                border: `1px solid ${isTracked ? 'rgba(99,102,241,0.4)' : 'transparent'}`,
                                borderRadius: '8px', padding: '8px 12px',
                                cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s ease'
                            }}
                        >
                            {l.logo && <img src={l.logo} alt="" style={{ width: '20px', height: '20px', objectFit: 'contain', flexShrink: 0 }} />}
                            <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: '600', color: isTracked ? '#a5b4fc' : '#cbd5e1', fontSize: '0.9rem' }}>{l.name}</div>
                                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{l.country}</div>
                            </div>
                            <div style={{ fontSize: '0.8rem', color: isTracked ? '#10b981' : '#475569', flexShrink: 0 }}>
                                {isTracked ? '✓ Tracked' : '+ Add'}
                            </div>
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

export default LeagueSelector;
