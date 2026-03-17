import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Badge, Button, Skeleton, Table } from '../../../../design-system';
import api from '../../../../services/api';
import { useSearchParams } from 'react-router-dom';
import { MLHubFiltersBar, MLHubHero, MLHubMetricStrip, MLHubSection } from './shared/MLHubSurface';
import MLHubGlossaryFooter from './shared/MLHubGlossaryFooter';
import { fmtDecimal, fmtPct } from './shared/mlUtils';
import './MLLeaguePremiumPage.css';

const MARKET_OPTIONS = [
    { value: 'FT_1X2', label: '1X2 FT' },
    { value: 'HT_1X2', label: '1X2 HT' },
    { value: 'GOALS_OU', label: 'Goals O/U' },
    { value: 'CORNERS_OU', label: 'Corners O/U' },
    { value: 'CARDS_OU', label: 'Cards O/U' },
];

const buildLeagueRows = (runs, leagueId, seasonYear) => {
    return (runs || [])
        .filter((run) => String(run.league_id) === String(leagueId) && String(run.season_year) === String(seasonYear))
        .map((run) => {
            const markets = run.metrics?.markets || {};
            return {
                ...run,
                marketRows: MARKET_OPTIONS.map((market) => ({
                    ...market,
                    metrics: markets[market.value] || null,
                })),
            };
        })
        .sort((a, b) => Number(b.id) - Number(a.id));
};

const MLLeaguePremiumPage = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const [runs, setRuns] = useState([]);
    const [filters, setFilters] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedLeagueId, setSelectedLeagueId] = useState('');
    const [selectedSeason, setSelectedSeason] = useState('');

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const [allRuns, filterRows] = await Promise.all([
                api.getAllSimulationJobs(),
                api.getMLSimulationFilters().catch(() => []),
            ]);
            setRuns(Array.isArray(allRuns) ? allRuns : []);
            setFilters(Array.isArray(filterRows) ? filterRows : []);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    const leagues = useMemo(() => {
        const map = new Map();
        for (const row of filters) {
            const key = String(row.league_id);
            if (!map.has(key)) {
                map.set(key, {
                    leagueId: key,
                    leagueName: row.league_name,
                    countryName: row.country_name || '',
                    seasons: [],
                });
            }
            map.get(key).seasons.push(String(row.season_year));
        }
        return [...map.values()]
            .map((league) => ({
                ...league,
                seasons: [...new Set(league.seasons)].sort((a, b) => Number(b) - Number(a)),
            }))
            .sort((a, b) => a.leagueName.localeCompare(b.leagueName));
    }, [filters]);

    useEffect(() => {
        if (!leagues.length) return;
        const leagueFromQuery = searchParams.get('leagueId');
        const seasonFromQuery = searchParams.get('season');
        if (leagueFromQuery && leagues.some((league) => league.leagueId === leagueFromQuery)) {
            setSelectedLeagueId(leagueFromQuery);
            const league = leagues.find((item) => item.leagueId === leagueFromQuery);
            if (seasonFromQuery && league?.seasons.includes(seasonFromQuery)) {
                setSelectedSeason(seasonFromQuery);
            } else if (!selectedSeason) {
                setSelectedSeason(league?.seasons[0] || '');
            }
            return;
        }
        if (!selectedLeagueId) {
            setSelectedLeagueId(leagues[0].leagueId);
            setSelectedSeason(leagues[0].seasons[0] || '');
        }
    }, [leagues, searchParams, selectedLeagueId, selectedSeason]);

    const selectedLeague = useMemo(
        () => leagues.find((league) => league.leagueId === selectedLeagueId) || null,
        [leagues, selectedLeagueId]
    );

    useEffect(() => {
        if (!selectedLeague) return;
        if (!selectedLeague.seasons.includes(selectedSeason)) {
            setSelectedSeason(selectedLeague.seasons[0] || '');
        }
    }, [selectedLeague, selectedSeason]);

    useEffect(() => {
        const params = new URLSearchParams();
        if (selectedLeagueId) params.set('leagueId', selectedLeagueId);
        if (selectedSeason) params.set('season', selectedSeason);
        setSearchParams(params, { replace: true });
    }, [selectedLeagueId, selectedSeason, setSearchParams]);

    const leagueRuns = useMemo(
        () => buildLeagueRows(runs, selectedLeagueId, selectedSeason),
        [runs, selectedLeagueId, selectedSeason]
    );

    const filterControls = [
        {
            id: 'league',
            label: 'Ligue',
            value: selectedLeagueId,
            onChange: setSelectedLeagueId,
            searchable: true,
            options: leagues.map((league) => ({
                value: league.leagueId,
                label: league.countryName ? `${league.countryName} · ${league.leagueName}` : league.leagueName,
            })),
        },
        {
            id: 'season',
            label: 'Saison',
            value: selectedSeason,
            onChange: setSelectedSeason,
            options: (selectedLeague?.seasons || []).map((season) => ({ value: season, label: season })),
        },
    ];

    const topMetrics = [
        {
            label: 'Ligue',
            value: selectedLeague?.leagueName || '—',
            subValue: selectedLeague?.countryName || 'Sélectionne une ligue',
            featured: true,
        },
        {
            label: 'Saison',
            value: selectedSeason || '—',
            subValue: 'Fenêtre actuellement analysée',
        },
        {
            label: 'Runs',
            value: String(leagueRuns.length),
            subValue: 'Historique disponible',
        },
        {
            label: 'Marchés couverts',
            value: '5',
            subValue: 'FT, HT, goals, corners, cards',
        },
    ];

    const runColumns = [
        {
            key: 'run',
            title: 'Run',
            render: (_, run) => (
                <div className="ml-league-premium__run-cell">
                    <strong>Run #{run.id}</strong>
                    <span>{run.horizon_type}</span>
                </div>
            ),
        },
        {
            key: 'status',
            title: 'Statut',
            dataIndex: 'status',
            render: (value) => <Badge variant={value === 'COMPLETED' ? 'success' : 'neutral'} size="sm">{value}</Badge>,
        },
        {
            key: 'ft',
            title: 'FT',
            render: (_, run) => run.marketRows.find((market) => market.value === 'FT_1X2')?.metrics
                ? `Acc ${fmtPct(run.marketRows.find((market) => market.value === 'FT_1X2').metrics.accuracy)} · LL ${fmtDecimal(run.marketRows.find((market) => market.value === 'FT_1X2').metrics.log_loss)}`
                : '—',
        },
        {
            key: 'ht',
            title: 'HT',
            render: (_, run) => run.marketRows.find((market) => market.value === 'HT_1X2')?.metrics
                ? `Acc ${fmtPct(run.marketRows.find((market) => market.value === 'HT_1X2').metrics.accuracy)} · LL ${fmtDecimal(run.marketRows.find((market) => market.value === 'HT_1X2').metrics.log_loss)}`
                : '—',
        },
        {
            key: 'goals',
            title: 'Goals',
            render: (_, run) => run.marketRows.find((market) => market.value === 'GOALS_OU')?.metrics
                ? `Hit ${fmtPct(run.marketRows.find((market) => market.value === 'GOALS_OU').metrics.hit_rate)} · MAE ${fmtDecimal(run.marketRows.find((market) => market.value === 'GOALS_OU').metrics.mae_total)}`
                : '—',
        },
        {
            key: 'corners',
            title: 'Corners',
            render: (_, run) => run.marketRows.find((market) => market.value === 'CORNERS_OU')?.metrics
                ? `Hit ${fmtPct(run.marketRows.find((market) => market.value === 'CORNERS_OU').metrics.hit_rate)} · MAE ${fmtDecimal(run.marketRows.find((market) => market.value === 'CORNERS_OU').metrics.mae_total)}`
                : '—',
        },
        {
            key: 'cards',
            title: 'Cards',
            render: (_, run) => run.marketRows.find((market) => market.value === 'CARDS_OU')?.metrics
                ? `Hit ${fmtPct(run.marketRows.find((market) => market.value === 'CARDS_OU').metrics.hit_rate)} · MAE ${fmtDecimal(run.marketRows.find((market) => market.value === 'CARDS_OU').metrics.mae_total)}`
                : '—',
        },
    ];

    return (
        <div className="ml-league-premium">
            <MLHubHero
                badge={{ label: 'League Command', variant: 'primary' }}
                title="Ligue Premium"
                subtitle="Lire une compétition comme un objet produit: horizons, runs, marchés forts et points faibles."
                actions={<Button variant="ghost" onClick={load}>Rafraîchir</Button>}
            />

            {loading ? (
                <div className="ml-league-premium__loading">
                    <Skeleton height="48px" />
                    <Skeleton height="48px" />
                </div>
            ) : (
                <MLHubFiltersBar filters={filterControls} />
            )}

            <MLHubMetricStrip metrics={topMetrics} />

            <MLHubSection
                title="Runs de la ligue"
                subtitle="Comparer les horizons et les marchés sur une seule table claire."
                badge={selectedLeague ? { label: `${selectedLeague.leagueName} · ${selectedSeason}`, variant: 'neutral' } : null}
            >
                <Table
                    columns={runColumns}
                    data={leagueRuns}
                    rowKey="id"
                    className="ml-league-premium__run-table"
                />
            </MLHubSection>
            <MLHubGlossaryFooter topic="analytics" />
        </div>
    );
};

export default MLLeaguePremiumPage;
