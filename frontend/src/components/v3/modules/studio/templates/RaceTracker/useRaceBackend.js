import { useEffect, useState } from 'react';
import api from '../../../../../../services/api';
import demoData from './demo';

/**
 * Hook V4 pour RaceTracker.
 *
 * @STUB : la route dédiée `/v4/league/:league/season/:season/points-trajectory`
 * n'existe pas encore (cf. TSD section 6). On essaie en fallback d'agréger
 * depuis `getFixturesV4` — si indispo, on tombe sur `demo.js`.
 *
 * @param {object} params
 * @param {string} params.league
 * @param {string|number} params.season
 * @param {string[]} params.teams - noms des clubs suivis
 */
export function useRaceBackend({ league, season, teams = [] } = {}) {
  const [state, setState] = useState({ data: demoData, loading: false, error: null });

  useEffect(() => {
    let cancelled = false;
    if (!league || !season || teams.length === 0) return;

    setState((s) => ({ ...s, loading: true, error: null }));

    (async () => {
      try {
        const fixturesResp = await api.getFixturesV4(league, season);
        const fixtures = fixturesResp?.data?.fixtures || fixturesResp?.fixtures || [];

        if (!fixtures.length) {
          if (!cancelled) {
            setState({ data: demoData, loading: false, error: 'Fixtures vides — demo.' });
          }
          return;
        }

        // Agrégation : points cumulés par (team, matchday)
        const pointsFor = (home, away, hg, ag) => {
          if (hg == null || ag == null) return [0, 0];
          if (hg > ag) return [3, 0];
          if (hg < ag) return [0, 3];
          return [1, 1];
        };

        const cumul = new Map(); // teamName -> Map(matchday -> points)
        teams.forEach((t) => cumul.set(t, new Map()));

        const sorted = [...fixtures].sort(
          (a, b) => (a.match_date || '').localeCompare(b.match_date || ''),
        );

        let matchdayIdx = 0;
        let lastDate = null;
        const running = new Map(teams.map((t) => [t, 0]));

        sorted.forEach((fx) => {
          if (fx.match_date !== lastDate) {
            matchdayIdx += 1;
            lastDate = fx.match_date;
          }
          const home = fx.home_club_name;
          const away = fx.away_club_name;
          const [hp, ap] = pointsFor(home, away, fx.home_goals, fx.away_goals);
          if (teams.includes(home)) running.set(home, running.get(home) + hp);
          if (teams.includes(away)) running.set(away, running.get(away) + ap);

          teams.forEach((t) => {
            cumul.get(t).set(matchdayIdx, running.get(t));
          });
        });

        const maxMd = matchdayIdx;
        if (maxMd < 4) {
          if (!cancelled) {
            setState({ data: demoData, loading: false, error: 'Saison trop courte — demo.' });
          }
          return;
        }

        const sampleMds = [];
        const step = Math.max(1, Math.floor(maxMd / 9));
        for (let md = 1; md <= maxMd; md += step) sampleMds.push(md);
        if (sampleMds[sampleMds.length - 1] !== maxMd) sampleMds.push(maxMd);

        const timeline = sampleMds.map((md) => {
          const values = {};
          teams.forEach((t) => {
            const m = cumul.get(t);
            // last known value <= md
            let v = 0;
            for (let k = md; k >= 1; k -= 1) {
              if (m.has(k)) { v = m.get(k); break; }
            }
            values[t] = v;
          });
          return { matchday: md, values };
        });

        const built = {
          eyebrow: `${league} ${season}`,
          headline: `La course au titre — J1 → J${maxMd}`,
          competitors: teams.map((t) => ({ name: t, color: null })),
          timeline,
          events: [],
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
  }, [league, season, JSON.stringify(teams)]);

  return state;
}

export default useRaceBackend;
