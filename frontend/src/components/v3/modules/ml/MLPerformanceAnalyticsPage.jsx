import React from 'react';
import { Badge, Button, Card, Progress, Skeleton, Table, Tabs, Stack } from '../../../../design-system';
import api from '../../../../services/api';
import { MLHubEmptyState, MLHubHero, MLHubMetricStrip, MLHubSection, MLHubFiltersBar } from './shared/MLHubSurface';
import MLHubGlossaryFooter from './shared/MLHubGlossaryFooter';
import { fmtPct, fmtDate, getOutcomeVariant } from './shared/mlUtils';
import './MLPerformanceAnalyticsPage.css';

// ─── V4 Components ───────────────────────────────────────────────────────────

const V4OverviewTab = ({ stats, loading, error }) => {
    if (loading) return <div className="ml-pa__tab-body"><Skeleton height="120px" /><Skeleton height="200px" /></div>;
    if (error)   return <div className="ml-pa__tab-body"><Card className="ml-pa__alert">{error}</Card></div>;
    if (!stats)  return <div className="ml-pa__tab-body"><MLHubEmptyState title="Aucune donnée" message="Pas de statistiques V4 disponibles." /></div>;

    return (
        <div className="ml-pa__tab-body">
            <MLHubMetricStrip metrics={[
                { label: 'Total Prédictions', value: String(stats.total_predictions), subValue: 'Historique complet' },
                { label: 'Hit Rate Global', value: fmtPct(stats.hit_rate), subValue: `Sur ${stats.hit_rate_sample} matchs`, featured: true },
                { label: 'Ligues Couvertes', value: String(stats.covered_competitions), subValue: 'Périmètre V4' },
                { label: 'Matchs à venir', value: String(stats.upcoming_with_pred), subValue: 'Avec prédictions' },
            ]} />

            <MLHubSection title="Indicateurs de Performance" subtitle="Aperçu de la fiabilité du modèle global V4 (1X2).">
                <div className="ml-pa__roi-grid">
                    <div className="ml-pa__roi-card">
                        <span>Échantillon test</span>
                        <strong>{stats.hit_rate_sample}</strong>
                    </div>
                    <div className="ml-pa__roi-card">
                        <span>Précision brute</span>
                        <strong className="is-positive">{fmtPct(stats.hit_rate, 1)}</strong>
                    </div>
                    <div className="ml-pa__roi-card">
                        <span>Modèle Actif</span>
                        <strong>v4_global_1x2</strong>
                    </div>
                </div>
            </MLHubSection>
        </div>
    );
};

const V4LeaguesTab = ({ stats, loading }) => {
    if (loading) return <div className="ml-pa__tab-body"><Skeleton height="320px" /></div>;
    if (!stats?.accuracy_by_competition?.length) return <div className="ml-pa__tab-body"><MLHubEmptyState title="Aucune donnée" message="Pas de stats par ligue." /></div>;

    const columns = [
        { key: 'name', title: 'Compétition', render: (val) => <strong>{val}</strong> },
        { key: 'total', title: 'Matchs', render: (val) => <span>{val} matchs</span> },
        { key: 'accuracy', title: 'Hit Rate', render: (val) => <strong className={val > 0.5 ? 'is-positive' : ''}>{fmtPct(val, 1)}</strong> },
    ];

    return (
        <div className="ml-pa__tab-body">
            <MLHubSection title="Précision par Compétition" subtitle="Hit rate calculé sur les matchs terminés disposant d'une prédiction V4.">
                <Table columns={columns} data={stats.accuracy_by_competition} rowKey="name" />
            </MLHubSection>
        </div>
    );
};

const V4ConfidenceTab = ({ stats, loading }) => {
    if (loading) return <div className="ml-pa__tab-body"><Skeleton height="320px" /></div>;
    if (!stats?.accuracy_by_confidence?.length) return <div className="ml-pa__tab-body"><MLHubEmptyState title="Aucune donnée" message="Pas de stats de confiance." /></div>;

    const columns = [
        { key: 'range', title: 'Palier de Confiance', render: (val) => <strong>{val}</strong> },
        { key: 'total', title: 'Volume', render: (val) => <span>{val} prédictions</span> },
        { key: 'accuracy', title: 'Hit Rate Réel', render: (val) => (
            <div className="ml-pa__cell">
                <strong className={val > 0.6 ? 'is-positive' : ''}>{val != null ? fmtPct(val, 1) : '—'}</strong>
                <Progress value={(val || 0) * 100} size="xs" variant={val > 0.6 ? 'success' : 'primary'} />
            </div>
        )},
    ];

    return (
        <div className="ml-pa__tab-body">
            <MLHubSection title="Analyse de Fiabilité" subtitle="Comparaison entre la probabilité prédite et le résultat réel.">
                <Table columns={columns} data={stats.accuracy_by_confidence} rowKey="range" />
                <p className="ml-pa__empty-note" style={{ marginTop: 'var(--space-md)' }}>
                    Note : Un modèle bien calibré doit avoir un Hit Rate proche de son palier de confiance (ex: ~75% de réussite pour le palier 70-80%).
                </p>
            </MLHubSection>
        </div>
    );
};

const V4HistoryTab = ({ competitions = [] }) => {
    const [rows, setRows] = React.useState([]);
    const [total, setTotal] = React.useState(0);
    const [loading, setLoading] = React.useState(true);
    const [page, setPage] = React.useState(0);
    const [compId, setCompId] = React.useState('');
    const PAGE_SIZE = 50;

    const loadHistory = React.useCallback(async () => {
        setLoading(true);
        try {
            const params = {
                limit: PAGE_SIZE,
                offset: page * PAGE_SIZE,
                competition_id: compId || undefined
            };
            const res = await api.getV4PredictionHistory(params);
            setRows(res.rows || []);
            setTotal(res.total || 0);
        } catch (err) {
            console.error('History load error:', err);
        } finally {
            setLoading(false);
        }
    }, [page, compId]);

    React.useEffect(() => { loadHistory(); }, [loadHistory]);

    const handleCompChange = (newId) => {
        setCompId(newId);
        setPage(0);
    };

    const columns = [
        { key: 'match_date', title: 'Date', render: (val) => <span className="ml-pa__date">{fmtDate(val)}</span> },
        { key: 'competition_name', title: 'Ligue', render: (val) => <Badge variant="neutral" size="sm" ghost>{val}</Badge> },
        { 
            key: 'match', 
            title: 'Match', 
            render: (_, row) => (
                <div className="ml-pa__match-cell">
                    <div className="ml-pa__team">
                        {row.home_logo && <img src={row.home_logo} alt="" className="ml-pa__logo" />}
                        <span>{row.home_team}</span>
                    </div>
                    <span className="ml-pa__vs">vs</span>
                    <div className="ml-pa__team">
                        <span>{row.away_team}</span>
                        {row.away_logo && <img src={row.away_logo} alt="" className="ml-pa__logo" />}
                    </div>
                </div>
            )
        },
        { 
            key: 'actual_score', 
            title: 'Score', 
            render: (_, row) => (
                <div className="ml-pa__score-capsule">
                    {row.actual_home} - {row.actual_away}
                </div>
            ) 
        },
        { 
            key: 'predicted_outcome', 
            title: 'Prédit', 
            render: (val, row) => (
                <div className="ml-pa__pred-cell">
                    <strong>{val === 'N' ? 'Nul' : (val === '1' ? 'Dom.' : 'Ext.')}</strong>
                    <span className="ml-pa__prob">({fmtPct(row.was_correct ? Math.max(row.prob_home, row.prob_draw, row.prob_away) : 0, 1)})</span>
                </div>
            )
        },
        { 
            key: 'was_correct', 
            title: 'Résultat', 
            render: (val) => (
                <Badge variant={getOutcomeVariant(val)} size="sm">
                    {val ? 'HIT' : 'MISS'}
                </Badge>
            )
        }
    ];

    const totalPages = Math.ceil(total / PAGE_SIZE);

    return (
        <div className="ml-pa__tab-body">
            <MLHubFiltersBar 
                filters={[
                    {
                        id: 'comp',
                        label: 'Compétition',
                        value: compId,
                        onChange: handleCompChange,
                        options: [
                            { value: '', label: 'Toutes les ligues' },
                            ...competitions.map(c => ({ value: c.competitionId, label: c.competitionName }))
                        ]
                    }
                ]}
                actions={
                    <div className="ml-pa__pagination">
                        <Button variant="ghost" size="sm" onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}>Prec.</Button>
                        <span className="ml-pa__page-info">Page {page + 1} / {Math.max(1, totalPages)}</span>
                        <Button variant="ghost" size="sm" onClick={() => setPage(p => p + 1)} disabled={page >= totalPages - 1}>Suiv.</Button>
                    </div>
                }
            />

            <MLHubSection title="Historique des Prédictions V4" subtitle="Liste chronologique des prévisions passées et leur résultat réel.">
                {loading ? <Skeleton height="400px" /> : <Table columns={columns} data={rows} rowKey="match_id" />}
            </MLHubSection>
        </div>
    );
};

// ─── Main component ───────────────────────────────────────────────────────────

const TABS = [
    { id: 'overview',   label: 'Vue d\'ensemble' },
    { id: 'leagues',    label: 'Précision par Ligue' },
    { id: 'confidence', label: 'Analyse de Confiance' },
    { id: 'history',    label: 'Historique des Matchs' },
];

const MLPerformanceAnalyticsPage = () => {
    const [activeTab, setActiveTab] = React.useState('overview');
    const [stats, setStats]         = React.useState(null);
    const [loading, setLoading]     = React.useState(true);
    const [error, setError]         = React.useState(null);
    const [competitions, setCompetitions] = React.useState([]);

    const load = React.useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await api.getV4MLStats();
            // api helper already returns body.data if success is true
            setStats(res);

            // Also load competitions for history filter
            const compRes = await api.getV4ForesightCompetitions();
            setCompetitions(compRes || []);
        } catch (err) {
            setError(err.message || 'Impossible de charger la page Performance V4.');
        } finally {
            setLoading(false);
        }
    }, []);

    React.useEffect(() => { load(); }, [load]);

    return (
        <div className="ml-pa">
            <MLHubHero
                badge={{ label: 'V4 Analytics', variant: 'primary' }}
                title="Performance & Analytics V4"
                subtitle="Analyse de précision des modèles globaux · Fiabilité par ligue · Calibration de la confiance"
            />

            <div className="ml-pa__tabs-bar">
                <Tabs items={TABS} activeId={activeTab} onChange={setActiveTab} variant="pills" />
                <Button variant="ghost" size="sm" onClick={load} style={{ marginLeft: 'auto' }}>Rafraîchir</Button>
            </div>

            {activeTab === 'overview'   && <V4OverviewTab   stats={stats} loading={loading} error={error} />}
            {activeTab === 'leagues'    && <V4LeaguesTab    stats={stats} loading={loading} />}
            {activeTab === 'confidence' && <V4ConfidenceTab stats={stats} loading={loading} />}
            {activeTab === 'history'    && <V4HistoryTab    competitions={competitions} />}

            <MLHubGlossaryFooter topic="analytics" />
        </div>
    );
};

export default MLPerformanceAnalyticsPage;
