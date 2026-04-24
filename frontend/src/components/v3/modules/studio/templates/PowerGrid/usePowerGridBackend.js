import { useEffect, useState } from 'react';
import api from '../../../../../../services/api';
import demoData from './demo';

/**
 * Hook V4 pour PowerGrid — deux modes :
 *   mode="foresight" : utilise getV4ForesightCompetitions() (probas titre).
 *   mode="standings" : classement classique via getSeasonOverviewV4.
 *
 * @param {object} params
 * @param {'foresight'|'standings'} [params.mode='foresight']
 * @param {string} [params.league]
 * @param {string|number} [params.season]
 * @param {number} [params.limit=12]
 * @param {object} [params.labels]
 */
export function usePowerGridBackend({
  mode = 'foresight',
  league,
  season,
  limit = 12,
  labels = {},
} = {}) {
  const [state, setState] = useState({ data: demoData, loading: false, error: null });

  useEffect(() => {
    let cancelled = false;

    setState((s) => ({ ...s, loading: true, error: null }));

    (async () => {
      try {
        if (mode === 'foresight') {
          const resp = await api.getV4ForesightCompetitions();
          const competitions = resp?.data || resp || [];
          if (!Array.isArray(competitions) || !competitions.length) {
            if (!cancelled) {
              setState({ data: demoData, loading: false, error: 'Aucune proba — demo.' });
            }
            return;
          }
          // Format inconnu selon l'API — fallback demo si structure pas matchable
          const cells = competitions.slice(0, limit).map((c, i) => ({
            title: c.name || c.competition || `#${i + 1}`,
            rank: i + 1,
            subtitle: c.country || '',
            score: Math.round((c.probability || c.score || 0) * 100) || 100 - i * 5,
            meta: c.probability ? `${(c.probability * 100).toFixed(1)}%` : '',
          }));

          const built = {
            eyebrow: labels.eyebrow || 'Foresight V4 · Probas',
            headline: labels.headline || 'Power Ranking — probas de titre',
            subtitle: labels.subtitle || '',
            columns: labels.columns || 3,
            cells,
            source: 'statFoot Foresight V4',
          };
          if (!cancelled) setState({ data: built, loading: false, error: null });
          return;
        }

        // Mode standings
        if (!league || !season) return;
        const resp = await api.getSeasonOverviewV4(league, season);
        const teams = resp?.data?.teams || resp?.teams || [];
        if (!teams.length) {
          if (!cancelled) {
            setState({ data: demoData, loading: false, error: 'Standings vides — demo.' });
          }
          return;
        }

        const sorted = [...teams]
          .sort((a, b) => (b.points || 0) - (a.points || 0))
          .slice(0, limit);
        const maxPts = Math.max(...sorted.map((t) => t.points || 0), 1);

        const cells = sorted.map((t, i) => ({
          title: t.name || t.club_name || `#${i + 1}`,
          rank: i + 1,
          subtitle: t.country || league,
          logoUrl: t.logo_url || null,
          score: Math.round(((t.points || 0) / maxPts) * 100),
          meta: `${t.points || 0} pts`,
        }));

        const built = {
          eyebrow: labels.eyebrow || `${league} · ${season}`,
          headline: labels.headline || `${league} — classement`,
          subtitle: labels.subtitle || '',
          columns: labels.columns || 3,
          cells,
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
  }, [mode, league, season, limit]);

  return state;
}

export default usePowerGridBackend;
