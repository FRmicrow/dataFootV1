import React, { useState, useEffect, useMemo } from 'react';
import PropTypes from 'prop-types';
import api from '../../../../../services/api';
import { Card, Badge, Stack, Button, Grid } from '../../../../../design-system';

const LineupTab = ({ clubId, year, competitionId, roster }) => {
    const [lineup, setLineup] = useState(null);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [showNames, setShowNames] = useState(true);

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

    const formationCoords = useMemo(() => {
        const formation = lineup?.formation || '4-3-3';
        const parts = formation.includes('.') ? formation.split('.') : formation.split('-');
        const coords = [];

        // GK
        coords.push({ left: '8%', top: '50%' });

        const rows = parts.map(Number);
        const rowCount = rows.length;

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
        if (!roster || roster.length === 0) return (lineup?.roster || []).slice(0, 11);

        const formation = lineup?.formation || '4-3-3';
        const parts = formation.includes('.') ? formation.split('.') : formation.split('-');
        const rows = parts.map(Number);

        // Categorize by mapping position string to simple categories
        const availGK = [];
        const availDEF = [];
        const availMID = [];
        const availATT = [];

        // Sort roster by appearances descending
        const sortedRoster = [...roster].sort((a, b) => (b.appearances || 0) - (a.appearances || 0));

        sortedRoster.forEach(p => {
            const pos = (p.position || '').toUpperCase();
            if (pos.includes('G')) availGK.push(p);
            else if (pos.includes('D') || pos.includes('BACK')) availDEF.push(p);
            else if (pos.includes('M')) availMID.push(p);
            else availATT.push(p);
        });

        const pullPlayers = (count, prefs) => {
            const pulled = [];
            while (pulled.length < count) {
                let found = false;
                for (let arr of prefs) {
                    if (arr.length > 0) {
                        pulled.push(arr.shift());
                        found = true;
                        break;
                    }
                }
                if (!found) {
                    // Fallback to any remaining player if we somehow run out
                    if (availMID.length > 0) pulled.push(availMID.shift());
                    else if (availDEF.length > 0) pulled.push(availDEF.shift());
                    else if (availATT.length > 0) pulled.push(availATT.shift());
                    else if (availGK.length > 0) pulled.push(availGK.shift());
                    else break;
                }
            }
            return pulled;
        };

        const newStarters = [];

        // 1. GK
        newStarters.push(...pullPlayers(1, [availGK]));

        // 2. Outfield Rows
        rows.forEach((count, i) => {
            if (i === 0) {
                // Defense
                newStarters.push(...pullPlayers(count, [availDEF, availMID]));
            } else if (i === rows.length - 1) {
                // Attack
                newStarters.push(...pullPlayers(count, [availATT, availMID, availDEF]));
            } else {
                // Midfield / Advanced Midfield
                newStarters.push(...pullPlayers(count, [availMID, availATT, availDEF]));
            }
        });

        while (newStarters.length < 11) {
            newStarters.push({ player_id: `unknown-${newStarters.length}`, name: 'Unknown', photo_url: '' });
        }

        return newStarters.slice(0, 11);
    }, [lineup, roster]);

    const bench = useMemo(() => {
        if (!roster) return (lineup?.roster || []).slice(11, 16);
        const starterIds = new Set(activeStarters.map(s => s.player_id));
        return [...roster]
            .filter(p => !starterIds.has(p.player_id))
            .sort((a, b) => (b.appearances || 0) - (a.appearances || 0))
            .slice(0, 5);
    }, [activeStarters, roster, lineup]);

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
        <Card style={{ padding: '80px', textAlign: 'center' }}>
            <Stack align="center" gap="var(--spacing-md)">
                <div className="ds-button-spinner"></div>
                <div style={{ color: 'var(--color-text-muted)' }}>Analyzing tactical formations...</div>
            </Stack>
        </Card>
    );

    return (
        <div className="lineup-tab-v4 animate-fade-in">
            <Grid columns="300px 1fr" gap="var(--spacing-xl)">
                {/* Sidebar */}
                <Card title="Squad Registry" extra={<Badge variant="primary">{roster?.length}</Badge>}>
                    <Stack gap="var(--spacing-md)">
                        <input
                            type="text"
                            placeholder="Find player..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            style={{ width: '100%', padding: '8px 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', color: 'white' }}
                        />
                        <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
                            {Object.keys(groupedRoster).map(pos => (
                                <div key={pos} style={{ marginBottom: '16px' }}>
                                    <div style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--color-text-muted)', marginBottom: '8px' }}>{pos}s</div>
                                    <Stack gap="4px">
                                        {groupedRoster[pos].map(p => {
                                            const isStarter = activeStarters.find(r => r.player_id === p.player_id || r.player_api_id === p.player_api_id);
                                            return (
                                                <div key={p.player_id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px', background: isStarter ? 'rgba(99, 102, 241, 0.1)' : 'transparent', borderRadius: '4px', border: isStarter ? '1px solid var(--color-primary-500)' : '1px solid transparent' }}>
                                                    <img src={p.photo_url} alt="" style={{ width: '24px', height: '24px', borderRadius: '50%' }} />
                                                    <div style={{ flex: 1, fontSize: 'var(--font-size-xs)' }}>
                                                        <div style={{ fontWeight: isStarter ? 'bold' : 'normal' }}>{p.name}</div>
                                                        <div style={{ fontSize: '9px', opacity: 0.6 }}>{p.appearances || 0} apps</div>
                                                    </div>
                                                    {isStarter && <Badge variant="primary" size="sm">XI</Badge>}
                                                </div>
                                            );
                                        })}
                                    </Stack>
                                </div>
                            ))}
                        </div>
                    </Stack>
                </Card>

                {/* Pitch */}
                <Stack gap="var(--spacing-lg)">
                    <Card>
                        <Stack direction="row" justify="space-between" align="center">
                            <div>
                                <Badge variant="primary" size="sm" style={{ marginBottom: '4px' }}>Most Common</Badge>
                                <h2 style={{ margin: 0 }}>{lineup?.formation || '4-3-3'}</h2>
                            </div>
                            <Stack direction="row" gap="var(--spacing-xl)">
                                <Stack align="center">
                                    <div style={{ fontSize: 'var(--font-size-xl)', fontWeight: 'bold' }}>{lineup?.usage || 0}</div>
                                    <div style={{ fontSize: '10px', color: 'var(--color-text-muted)' }}>MATCHES</div>
                                </Stack>
                                <Stack align="center">
                                    <div style={{ fontSize: 'var(--font-size-xl)', fontWeight: 'bold', color: 'var(--color-success-500)' }}>{lineup?.win_rate || 0}%</div>
                                    <div style={{ fontSize: '10px', color: 'var(--color-text-muted)' }}>WIN RATE</div>
                                </Stack>
                                <Button size="sm" variant="secondary" onClick={() => setShowNames(!showNames)}>
                                    {showNames ? 'Hide Names' : 'Show Names'}
                                </Button>
                            </Stack>
                        </Stack>

                        <div style={{ marginTop: '24px', position: 'relative', background: 'radial-gradient(circle at center, #2d3748 0%, #1a202c 100%)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)', height: '500px', overflow: 'hidden' }}>
                            {/* Pitch Lines - Simplified CSS Pitch */}
                            <div style={{ position: 'absolute', top: '5%', bottom: '5%', left: '2%', right: '2%', border: '2px solid rgba(255,255,255,0.2)', pointerEvents: 'none' }}>
                                <div style={{ position: 'absolute', top: '0', bottom: '0', left: '50%', width: '2px', background: 'rgba(255,255,255,0.2)' }}></div>
                                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '100px', height: '100px', border: '2px solid rgba(255,255,255,0.2)', borderRadius: '50%' }}></div>
                            </div>

                            {activeStarters.map((p, idx) => (
                                <div
                                    key={p.player_id || `starter-${idx}`}
                                    style={{
                                        position: 'absolute',
                                        left: formationCoords[idx]?.left || '50%',
                                        top: formationCoords[idx]?.top || '50%',
                                        transform: 'translate(-50%, -50%)',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        zIndex: 2
                                    }}
                                >
                                    <div style={{ position: 'relative', width: '48px', height: '48px', border: '2px solid var(--color-primary-500)', borderRadius: '50%', background: 'var(--color-bg-card)', padding: '2px', boxShadow: '0 0 15px rgba(99, 102, 241, 0.4)' }}>
                                        <img src={p.photo_url || p.photo} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                                        {p.number && (
                                            <span style={{ position: 'absolute', bottom: '-4px', right: '-4px', background: 'var(--color-primary-500)', color: 'white', fontSize: '10px', padding: '1px 4px', borderRadius: '4px', fontWeight: 'bold' }}>
                                                {p.number}
                                            </span>
                                        )}
                                    </div>
                                    {showNames && (
                                        <span style={{ fontSize: '10px', marginTop: '6px', padding: '2px 8px', background: 'rgba(0,0,0,0.6)', borderRadius: '4px', whiteSpace: 'nowrap' }}>
                                            {p.name}
                                        </span>
                                    )}
                                </div>
                            ))}
                        </div>
                    </Card>

                    {bench.length > 0 && (
                        <Card title="Frequent Substitutes">
                            <Stack direction="row" gap="var(--spacing-md)" justify="center">
                                {bench.map((p, bIdx) => (
                                    <Stack key={p.player_id || `bench-${bIdx}`} align="center" gap="4px">
                                        <img src={p.photo_url || p.photo} alt="" style={{ width: '32px', height: '32px', borderRadius: '50%', border: '1px solid var(--color-border)' }} />
                                        <span style={{ fontSize: '10px' }}>{p.name}</span>
                                    </Stack>
                                ))}
                            </Stack>
                        </Card>
                    )}
                </Stack>
            </Grid>
        </div>
    );
};

LineupTab.propTypes = {
    clubId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    year: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    competitionId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    roster: PropTypes.arrayOf(PropTypes.shape({
        player_id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
        name: PropTypes.string.isRequired,
        photo_url: PropTypes.string,
        position: PropTypes.string,
        appearances: PropTypes.number
    })).isRequired
};

export default LineupTab;
