import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, Badge, Skeleton, Stack, Tabs } from '../../../../design-system';
import api from '../../../../services/api';
import './MLForesightHub.css';

const LS_KEY = 'ml_hub_favorite_leagues';

const POWER_CONFIG = {
    elite:    { icon: '🔥', label: 'ELITE',    color: 'var(--color-error)' },
    strong:   { icon: '⚡', label: 'STRONG',   color: 'var(--color-warning)' },
    moderate: { icon: '●',  label: 'MODERATE', color: 'var(--color-info)' },
    weak:     { icon: '·',  label: 'WEAK',     color: 'var(--color-text-muted)' },
};

const MARKET_LABELS = {
    '1N2_FT':   '1X2 FT', '1N2_HT': '1X2 HT',
    'CORNERS_OU': 'Corners', 'CARDS_OU': 'Cards',
    'FT_RESULT': '1X2 FT', 'HT_RESULT': '1X2 HT',
    'CORNERS_TOTAL': 'Corners', 'CARDS_TOTAL': 'Cards',
};

const SELECTION_LABELS = { '1': 'Domicile', 'N': 'Nul', '2': 'Extérieur', '1': '1', 'N': 'N', '2': '2' };

const fmtDate = (d) => {
    if (!d) return '';
    return new Date(d).toLocaleString('fr-FR', { weekday: 'short', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
};

// ── Fav League Selector ────────────────────────────────────────────────────────
const FavLeagueSelector = ({ favorites, onToggle, availableLeagues }) => {
    const [open, setOpen] = useState(false);

    return (
        <div className="ml-foresight__fav-selector">
            <button className="ml-foresight__fav-btn" onClick={() => setOpen(!open)}>
                ⚙️ Gérer mes ligues favorites ({favorites.length})
            </button>
            {open && (
                <div className="ml-foresight__fav-panel">
                    <p className="ml-foresight__fav-hint">Sélectionne les ligues à suivre en Section A</p>
                    <div className="ml-foresight__fav-list">
                        {availableLeagues.map(l => {
                            const active = favorites.some(f => f.leagueId === l.leagueId);
                            return (
                                <button
                                    key={l.leagueId}
                                    className={`ml-foresight__fav-item ${active ? 'ml-foresight__fav-item--active' : ''}`}
                                    onClick={() => onToggle(l)}
                                >
                                    {l.leagueLogo && <img src={l.leagueLogo} alt="" className="ml-foresight__fav-logo" />}
                                    <span>{l.leagueName}</span>
                                    {active && <span className="ml-foresight__fav-check">✓</span>}
                                </button>
                            );
                        })}
                    </div>
                    <button className="ml-foresight__fav-close" onClick={() => setOpen(false)}>Fermer</button>
                </div>
            )}
        </div>
    );
};

// ── Fixture Prediction Card ────────────────────────────────────────────────────
const FixturePredCard = ({ predictions }) => {
    if (!predictions?.length) return null;
    const first = predictions[0];

    // Group by market
    const byMarket = {};
    for (const p of predictions) {
        if (!byMarket[p.market_type]) byMarket[p.market_type] = [];
        byMarket[p.market_type].push(p);
    }

    // Find best edge
    const bestEdge = predictions.reduce((max, p) => (p.edge ?? 0) > (max.edge ?? 0) ? p : max, predictions[0]);
    const hasEdge = bestEdge?.edge != null && bestEdge.edge > 0;

    return (
        <Card className="ml-foresight__fixture-card">
            <div className="ml-foresight__fixture-header">
                <span className="ml-foresight__fixture-date">{fmtDate(first.date)}</span>
                {first.round && <span className="ml-foresight__fixture-round">{first.round}</span>}
            </div>

            <div className="ml-foresight__fixture-teams">
                <div className="ml-foresight__team ml-foresight__team--home">
                    {first.home_logo && <img src={first.home_logo} alt="" className="ml-foresight__team-logo" />}
                    <span>{first.home_team}</span>
                </div>
                <span className="ml-foresight__vs">vs</span>
                <div className="ml-foresight__team ml-foresight__team--away">
                    <span>{first.away_team}</span>
                    {first.away_logo && <img src={first.away_logo} alt="" className="ml-foresight__team-logo" />}
                </div>
            </div>

            <div className="ml-foresight__markets">
                {Object.entries(byMarket).map(([market, preds]) => {
                    const sorted = [...preds].sort((a, b) => b.ml_probability - a.ml_probability);
                    return (
                        <div key={market} className="ml-foresight__market-row">
                            <span className="ml-foresight__market-name">{MARKET_LABELS[market] ?? market}</span>
                            <div className="ml-foresight__market-probs">
                                {sorted.map((p, i) => (
                                    <span key={i} className={`ml-foresight__prob ${i === 0 ? 'ml-foresight__prob--best' : ''}`}>
                                        {p.selection} {Math.round(p.ml_probability * 100)}%
                                    </span>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>

            {hasEdge && (
                <div className="ml-foresight__edge-badge">
                    <span>Edge vs cotes: +{bestEdge.edge.toFixed(1)}%</span>
                    <span className="ml-foresight__edge-market">({MARKET_LABELS[bestEdge.market_type] ?? bestEdge.market_type} · {bestEdge.selection})</span>
                </div>
            )}
        </Card>
    );
};

// ── Section A — My Leagues ─────────────────────────────────────────────────────
const SectionMyLeagues = ({ favorites, availableLeagues, onToggle }) => {
    const [activeLeagueId, setActiveLeagueId] = useState(null);
    const [predictions, setPredictions] = useState({});
    const [loading, setLoading] = useState({});

    // Set first fav as active when favorites change
    useEffect(() => {
        if (favorites.length > 0 && !activeLeagueId) {
            setActiveLeagueId(favorites[0].leagueId);
        }
    }, [favorites, activeLeagueId]);

    // Fetch predictions for active league (7-day lookahead)
    useEffect(() => {
        if (!activeLeagueId) return;
        if (predictions[activeLeagueId] !== undefined) return; // cached

        setLoading(prev => ({ ...prev, [activeLeagueId]: true }));
        const league = favorites.find(f => f.leagueId === activeLeagueId);
        
        // 7-day lookahead
        const maxDate = new Date();
        maxDate.setDate(maxDate.getDate() + 7);
        const maxDateStr = maxDate.toISOString().split('T')[0];

        api.getMLUpcomingPredictions(league ? { leagues: league.leagueName, maxDate: maxDateStr } : { maxDate: maxDateStr })
            .then(rows => {
                // Group by fixture
                const byFixture = {};
                for (const r of (rows || [])) {
                    if (!byFixture[r.fixture_id]) byFixture[r.fixture_id] = [];
                    byFixture[r.fixture_id].push(r);
                }
                setPredictions(prev => ({ ...prev, [activeLeagueId]: Object.values(byFixture) }));
            })
            .catch(() => setPredictions(prev => ({ ...prev, [activeLeagueId]: [] })))
            .finally(() => setLoading(prev => ({ ...prev, [activeLeagueId]: false })));
    }, [activeLeagueId, favorites, predictions]);

    const tabs = favorites.map(f => ({ id: String(f.leagueId), label: f.leagueName }));
    const activeFixtures = predictions[activeLeagueId] ?? [];
    const isLoading = loading[activeLeagueId];

    if (favorites.length === 0) return (
        <div className="ml-foresight__section-empty">
            <span>🏆</span>
            <p>Aucune ligue favorite. Clique sur "Gérer mes ligues" pour en ajouter.</p>
        </div>
    );

    return (
        <div className="ml-foresight__section-a">
            <Tabs
                items={tabs}
                activeId={String(activeLeagueId)}
                onChange={id => setActiveLeagueId(parseInt(id))}
                variant="pills"
            />
            <div className="ml-foresight__fixture-list">
                {isLoading ? (
                    [1,2,3].map(i => <Skeleton key={i} height="140px" className="ds-mb-md" />)
                ) : activeFixtures.length === 0 ? (
                    <div className="ml-foresight__section-empty">
                        <span>📅</span>
                        <p>Aucun match à venir avec prédiction pour cette ligue.</p>
                    </div>
                ) : (
                    activeFixtures.map((preds, i) => (
                        <FixturePredCard key={i} predictions={preds} />
                    ))
                )}
            </div>
        </div>
    );
};

// ── Edge Card ──────────────────────────────────────────────────────────────────
const EdgeCard = ({ edge }) => {
    const pw = POWER_CONFIG[edge.powerLevel] ?? POWER_CONFIG.weak;
    return (
        <Card className={`ml-foresight__edge-card ml-foresight__edge-card--${edge.powerLevel}`}>
            <div className="ml-foresight__edge-header">
                <span className="ml-foresight__edge-power-icon">{pw.icon}</span>
                <Badge style={{ background: pw.color, color: '#fff', border: 'none' }}>{pw.label}</Badge>
                <span className="ml-foresight__edge-score">{edge.powerScore}/100</span>
            </div>

            <div className="ml-foresight__edge-fixture">
                <div className="ml-foresight__edge-teams">
                    {edge.homeLogo && <img src={edge.homeLogo} alt="" className="ml-foresight__edge-logo" />}
                    <span className="ml-foresight__edge-team">{edge.homeTeam}</span>
                    <span className="ml-foresight__vs-sm">vs</span>
                    <span className="ml-foresight__edge-team">{edge.awayTeam}</span>
                    {edge.awayLogo && <img src={edge.awayLogo} alt="" className="ml-foresight__edge-logo" />}
                </div>
                <span className="ml-foresight__edge-league">{edge.leagueName}</span>
            </div>

            <div className="ml-foresight__edge-market-row">
                <Badge variant="default">{MARKET_LABELS[edge.market] ?? edge.market}</Badge>
                <span className="ml-foresight__edge-selection">{edge.selection}</span>
                <span className="ml-foresight__edge-date">{fmtDate(edge.matchDate)}</span>
            </div>

            <div className="ml-foresight__edge-stats">
                <div className="ml-foresight__edge-stat">
                    <span className="ml-foresight__edge-stat-label">ML</span>
                    <span className="ml-foresight__edge-stat-value">{Math.round(edge.mlProbability * 100)}%</span>
                </div>
                <div className="ml-foresight__edge-stat">
                    <span className="ml-foresight__edge-stat-label">Cotes implicites</span>
                    <span className="ml-foresight__edge-stat-value">{Math.round(edge.impliedProbability * 100)}%</span>
                </div>
                <div className="ml-foresight__edge-stat">
                    <span className="ml-foresight__edge-stat-label">Edge</span>
                    <span className="ml-foresight__edge-stat-value ml-foresight__edge-positive">+{edge.edge.toFixed(1)}%</span>
                </div>
                {edge.bestOdds && (
                    <div className="ml-foresight__edge-stat">
                        <span className="ml-foresight__edge-stat-label">Meil. cote</span>
                        <span className="ml-foresight__edge-stat-value">{edge.bestOdds.toFixed(2)}</span>
                    </div>
                )}
            </div>

            <div className="ml-foresight__power-bar-wrap">
                <div className="ml-foresight__power-bar-track">
                    <div
                        className="ml-foresight__power-bar-fill"
                        style={{ width: `${edge.powerScore}%`, background: pw.color }}
                    />
                </div>
            </div>
        </Card>
    );
};

// ── Section B — Top Edges ──────────────────────────────────────────────────────
const MARKET_FILTER_OPTIONS = [
    { key: '1N2_FT',    label: '1X2 FT' },
    { key: '1N2_HT',    label: '1X2 HT' },
    { key: 'CORNERS_OU', label: 'Corners' },
    { key: 'CARDS_OU',  label: 'Cards' },
];

const SectionTopEdges = () => {
    const [minEdge, setMinEdge] = useState(2);
    const [minConf, setMinConf] = useState(50);
    const [activeMarkets, setActiveMarkets] = useState(new Set(MARKET_FILTER_OPTIONS.map(m => m.key)));
    const [edges, setEdges] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const fetchEdges = useCallback(() => {
        setLoading(true);
        setError(null);
        const params = {
            minEdge,
            minConfidence: minConf,
            limit: 30,
        };
        if (activeMarkets.size > 0 && activeMarkets.size < MARKET_FILTER_OPTIONS.length) {
            params.markets = [...activeMarkets].join(',');
        }
        api.getTopEdges(params)
            .then(data => setEdges(Array.isArray(data) ? data : []))
            .catch(e => setError(e.message))
            .finally(() => setLoading(false));
    }, [minEdge, minConf, activeMarkets]);

    useEffect(() => {
        const t = setTimeout(fetchEdges, 500);
        return () => clearTimeout(t);
    }, [fetchEdges]);

    const toggleMarket = (key) => {
        setActiveMarkets(prev => {
            const next = new Set(prev);
            next.has(key) ? next.delete(key) : next.add(key);
            return next;
        });
    };

    return (
        <div className="ml-foresight__section-b">
            <div className="ml-foresight__edge-filters">
                <label className="ml-foresight__filter-label">
                    Edge min (%)
                    <input type="number" className="ml-foresight__filter-input" value={minEdge} min={0} max={50}
                        onChange={e => setMinEdge(Number(e.target.value))} />
                </label>
                <label className="ml-foresight__filter-label">
                    Confiance min (%)
                    <input type="number" className="ml-foresight__filter-input" value={minConf} min={0} max={100}
                        onChange={e => setMinConf(Number(e.target.value))} />
                </label>
                <div className="ml-foresight__filter-label">
                    Marchés
                    <div className="ml-foresight__market-toggles">
                        {MARKET_FILTER_OPTIONS.map(m => (
                            <button
                                key={m.key}
                                className={`ml-foresight__mkt-toggle ${activeMarkets.has(m.key) ? 'ml-foresight__mkt-toggle--on' : ''}`}
                                onClick={() => toggleMarket(m.key)}
                            >
                                {m.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {loading && <div className="ml-foresight__edges-loading">{[1,2,3].map(i => <Skeleton key={i} height="130px" className="ds-mb-md" />)}</div>}

            {!loading && error && (
                <Card className="ml-foresight__section-empty">
                    <p>⚠️ {error}</p>
                </Card>
            )}

            {!loading && !error && edges !== null && edges.length === 0 && (
                <Card className="ml-foresight__section-empty">
                    <Stack direction="col" gap="sm" className="ds-items-center ds-text-center">
                        <span style={{ fontSize: '2rem' }}>📡</span>
                        <p>Aucun edge au-dessus de {minEdge}%.</p>
                        <p className="ml-foresight__empty-hint">
                            Les edges nécessitent que les cotes bookmaker soient synchronisées.<br />
                            Lance une <strong>Sync Odds</strong> depuis l'onglet Système.
                        </p>
                    </Stack>
                </Card>
            )}

            {!loading && edges?.length > 0 && (
                <div className="ml-foresight__edges-list">
                    {edges.map((edge, i) => <EdgeCard key={i} edge={edge} />)}
                </div>
            )}
        </div>
    );
};

// ── Main Page ──────────────────────────────────────────────────────────────────
const MLForesightHub = () => {
    // Load available leagues from upcoming predictions metadata
    const [availableLeagues, setAvailableLeagues] = useState([]);
    const [favorites, setFavorites] = useState(() => {
        try { return JSON.parse(localStorage.getItem(LS_KEY) ?? '[]'); } catch { return []; }
    });

    useEffect(() => {
        api.getMLUpcomingPredictions({})
            .then(rows => {
                const seen = new Map();
                for (const r of (rows || [])) {
                    const lid = r.league_id;
                    if (lid == null || seen.has(lid)) continue;
                    seen.set(lid, {
                        leagueId: lid,
                        leagueName: r.league_name,
                        leagueLogo: r.league_logo ?? null,
                        leagueImportance: r.league_importance ?? 999,
                        countryImportance: r.country_importance ?? 999
                    });
                }
                setAvailableLeagues([...seen.values()].sort((a, b) => 
                    (a.countryImportance - b.countryImportance) || 
                    (a.leagueImportance - b.leagueImportance) ||
                    a.leagueName.localeCompare(b.leagueName)
                ));
            })
            .catch(() => {});
    }, []);

    const toggleFav = (league) => {
        setFavorites(prev => {
            const exists = prev.some(f => f.leagueId === league.leagueId);
            const next = exists ? prev.filter(f => f.leagueId !== league.leagueId) : [...prev, league];
            localStorage.setItem(LS_KEY, JSON.stringify(next));
            return next;
        });
    };

    return (
        <div className="ml-foresight">
            <div className="ml-foresight__header">
                <h2 className="ml-foresight__title">🔭 Prévisions</h2>
            </div>

            {/* Section A */}
            <section className="ml-foresight__section">
                <div className="ml-foresight__section-header">
                    <h3 className="ml-foresight__section-title">Mes Ligues</h3>
                    <FavLeagueSelector
                        favorites={favorites}
                        availableLeagues={availableLeagues}
                        onToggle={toggleFav}
                    />
                </div>
                <SectionMyLeagues
                    favorites={favorites}
                    availableLeagues={availableLeagues}
                    onToggle={toggleFav}
                />
            </section>

            <div className="ml-foresight__divider" />

            {/* Section B */}
            <section className="ml-foresight__section">
                <div className="ml-foresight__section-header">
                    <h3 className="ml-foresight__section-title">Top Edges — Toutes Compétitions</h3>
                </div>
                <SectionTopEdges />
            </section>
        </div>
    );
};

export default MLForesightHub;
