import React, { useEffect, useMemo, useState } from 'react';
import { Badge, Button, Skeleton } from '../../../../design-system';
import api from '../../../../services/api';
import { useNavigate } from 'react-router-dom';
import { MLHubEmptyState, MLHubHero, MLHubMetricStrip, MLHubSection } from './shared/MLHubSurface';
import MLGlossaryTooltip from './shared/MLGlossaryTooltip';
import { ForesightFixtureCard } from './submodules/MLForesightComponents';
import './MLForesightHub.css';

const MARKET_ORDER = ['FT_RESULT', 'HT_RESULT', 'GOALS_TOTAL', 'CORNERS_TOTAL', 'CARDS_TOTAL'];
const MARKET_LABELS = { FT_RESULT: 'FT 1X2', HT_RESULT: 'HT 1X2', GOALS_TOTAL: 'Goals O/U', CORNERS_TOTAL: 'Corners O/U', CARDS_TOTAL: 'Cards O/U' };

const groupPredictionsByFixture = (rows = []) => {
    const grouped = new Map();
    rows.forEach((r) => {
        const key = String(r.fixture_id);
        if (!grouped.has(key)) {
            grouped.set(key, {
                ...r,
                fixtureId: r.fixture_id,
                leagueId: r.league_id,
                leagueName: r.league_name,
                homeTeam: r.home_team,
                awayTeam: r.away_team,
                markets: [],
            });
        }
        grouped.get(key).markets.push(r);
    });

    return [...grouped.values()].map((f) => ({
        ...f,
        markets: MARKET_ORDER.map((m) => {
            const rows = f.markets.filter((r) => r.market_type === m).sort((a, b) => b.ml_probability - a.ml_probability);
            return rows.length ? { marketType: m, marketLabel: MARKET_LABELS[m] || m, primary: rows[0], rows } : null;
        }).filter(Boolean)
    })).sort((a, b) => new Date(a.date) - new Date(b.date));
};

const MLForesightHub = () => {
    const navigate = useNavigate();
    const [catalog, setCatalog] = useState([]);
    const [predictions, setPredictions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedLeagueId, setSelectedLeagueId] = useState('');

    useEffect(() => {
        Promise.all([api.getModelsCatalog(), api.getMLUpcomingPredictions({ maxDate: '2026-12-31' })])
            .then(([c, p]) => { setCatalog(c); setPredictions(p); })
            .catch(err => setError(err.message || 'Erreur.'))
            .finally(() => setLoading(false));
    }, []);

    const coveredLeagues = useMemo(() => {
        return (catalog || [])
            .filter((league) => Array.isArray(league.models) && league.models.length > 0)
            .map((league) => ({
                id: String(league.leagueId),
                name: league.leagueName,
                country: league.country || '',
                logo: league.logo || '',
                modelsCount: league.models.length,
            }))
            .sort((a, b) => a.name.localeCompare(b.name));
    }, [catalog]);

    const groupedFixtures = useMemo(() => {
        const coveredIds = new Set(coveredLeagues.map((l) => l.id));
        const now = new Date();
        return groupPredictionsByFixture(
            predictions.filter((p) => coveredIds.has(String(p.league_id)) && new Date(p.date) >= now)
        );
    }, [coveredLeagues, predictions]);

    const leagues = useMemo(() => {
        const counts = new Map();
        groupedFixtures.forEach((fixture) => {
            const key = String(fixture.leagueId);
            counts.set(key, (counts.get(key) || 0) + 1);
        });

        return coveredLeagues
            .map((league) => ({
                ...league,
                count: counts.get(league.id) || 0,
            }))
            .filter((league) => league.count > 0);
    }, [catalog, predictions]);

    useEffect(() => { if (!selectedLeagueId && leagues.length) setSelectedLeagueId(leagues[0].id); }, [leagues, selectedLeagueId]);

    useEffect(() => {
        if (selectedLeagueId && !leagues.some((league) => league.id === selectedLeagueId)) {
            setSelectedLeagueId(leagues[0]?.id || '');
        }
    }, [leagues, selectedLeagueId]);

    const activeLeague = leagues.find((l) => l.id === selectedLeagueId);
    const activeFixtures = groupedFixtures.filter((f) => String(f.leagueId) === selectedLeagueId);

    const metrics = [
        { label: 'Ligues avec modèles', value: String(leagues.length), subValue: 'Compétitions à venir couvertes', featured: true },
        { label: 'Matchs à venir', value: String(groupedFixtures.length), subValue: 'Uniquement ligues modélisées' },
        { label: 'Ligue sélectionnée', value: activeLeague?.name || '—', subValue: activeLeague ? `${activeLeague.count} matchs à venir` : 'Aucune ligue' },
        { label: 'Marchés affichés', value: 'FT · HT · Goals · Corners · Cards', subValue: 'Quand les estimations sont disponibles' },
    ];

    if (loading) return <div className="ml-foresight"><Skeleton height="120px" /><Skeleton height="400px" /></div>;
    if (error) return <div className="ml-foresight"><MLHubEmptyState title="Erreur" message={error} /></div>;

    return (
        <div className="ml-foresight">
            <MLHubHero
                title="Prévisions des matchs à venir"
                subtitle="Cette page ne montre que les ligues pour lesquelles des modèles actifs existent, avec les matchs futurs déjà prédits."
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
                subtitle="Sélectionne une compétition modélisée pour lire ses prochains matchs et les estimations déjà calculées."
                badge={{ label: `${leagues.length} ligues`, variant: 'neutral' }}
            >
                <div className="ml-foresight__league-picker">
                    {leagues.map((l) => (
                        <button key={l.id} type="button" className={`ml-foresight__league-chip ${selectedLeagueId === l.id ? 'is-active' : ''}`} onClick={() => setSelectedLeagueId(l.id)}>
                            {l.logo && <img src={l.logo} alt="" />}
                            <span>{l.country ? `${l.country} · ${l.name}` : l.name}</span>
                            <Badge variant="neutral" size="sm">{l.count}</Badge>
                        </button>
                    ))}
                </div>
            </MLHubSection>

            <MLHubSection
                title="Flux de prévisions"
                subtitle="Chaque carte regroupe les estimations disponibles pour le match: FT, HT, Goals, Corners et Cards."
                badge={{ label: `${activeFixtures.length} matchs`, variant: 'neutral' }}
            >
                {activeFixtures.length ? (
                    <div className="ml-foresight__fixture-list">
                        {activeFixtures.map((f) => <ForesightFixtureCard key={f.fixtureId} fixture={f} />)}
                    </div>
                ) : <MLHubEmptyState title="Aucun match à venir" message="Pas encore de prévisions futures pour cette ligue modélisée." />}
            </MLHubSection>
        </div>
    );
};

export default MLForesightHub;
