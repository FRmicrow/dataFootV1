import React, { useState, useEffect, useMemo } from 'react';
import { Card, Grid, Stack, Badge, Button, Table, Progress } from '../../../../../design-system';
import api from '../../../../../services/api';

const MLModelFactory = () => {
    const [leagues, setLeagues] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [status, setStatus] = useState({ is_building: false });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const fetchLeagues = async () => {
            try {
                const res = await api.getStructuredLeagues();
                if (res.success !== false) {
                    const flattened = [];
                    const data = res.data || res;

                    // Handle International
                    if (data.international) {
                        data.international.world?.forEach(l => {
                            flattened.push({ id: l.id, name: l.name, type: 'World', display: `🌍 ${l.name}` });
                        });
                        Object.entries(data.international.continental || {}).forEach(([continent, list]) => {
                            list.forEach(l => {
                                flattened.push({ id: l.id, name: l.name, type: continent, display: `🌐 ${l.name}` });
                            });
                        });
                    }
                    // Handle National
                    if (data.national) {
                        data.national.forEach(country => {
                            country.leagues.forEach(l => {
                                flattened.push({ id: l.id, name: l.name, type: country.name, display: `${l.name}` });
                            });
                        });
                    }
                    setLeagues(flattened);
                }
            } catch (err) {
                console.error("Leagues fetch failed", err);
            }
        };

        const fetchStatus = async () => {
            try {
                const res = await api.getForgeBuildStatus();
                if (res && typeof res === 'object') {
                    setStatus(res);
                }
            } catch (err) {
                console.error("Status fetch failed", err);
            }
        };

        fetchLeagues();
        fetchStatus();
        const interval = setInterval(fetchStatus, 3000);
        return () => clearInterval(interval);
    }, []);

    const startForge = async (leagueId) => {
        setLoading(true);
        try {
            await api.buildForgeModels({ leagueId });
        } catch (err) {
            console.error("Forge failed", err);
        } finally {
            setLoading(false);
        }
    };

    const cancelForge = async () => {
        try {
            await api.cancelForgeBuild();
        } catch (err) {
            console.error("Cancel failed", err);
        }
    };

    const filteredLeagues = useMemo(() => {
        if (!searchTerm) return leagues;
        const s = searchTerm.toLowerCase();
        return leagues.filter(l =>
            l.name.toLowerCase().includes(s) ||
            l.type.toLowerCase().includes(s)
        );
    }, [leagues, searchTerm]);

    const columns = [
        {
            dataIndex: 'type',
            title: 'Region',
            render: (type) => <Badge variant="neutral">{type}</Badge>
        },
        {
            dataIndex: 'name',
            title: 'Competition',
            render: (name, row) => <span className="ds-font-bold">{row.display}</span>
        },
        {
            dataIndex: 'action',
            title: 'Command',
            render: (_, row) => (
                <Button
                    size="sm"
                    variant="primary"
                    onClick={() => startForge(row.id)}
                    disabled={status.is_building || loading}
                    loading={loading && status.league_id === row.id}
                >
                    Build Models
                </Button>
            )
        }
    ];

    return (
        <Stack gap="xl">
            <Card title="The Forge" subtitle="Managed model assembly pipelines for verified competitions.">
                <Grid columns="2fr 1fr" gap="xl">
                    <Stack gap="md">
                        <Stack direction="row" className="ds-w-full">
                            <input
                                type="text"
                                placeholder="Filter competitions..."
                                className="ds-input ds-flex-1"
                                style={{
                                    background: 'rgba(255,255,255,0.03)',
                                    border: '1px solid rgba(255,255,255,0.08)',
                                    color: 'white',
                                    padding: '10px 14px',
                                    borderRadius: '8px',
                                    width: '100%',
                                    outline: 'none'
                                }}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </Stack>
                        <div style={{ maxHeight: '400px', overflowY: 'auto', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '8px' }}>
                            <Table
                                columns={columns}
                                data={filteredLeagues}
                                className="ds-table-compact"
                            />
                        </div>
                    </Stack>

                    <Stack gap="lg" align="center" justify="center" className="ds-bg-neutral-900 ds-p-lg ds-rounded-lg">
                        <Stack gap="sm" align="center">
                            <div className={`ds-text-3xl ${status.is_building ? 'ds-animate-pulse' : ''}`}>
                                {status.is_building ? '🔥' : '⚒️'}
                            </div>
                            <h4 className="ds-font-bold">{status.is_building ? 'Forge Active' : 'Forge Standby'}</h4>
                            <span className="ds-text-xs ds-text-neutral-500 mb-xs">
                                {status.is_building ? `Building L#${status.league_id}` : 'Infrastructure ready'}
                            </span>
                            {status.is_building && (
                                <Button variant="danger" size="sm" onClick={cancelForge}>
                                    Emergency Stop
                                </Button>
                            )}
                        </Stack>
                    </Stack>
                </Grid>
            </Card>

            {status.is_building && (
                <Card title="Process Telemetry" subtitle="Assembly integrity monitor.">
                    <Stack gap="md">
                        <Stack direction="row" className="ds-justify-between ds-items-center">
                            <span className="ds-text-sm">Global Progress</span>
                            <span className="ds-font-bold ds-text-sm">{status.progress || 0}%</span>
                        </Stack>
                        <Progress value={status.progress || 0} variant="primary" />
                        <Stack className="ds-bg-black ds-p-md ds-rounded ds-min-h-[60px]">
                            <span className="ds-text-xs ds-font-mono ds-text-success-400">
                                {status.logs?.[status.logs.length - 1] || 'Synchronizing neural mesh...'}
                            </span>
                        </Stack>
                    </Stack>
                </Card>
            )}
        </Stack>
    );
};

export default MLModelFactory;
