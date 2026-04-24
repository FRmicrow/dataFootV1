import { useEffect, useState } from 'react';
import api from '../../../../../../services/api';
import demoData from './demo';

/**
 * Hook V4 pour NarrativeGrid.
 * Récupère les derniers N matchs d'un club, calcule :
 *  - Résultat : 0 / 0.5 / 1
 *  - xG diff : normalisé via `getTeamSeasonXgV4` si dispo (@STUB sinon)
 *  - Possession : par match (@STUB)
 *  - Moral : neutre 0.5 (@STUB — source externe requise)
 *
 * @param {object} params
 * @param {string} params.league
 * @param {string|number} params.season
 * @param {string} params.clubName
 * @param {number} [params.limit=10]
 */
export function useNarrativeBackend({ league, season, clubName, limit = 10 } = {}) {
  const [state, setState] = useState({ data: demoData, loading: false, error: null });

  useEffect(() => {
    let cancelled = false;
    if (!league || !season || !clubName) return;

    setState((s) => ({ ...s, loading: true, error: null }));

    (async () => {
      try {
        const fxResp = await api.getFixturesV4(league, season);
        const fixtures = fxResp?.data?.fixtures || fxResp?.fixtures || [];

        const clubFx = fixtures
          .filter(
            (fx) =>
              fx.home_club_name === clubName || fx.away_club_name === clubName,
          )
          .filter((fx) => fx.home_goals != null && fx.away_goals != null)
          .sort((a, b) => (b.match_date || '').localeCompare(a.match_date || ''))
          .slice(0, limit)
          .reverse();

        if (clubFx.length < 4) {
          if (!cancelled) {
            setState({ data: demoData, loading: false, error: 'Pas assez de matchs — demo.' });
          }
          return;
        }

        const matches = clubFx.map((fx) => {
          const isHome = fx.home_club_name === clubName;
          const gf = isHome ? fx.home_goals : fx.away_goals;
          const ga = isHome ? fx.away_goals : fx.home_goals;
          let result = 'D';
          if (gf > ga) result = 'W';
          else if (gf < ga) result = 'L';
          const opponent = isHome ? fx.away_club_name : fx.home_club_name;
          const score01 = result === 'W' ? 1 : result === 'L' ? 0 : 0.5;

          return {
            opponent,
            result,
            isHome,
            kpis: {
              Résultat: score01,
              'xG diff': 0.5, // @STUB
              Possession: 0.5, // @STUB
              'Moral (réseaux)': 0.5, // @STUB
            },
            meta: `${gf}-${ga}`,
          };
        });

        const built = {
          eyebrow: `${clubName} · ${season}`,
          headline: `${clubName} — ${limit} derniers matchs`,
          subtitle: 'Résultat, xG diff, possession, moral — une ligne narrative.',
          kpiLabels: ['Résultat', 'xG diff', 'Possession', 'Moral (réseaux)'],
          matches,
          takeaway: '',
          source: 'statFoot V4',
        };

        if (!cancelled) setState({ data: built, loading: false, error: null });
      } catch (err) {
        if (!cancelled) {
          setState({ data: demoData, loading: false, error: err.message || 'API error' });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [league, season, clubName, limit]);

  return state;
}

export default useNarrativeBackend;
