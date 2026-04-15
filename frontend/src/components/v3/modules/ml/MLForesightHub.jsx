import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Badge, Button, Skeleton, Tabs } from '../../../../design-system';
import api from '../../../../services/api';
import { MLHubEmptyState, MLHubHero, MLHubMetricStrip } from './shared/MLHubSurface';
import './MLForesightHub.css';

// ─── ProbaBar ─────────────────────────────────────────────────────────────────
const ProbaBar = ({ probs, best }) => (
    <div className="mf4__proba-bar">
        {[
            { key: '1', label: '1' },
            { key: 'N', label: 'N' },
            { key: '2', label: '2' },
        ].map(({ key, label }) => {
            const pct = Math.round((probs[key] ?? 0) * 100);
            const isBest = key === best;
            return (
                <div key={key} className={`mf4__proba-item${isBest ? ' is-best' : ''}`}>
                    <span className="mf4__proba-label">{label}</span>
                    <div className="mf4__proba-track">
                        <div className="mf4__proba-fill" style={{ width: `${pct}%` }} />
                    </div>
                    <strong className="mf4__proba-value">{pct}%</strong>
                </div>
            );
        })}
    </div>
);

// ─── MatchPredictionCard ──────────────────────────────────────────────────────
const MatchPredictionCard = ({ fixture, idx }) => {
    const ft = fixture.markets?.ftResult;
    const goals = fixture.markets?.goals;

    const date = fixture.date
        ? new Date(fixture.date).toLocaleDateString('fr-FR', {
              weekday: 'short', day: '2-digit', month: 'short',
          })
        : '—';

    return (
        <div
            className={`mf4__match-card${ft ? '' : ' mf4__match-card--pending'}`}
            style={{ animationDelay: `${idx * 25}ms` }}
        >
            <div className="mf4__match-meta">
                {fixture.round && <span className="mf4__match-round">{fixture.round}</span>}
                <span className="mf4__match-date">{date}</span>
                {!ft && <Badge variant="neutral" size="sm">En attente</Badge>}
            </div>

            <div className="mf4__teams">
                <div className="mf4__team">
                    {fixture.homeTeam?.logo && (
                        <img src={fixture.homeTeam.logo} alt="" className="mf4__team-logo" />
                    )}
                    <span className="mf4__team-name">{fixture.homeTeam?.name}</span>
                </div>
                <span className="mf4__vs">vs</span>
                <div className="mf4__team mf4__team--away">
                    <span className="mf4__team-name">{fixture.awayTeam?.name}</span>
                    {fixture.awayTeam?.logo && (
                        <img src={fixture.awayTeam.logo} alt="" className="mf4__team-logo" />
                    )}
                </div>
            </div>

            {ft?.probabilities ? (
                <ProbaBar probs={ft.probabilities} best={ft.selection} />
            ) : (
                <div className="mf4__no-pred">Prédiction indisponible</div>
            )}

            {goals?.expected_total != null && (
                <div className="mf4__goals-row">
                    <span>Buts attendus</span>
                    <strong>{Number(goals.expected_total).toFixed(2)}</strong>
                    {goals.expected_home != null && (
                        <span className="mf4__goals-split">
                            ({Number(goals.expected_home).toFixed(1)} – {Number(goals.expected_away).toFixed(1)})
                        </span>
                    )}
                </div>
            )}
        </div>
    );
};

// ─── PredictionHistoryRow ─────────────────────────────────────────────────────
const PredictionHistoryRow = ({ row, idx }) => {
    const pct = (v) => (v != null ? `${Math.round(v * 100)}%` : '—');
    const date = row.match_date
        ? new Date(row.match_date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
        : '—';

    return (
        <div className="mf4__history-row" style={{ animationDelay: `${idx * 20}ms` }}>
            <div className="mf4__history-teams">
                <div className="mf4__history-team">
                    {row.home_logo && <img src={row.home_logo} alt="" className="mf4__history-logo" />}
                    <span>{row.home_team}</span>
                </div>
                <span className="mf4__history-score">
                    {row.actual_home != null ? `${row.actual_home} – ${row.actual_away}` : 'vs'}
                </span>
                <div className="mf4__history-team mf4__history-team--away">
                    <span>{row.away_team}</span>
                    {row.away_logo && <img src={row.away_logo} alt="" className="mf4__history-logo" />}
                </div>
            </div>

            <div className="mf4__history-context">
                <span>{date}</span>
                {row.competition_name && <span className="mf4__history-comp">· {row.competition_name}</span>}
            </div>

            <div className="mf4__history-verdict">
                <span className="mf4__history-proba">
                    {pct(row.prob_home)} / {pct(row.prob_draw)} / {pct(row.prob_away)}
                </span>
                <Badge variant={row.was_correct ? 'success' : 'danger'} size="sm">
                    {row.was_correct ? 'Hit' : 'Miss'}
                </Badge>
            </div>
        </div>
    );
};

// ─── CompPicker ────────────────────────────────────────────────────────────────
const CompPicker = ({ comps, selected, onSelect }) => (
    <div className="mf4__comp-picker">
        {comps.map((comp) => (
            <button
                key={comp.competitionId}
                type="button"
                className={`mf4__comp-chip${selected === comp.competitionId ? ' is-active' : ''}`}
                onClick={() => onSelect(comp.competitionId)}
            >
                {comp.logo && <img src={comp.logo} alt="" />}
                <span>{comp.competitionName}</span>
                <Badge variant="neutral" size="sm">{comp.upcomingCount}</Badge>
            </button>
        ))}
    </div>
);

// ─── Main ─────────────────────────────────────────────────────────────────────
const HISTORY_PAGE_SIZE = 50;

const TAB_ITEMS = [
    { id: 'upcoming', label: 'Matchs à venir' },
    { id: 'history',  label: 'Résultats & hit rate' },
];

const MLForesightHub = () => {
    const [activeTab, setActiveTab] = useState('upcoming');

    // Competitions
    const [comps, setComps]               = useState([]);
    const [compsLoading, setCompsLoading] = useState(true);
    const [selectedCompId, setSelectedCompId] = useState('');

    // Stats strip
    const [stats, setStats] = useState(null);

    // Upcoming
    const [upcoming, setUpcoming]             = useState([]);
    const [upcomingLoading, setUpcomingLoading] = useState(false);
    const [upcomingError, setUpcomingError]   = useState(null);

    // History
    const [history, setHistory]               = useState([]);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [historyError, setHistoryError]     = useState(null);
    const [historyTotal, setHistoryTotal]     = useState(0);
    const [historyPage, setHistoryPage]       = useState(0);
    const [historyCompId, setHistoryCompId]   = useState(''); // '' = all comps in history tab

    // Bootstrap: competitions + stats (parallel)
    useEffect(() => {
        api.getV4ForesightCompetitions()
            .then((payload) => {
                const data = payload?.data ?? (Array.isArray(payload) ? payload : []);
                setComps(data);
                if (data.length) setSelectedCompId(data[0].competitionId);
            })
            .catch(() => setComps([]))
            .finally(() => setCompsLoading(false));

        api.getV4MLStats()
            .then((payload) => setStats(payload?.data ?? payload))
            .catch(() => {});
    }, []);

    // Upcoming matches when competition changes
    useEffect(() => {
        if (!selectedCompId) return;
        let cancelled = false;
        setUpcomingLoading(true);
        setUpcomingError(null);

        api.getV4ForesightMatches(selectedCompId)
            .then((payload) => {
                if (cancelled) return;
                setUpcoming(payload?.data ?? (Array.isArray(payload) ? payload : []));
            })
            .catch((err) => {
                if (!cancelled) setUpcomingError(err.message || 'Erreur chargement matchs.');
            })
            .finally(() => { if (!cancelled) setUpcomingLoading(false); });

        return () => { cancelled = true; };
    }, [selectedCompId]);

    // History loader
    const loadHistory = useCallback((compId, page) => {
        let cancelled = false;
        setHistoryLoading(true);
        setHistoryError(null);

        const params = { limit: HISTORY_PAGE_SIZE, offset: page * HISTORY_PAGE_SIZE };
        if (compId) params.competition_id = compId;

        api.getV4PredictionHistory(params)
            .then((payload) => {
                if (cancelled) return;
                setHistory(payload?.data ?? []);
                setHistoryTotal(payload?.total ?? 0);
            })
            .catch((err) => {
                if (!cancelled) setHistoryError(err.message || 'Erreur chargement historique.');
            })
            .finally(() => { if (!cancelled) setHistoryLoading(false); });

        return () => { cancelled = true; };
    }, []);

    useEffect(() => {
        if (activeTab === 'history') loadHistory(historyCompId, historyPage);
    }, [activeTab, historyCompId, historyPage, loadHistory]);

    // Reset page when filter changes in history
    const handleHistoryCompSelect = (id) => {
        setHistoryCompId(id);
        setHistoryPage(0);
    };

    const hitRatePct = useMemo(() => {
        if (stats?.hit_rate == null) return null;
        return `${Math.round(stats.hit_rate * 100)}%`;
    }, [stats]);

    const metricStrip = [
        {
            label: 'Matchs prédits',
            value: stats?.upcoming_with_pred != null ? String(stats.upcoming_with_pred) : '…',
            subValue: 'Matchs à venir avec ML V4',
            featured: true,
        },
        {
            label: 'Hit rate',
            value: hitRatePct ?? '…',
            subValue: stats?.hit_rate_sample ? `Sur ${stats.hit_rate_sample} derniers matchs` : 'Sur 500 derniers matchs',
        },
        {
            label: 'Compétitions',
            value: stats?.covered_competitions != null ? String(stats.covered_competitions) : '…',
            subValue: 'Couvertes par le modèle V4',
        },
        {
            label: 'Prédictions totales',
            value: stats?.total_predictions != null ? String(stats.total_predictions) : '…',
            subValue: 'Stockées dans v4.ml_predictions',
        },
    ];

    const totalHistoryPages = Math.ceil(historyTotal / HISTORY_PAGE_SIZE);

    return (
        <div className="ml-foresight mf4">
            <MLHubHero
                title="Prédictions ML"
                subtitle="Moteur V4 — modèles CatBoost entraînés sur 276k matchs Transfermarkt. Toutes compétitions confondues."
            />

            <MLHubMetricStrip metrics={metricStrip} />

            {/* Competition picker */}
            {compsLoading ? (
                <Skeleton height="52px" />
            ) : comps.length > 0 ? (
                <CompPicker
                    comps={comps}
                    selected={activeTab === 'upcoming' ? selectedCompId : historyCompId}
                    onSelect={activeTab === 'upcoming' ? setSelectedCompId : handleHistoryCompSelect}
                />
            ) : null}

            <Tabs
                items={TAB_ITEMS}
                activeId={activeTab}
                onChange={(id) => { setActiveTab(id); setHistoryPage(0); }}
                variant="line"
            />

            {/* ── À venir ── */}
            {activeTab === 'upcoming' && (
                <div className="mf4__panel">
                    {upcomingLoading ? (
                        <div className="mf4__match-grid">
                            {[1, 2, 3, 4].map((n) => <Skeleton key={n} height="200px" />)}
                        </div>
                    ) : upcomingError ? (
                        <MLHubEmptyState title="Chargement impossible" message={upcomingError} />
                    ) : upcoming.length ? (
                        <div className="mf4__match-grid">
                            {upcoming.map((f, i) => (
                                <MatchPredictionCard key={f.fixtureId} fixture={f} idx={i} />
                            ))}
                        </div>
                    ) : (
                        <MLHubEmptyState
                            title="Aucun match à venir"
                            message="Pas de match planifié dans cette compétition pour les prochains jours."
                        />
                    )}
                </div>
            )}

            {/* ── Résultats ── */}
            {activeTab === 'history' && (
                <div className="mf4__panel">
                    {historyLoading ? (
                        <div className="mf4__history-list">
                            {[1, 2, 3, 4, 5].map((n) => <Skeleton key={n} height="64px" />)}
                        </div>
                    ) : historyError ? (
                        <MLHubEmptyState title="Chargement impossible" message={historyError} />
                    ) : history.length ? (
                        <>
                            <div className="mf4__history-list">
                                {history.map((row, i) => (
                                    <PredictionHistoryRow key={row.match_id} row={row} idx={i} />
                                ))}
                            </div>
                            {totalHistoryPages > 1 && (
                                <div className="mf4__pagination">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        disabled={historyPage === 0}
                                        onClick={() => setHistoryPage((p) => p - 1)}
                                    >
                                        ← Précédent
                                    </Button>
                                    <span className="mf4__page-label">
                                        Page {historyPage + 1} / {totalHistoryPages}
                                    </span>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        disabled={historyPage + 1 >= totalHistoryPages}
                                        onClick={() => setHistoryPage((p) => p + 1)}
                                    >
                                        Suivant →
                                    </Button>
                                </div>
                            )}
                        </>
                    ) : (
                        <MLHubEmptyState
                            title="Aucun résultat"
                            message="Pas d'historique de prédictions pour cette sélection."
                        />
                    )}
                </div>
            )}
        </div>
    );
};

export default MLForesightHub;
