import React, { useState, useEffect, useCallback } from 'react';
import { Card, Badge, Button, Skeleton, Stack } from '../../../../design-system';
import api from '../../../../services/api';
import './MLOrchestratorPage.css';

const fmtTime = (d) => {
    if (!d) return '—';
    const diff = Date.now() - new Date(d).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'À l\'instant';
    if (mins < 60) return `Il y a ${mins} min`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `Il y a ${hrs}h`;
    return `Il y a ${Math.floor(hrs / 24)}j`;
};

const MARKET_LABELS = {
    '1N2_FT': '1X2 FT', '1N2_HT': '1X2 HT',
    'CORNERS_OU': 'Corners', 'CARDS_OU': 'Cards',
};

const StatusCard = ({ title, icon, isOnline, isWarning, details }) => {
    const dotColor = isOnline ? 'var(--color-success)' : isWarning ? 'var(--color-warning)' : 'var(--color-error)';
    return (
        <Card className="ml-orch__status-card">
            <div className="ml-orch__status-header">
                <span className="ml-orch__status-icon">{icon}</span>
                <h3 className="ml-orch__status-title">{title}</h3>
                <span className="ml-orch__status-dot" style={{ background: dotColor }} />
            </div>
            <div className="ml-orch__status-details">
                {details.map((d, i) => (
                    <div key={i} className="ml-orch__status-detail">
                        <span className="ml-orch__detail-label">{d.label}</span>
                        <span className="ml-orch__detail-value">{d.value}</span>
                    </div>
                ))}
            </div>
        </Card>
    );
};

const FeedItem = ({ item }) => (
    <div className="ml-orch__feed-item">
        <div className="ml-orch__feed-dot" />
        <div className="ml-orch__feed-content">
            <div className="ml-orch__feed-main">
                <span className="ml-orch__feed-teams">{item.home_team} vs {item.away_team}</span>
                <Badge variant="default">{MARKET_LABELS[item.market_type] ?? item.market_type}</Badge>
                <span className="ml-orch__feed-prob">{Math.round(item.ml_probability * 100)}%</span>
            </div>
            <div className="ml-orch__feed-meta">
                <span>{item.league_name}</span>
                <span>{fmtTime(item.analyzed_at)}</span>
            </div>
        </div>
    </div>
);

const MLOrchestratorPage = () => {
    const [orchData, setOrchData] = useState(null);
    const [feed, setFeed] = useState([]);
    const [leagueStats, setLeagueStats] = useState([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState({});
    const [actionMsg, setActionMsg] = useState(null);

    const load = useCallback(() => {
        setLoading(true);
        Promise.all([
            api.getMLOrchestratorStatus(),
            api.getMLRecentAnalyses(),
            api.getMLSimulationOverview(),
        ]).then(([orch, analyses, overview]) => {
            setOrchData(orch);
            setFeed(Array.isArray(analyses) ? analyses.slice(0, 8) : []);
            // Group overview by league (take best season per league)
            const byLeague = {};
            for (const r of (Array.isArray(overview) ? overview : [])) {
                const k = r.league_id;
                if (!byLeague[k] || r.season_year > byLeague[k].season_year) byLeague[k] = r;
            }
            setLeagueStats(Object.values(byLeague)
                .sort((a, b) => (a.country_importance_rank ?? 99) - (b.country_importance_rank ?? 99) || (a.league_importance_rank ?? 99) - (b.league_importance_rank ?? 99))
                .slice(0, 20)
            );
        }).catch(() => setOrchData(null))
          .finally(() => setLoading(false));
    }, []);

    useEffect(() => { load(); }, [load]);

    const runAction = async (key, apiFn, successMsg) => {
        setActionLoading(prev => ({ ...prev, [key]: true }));
        setActionMsg(null);
        try {
            await apiFn();
            setActionMsg({ type: 'success', text: successMsg });
            setTimeout(load, 1500);
        } catch (e) {
            setActionMsg({ type: 'error', text: e.message ?? 'Erreur' });
        } finally {
            setActionLoading(prev => ({ ...prev, [key]: false }));
        }
    };

    const isOnline = orchData?.status === 'online';

    return (
        <div className="ml-orch">
            <div className="ml-orch__header">
                <h2 className="ml-orch__title">⚙️ Système</h2>
                <Button variant="ghost" onClick={load} disabled={loading}>🔄 Rafraîchir</Button>
            </div>

            {/* Status Grid */}
            <div className="ml-orch__status-grid">
                {loading ? (
                    [1,2,3].map(i => <Skeleton key={i} height="130px" />)
                ) : (
                    <>
                        <StatusCard
                            title="ML Service"
                            icon="🧠"
                            isOnline={isOnline}
                            details={[
                                { label: 'Statut',       value: isOnline ? '● ONLINE' : '○ OFFLINE' },
                                { label: 'Version',      value: orchData?.version ?? '—' },
                                { label: 'Modèle',       value: orchData?.model_loaded ? '✓ Chargé' : '✗ Non chargé' },
                                { label: 'Entraînement', value: orchData?.training ? '⟳ En cours' : 'Inactif' },
                            ]}
                        />
                        <StatusCard
                            title="Prédictions"
                            icon="📊"
                            isOnline={(orchData?.total_risk_rows ?? 0) > 0}
                            details={[
                                { label: 'Total',      value: orchData?.total_risk_rows?.toLocaleString() ?? '—' },
                                { label: 'Par ligue',  value: leagueStats.length > 0 ? `${leagueStats.length} ligues` : '—' },
                                { label: 'Feed',       value: `${feed.length} entrées` },
                            ]}
                        />
                        <StatusCard
                            title="Données"
                            icon="🗄️"
                            isOnline
                            details={[
                                { label: 'PostgreSQL', value: '● Connecté' },
                                { label: 'Odds sync',  value: 'Manuel' },
                            ]}
                        />
                    </>
                )}
            </div>

            {actionMsg && (
                <div className={`ml-orch__action-msg ml-orch__action-msg--${actionMsg.type}`}>
                    {actionMsg.type === 'success' ? '✓' : '⚠️'} {actionMsg.text}
                </div>
            )}

            <div className="ml-orch__body">
                {/* Per-League Results */}
                <div className="ml-orch__feed-section">
                    <h3 className="ml-orch__section-title">Performance par Ligue</h3>
                    <Card className="ml-orch__feed-card">
                        {loading ? (
                            [1,2,3].map(i => <Skeleton key={i} height="36px" className="ds-mb-xs" />)
                        ) : leagueStats.length === 0 ? (
                            <p className="ml-orch__feed-empty">Aucune simulation disponible. Lance une Simulation Bulk →</p>
                        ) : (
                            <table className="ml-orch__league-table">
                                <thead>
                                    <tr>
                                        <th>Ligue</th>
                                        <th>Saison</th>
                                        <th>Hit Rate</th>
                                        <th>Brier</th>
                                        <th>1X2 FT</th>
                                        <th>1X2 HT</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {leagueStats.map((r, i) => (
                                        <tr key={i}>
                                            <td className="ml-orch__league-name">{r.league_name}</td>
                                            <td>{r.season_year}</td>
                                            <td><span className={`ml-orch__hr ml-orch__hr--${r.global_hit_rate >= 0.6 ? 'good' : r.global_hit_rate >= 0.5 ? 'ok' : 'low'}`}>{r.global_hit_rate != null ? `${Math.round(r.global_hit_rate * 100)}%` : '—'}</span></td>
                                            <td>{r.brier_score != null ? r.brier_score.toFixed(3) : '—'}</td>
                                            <td>{r.market_1n2_ft != null ? `${Math.round(r.market_1n2_ft * 100)}%` : '—'}</td>
                                            <td>{r.market_1n2_ht != null ? `${Math.round(r.market_1n2_ht * 100)}%` : '—'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </Card>

                    <h3 className="ml-orch__section-title" style={{ marginTop: 'var(--space-xl)' }}>Intelligence Feed</h3>
                    <Card className="ml-orch__feed-card">
                        {loading
                            ? [1,2,3,4].map(i => <Skeleton key={i} height="48px" className="ds-mb-sm" />)
                            : feed.length === 0
                                ? <p className="ml-orch__feed-empty">Aucune analyse récente.</p>
                                : <div className="ml-orch__feed-list">{feed.map((item, i) => <FeedItem key={i} item={item} />)}</div>
                        }
                    </Card>
                </div>

                {/* Quick Actions */}
                <div className="ml-orch__actions-section">
                    <h3 className="ml-orch__section-title">Actions Rapides</h3>
                    <div className="ml-orch__actions-grid">
                        <Card className="ml-orch__action-group">
                            <h4 className="ml-orch__action-group-title">Odds Bookmaker</h4>
                            <p className="ml-orch__action-group-desc">Requis pour calculer les edges dans Foresight Hub.</p>
                            <Stack direction="row" gap="sm" style={{ flexWrap: 'wrap' }}>
                                <Button variant="secondary" disabled={actionLoading.sync} onClick={() => runAction('sync', api.syncMLUpcomingOdds, 'Sync odds lancée ✓')}>
                                    {actionLoading.sync ? '…' : '⚡ Sync Odds'}
                                </Button>
                                <Button variant="secondary" disabled={actionLoading.advSync} onClick={() => runAction('advSync', api.syncMLAdvancedOdds, 'Sync avancée lancée ✓')}>
                                    {actionLoading.advSync ? '…' : '🔬 Sync Avancée'}
                                </Button>
                                <Button variant="ghost" disabled={actionLoading.catchup} onClick={() => runAction('catchup', api.runMLOddsCatchup, 'Catchup lancé ✓')}>
                                    {actionLoading.catchup ? '…' : '⏩ Catchup'}
                                </Button>
                            </Stack>
                        </Card>

                        <Card className="ml-orch__action-group">
                            <h4 className="ml-orch__action-group-title">Simulation Bulk</h4>
                            <p className="ml-orch__action-group-desc">Lance une simulation sur toutes les ligues. Met à jour les métriques du Performance Lab.</p>
                            <Button variant="primary" disabled={actionLoading.bulkSim} onClick={() => runAction('bulkSim', api.triggerBulkSimulation, 'Simulation bulk lancée ✓')}>
                                {actionLoading.bulkSim ? '⟳ En cours…' : '📊 Lancer Simulation Bulk'}
                            </Button>
                        </Card>

                        <Card className="ml-orch__action-group">
                            <h4 className="ml-orch__action-group-title">Réentraînement</h4>
                            <p className="ml-orch__action-group-desc">Déclenche le réentraînement du modèle principal sur les données récentes.</p>
                            <Button variant="secondary" disabled={actionLoading.retrain} onClick={() => runAction('retrain', api.triggerMLRetrain, 'Réentraînement lancé ✓')}>
                                {actionLoading.retrain ? '⟳ En cours…' : '🔄 Réentraîner'}
                            </Button>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MLOrchestratorPage;
