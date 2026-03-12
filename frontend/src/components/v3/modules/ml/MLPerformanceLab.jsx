import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, MetricCard, Skeleton, Stack, Tabs } from '../../../../design-system';
import Accordion from '../../../../design-system/components/Accordion';
import EquityCurve from '../../../../design-system/components/EquityCurve';
import api from '../../../../services/api';
import './MLPerformanceLab.css';

const MARKET_LABELS = {
    '1N2_FT':      '1X2 Full Time',
    '1N2_HT':      '1X2 Half Time',
    'CORNERS_OU':  'Corners O/U 9.5',
    'CARDS_OU':    'Cards O/U 3.5',
};
// MARKET_OPTIONS removed — replaced by MARKET_CHECKBOXES below
const MARKET_CHECKBOXES = [
    { value: '1N2_FT',      label: '1X2 FT' },
    { value: '1N2_HT',      label: '1X2 HT' },
    { value: 'CORNERS_OU',  label: 'Corners' },
    { value: 'CARDS_OU',    label: 'Cards' },
];

const fmt = (n, digits = 1) => n != null ? `${n.toFixed(digits)}%` : '—';
const fmtBrier = (n) => n != null ? n.toFixed(3) : '—';
const fmtHR = (n) => n != null ? `${Math.round(n * 100)}%` : '—';

// ── ROI Calculator ─────────────────────────────────────────────────────────────
const ROICalculator = ({ onResult }) => {
    const [portfolio, setPortfolio] = useState(1000);
    const [stake, setStake] = useState(10);
    const [activeMarkets, setActiveMarkets] = useState(new Set(MARKET_CHECKBOXES.map(m => m.value)));
    const [leaguesWithOdds, setLeaguesWithOdds] = useState([]);
    const [selectedLeague, setSelectedLeague] = useState('');
    const [selectedSeason, setSelectedSeason] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        api.getLeaguesWithOdds()
            .then(data => setLeaguesWithOdds(Array.isArray(data) ? data : []))
            .catch(() => {});
    }, []);

    const availableSeasons = selectedLeague
        ? (leaguesWithOdds.find(l => String(l.leagueId) === selectedLeague)?.seasons ?? [])
        : [];

    const stakeTooHigh = stake > portfolio * 0.5;

    const run = useCallback(() => {
        if (!portfolio || !stake || portfolio <= 0 || stake <= 0) return;
        setLoading(true);
        const marketsArr = [...activeMarkets];
        const markets = marketsArr.length === MARKET_CHECKBOXES.length ? 'all' : marketsArr.join(',');
        api.calculateROI({
            portfolioSize: portfolio,
            stakePerBet: stake,
            markets,
            leagueId: selectedLeague ? parseInt(selectedLeague) : undefined,
            seasonYear: selectedSeason ? parseInt(selectedSeason) : undefined,
        })
            .then(data => onResult(data))
            .catch(() => onResult(null))
            .finally(() => setLoading(false));
    }, [portfolio, stake, activeMarkets, selectedLeague, selectedSeason, onResult]);

    useEffect(() => {
        const t = setTimeout(run, 600);
        return () => clearTimeout(t);
    }, [run]);

    const toggleMarket = (val) => setActiveMarkets(prev => {
        const next = new Set(prev);
        next.has(val) ? next.delete(val) : next.add(val);
        return next;
    });

    return (
        <Card className="ml-perf__roi-card">
            <div className="ml-perf__roi-header">
                <h3 className="ml-perf__roi-title">💰 ROI Calculator</h3>
                <p className="ml-perf__roi-subtitle">Simulation sur l'historique · uniquement ligues avec odds disponibles</p>
            </div>
            <div className="ml-perf__roi-inputs">
                <label className="ml-perf__label">
                    Portefeuille (€)
                    <input type="number" className="ml-perf__input" value={portfolio} min={1}
                        onChange={e => setPortfolio(Number(e.target.value))} />
                </label>
                <label className="ml-perf__label">
                    Mise / pari (€)
                    <input type="number" className={`ml-perf__input ${stakeTooHigh ? 'ml-perf__input--warn' : ''}`}
                        value={stake} min={1} onChange={e => setStake(Number(e.target.value))} />
                    {stakeTooHigh && <span className="ml-perf__warn-text">⚠️ Mise &gt; 50% du portefeuille</span>}
                </label>
                <label className="ml-perf__label">
                    Ligue
                    <select className="ml-perf__input" value={selectedLeague}
                        onChange={e => { setSelectedLeague(e.target.value); setSelectedSeason(''); }}>
                        <option value="">— Toutes les ligues —</option>
                        {leaguesWithOdds.map(l => (
                            <option key={l.leagueId} value={l.leagueId}>{l.leagueName}</option>
                        ))}
                    </select>
                </label>
                {selectedLeague && (
                    <label className="ml-perf__label">
                        Saison
                        <select className="ml-perf__input" value={selectedSeason} onChange={e => setSelectedSeason(e.target.value)}>
                            <option value="">— Toutes les saisons —</option>
                            {availableSeasons.map(s => (
                                <option key={s.year} value={s.year}>{s.year} ({s.oddsCount} paris)</option>
                            ))}
                        </select>
                    </label>
                )}
                <div className="ml-perf__label">
                    Marchés
                    <div className="ml-perf__market-toggles">
                        {MARKET_CHECKBOXES.map(m => (
                            <button key={m.value}
                                className={`ml-perf__mkt-btn ${activeMarkets.has(m.value) ? 'ml-perf__mkt-btn--on' : ''}`}
                                onClick={() => toggleMarket(m.value)}
                                type="button">
                                {m.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
            {loading && <div className="ml-perf__roi-loading">Calcul en cours…</div>}
        </Card>
    );
};

// ── ROI Results ────────────────────────────────────────────────────────────────
const ROIResults = ({ roi }) => {
    if (!roi) return null;
    const isProfit = roi.profit >= 0;

    return (
        <Card className="ml-perf__roi-results">
            <div className="ml-perf__roi-grid">
                <MetricCard label="Paris" value={roi.totalBets} icon="🎲" />
                <MetricCard
                    label="Hit Rate"
                    value={`${Math.round(roi.hitRate * 100)}%`}
                    icon="🎯"
                    subValue={`${roi.wins}W / ${roi.losses}L`}
                />
                <MetricCard
                    label="ROI"
                    value={`${roi.roi >= 0 ? '+' : ''}${roi.roi.toFixed(1)}%`}
                    icon={isProfit ? '📈' : '📉'}
                    variant={isProfit ? 'featured' : 'default'}
                    subValue={`${roi.profit >= 0 ? '+' : ''}${roi.profit.toFixed(0)}€`}
                />
                <MetricCard
                    label="Drawdown max"
                    value={`-${roi.maxDrawdown.toFixed(1)}%`}
                    icon="⚠️"
                    subValue={`Série noire: ${roi.worstStreak}`}
                />
            </div>
            {roi.equityCurve?.length > 2 && (
                <div className="ml-perf__equity-wrap">
                    <p className="ml-perf__equity-label">Courbe d'équité</p>
                    <EquityCurve
                        data={roi.equityCurve}
                        baseline={roi.equityCurve[0]?.portfolio}
                        width={500}
                        height={72}
                    />
                    <div className="ml-perf__equity-values">
                        <span>Départ: {roi.equityCurve[0]?.portfolio.toFixed(0)}€</span>
                        <span style={{ color: isProfit ? 'var(--color-success)' : 'var(--color-error)' }}>
                            Final: {roi.equityCurve[roi.equityCurve.length - 1]?.portfolio.toFixed(0)}€
                        </span>
                    </div>
                </div>
            )}
        </Card>
    );
};

// ── League Tab ─────────────────────────────────────────────────────────────────
const LeagueTab = () => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        api.getMLSimulationOverview()
            .then(rows => {
                // Group by league_id, then season
                const byLeague = {};
                for (const row of (rows || [])) {
                    const lk = `${row.league_id}`;
                    if (!byLeague[lk]) byLeague[lk] = {
                        leagueId: row.league_id,
                        leagueName: row.league_name,
                        importanceRank: row.league_importance_rank ?? 99,
                        countryRank: row.country_importance_rank ?? 99,
                        seasons: []
                    };
                    byLeague[lk].seasons.push(row);
                }
                setData(Object.values(byLeague).sort((a, b) =>
                    a.countryRank - b.countryRank || a.importanceRank - b.importanceRank
                ));
            })
            .catch(e => setError(e.message))
            .finally(() => setLoading(false));
    }, []);

    if (loading) return <div className="ml-perf__tab-loading">{[1,2,3].map(i => <Skeleton key={i} height="60px" className="ds-mb-sm" />)}</div>;
    if (error) return <p className="ml-perf__error">⚠️ {error}</p>;
    if (!data?.length) return <p className="ml-perf__empty">Aucune simulation disponible.</p>;

    return (
        <div className="ml-perf__list">
            {data.map(league => (
                <Accordion
                    key={league.leagueId}
                    title={<span className="ml-perf__accordion-title">{league.leagueName}</span>}
                    maxHeight="none"
                >
                    <table className="ml-perf__table">
                        <thead>
                            <tr>
                                <th>Saison</th>
                                <th>Hit Rate</th>
                                <th>Brier</th>
                                <th>1X2 FT</th>
                                <th>1X2 HT</th>
                            </tr>
                        </thead>
                        <tbody>
                            {league.seasons.sort((a, b) => b.season_year - a.season_year).map((s, i) => (
                                <tr key={i}>
                                    <td>{s.season_year}</td>
                                    <td><span className="ml-perf__highlight">{fmtHR(s.global_hit_rate)}</span></td>
                                    <td>{fmtBrier(s.brier_score)}</td>
                                    <td>{s.market_1n2_ft != null ? `${Math.round(s.market_1n2_ft * 100)}%` : '—'}</td>
                                    <td>{s.market_1n2_ht != null ? `${Math.round(s.market_1n2_ht * 100)}%` : '—'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </Accordion>
            ))}
        </div>
    );
};

// ── Club Tab ───────────────────────────────────────────────────────────────────
const ClubTab = () => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        api.getMLClubEvaluation()
            .then(rows => setData(rows || []))
            .catch(e => setError(e.message))
            .finally(() => setLoading(false));
    }, []);

    if (loading) return <div className="ml-perf__tab-loading">{[1,2,3].map(i => <Skeleton key={i} height="50px" className="ds-mb-sm" />)}</div>;
    if (error) return <p className="ml-perf__error">⚠️ {error}</p>;
    if (!data?.length) return <p className="ml-perf__empty">Aucune donnée par club disponible.</p>;

    return (
        <div className="ml-perf__list">
            {data.slice(0, 50).map((club, i) => (
                <Accordion
                    key={club.team_id ?? i}
                    title={
                        <div className="ml-perf__club-title">
                            <span>{club.team_name}</span>
                            <span className="ml-perf__club-hr">HR: {Math.round((club.hit_rate ?? 0) * 100)}%</span>
                        </div>
                    }
                    maxHeight="none"
                >
                    <table className="ml-perf__table">
                        <thead>
                            <tr><th>Marché</th><th>Correct</th><th>Total</th><th>Hit Rate</th></tr>
                        </thead>
                        <tbody>
                            {Object.entries(club.by_market ?? {}).map(([mkt, s]) => (
                                <tr key={mkt}>
                                    <td>{MARKET_LABELS[mkt] ?? mkt}</td>
                                    <td>{s.h}</td>
                                    <td>{s.t}</td>
                                    <td><span className="ml-perf__highlight">{s.t > 0 ? `${Math.round((s.h / s.t) * 100)}%` : '—'}</span></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </Accordion>
            ))}
        </div>
    );
};

// ── Market Tab ─────────────────────────────────────────────────────────────────
const MarketTab = ({ roiData }) => {
    if (!roiData) return <p className="ml-perf__empty">Lance le ROI Calculator pour voir les stats par marché.</p>;

    const markets = Object.entries(MARKET_LABELS).map(([key, label]) => ({
        key, label,
        count: roiData.totalBets,
        hitRate: roiData.hitRate
    }));

    return (
        <div className="ml-perf__market-grid">
            {[
                { label: '1X2 Full Time', icon: '⚽', key: 'FT_RESULT' },
                { label: '1X2 Half Time', icon: '⏱️', key: 'HT_RESULT' },
                { label: 'Corners O/U 9.5', icon: '🚩', key: 'CORNERS_TOTAL' },
                { label: 'Cards O/U 3.5', icon: '🟨', key: 'CARDS_TOTAL' },
            ].map(m => (
                <MetricCard
                    key={m.key}
                    label={m.label}
                    icon={m.icon}
                    value={`${Math.round(roiData.hitRate * 100)}%`}
                    subValue={`${roiData.totalBets} paris · Brier —`}
                />
            ))}
        </div>
    );
};

// ── Main Page ──────────────────────────────────────────────────────────────────
const TABS = [
    { id: 'league', label: 'Par Ligue' },
    { id: 'club',   label: 'Par Club' },
    { id: 'market', label: 'Par Marché' },
];

const MLPerformanceLab = () => {
    const [roiData, setRoiData] = useState(null);
    const [activeTab, setActiveTab] = useState('league');

    return (
        <div className="ml-perf">
            <div className="ml-perf__header">
                <h2 className="ml-perf__title">📊 Performance Lab</h2>
            </div>

            <ROICalculator onResult={setRoiData} />
            <ROIResults roi={roiData} />

            <div className="ml-perf__tabs-section">
                <Tabs items={TABS} activeId={activeTab} onChange={setActiveTab} variant="pills" />
                <div className="ml-perf__tab-content">
                    {activeTab === 'league' && <LeagueTab />}
                    {activeTab === 'club'   && <ClubTab />}
                    {activeTab === 'market' && <MarketTab roiData={roiData} />}
                </div>
            </div>
        </div>
    );
};

export default MLPerformanceLab;
