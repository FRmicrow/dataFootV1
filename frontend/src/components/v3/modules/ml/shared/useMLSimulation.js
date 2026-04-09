import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import api from '../../../../../services/api';
import { fmtDecimal, fmtPct, normalizeMetrics } from './mlUtils';

const MARKET_LABELS = {
    FT_1X2: '1X2 FT',
    HT_1X2: '1X2 HT',
    GOALS_OU: 'Goals O/U',
    CORNERS_OU: 'Corners O/U',
    CARDS_OU: 'Cards O/U',
};

/**
 * Custom hook to manage ML simulation lifecycle, status, and results.
 */
export const useMLSimulation = (initialParams = {}) => {
    const [status, setStatus] = useState(null);
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [readiness, setReadiness] = useState(null);
    const [readinessLoading, setReadinessLoading] = useState(false);
    const [activeSimulationId, setActiveSimulationId] = useState(null);
    const activeSimulationIdRef = useRef(null);

    const fetchResults = useCallback(async (simId) => {
        if (!simId) {
            setResults([]);
            return;
        }

        setLoading(true);
        try {
            const rows = await api.getSimulationResults(simId);
            setResults(Array.isArray(rows) ? rows : []);
        } catch (err) {
            setError(err.message || 'Impossible de charger les résultats.');
            setResults([]);
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchStatusBundle = useCallback(async (leagueId, seasonYear, horizon, simId) => {
        if (!leagueId || !seasonYear) return;

        const currentSimId = simId || activeSimulationIdRef.current;
        setError(null);

        try {
            const statusResponse = await api.getSimulationStatus(leagueId, seasonYear, horizon, currentSimId);
            setStatus(statusResponse);

            if (statusResponse?.id) {
                activeSimulationIdRef.current = statusResponse.id;
                setActiveSimulationId(statusResponse.id);
            }

            const resultRunId = statusResponse?.id || currentSimId;
            if (resultRunId) {
                await fetchResults(resultRunId);
            }
        } catch (err) {
            setError(err.message || 'Impossible de charger le run de simulation.');
            setStatus(null);
            setResults([]);
        }
    }, [fetchResults]);

    const fetchReadiness = useCallback(async (leagueId, seasonYear) => {
        if (!leagueId || !seasonYear) return;

        setReadinessLoading(true);
        try {
            const data = await api.getSimulationReadiness(leagueId, seasonYear);
            setReadiness(data);
        } catch (err) {
            setReadiness({
                status: 'BLOCKED',
                message: err.message || 'Impossible de vérifier la readiness.',
            });
        } finally {
            setReadinessLoading(false);
        }
    }, []);

    const startSimulation = useCallback(async (params) => {
        const { leagueId, seasonYear, horizon, mode = 'STATIC' } = params;
        if (!leagueId || !seasonYear) return;

        setLoading(true);
        setError(null);

        try {
            const response = await api.startSimulation({
                leagueId: Number(leagueId),
                seasonYear: Number(seasonYear),
                mode,
                horizon,
            });

            const launchedId = response?.simulation_id || null;
            activeSimulationIdRef.current = launchedId;
            setActiveSimulationId(launchedId);
            
            // Start polling if needed by returning the ID
            return launchedId;
        } catch (err) {
            setError(err.message || 'Le lancement de la simulation a échoué.');
            throw err;
        } finally {
            setLoading(false);
        }
    }, []);

    // Polling effect
    useEffect(() => {
        const currentStatus = status?.status;
        if (currentStatus !== 'RUNNING' && currentStatus !== 'PENDING') return undefined;

        // Note: Polling requires closure over current scope or better yet, a way to refresh
        // For simplicity, we expose a refresh function or the caller manages the interval
        // But we could implement internal polling here if we had all params.
    }, [status]);

    const marketSummaries = useMemo(() => {
        const markets = status?.metrics?.markets || {};

        return Object.entries(markets).map(([marketKey, metrics]) => {
            const primaryMetric = marketKey === 'FT_1X2' || marketKey === 'HT_1X2'
                ? { label: 'Accuracy', value: fmtPct(metrics?.accuracy) }
                : { label: 'Hit rate', value: fmtPct(metrics?.hit_rate) };

            const secondaryMetrics = marketKey === 'FT_1X2' || marketKey === 'HT_1X2'
                ? [
                    { label: 'Brier', value: fmtDecimal(metrics?.brier_score) },
                    { label: 'Log loss', value: fmtDecimal(metrics?.log_loss) },
                ]
                : [
                    { label: 'MAE', value: fmtDecimal(metrics?.mae_total) },
                    { label: 'Samples', value: Number.isFinite(Number(metrics?.samples)) ? String(metrics.samples) : '—' },
                ];

            return {
                value: marketKey,
                label: MARKET_LABELS[marketKey] || marketKey,
                metrics: [primaryMetric, ...secondaryMetrics],
            };
        });
    }, [status]);

    const summaryMetrics = useMemo(() => {
        const rawSummary = status?.metrics || status?.summary_metrics || null;
        return normalizeMetrics(rawSummary);
    }, [status]);

    return {
        status,
        results,
        loading,
        error,
        readiness,
        readinessLoading,
        activeSimulationId,
        fetchStatusBundle,
        fetchResults,
        fetchReadiness,
        startSimulation,
        setStatus,
        setResults,
        setActiveSimulationId,
        marketSummaries,
        summaryMetrics,
    };
};
