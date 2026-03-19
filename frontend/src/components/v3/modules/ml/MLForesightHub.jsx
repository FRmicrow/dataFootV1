import React, { useEffect, useMemo, useState } from 'react';
import { Badge, Button, Skeleton } from '../../../../design-system';
import api from '../../../../services/api';
import { useNavigate } from 'react-router-dom';
import { MLHubEmptyState, MLHubHero, MLHubMetricStrip, MLHubSection } from './shared/MLHubSurface';
import MLGlossaryTooltip from './shared/MLGlossaryTooltip';
import { ForesightFixtureCard, HistoricalFixtureRow } from './submodules/MLForesightComponents';
import './MLForesightHub.css';

const pickDefaultLeagueId = (leagues) => {
    if (!leagues.length) return '';

    return String(
        leagues.find((league) => league.isFeatured && league.upcomingFixtureCount > 0)?.leagueId
        || leagues.find((league) => league.upcomingFixtureCount > 0)?.leagueId
        || leagues[0].leagueId
    );
};

const MLForesightHub = () => {
    const navigate = useNavigate();
    const [leagues, setLeagues] = useState([]);
    const [selectedLeagueId, setSelectedLeagueId] = useState('');
    const [selectedSeasonYear, setSelectedSeasonYear] = useState('');
    const [activeLeagueData, setActiveLeagueData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [detailLoading, setDetailLoading] = useState(false);
    const [error, setError] = useState(null);
    const [detailError, setDetailError] = useState(null);

    useEffect(() => {
        let cancelled = false;

        api.getMLForesightLeagues()
            .then((rows) => {
                if (cancelled) return;
                const normalizedRows = Array.isArray(rows) ? rows : [];
                setLeagues(normalizedRows);
                setSelectedLeagueId((current) => current || pickDefaultLeagueId(normalizedRows));
            })
            .catch((err) => {
                if (!cancelled) {
                    setError(err.message || 'Impossible de charger les ligues ML Hub.');
                }
            })
            .finally(() => {
                if (!cancelled) {
                    setLoading(false);
                }
            });

        return () => {
            cancelled = true;
        };
    }, []);

    useEffect(() => {
        if (!selectedLeagueId) return;
        if (!leagues.some((league) => String(league.leagueId) === String(selectedLeagueId))) {
            setSelectedLeagueId(pickDefaultLeagueId(leagues));
            setSelectedSeasonYear('');
        }
    }, [leagues, selectedLeagueId]);

    useEffect(() => {
        if (!selectedLeagueId) {
            setActiveLeagueData(null);
            setDetailError(null);
            return;
        }

        let cancelled = false;
        setDetailLoading(true);
        setDetailError(null);
        setActiveLeagueData(null);

        api.getMLForesightLeague(selectedLeagueId, selectedSeasonYear || undefined)
            .then((payload) => {
                if (!cancelled) {
                    setActiveLeagueData(payload || null);
                }
            })
            .catch((err) => {
                if (!cancelled) {
                    setActiveLeagueData(null);
                    setDetailError(err.message || 'Impossible de charger les matchs à venir.');
                }
            })
            .finally(() => {
                if (!cancelled) {
                    setDetailLoading(false);
                }
            });

        return () => {
            cancelled = true;
        };
    }, [selectedLeagueId, selectedSeasonYear]);

    useEffect(() => {
        if (!activeLeagueData?.seasonOptions?.length || !selectedSeasonYear) return;

        const seasonExists = activeLeagueData.seasonOptions.some(
            (season) => String(season.seasonYear) === String(selectedSeasonYear),
        );
        if (!seasonExists) {
            setSelectedSeasonYear('');
        }
    }, [activeLeagueData, selectedSeasonYear]);

    const activeLeague = useMemo(
        () => leagues.find((league) => String(league.leagueId) === String(selectedLeagueId)) || null,
        [leagues, selectedLeagueId]
    );

    const seasonOptions = activeLeagueData?.seasonOptions || [];
    const activeSeasonYear = selectedSeasonYear || String(activeLeagueData?.league?.seasonYear || '');
    const activeSeason = useMemo(
        () => seasonOptions.find((season) => String(season.seasonYear) === String(activeSeasonYear)) || null,
        [seasonOptions, activeSeasonYear]
    );
    const upcomingFixtures = activeLeagueData?.upcomingFixtures || activeLeagueData?.fixtures || [];
    const historicalFixtures = activeLeagueData?.historicalFixtures || [];
    const projectedResults = useMemo(
        () => upcomingFixtures.filter((fixture) => fixture.projectedResult).slice(0, 12),
        [upcomingFixtures]
    );

    const totalUpcomingFixtures = useMemo(
        () => leagues.reduce((sum, league) => sum + Number(league.upcomingFixtureCount || 0), 0),
        [leagues]
    );

    const totalReadyFixtures = useMemo(
        () => leagues.reduce((sum, league) => sum + Number(league.predictionReadyCount || 0), 0),
        [leagues]
    );
    const totalModeledSeasons = useMemo(
        () => leagues.reduce((sum, league) => sum + Number(league.modeledSeasonYears?.length || 0), 0),
        [leagues]
    );

    const metrics = [
        {
            label: 'Ligues couvertes',
            value: String(leagues.length),
            subValue: 'Catalogue V36 relié aux fixtures app',
            featured: true,
        },
        {
            label: 'Matchs à venir',
            value: String(totalUpcomingFixtures),
            subValue: 'Source unique: V3_Fixtures',
        },
        {
            label: 'Saisons modélisées',
            value: String(totalModeledSeasons),
            subValue: 'Années avec runs complétés',
        },
        {
            label: 'Prédictions prêtes',
            value: String(totalReadyFixtures),
            subValue: 'Fixtures avec tous les marchés couverts',
        },
        {
            label: 'Saison sélectionnée',
            value: activeSeasonYear || '—',
            subValue: activeSeason
                ? `${activeSeason.completedFixtureCount} joués · ${activeSeason.upcomingFixtureCount} à venir`
                : (activeLeague ? activeLeague.leagueName : 'Aucune ligue'),
        },
    ];

    if (loading) {
        return (
            <div className="ml-foresight">
                <Skeleton height="120px" />
                <Skeleton height="80px" />
                <Skeleton height="320px" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="ml-foresight">
                <MLHubEmptyState title="Chargement impossible" message={error} />
            </div>
        );
    }

    if (!leagues.length) {
        return (
            <div className="ml-foresight">
                <MLHubEmptyState
                    title="Aucune ligue couverte"
                    message="Le contrat Prévisions n’a remonté aucune ligue V36 exploitable."
                />
            </div>
        );
    }

    return (
        <div className="ml-foresight">
            <MLHubHero
                title="Prévisions des matchs à venir"
                subtitle="Les ligues affichées ici viennent du contrat ML Hub V36. Les matchs à venir sont lus depuis l’application, puis enrichis avec les outputs ML persistés."
                actions={(
                    <div className="ml-foresight__hero-actions">
                        <MLGlossaryTooltip topic="foresight" label="Glossaire prévisions" />
                        <Button variant="ghost" onClick={() => navigate('/machine-learning/models')}>
                            Voir les modèles
                        </Button>
                    </div>
                )}
            />

            <MLHubMetricStrip metrics={metrics} />

            <MLHubSection
                title="Ligues couvertes"
                subtitle="Sélectionne une ligue V36. La liste des prochains matchs vient du même socle que la page ligue classique."
                badge={{ label: `${leagues.length} ligues`, variant: 'neutral' }}
            >
                <div className="ml-foresight__league-picker">
                    {leagues.map((league) => (
                        <button
                            key={league.leagueId}
                            type="button"
                            className={`ml-foresight__league-chip ${selectedLeagueId === String(league.leagueId) ? 'is-active' : ''}`}
                            onClick={() => {
                                setSelectedLeagueId(String(league.leagueId));
                                setSelectedSeasonYear('');
                            }}
                        >
                            {league.logo ? <img src={league.logo} alt="" /> : null}
                            <span>{league.country ? `${league.country} · ${league.leagueName}` : league.leagueName}</span>
                            {league.isFeatured ? <Badge variant="primary" size="sm">UEFA</Badge> : null}
                            <Badge variant="neutral" size="sm">{league.predictionReadyCount}/{league.upcomingFixtureCount}</Badge>
                        </button>
                    ))}
                </div>
            </MLHubSection>

            <MLHubSection
                title="Saisons avec modèles"
                subtitle="Choisis l’année à lire. Les saisons passées viennent des runs complétés; la saison active garde aussi les matchs à venir."
                badge={{ label: `${seasonOptions.length} saisons`, variant: 'neutral' }}
            >
                {detailLoading && !activeLeagueData ? (
                    <div className="ml-foresight__season-picker">
                        <Skeleton height="52px" />
                        <Skeleton height="52px" />
                    </div>
                ) : seasonOptions.length ? (
                    <div className="ml-foresight__season-picker">
                        {seasonOptions.map((season) => (
                            <button
                                key={season.seasonYear}
                                type="button"
                                className={`ml-foresight__season-chip ${String(season.seasonYear) === String(activeSeasonYear) ? 'is-active' : ''}`}
                                onClick={() => setSelectedSeasonYear(String(season.seasonYear))}
                            >
                                <strong>{season.seasonYear}</strong>
                                <span>{season.completedFixtureCount} joues · {season.upcomingFixtureCount} a venir</span>
                                <div className="ml-foresight__season-badges">
                                    {season.hasHistoricalRun ? <Badge variant="success" size="sm">Run</Badge> : <Badge variant="neutral" size="sm">Live</Badge>}
                                    {season.horizonType ? <Badge variant="neutral" size="sm">{season.horizonType}</Badge> : null}
                                </div>
                            </button>
                        ))}
                    </div>
                ) : (
                    <MLHubEmptyState
                        title="Aucune saison exploitable"
                        message="La ligue sélectionnée n’a ni run historique complété ni match futur remonté dans le contrat ML Hub."
                    />
                )}
            </MLHubSection>

            <MLHubSection
                title="Résultats à venir"
                subtitle="Lecture rapide du FT 1X2 projeté sur la ligue sélectionnée."
                badge={{ label: activeLeague ? `${activeLeague.leagueName} · ${activeSeasonYear || '—'}` : 'Prévisions', variant: 'neutral' }}
            >
                {detailLoading ? (
                    <div className="ml-foresight__result-strip">
                        <Skeleton height="140px" />
                        <Skeleton height="140px" />
                        <Skeleton height="140px" />
                    </div>
                ) : detailError ? (
                    <MLHubEmptyState title="Prévisions indisponibles" message={detailError} />
                ) : projectedResults.length ? (
                    <div className="ml-foresight__result-strip">
                        {projectedResults.map((fixture) => (
                            <ForesightFixtureCard key={`${fixture.fixtureId}-projected`} fixture={fixture} compact />
                        ))}
                    </div>
                ) : (
                    <MLHubEmptyState
                        title="Aucune projection FT"
                        message={activeSeason?.upcomingFixtureCount
                            ? 'Les matchs a venir sont bien remontes, mais aucune sortie FT 1X2 n’est encore persistee pour cette ligue.'
                            : 'La saison selectionnee n’a actuellement plus de match a venir a projeter.'}
                    />
                )}
            </MLHubSection>

            <MLHubSection
                title="Prochains matchs"
                subtitle="Chaque match reste visible même si la prédiction est partielle ou encore en attente."
                badge={{ label: `${upcomingFixtures.length} matchs`, variant: 'neutral' }}
            >
                {detailLoading ? (
                    <div className="ml-foresight__fixture-list">
                        <Skeleton height="220px" />
                        <Skeleton height="220px" />
                    </div>
                ) : detailError ? (
                    <MLHubEmptyState title="Chargement impossible" message={detailError} />
                ) : upcomingFixtures.length ? (
                    <div className="ml-foresight__fixture-list">
                        {upcomingFixtures.map((fixture) => (
                            <ForesightFixtureCard key={fixture.fixtureId} fixture={fixture} />
                        ))}
                    </div>
                ) : (
                    <MLHubEmptyState
                        title="Aucun match à venir"
                        message="La ligue et la saison selectionnees n’ont actuellement aucun match futur dans les donnees applicatives."
                    />
                )}
            </MLHubSection>

            <MLHubSection
                title="Historique des matchs"
                subtitle="Toutes les fixtures terminées de la saison sélectionnée, lues depuis V3_Fixtures puis enrichies avec le dernier run complété de cette année."
                badge={{ label: `${historicalFixtures.length} matchs`, variant: 'neutral' }}
            >
                {detailLoading ? (
                    <div className="ml-foresight__history-list">
                        <Skeleton height="140px" />
                        <Skeleton height="140px" />
                    </div>
                ) : detailError ? (
                    <MLHubEmptyState title="Chargement impossible" message={detailError} />
                ) : historicalFixtures.length ? (
                    <div className="ml-foresight__history-list">
                        {historicalFixtures.map((fixture) => (
                            <HistoricalFixtureRow key={`${fixture.fixtureId}-history`} fixture={fixture} />
                        ))}
                    </div>
                ) : (
                    <MLHubEmptyState
                        title="Aucun match historique"
                        message={activeSeason?.hasHistoricalRun
                            ? 'Le run existe pour cette saison, mais aucune fixture terminee n’a ete remontee dans le contrat.'
                            : 'Aucun run historique complete n’est disponible pour cette saison sur cette ligue.'}
                    />
                )}
            </MLHubSection>
        </div>
    );
};

export default MLForesightHub;
