import React, { useEffect, useMemo, useState } from 'react';
import { Button, Input, Skeleton, Table } from '../../../../design-system';
import api from '../../../../services/api';
import { MLHubEmptyState, MLHubHero, MLHubSection } from './shared/MLHubSurface';
import { fmtDecimal, fmtPct } from './shared/mlUtils';
import './MLPerformanceLab.css';

const DETAIL_MARKETS = [
    { key: 'FT_1X2', label: '1X2 FT', type: '1X2' },
    { key: 'HT_1X2', label: '1X2 HT', type: '1X2' },
    { key: 'GOALS_OU', label: 'Goals O/U', type: 'TOTALS' },
    { key: 'CORNERS_OU', label: 'Corners O/U', type: 'TOTALS' },
    { key: 'CARDS_OU', label: 'Cards O/U', type: 'TOTALS' },
];

const hasMetrics = (run) => {
    const markets = run.metrics?.markets;
    return markets && Object.keys(markets).length > 0;
};

const getRunLeagueLabel = (run) => {
    if (run?.league_name) return run.league_name;
    if (run?.league_id != null) return `ID ${run.league_id}`;
    return 'Nom indisponible';
};

const formatMatchDate = (value) => {
    if (!value) return 'Date indisponible';

    return new Date(value).toLocaleString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
};

const formatProfit = (value) => {
    const numericValue = Number(value || 0);
    return `${numericValue >= 0 ? '+' : ''}${fmtDecimal(numericValue, 2)} €`;
};

const PerformanceLab = () => {
    const [runs, setRuns] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [portfolioSize, setPortfolioSize] = useState(1000);
    const [stakePerBet, setStakePerBet] = useState(10);
    const [selectedLeagueId, setSelectedLeagueId] = useState('');
    const [selectedSeasonYear, setSelectedSeasonYear] = useState('');
    const [selectedAnnualSeasonYear, setSelectedAnnualSeasonYear] = useState('');
    const [roi, setRoi] = useState(null);
    const [annualRoi, setAnnualRoi] = useState(null);
    const [roiLoading, setRoiLoading] = useState(false);
    const [annualLoading, setAnnualLoading] = useState(false);
    const [historicalBetRows, setHistoricalBetRows] = useState([]);
    const [historicalLoading, setHistoricalLoading] = useState(false);
    const [selectedRunId, setSelectedRunId] = useState(null);

    useEffect(() => {
        api.getAllSimulationJobs()
            .then((rows) => setRuns(Array.isArray(rows) ? rows : []))
            .catch((err) => setError(err.message || 'Impossible de charger la page performance.'))
            .finally(() => setLoading(false));
    }, []);

    const completedRuns = useMemo(
        () => runs
            .filter((run) => run.status === 'COMPLETED' && hasMetrics(run))
            .sort((a, b) => Number(b.id) - Number(a.id)),
        [runs]
    );

    const leagueOptions = useMemo(() => {
        const seen = new Map();
        completedRuns.forEach((run) => {
            if (!seen.has(String(run.league_id))) {
                seen.set(String(run.league_id), {
                    id: String(run.league_id),
                    name: getRunLeagueLabel(run),
                    importanceRank: Number(run.importance_rank || 9999),
                });
            }
        });
        return [...seen.values()].sort((a, b) =>
            a.importanceRank - b.importanceRank || a.name.localeCompare(b.name)
        );
    }, [completedRuns]);

    const leagueSeasonCoverage = useMemo(() => {
        const byLeague = new Map();
        completedRuns.forEach((run) => {
            const key = String(run.league_id);
            if (!byLeague.has(key)) {
                byLeague.set(key, {
                    id: key,
                    name: getRunLeagueLabel(run),
                    importanceRank: Number(run.importance_rank || 9999),
                    seasons: new Set(),
                });
            }
            if (run.season_year != null) {
                byLeague.get(key).seasons.add(String(run.season_year));
            }
        });

        return [...byLeague.values()]
            .map((league) => ({
                ...league,
                seasons: [...league.seasons].sort((a, b) => Number(b) - Number(a)),
            }))
            .sort((a, b) =>
                a.importanceRank - b.importanceRank || a.name.localeCompare(b.name)
            );
    }, [completedRuns]);

    const seasonOptions = useMemo(() => {
        if (!selectedLeagueId) return [];
        const years = new Set(
            completedRuns
                .filter((r) => String(r.league_id) === selectedLeagueId)
                .map((r) => String(r.season_year))
        );
        return [...years].sort((a, b) => Number(b) - Number(a));
    }, [completedRuns, selectedLeagueId]);

    const annualSeasonOptions = useMemo(() => {
        const years = new Set(
            completedRuns
                .map((run) => String(run.season_year))
                .filter(Boolean)
        );
        return [...years].sort((a, b) => Number(b) - Number(a));
    }, [completedRuns]);

    useEffect(() => {
        if (!selectedLeagueId && leagueOptions.length) {
            setSelectedLeagueId(leagueOptions[0].id);
        }
    }, [leagueOptions, selectedLeagueId]);

    useEffect(() => {
        if (!selectedSeasonYear && seasonOptions.length) {
            setSelectedSeasonYear(seasonOptions[0]);
        }
    }, [seasonOptions, selectedSeasonYear]);

    useEffect(() => {
        if (selectedSeasonYear && !seasonOptions.includes(selectedSeasonYear)) {
            setSelectedSeasonYear(seasonOptions[0] || '');
        }
    }, [seasonOptions, selectedSeasonYear]);

    useEffect(() => {
        if (!selectedAnnualSeasonYear && annualSeasonOptions.length) {
            setSelectedAnnualSeasonYear(annualSeasonOptions[0]);
        }
    }, [annualSeasonOptions, selectedAnnualSeasonYear]);

    useEffect(() => {
        if (selectedAnnualSeasonYear && !annualSeasonOptions.includes(selectedAnnualSeasonYear)) {
            setSelectedAnnualSeasonYear(annualSeasonOptions[0] || '');
        }
    }, [annualSeasonOptions, selectedAnnualSeasonYear]);

    const filteredRuns = useMemo(() => completedRuns.filter((run) => {
        if (selectedLeagueId && String(run.league_id) !== selectedLeagueId) return false;
        if (selectedSeasonYear && String(run.season_year) !== selectedSeasonYear) return false;
        return true;
    }), [completedRuns, selectedLeagueId, selectedSeasonYear]);

    useEffect(() => {
        if (selectedRunId && !filteredRuns.some((run) => run.id === selectedRunId)) {
            setSelectedRunId(null);
        }
    }, [filteredRuns, selectedRunId]);

    useEffect(() => {
        if (!selectedLeagueId || !selectedSeasonYear) {
            setRoi(null);
            return;
        }
        let cancelled = false;
        setRoiLoading(true);
        api.calculateROI({
            portfolioSize: Number(portfolioSize),
            stakePerBet: Number(stakePerBet),
            leagueId: Number(selectedLeagueId),
            seasonYear: Number(selectedSeasonYear),
            markets: 'all',
        })
            .then((payload) => { if (!cancelled) setRoi(payload); })
            .catch(() => { if (!cancelled) setRoi(null); })
            .finally(() => { if (!cancelled) setRoiLoading(false); });
        return () => { cancelled = true; };
    }, [portfolioSize, stakePerBet, selectedLeagueId, selectedSeasonYear]);

    useEffect(() => {
        if (!selectedAnnualSeasonYear) {
            setAnnualRoi(null);
            return;
        }
        let cancelled = false;
        setAnnualLoading(true);
        api.calculateROI({
            portfolioSize: Number(portfolioSize),
            stakePerBet: Number(stakePerBet),
            seasonYear: Number(selectedAnnualSeasonYear),
            markets: 'all',
        })
            .then((payload) => { if (!cancelled) setAnnualRoi(payload); })
            .catch(() => { if (!cancelled) setAnnualRoi(null); })
            .finally(() => { if (!cancelled) setAnnualLoading(false); });
        return () => { cancelled = true; };
    }, [portfolioSize, stakePerBet, selectedAnnualSeasonYear]);

    const selectedRun = useMemo(
        () => filteredRuns.find((r) => r.id === selectedRunId) || null,
        [filteredRuns, selectedRunId]
    );
    const isHistoricalSeasonSelected = useMemo(() => {
        if (!selectedSeasonYear || !seasonOptions.length) return false;
        return String(selectedSeasonYear) !== String(seasonOptions[0]);
    }, [seasonOptions, selectedSeasonYear]);
    const activeHistoricalRun = useMemo(
        () => (isHistoricalSeasonSelected ? (selectedRun || filteredRuns[0] || null) : null),
        [filteredRuns, isHistoricalSeasonSelected, selectedRun]
    );

    const annualRows = useMemo(() => {
        if (!annualRoi?.leagueBreakdown?.length) return [];

        const totalMarketMap = Object.fromEntries(
            DETAIL_MARKETS.map((market) => [
                market.key,
                annualRoi.marketBreakdown?.find((entry) => entry.marketType === market.key) || null,
            ]),
        );

        return [
            ...annualRoi.leagueBreakdown.map((row) => ({
                ...row,
                isTotal: false,
            })),
            {
                leagueId: 'TOTAL',
                leagueName: 'TOTAL ANNEE',
                seasonYear: Number(selectedAnnualSeasonYear),
                totalBets: annualRoi.totalBets,
                totalMatches: annualRoi.totalMatches,
                benefit: annualRoi.benefit,
                roi: annualRoi.roi,
                markets: totalMarketMap,
                isTotal: true,
            },
        ];
    }, [annualRoi, selectedAnnualSeasonYear]);

    useEffect(() => {
        if (!activeHistoricalRun?.id) {
            setHistoricalBetRows([]);
            return;
        }

        let cancelled = false;
        setHistoricalLoading(true);
        api.getSimulationResults(activeHistoricalRun.id)
            .then((rows) => {
                if (!cancelled) {
                    setHistoricalBetRows(Array.isArray(rows) ? rows : []);
                }
            })
            .catch(() => {
                if (!cancelled) {
                    setHistoricalBetRows([]);
                }
            })
            .finally(() => {
                if (!cancelled) {
                    setHistoricalLoading(false);
                }
            });

        return () => {
            cancelled = true;
        };
    }, [activeHistoricalRun]);

    const matchColumns = useMemo(() => ([
        {
            key: 'match',
            title: 'Match',
            render: (_, row) => (
                <div className="ml-perf__league-cell">
                    <strong>{row.homeTeam} vs {row.awayTeam}</strong>
                    <span>{formatMatchDate(row.date)}</span>
                    <span>{row.matchScore ? `Score final ${row.matchScore}` : 'Score indisponible'}</span>
                </div>
            ),
        },
        {
            key: 'bets',
            title: 'Paris simulés',
            render: (_, row) => (
                <div className="ml-perf__bet-list">
                    {row.picks.map((pick, index) => (
                        <div key={`${row.fixtureId}-${pick.marketType}-${index}`} className="ml-perf__bet-item">
                            <strong>{pick.marketLabel}</strong>
                            <span>{pick.selection} @ {fmtDecimal(pick.bookmakerOdd, 2)}</span>
                            <span>ML {fmtPct(pick.mlProbability)}</span>
                        </div>
                    ))}
                </div>
            ),
        },
        {
            key: 'outcomes',
            title: 'Issue réelle',
            render: (_, row) => (
                <div className="ml-perf__bet-list">
                    {row.picks.map((pick, index) => (
                        <div key={`${row.fixtureId}-actual-${pick.marketType}-${index}`} className="ml-perf__bet-item">
                            <strong>{pick.marketLabel}</strong>
                            <span>{pick.actualOutcome || 'Push / indisponible'}</span>
                            <span className={pick.isHit ? 'is-positive' : 'is-negative'}>
                                {pick.isHit ? 'Gagné' : 'Perdu'}
                            </span>
                        </div>
                    ))}
                </div>
            ),
        },
        {
            key: 'stake',
            title: 'Engagement',
            render: (_, row) => (
                <div className="ml-perf__league-cell">
                    <strong>{fmtDecimal(row.totalStake, 0)} €</strong>
                    <span>{row.betCount} pari{row.betCount > 1 ? 's' : ''}</span>
                    <span>{row.hits}/{row.betCount} gagné{row.hits > 1 ? 's' : ''}</span>
                </div>
            ),
        },
        {
            key: 'profit',
            title: 'Gain / Perte',
            render: (_, row) => (
                <div className="ml-perf__league-cell">
                    <strong className={row.totalNetProfit >= 0 ? 'is-positive' : 'is-negative'}>
                        {row.totalNetProfit >= 0 ? '+' : ''}{fmtDecimal(row.totalNetProfit, 2)} €
                    </strong>
                    <span>Retour {fmtDecimal(row.totalGrossReturn, 2)} €</span>
                    <span>Portefeuille {fmtDecimal(row.portfolioAfterMatch, 2)} €</span>
                </div>
            ),
        },
    ]), []);

    const historicalBetColumns = useMemo(() => ([
        {
            key: 'match',
            title: 'Match',
            render: (_, row) => (
                <div className="ml-perf__league-cell">
                    <strong>{row.home_team_name} vs {row.away_team_name}</strong>
                    <span>{formatMatchDate(row.fixture_date)}</span>
                    <span>{row.score && row.score !== '-' ? `Score ${row.score}` : 'Score indisponible'}</span>
                </div>
            ),
        },
        {
            key: 'market',
            title: 'Marché',
            render: (_, row) => (
                <div className="ml-perf__league-cell">
                    <strong>{row.market_label || row.market_type}</strong>
                    <span>{row.model_version || 'runtime'}</span>
                    <span>{row.round_name || '—'}</span>
                </div>
            ),
        },
        {
            key: 'prediction',
            title: 'Pari possible',
            render: (_, row) => (
                <div className="ml-perf__league-cell">
                    <strong>{row.predicted_outcome || '—'}</strong>
                    <span>Confiance {row.primary_probability || '—'}</span>
                    <span>{row.expected_total_label ? `Total attendu ${row.expected_total_label}` : 'Sans total attendu'}</span>
                </div>
            ),
        },
        {
            key: 'actual',
            title: 'Issue réelle',
            render: (_, row) => (
                <div className="ml-perf__league-cell">
                    <strong>{row.actual_result || '—'}</strong>
                    <span>{row.actual_numeric_label ? `Valeur réelle ${row.actual_numeric_label}` : '—'}</span>
                    <span className={row.is_correct ? 'is-positive' : 'is-negative'}>
                        {row.is_correct == null ? 'Inconnu' : row.is_correct ? 'Hit' : 'Miss'}
                    </span>
                </div>
            ),
        },
    ]), []);

    const annualColumns = useMemo(() => ([
        {
            key: 'league',
            title: 'Ligue',
            render: (_, row) => (
                <div className={`ml-perf__league-cell ${row.isTotal ? 'is-total' : ''}`}>
                    <strong>{row.leagueName}</strong>
                    <span>{row.isTotal ? `Saison ${selectedAnnualSeasonYear}` : `${row.totalMatches} matchs · ${row.totalBets} paris`}</span>
                </div>
            ),
        },
        ...DETAIL_MARKETS.map((market) => ({
            key: market.key,
            title: market.label,
            render: (_, row) => {
                const metrics = row.markets?.[market.key];
                if (!metrics) return '—';

                return (
                    <div className="ml-perf__league-cell">
                        <strong className={metrics.benefit >= 0 ? 'is-positive' : 'is-negative'}>
                            {formatProfit(metrics.benefit)}
                        </strong>
                        <span>{metrics.totalBets} paris</span>
                        <span>ROI {fmtDecimal(metrics.roi, 1)} %</span>
                    </div>
                );
            },
        })),
        {
            key: 'total',
            title: 'Total année',
            render: (_, row) => (
                <div className={`ml-perf__league-cell ${row.isTotal ? 'is-total' : ''}`}>
                    <strong className={row.benefit >= 0 ? 'is-positive' : 'is-negative'}>
                        {formatProfit(row.benefit)}
                    </strong>
                    <span>{row.totalBets} paris</span>
                    <span>ROI {fmtDecimal(row.roi, 1)} %</span>
                </div>
            ),
        },
    ]), [selectedAnnualSeasonYear]);

    const runColumns = [
        {
            key: 'competition',
            title: 'Compétition',
            render: (_, row) => (
                <div className="ml-perf__league-cell">
                    <strong>{getRunLeagueLabel(row)}</strong>
                    <span>Saison {row.season_year || '—'}</span>
                </div>
            ),
        },
        {
            key: 'horizon',
            title: 'Horizon',
            render: (_, row) => (
                <div className="ml-perf__league-cell">
                    <strong>{row.horizon_type?.replaceAll('_', ' ') || '—'}</strong>
                    <span>Run #{row.id}</span>
                </div>
            ),
        },
        {
            key: 'ft',
            title: 'FT 1X2',
            render: (_, row) => {
                const m = row.metrics?.markets?.FT_1X2;
                return m ? (
                    <div className="ml-perf__league-cell">
                        <strong>{fmtPct(m.accuracy)}</strong>
                        <span>Brier {fmtDecimal(m.brier_score)}</span>
                    </div>
                ) : '—';
            },
        },
        {
            key: 'ht',
            title: 'HT 1X2',
            render: (_, row) => {
                const m = row.metrics?.markets?.HT_1X2;
                return m ? (
                    <div className="ml-perf__league-cell">
                        <strong>{fmtPct(m.accuracy)}</strong>
                        <span>Brier {fmtDecimal(m.brier_score)}</span>
                    </div>
                ) : '—';
            },
        },
        {
            key: 'goals',
            title: 'Goals',
            render: (_, row) => {
                const m = row.metrics?.markets?.GOALS_OU;
                return m ? (
                    <div className="ml-perf__league-cell">
                        <strong>{fmtPct(m.hit_rate)}</strong>
                        <span>MAE {fmtDecimal(m.mae_total)}</span>
                    </div>
                ) : '—';
            },
        },
        {
            key: 'corners',
            title: 'Corners',
            render: (_, row) => {
                const m = row.metrics?.markets?.CORNERS_OU;
                return m ? (
                    <div className="ml-perf__league-cell">
                        <strong>{fmtPct(m.hit_rate)}</strong>
                        <span>MAE {fmtDecimal(m.mae_total)}</span>
                    </div>
                ) : '—';
            },
        },
        {
            key: 'cards',
            title: 'Cards',
            render: (_, row) => {
                const m = row.metrics?.markets?.CARDS_OU;
                return m ? (
                    <div className="ml-perf__league-cell">
                        <strong>{fmtPct(m.hit_rate)}</strong>
                        <span>MAE {fmtDecimal(m.mae_total)}</span>
                    </div>
                ) : '—';
            },
        },
    ];

    if (loading) {
        return (
            <div className="ml-perf">
                <Skeleton height="120px" />
                <Skeleton height="160px" />
                <Skeleton height="320px" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="ml-perf">
                <MLHubEmptyState title="Chargement impossible" message={error} />
            </div>
        );
    }

    const hasSelection = Boolean(selectedLeagueId && selectedSeasonYear);
    const selectedLeagueName = leagueOptions.find((l) => l.id === selectedLeagueId)?.name || '';

    return (
        <div className="ml-perf">
            <MLHubHero
                badge={{ label: 'Performance', variant: 'primary' }}
                title="Gains et historique des runs"
                subtitle="Sélectionne une ligue et une saison pour voir les statistiques de performance et les runs modèles correspondants."
            />

            <MLHubSection
                title="Runs disponibles"
                subtitle="Liste réelle des compétitions et saisons déjà simulées. L’ordre suit l’importance métier de la ligue."
                badge={{ label: `${leagueSeasonCoverage.length} ligues`, variant: 'neutral' }}
            >
                <div className="ml-perf__coverage-list">
                    {leagueSeasonCoverage.map((league) => (
                        <button
                            key={league.id}
                            type="button"
                            className={`ml-perf__coverage-item ${selectedLeagueId === league.id ? 'is-active' : ''}`}
                            onClick={() => {
                                setSelectedLeagueId(league.id);
                                setSelectedSeasonYear(league.seasons[0] || '');
                                setSelectedRunId(null);
                            }}
                        >
                            <strong>{league.name}</strong>
                            <span>{league.seasons.join(', ')}</span>
                        </button>
                    ))}
                </div>
            </MLHubSection>

            <MLHubSection
                title="Paramètres"
                badge={{ label: hasSelection ? `${selectedLeagueName} · ${selectedSeasonYear}` : 'Sélection requise', variant: hasSelection ? 'primary' : 'neutral' }}
            >
                <div className="ml-perf__roi-controls">
                    <label>
                        Portefeuille (€)
                        <Input type="number" min="1" value={portfolioSize} onChange={(e) => setPortfolioSize(e.target.value)} />
                    </label>
                    <label>
                        Mise par pari (€)
                        <Input type="number" min="1" value={stakePerBet} onChange={(e) => setStakePerBet(e.target.value)} />
                    </label>
                    <label>
                        Ligue
                        <select className="ml-perf__input" value={selectedLeagueId} onChange={(e) => { setSelectedLeagueId(e.target.value); setSelectedSeasonYear(''); setSelectedRunId(null); }}>
                            <option value="">Choisir une ligue</option>
                            {leagueOptions.map((l) => (
                                <option key={l.id} value={l.id}>{l.name}</option>
                            ))}
                        </select>
                    </label>
                    <label>
                        Saison
                        <select className="ml-perf__input" value={selectedSeasonYear} onChange={(e) => { setSelectedSeasonYear(e.target.value); setSelectedRunId(null); }} disabled={!selectedLeagueId}>
                            <option value="">Choisir une saison</option>
                            {seasonOptions.map((year) => (
                                <option key={year} value={year}>{year}</option>
                            ))}
                        </select>
                    </label>
                </div>
            </MLHubSection>

            {selectedAnnualSeasonYear && (
                <MLHubSection
                    title="Tableau annuel par ligue et modèle"
                    subtitle="Chaque ligne représente une ligue sur la saison choisie. Les colonnes affichent le gain simulé par modèle, puis le total de l’année."
                    badge={{ label: annualLoading ? 'Calcul…' : `${selectedAnnualSeasonYear}`, variant: 'primary' }}
                    actions={(
                        <select
                            className="ml-perf__input ml-perf__section-select"
                            value={selectedAnnualSeasonYear}
                            onChange={(e) => setSelectedAnnualSeasonYear(e.target.value)}
                        >
                            {annualSeasonOptions.map((year) => (
                                <option key={year} value={year}>{year}</option>
                            ))}
                        </select>
                    )}
                >
                    {annualLoading ? (
                        <Skeleton height="220px" />
                    ) : annualRoi ? (
                        <>
                            <div className="ml-perf__roi-grid">
                                <div className="ml-perf__roi-card">
                                    <span>Ligues couvertes</span>
                                    <strong>{annualRoi.leagueBreakdown?.length || 0}</strong>
                                </div>
                                <div className="ml-perf__roi-card">
                                    <span>Paris simulés</span>
                                    <strong>{annualRoi.totalBets}</strong>
                                </div>
                                <div className="ml-perf__roi-card">
                                    <span>Benefice annuel</span>
                                    <strong className={annualRoi.benefit >= 0 ? 'is-positive' : 'is-negative'}>
                                        {formatProfit(annualRoi.benefit)}
                                    </strong>
                                </div>
                                <div className="ml-perf__roi-card">
                                    <span>ROI annuel</span>
                                    <strong className={annualRoi.roi >= 0 ? 'is-positive' : 'is-negative'}>
                                        {annualRoi.roi >= 0 ? '+' : ''}{fmtDecimal(annualRoi.roi, 1)} %
                                    </strong>
                                </div>
                            </div>
                            <div className="ml-perf__roi-detail">
                                <div className="ml-perf__roi-detail-head">
                                    <strong>Gains par ligue et par modele</strong>
                                    <span>Le total annuel additionne tous les paris de la saison avec la meme mise fixe sur chaque selection.</span>
                                </div>
                                {annualRows.length ? (
                                    <Table
                                        columns={annualColumns}
                                        data={annualRows}
                                        rowKey={(row) => String(row.leagueId)}
                                    />
                                ) : (
                                    <p className="ml-perf__empty-note">
                                        Aucun run exploitable n&apos;a ete trouve pour cette saison.
                                    </p>
                                )}
                            </div>
                        </>
                    ) : (
                        <MLHubEmptyState
                            title="Aucune donnee annuelle"
                            message="La saison selectionnee n’a pas encore de runs termines avec odds exploitables pour construire le tableau annuel."
                        />
                    )}
                </MLHubSection>
            )}

            {hasSelection && (
                <MLHubSection
                    title="Simulation ROI"
                    badge={{ label: roiLoading ? 'Calcul…' : roi ? `${roi.totalBets} paris` : 'Aucune donnée', variant: roi ? 'primary' : 'neutral' }}
                >
                    {roiLoading ? (
                        <Skeleton height="96px" />
                    ) : roi ? (
                        <>
                            <div className="ml-perf__roi-scope">
                                <strong>{roi.scope?.leagueName || selectedLeagueName}</strong>
                                <span>Saison {roi.scope?.seasonYear || selectedSeasonYear}</span>
                                <span>Source odds: {roi.scope?.oddsSource || 'indisponible'}</span>
                            </div>
                            <div className="ml-perf__roi-grid">
                            <div className="ml-perf__roi-card">
                                <span>Paris simulés</span>
                                <strong>{roi.totalBets}</strong>
                            </div>
                            <div className="ml-perf__roi-card">
                                <span>Matchs couverts</span>
                                <strong>{roi.totalMatches}</strong>
                            </div>
                            <div className="ml-perf__roi-card">
                                <span>Montant total</span>
                                <strong>{fmtDecimal(roi.totalBets * Number(stakePerBet), 0)} €</strong>
                            </div>
                            <div className="ml-perf__roi-card">
                                <span>Hit rate</span>
                                <strong>{fmtPct(roi.hitRate)}</strong>
                            </div>
                            <div className="ml-perf__roi-card">
                                <span>Bénéfice</span>
                                <strong className={roi.benefit >= 0 ? 'is-positive' : 'is-negative'}>
                                    {roi.benefit >= 0 ? '+' : ''}{fmtDecimal(roi.benefit, 0)} €
                                </strong>
                            </div>
                            <div className="ml-perf__roi-card">
                                <span>ROI</span>
                                <strong className={roi.roi >= 0 ? 'is-positive' : 'is-negative'}>
                                    {roi.roi >= 0 ? '+' : ''}{fmtDecimal(roi.roi, 1)} %
                                </strong>
                            </div>
                            <div className="ml-perf__roi-card">
                                <span>Retrait max</span>
                                <strong>-{fmtDecimal(roi.maxDrawdown, 1)} %</strong>
                            </div>
                            </div>
                            <div className="ml-perf__roi-detail">
                                <div className="ml-perf__roi-detail-head">
                                    <strong>Détail match par match</strong>
                                    <span>Une ligne regroupe tous les paris simulés sur un match pour la ligue et la saison sélectionnées.</span>
                                </div>
                                {roi.matchResults?.length ? (
                                    <Table
                                        columns={matchColumns}
                                        data={roi.matchResults}
                                        rowKey="fixtureId"
                                    />
                                ) : (
                                    <p className="ml-perf__empty-note">
                                        Aucune cote historique exploitable n&apos;a ete trouvee pour cette ligue et cette saison. Le detail match par match s&apos;affichera des que des odds finalisees seront disponibles.
                                    </p>
                                )}
                            </div>
                        </>
                    ) : null}
                </MLHubSection>
            )}

            {hasSelection && isHistoricalSeasonSelected && (
                <MLHubSection
                    title="Tous les paris possibles"
                    subtitle="Vue brute du dernier run complété pour cette ligue et cette saison. Elle remonte tous les paris modélisés, même quand les cotes historiques sont absentes."
                    badge={{ label: activeHistoricalRun ? `Run #${activeHistoricalRun.id}` : 'Aucun run', variant: activeHistoricalRun ? 'primary' : 'neutral' }}
                >
                    {historicalLoading ? (
                        <Skeleton height="220px" />
                    ) : historicalBetRows.length ? (
                        <Table
                            columns={historicalBetColumns}
                            data={historicalBetRows}
                            rowKey={(row) => `${row.fixture_id}-${row.market_type}`}
                        />
                    ) : (
                        <MLHubEmptyState
                            title="Aucun pari disponible"
                            message="Aucun résultat de simulation n’a été retrouvé pour cette ligue et cette saison."
                        />
                    )}
                </MLHubSection>
            )}

            {hasSelection && (
                <MLHubSection
                    title="Runs modèles"
                    subtitle={filteredRuns.length ? `${filteredRuns.length} run${filteredRuns.length > 1 ? 's' : ''} validé${filteredRuns.length > 1 ? 's' : ''} — clique sur un run pour voir le détail` : ''}
                    badge={{ label: `${filteredRuns.length} runs`, variant: 'neutral' }}
                >
                    {filteredRuns.length ? (
                        <>
                            <Table
                                columns={runColumns}
                                data={filteredRuns}
                                rowKey="id"
                                interactive
                                onRowClick={(row) => setSelectedRunId(row.id === selectedRunId ? null : row.id)}
                            />
                            {selectedRun && (
                                <div className="ml-perf__run-detail">
                                    <div className="ml-perf__run-detail-head">
                                        <strong>Run #{selectedRun.id} — {selectedRun.horizon_type?.replaceAll('_', ' ')}</strong>
                                        <Button variant="ghost" size="sm" onClick={() => setSelectedRunId(null)}>Fermer</Button>
                                    </div>
                                    <div className="ml-perf__run-markets">
                                        {DETAIL_MARKETS.map((m) => {
                                            const metrics = selectedRun.metrics?.markets?.[m.key];
                                            if (!metrics) return null;
                                            return (
                                                <div key={m.key} className="ml-perf__run-market-card">
                                                    <strong className="ml-perf__run-market-label">{m.label}</strong>
                                                    {m.type === '1X2' ? (
                                                        <>
                                                            <div className="ml-perf__run-market-row"><span>Hit rate</span><strong>{fmtPct(metrics.accuracy)}</strong></div>
                                                            <div className="ml-perf__run-market-row"><span>Brier</span><strong>{fmtDecimal(metrics.brier_score)}</strong></div>
                                                            <div className="ml-perf__run-market-row"><span>Log loss</span><strong>{fmtDecimal(metrics.log_loss)}</strong></div>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <div className="ml-perf__run-market-row"><span>Hit rate</span><strong>{fmtPct(metrics.hit_rate)}</strong></div>
                                                            <div className="ml-perf__run-market-row"><span>MAE</span><strong>{fmtDecimal(metrics.mae_total)}</strong></div>
                                                        </>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </>
                    ) : (
                        <MLHubEmptyState title="Aucun run" message="Aucun run validé pour cette ligue et cette saison." />
                    )}
                </MLHubSection>
            )}

            {!hasSelection && (
                <MLHubEmptyState
                    title="Sélectionne une ligue et une saison"
                    message="Seules les compétitions et années ayant de vrais runs terminés sont proposées ici."
                />
            )}
        </div>
    );
};

export default PerformanceLab;
