import React, { useState, useEffect, useMemo } from 'react';
import PropTypes from 'prop-types';
import { Card, Grid, Stack, Badge, Button, Table, Progress, Input } from '../../../../../design-system';

import api from '../../../../../services/api';

const processLeagues = (data) => {
    const flattened = [];
    if (data.international) {
        data.international.world?.forEach(l => flattened.push({ id: l.id, name: l.name, type: 'World', display: `🌍 ${l.name}` }));
        Object.entries(data.international.continental || {}).forEach(([continent, list]) => {
            list.forEach(l => flattened.push({ id: l.id, name: l.name, type: continent, display: `🌐 ${l.name}` }));
        });
    }
    if (data.national) {
        data.national.forEach(country => {
            country.leagues.forEach(l => flattened.push({ id: l.id, name: l.name, type: country.name, display: `${l.name}` }));
        });
    }
    return flattened;
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
        progress: PropTypes.number,
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
        progress: PropTypes.number,
        logs: PropTypes.arrayOf(PropTypes.string)
    }).isRequired
};

const MLModelFactory = () => {
    const [leagues, setLeagues] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [status, setStatus] = useState({ is_building: false });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        api.getStructuredLeagues().then(res => setLeagues(processLeagues(res.data || res))).catch(e => console.error(e));
        const fetchStatus = () => api.getForgeBuildStatus().then(res => res && setStatus(res)).catch(e => console.error(e));
        fetchStatus();
        const interval = setInterval(fetchStatus, 3000);
        return () => clearInterval(interval);
    }, []);

    const startForge = async (leagueId) => { setLoading(true); try { await api.buildForgeModels({ leagueId }); } catch (e) { console.error(e); } finally { setLoading(false); } };
    const cancelForge = async () => { try { await api.cancelForgeBuild(); } catch (e) { console.error(e); } };

    const filteredLeagues = useMemo(() => searchTerm ? leagues.filter(l => l.name.toLowerCase().includes(searchTerm.toLowerCase()) || l.type.toLowerCase().includes(searchTerm.toLowerCase())) : leagues, [leagues, searchTerm]);

    const columns = [
        { dataIndex: 'type', title: 'Region', render: (type) => <Badge variant="neutral">{type}</Badge> },
        { dataIndex: 'name', title: 'Competition', render: (_, row) => <span className="ds-font-bold">{row.display}</span> },
        { dataIndex: 'action', title: 'Command', render: (_, row) => <Button size="sm" variant="primary" onClick={() => startForge(row.id)} disabled={status.is_building || loading} loading={loading && status.league_id === row.id}>Build Models</Button> }
    ];

    return (
        <Stack gap="xl">
            <ForgeControlCard searchTerm={searchTerm} setSearchTerm={setSearchTerm} columns={columns} filteredLeagues={filteredLeagues} status={status} loading={loading} cancelForge={cancelForge} />
            {status.is_building && <ForgeTelemetryCard status={status} />}
        </Stack>
    );
};

export default MLModelFactory;
