import React, { useState, useEffect, useMemo } from 'react';
import PropTypes from 'prop-types';
import { Card, Stack, Badge, Button, Table, Progress, Input } from '../../../../../design-system';

import api from '../../../../../services/api';

const processLeagues = (data) => {
    const flattened = [];
    if (data.international) {
        data.international.world?.forEach(l => flattened.push({ 
            id: l.id, name: l.name, type: 'World', display: `🌍 ${l.name}`,
            rank: l.rank || 999, country_rank: 0 
        }));
        Object.entries(data.international.continental || {}).forEach(([continent, list]) => {
            list.forEach(l => flattened.push({ 
                id: l.id, name: l.name, type: continent, display: `🌐 ${l.name}`,
                rank: l.rank || 999, country_rank: 1 
            }));
        });
    }
    if (data.national) {
        data.national.forEach(country => {
            country.leagues.forEach(l => flattened.push({ 
                id: l.id, name: l.name, type: country.name, display: `${l.name}`,
                rank: l.rank || 999, country_rank: country.rank || 999 
            }));
        });
    }
    
    // Sort by Country Rank then League Rank
    return flattened.sort((a, b) => a.country_rank - b.country_rank || a.rank - b.rank);
};

const ForgeControlCard = ({ searchTerm, setSearchTerm, columns, filteredLeagues, status, loading, cancelForge }) => (
    <Card title="Forge Command" subtitle="Neural assembly control.">
        <Stack gap="md">
            <Stack direction="row" gap="md">
                <Input
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Filter neural networks..."
                    className="ds-flex-1"
                />
                {status.is_building && (
                    <Button variant="warning" onClick={cancelForge}>
                        Abort Assembly
                    </Button>
                )}
            </Stack>
            <Table
                columns={columns}
                data={filteredLeagues}
                loading={loading && !status.is_building}
                rowKey="id"
            />
        </Stack>
    </Card>
);


ForgeControlCard.propTypes = {
    searchTerm: PropTypes.string.isRequired,
    setSearchTerm: PropTypes.func.isRequired,
    columns: PropTypes.arrayOf(PropTypes.shape({
        dataIndex: PropTypes.string.isRequired,
        title: PropTypes.string.isRequired,
        render: PropTypes.func
    })).isRequired,
    filteredLeagues: PropTypes.arrayOf(PropTypes.object).isRequired,
    status: PropTypes.shape({
        is_building: PropTypes.bool,
        league_id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
        progress: PropTypes.oneOfType([PropTypes.number, PropTypes.object]),
        logs: PropTypes.arrayOf(PropTypes.string)
    }).isRequired,
    loading: PropTypes.bool.isRequired,
    cancelForge: PropTypes.func.isRequired
};

const ForgeTelemetryCard = ({ status }) => (
    <Card title="Process Telemetry" subtitle="Assembly integrity monitor.">
        <Stack gap="md">
            <Stack direction="row" className="ds-justify-between ds-items-center">
                <span className="ds-text-sm">Global Progress</span>
                <span className="ds-font-bold ds-text-sm">{status.progress || 0}%</span>
            </Stack>
            <Progress value={status.progress || 0} variant="primary" />
            <Stack className="ds-bg-black ds-p-md ds-rounded ds-min-h-[60px]">
                <span className="ds-text-xs ds-font-mono ds-text-success-400">{status.logs?.[status.logs.length - 1] || 'Synchronizing neural mesh...'}</span>
            </Stack>
        </Stack>
    </Card>
);

ForgeTelemetryCard.propTypes = {
    status: PropTypes.shape({
        progress: PropTypes.oneOfType([PropTypes.number, PropTypes.object]),
        logs: PropTypes.arrayOf(PropTypes.string)
    }).isRequired
};

const MLModelFactory = () => {
    const [leagues, setLeagues] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [status, setStatus] = useState({ is_building: false });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const load = async () => {
            try {
                const [leaguesRes, modelsRes, statusRes] = await Promise.all([
                    api.getStructuredLeagues(),
                    api.getForgeModels(),
                    api.getForgeBuildStatus()
                ]);
                
                const activeModelLeagueIds = new Set((modelsRes.models || []).map(m => m.league_id));
                const processed = processLeagues(leaguesRes.data || leaguesRes).map(l => ({
                    ...l,
                    has_models: activeModelLeagueIds.has(l.id)
                }));
                
                setLeagues(processed);
                if (statusRes) setStatus(statusRes);
            } catch (e) {
                console.error("Factory load failed", e);
            }
        };

        load();
        const interval = setInterval(async () => {
            try {
                const s = await api.getForgeBuildStatus();
                if (s) setStatus(s);
            } catch (e) {}
        }, 3000);
        return () => clearInterval(interval);
    }, []);

    const startForge = async (leagueId) => { setLoading(true); try { await api.buildForgeModels({ leagueId }); } catch (e) { console.error(e); } finally { setLoading(false); } };
    const cancelForge = async () => { try { await api.cancelForgeBuild(); } catch (e) { console.error(e); } };

    const filteredLeagues = useMemo(() => searchTerm ? leagues.filter(l => l.name.toLowerCase().includes(searchTerm.toLowerCase()) || l.type.toLowerCase().includes(searchTerm.toLowerCase())) : leagues, [leagues, searchTerm]);

    const calculateAverageProgress = (progressObj) => {
        if (!progressObj || typeof progressObj !== 'object') return 0;
        const horizons = Object.values(progressObj);
        if (horizons.length === 0) return 0;
        const completed = horizons.filter(h => h === 'completed').length;
        const total = 3; // Standard set of horizons: FULL, 5Y, 3Y
        return Math.round((completed / total) * 100);
    };

    const displayProgress = useMemo(() => {
        if (typeof status.progress === 'number') return status.progress;
        return calculateAverageProgress(status.progress);
    }, [status.progress]);

    const columns = [
        { dataIndex: 'type', title: 'Region', render: (type) => <Badge variant="neutral">{type}</Badge> },
        { 
            dataIndex: 'name', 
            title: 'Competition', 
            render: (_, row) => (
                <Stack gap="none">
                    <span className="ds-font-bold ds-text-main">{row.display}</span>
                    <span className="ds-text-xs ds-text-dim">Importance: {row.rank}</span>
                </Stack>
            )
        },
        {
            dataIndex: 'has_models',
            title: 'Model Status',
            render: (has) => (
                <Badge variant={has ? 'success' : 'neutral'}>
                    {has ? 'Active Models' : 'Awaiting Forge'}
                </Badge>
            )
        },
        { 
            dataIndex: 'action', 
            title: 'Command', 
            render: (_, row) => (
                <Button 
                    size="sm" 
                    variant={row.has_models ? 'surface' : 'primary'} 
                    onClick={() => startForge(row.id)} 
                    disabled={status.is_building || loading} 
                    loading={loading && status.league_id === row.id}
                >
                    {row.has_models ? 'Rebuild' : 'Build Models'}
                </Button>
            )
        }
    ];

    const sortedLeagues = useMemo(() => {
        const filtered = searchTerm ? leagues.filter(l => l.name.toLowerCase().includes(searchTerm.toLowerCase()) || l.type.toLowerCase().includes(searchTerm.toLowerCase())) : leagues;
        return [...filtered].sort((a, b) => {
            // Unbuilt models first
            if (a.has_models !== b.has_models) return a.has_models ? 1 : -1;
            // Then by country rank
            if (a.country_rank !== b.country_rank) return a.country_rank - b.country_rank;
            // Then by league rank
            return a.rank - b.rank;
        });
    }, [leagues, searchTerm]);

    return (
        <Stack gap="xl">
            <ForgeControlCard searchTerm={searchTerm} setSearchTerm={setSearchTerm} columns={columns} filteredLeagues={sortedLeagues} status={status} loading={loading} cancelForge={cancelForge} />
            {status.is_building && <ForgeTelemetryCard status={{ ...status, progress: displayProgress }} />}
        </Stack>
    );
};

export default MLModelFactory;
