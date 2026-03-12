import React, { useState, useEffect } from 'react';
import { Card, Grid, Stack, Badge } from '../../../../../design-system';
import api from '../../../../../services/api';

const MLPulse = () => {
    const [status, setStatus] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStatus = async () => {
            try {
                const res = await api.getMLOrchestratorStatus();
                // api service already unwraps the 'data' field
                setStatus(res);
            } catch (err) {
                console.error("Pulse fetch failed", err);
            } finally {
                setLoading(false);
            }
        };

        fetchStatus();
        const interval = setInterval(fetchStatus, 5000);
        return () => clearInterval(interval);
    }, []);

    if (loading && !status) return <Card title="System Intelligence" subtitle="Connecting to ML Engine...">Loading telemetry...</Card>;

    return (
        <Card title="System Intelligence" subtitle={`Engine: ${status?.version || 'Unknown'}`}>
            <Grid columns="repeat(auto-fit, minmax(200px, 1fr))" gap="lg">
                <Stack gap="xs">
                    <span className="ds-text-xs ds-text-dim ds-uppercase ds-font-bold ds-tracking-wider">Engine Status</span>
                    <Stack direction="row" gap="sm" className="ds-items-center">
                        <div 
                            className="ds-w-2 ds-h-2 ds-rounded-full ds-animate-pulse" 
                            style={{ background: status?.status === 'online' ? 'var(--color-success-500)' : 'var(--color-danger-500)' }}
                        />
                        <span className="ds-font-bold ds-text-main">{status?.status?.toUpperCase() || 'OFFLINE'}</span>
                    </Stack>
                </Stack>

                <Stack gap="xs">
                    <span className="ds-text-xs ds-text-dim ds-uppercase ds-font-bold ds-tracking-wider">Model Core</span>
                    <Badge variant={status?.model_loaded ? 'success' : 'warning'}>
                        {status?.model_loaded ? 'Active' : 'Standby'}
                    </Badge>
                </Stack>

                <Stack gap="xs">
                    <span className="ds-text-xs ds-text-dim ds-uppercase ds-font-bold ds-tracking-wider">Training State</span>
                    <Badge variant={status?.training?.is_training ? 'primary' : 'neutral'}>
                        {status?.training?.is_training ? 'Training' : 'Idle'}
                    </Badge>
                </Stack>

                <Stack gap="xs">
                    <span className="ds-text-xs ds-text-dim ds-uppercase ds-font-bold ds-tracking-wider">Total Analysis</span>
                    <span className="ds-text-lg ds-font-bold ds-text-primary-400">{(status?.total_risk_rows || 0).toLocaleString()}</span>
                </Stack>
            </Grid>
        </Card>
    );
};

export default MLPulse;
