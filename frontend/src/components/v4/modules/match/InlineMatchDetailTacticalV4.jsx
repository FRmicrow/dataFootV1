import React, { useState, useEffect, useMemo } from 'react';
import PropTypes from 'prop-types';
import api from '../../../../services/api';
import { MatchStatBar, Skeleton } from '../../../../design-system';
import './InlineMatchDetailTacticalV4.css';

// ─── Period selector ────────────────────────────────────────────────
const PERIODS = [
    { id: 'ft', label: 'Full Time', suffix: '' },
    { id: '1h', label: '1st Half', suffix: '_1h' },
    { id: '2h', label: '2nd Half', suffix: '_2h' },
];

// ─── Odds row ───────────────────────────────────────────────────────
const OddsCell = ({ label, value, variant = 'neutral' }) => (
    <div className={`tactical-odds-cell tactical-odds-cell--${variant}`}>
        <span className="tactical-odds-label">{label}</span>
        <span className="tactical-odds-value">{value != null ? Number(value).toFixed(2) : '—'}</span>
    </div>
);

OddsCell.propTypes = {
    label: PropTypes.string.isRequired,
    value: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    variant: PropTypes.string,
};

// ─── Forecast bar ───────────────────────────────────────────────────
const ForecastBar = ({ win, draw, loss }) => {
    const total = (parseFloat(win) || 0) + (parseFloat(draw) || 0) + (parseFloat(loss) || 0);
    if (total === 0) return null;
    const wPct = ((win / total) * 100).toFixed(1);
    const dPct = ((draw / total) * 100).toFixed(1);
    const lPct = ((loss / total) * 100).toFixed(1);

    return (
        <div className="tactical-forecast">
            <div className="tactical-forecast-labels">
                <span className="forecast-label--win">{wPct}% W</span>
                <span className="forecast-label--draw">{dPct}% D</span>
                <span className="forecast-label--loss">{lPct}% L</span>
            </div>
            <div className="tactical-forecast-bar">
                <div className="forecast-seg forecast-seg--win"  style={{ width: `${wPct}%` }} />
                <div className="forecast-seg forecast-seg--draw" style={{ width: `${dPct}%` }} />
                <div className="forecast-seg forecast-seg--loss" style={{ width: `${lPct}%` }} />
            </div>
        </div>
    );
};

ForecastBar.propTypes = {
    win:  PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    draw: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    loss: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
};

// ─── Main component ─────────────────────────────────────────────────
const InlineMatchDetailTacticalV4 = ({ fixtureId }) => {
    const [tactical, setTactical] = useState(null);
    const [fixture, setFixture] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [period, setPeriod] = useState('ft');

    useEffect(() => {
        let cancelled = false;
        const load = async () => {
            setLoading(true);
            setError(null);
            try {
                const [tacRes, fixRes] = await Promise.allSettled([
                    api.getFixtureTacticalStatsV4(fixtureId),
                    api.getFixtureDetailsV4(fixtureId),
                ]);
                if (!cancelled) {
                    setTactical(tacRes.status === 'fulfilled' ? tacRes.value : null);
                    setFixture(fixRes.status === 'fulfilled' ? fixRes.value : null);
                }
            } catch (e) {
                if (!cancelled) setError(e.message);
            } finally {
                if (!cancelled) setLoading(false);
            }
        };
        load();
        return () => { cancelled = true; };
    }, [fixtureId]);

    const home = useMemo(() => tactical?.stats?.find(s => s.side === 'home'), [tactical]);
    const away = useMemo(() => tactical?.stats?.find(s => s.side === 'away'), [tactical]);
    const odds = tactical?.odds ?? null;

    const getVal = (side, key, sfx) => side?.[`${key}${sfx}`] ?? side?.[key] ?? null;

    if (loading) return (
        <div className="tactical-loading">
            <Skeleton height="12px" width="60%" className="mb-sm" />
            <Skeleton height="12px" width="80%" className="mb-sm" />
            <Skeleton height="12px" width="70%" />
        </div>
    );

    if (error) return <div className="tactical-empty">Failed to load match data.</div>;

    const noStats = !home && !away;
    const noOdds = !odds;
    const noForecast = !fixture?.forecast_win && !fixture?.xg_home;

    if (noStats && noOdds && noForecast) return (
        <div className="tactical-empty">No tactical data available for this match.</div>
    );

    const suffix = PERIODS.find(p => p.id === period)?.suffix ?? '';

    const statRows = [
        { label: 'Ball Possession', key: 'ball_possession', isPct: true },
        { label: 'Total Shots',     key: 'shots_total' },
        { label: 'Shots on Target', key: 'shots_on_goal' },
        { label: 'Corner Kicks',    key: 'corner_kicks' },
        { label: 'Yellow Cards',    key: 'yellow_cards' },
    ];

    return (
        <div className="tactical-wrapper animate-fade-in">

            {/* ── xG + Forecast ────────────────────────── */}
            {(fixture?.xg_home != null || fixture?.forecast_win != null) && (
                <section className="tactical-section">
                    <h5 className="tactical-section-title">Expected Goals & Forecast</h5>
                    {fixture?.xg_home != null && (
                        <MatchStatBar
                            label="xG"
                            homeValue={Number(fixture.xg_home).toFixed(2)}
                            awayValue={Number(fixture.xg_away).toFixed(2)}
                            className="mb-sm"
                        />
                    )}
                    {fixture?.forecast_win != null && (
                        <ForecastBar
                            win={fixture.forecast_win}
                            draw={fixture.forecast_draw}
                            loss={fixture.forecast_loss}
                        />
                    )}
                </section>
            )}

            {/* ── Stats ────────────────────────────────── */}
            {!noStats && (
                <section className="tactical-section">
                    <div className="tactical-section-header">
                        <h5 className="tactical-section-title">Match Stats</h5>
                        <div className="tactical-period-tabs">
                            {PERIODS.map(p => (
                                <button
                                    key={p.id}
                                    className={`tactical-period-btn ${period === p.id ? 'active' : ''}`}
                                    onClick={() => setPeriod(p.id)}
                                    type="button"
                                >
                                    {p.label}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="tactical-stat-rows">
                        {statRows.map(({ label, key, isPct }) => (
                            <MatchStatBar
                                key={key}
                                label={label}
                                homeValue={getVal(home, key, suffix)}
                                awayValue={getVal(away, key, suffix)}
                                isPct={isPct}
                            />
                        ))}
                    </div>
                </section>
            )}

            {/* ── Odds ─────────────────────────────────── */}
            {!noOdds && (
                <section className="tactical-section">
                    <h5 className="tactical-section-title">Pre-match Odds</h5>
                    <div className="tactical-odds-grid">
                        <div className="tactical-odds-group">
                            <span className="tactical-odds-group-label">1X2</span>
                            <div className="tactical-odds-row">
                                <OddsCell label="1" value={odds.odds_home} variant="home" />
                                <OddsCell label="X" value={odds.odds_draw} variant="draw" />
                                <OddsCell label="2" value={odds.odds_away} variant="away" />
                            </div>
                        </div>
                        <div className="tactical-odds-group">
                            <span className="tactical-odds-group-label">Over / Under</span>
                            <div className="tactical-odds-row">
                                <OddsCell label="O 1.5" value={odds.over_15} />
                                <OddsCell label="U 1.5" value={odds.under_15} />
                                <OddsCell label="O 2.5" value={odds.over_25} />
                                <OddsCell label="U 2.5" value={odds.under_25} />
                                <OddsCell label="O 3.5" value={odds.over_35} />
                                <OddsCell label="U 3.5" value={odds.under_35} />
                            </div>
                        </div>
                        <div className="tactical-odds-group">
                            <span className="tactical-odds-group-label">BTTS</span>
                            <div className="tactical-odds-row">
                                <OddsCell label="Yes" value={odds.btts_yes} variant="success" />
                                <OddsCell label="No"  value={odds.btts_no}  variant="danger" />
                            </div>
                        </div>
                    </div>
                </section>
            )}
        </div>
    );
};

InlineMatchDetailTacticalV4.propTypes = {
    fixtureId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
};

export default InlineMatchDetailTacticalV4;
