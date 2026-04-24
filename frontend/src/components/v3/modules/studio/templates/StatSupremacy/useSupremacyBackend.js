import { useEffect, useState } from 'react';
import api from '../../../../../../services/api';
import demoData from './demo';

/**
 * Hook V4 pour StatSupremacy.
 * Top N joueurs triés par `sortField` sur une saison.
 *
 * @param {object} params
 * @param {string} params.league
 * @param {string|number} params.season
 * @param {string} [params.sortField='goals']
 * @param {number} [params.limit=4]
 * @param {object} [params.labels] - { eyebrow, headline, heroLabel }
 */
export function useSupremacyBackend({
  league,
  season,
  sortField = 'goals',
  limit = 4,
  labels = {},
} = {}) {
  const [state, setState] = useState({ data: demoData, loading: false, error: null });

  useEffect(() => {
    let cancelled = false;
    if (!league || !season) return;

    setState((s) => ({ ...s, loading: true, error: null }));

    (async () => {
      try {
        const resp = await api.getSeasonPlayersV4(league, season, {
          sort_field: sortField,
          limit,
        });
        const rows = resp?.data?.players || resp?.players || [];

        if (!rows.length) {
          if (!cancelled) {
            setState({ data: demoData, loading: false, error: 'Aucune donnée — demo.' });
          }
          return;
        }

        const topValue = Number(rows[0][sortField] || 0);
        const totalTop2 = rows.slice(0, 2).reduce((acc, r) => acc + Number(r[sortField] || 0), 0);

        const built = {
          eyebrow: labels.eyebrow || `${league} · ${season}`,
          headline: labels.headline || `Top ${limit} ${sortField} — ${league}`,
          heroStat: {
            value: String(totalTop2),
            unit: sortField,
            label: labels.heroLabel || `cumulés par le top 2 ${league} ${season}`,
          },
          subjects: rows.slice(0, limit).map((r) => ({
            name: r.player_name || r.name || '—',
            value: Number(r[sortField] || 0),
            color: null,
            portraitUrl: r.photo_url || null,
          })),
          trendline: [],
          annotations: [],
          source: 'statFoot V4',
        };

        // Ignore hero if top value too low (avoids "0 cumulés" garbage output)
        if (topValue < 1) {
          if (!cancelled) setState({ data: demoData, loading: false, error: 'Data creuse.' });
          return;
        }

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
  }, [league, season, sortField, limit]);

  return state;
}

export default useSupremacyBackend;
