import { useEffect, useState } from 'react';
import api from '../../../../../../services/api';
import demoData from './demo';

/**
 * Hook V4 pour DuoComparison.
 * Cherche 2+2 joueurs sur une saison et formate en data contract.
 * Fallback demo si payload incomplet ou erreur.
 *
 * @param {object} params
 * @param {string} params.league - ex: 'Bundesliga'
 * @param {string|number} params.season - ex: 2025
 * @param {string[]} params.leftPlayers - noms ou IDs
 * @param {string[]} params.rightPlayers
 * @param {object} [params.labels] - { leftHeading, rightHeading, title, subtitle, verdict }
 * @returns {{ data, loading, error }}
 */
export function useDuoBackend({ league, season, leftPlayers, rightPlayers, labels = {} } = {}) {
  const [state, setState] = useState({ data: demoData, loading: false, error: null });

  useEffect(() => {
    let cancelled = false;

    if (!league || !season || !leftPlayers?.length || !rightPlayers?.length) {
      return;
    }

    setState((s) => ({ ...s, loading: true, error: null }));

    (async () => {
      try {
        // @STUB : api.getSeasonPlayersV4 ne supporte pas un filter par noms
        // → on récupère le top et on filtre côté client. Route dédiée
        // (`/v4/.../season/:s/players/by-names`) à prévoir en V8.1.
        const resp = await api.getSeasonPlayersV4(league, season, { limit: 200 });
        const rows = resp?.data?.players || resp?.players || [];

        const findAll = (names) =>
          names
            .map((n) =>
              rows.find(
                (r) => (r.player_name || r.name || '').toLowerCase().includes(n.toLowerCase()),
              ),
            )
            .filter(Boolean);

        const leftRows = findAll(leftPlayers);
        const rightRows = findAll(rightPlayers);

        if (leftRows.length < 1 || rightRows.length < 1) {
          if (!cancelled) {
            setState({ data: demoData, loading: false, error: 'Joueurs introuvables — demo.' });
          }
          return;
        }

        const sumStat = (rows_, key) =>
          rows_.reduce((acc, r) => acc + (Number(r[key]) || 0), 0);

        const formatSide = (rows_, heading, subheading) => ({
          heading,
          subheading,
          members: rows_.map((r) => ({
            name: r.player_name || r.name || 'Inconnu',
            role: r.position || '—',
            portraitUrl: r.photo_url || null,
          })),
          stats: [
            { label: 'Buts cumulés', value: String(sumStat(rows_, 'goals')), unit: league },
            { label: 'Passes D', value: String(sumStat(rows_, 'assists')) },
            { label: 'xG combiné', value: sumStat(rows_, 'xg').toFixed(1) },
            { label: 'Minutes', value: String(sumStat(rows_, 'minutes')) },
          ],
        });

        const built = {
          title: labels.title || demoData.title,
          subtitle: labels.subtitle || `${league} ${season}`,
          left: formatSide(leftRows, labels.leftHeading || 'Duo A', league),
          right: formatSide(rightRows, labels.rightHeading || 'Duo B', `${league} (ref)`),
          verdict: labels.verdict || '',
          footer: { source: 'statFoot V4', era: `${league} ${season}` },
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
  }, [league, season, JSON.stringify(leftPlayers), JSON.stringify(rightPlayers)]);

  return state;
}

export default useDuoBackend;
