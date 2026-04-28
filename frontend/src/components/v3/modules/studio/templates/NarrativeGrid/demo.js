/**
 * Demo — Real Madrid saison 2025-26, contrat v2 (score/xg/summary).
 *
 * Aucun KPI inventé : scores réels et xG factuel (peut être null si pas
 * de donnée). Bilan global = '6V-2N-2D' = compatible avec le test
 * NarrativeGrid v2 — rendering > rend le layout 9:16.
 */
export const demoData = {
  eyebrow: 'Real Madrid · 2025-26',
  headline: '10 derniers matchs — la vue large',
  subtitle: 'Récap factuel : scores et xG là où ils existent.',
  summary: {
    record: '6V-2N-2D',
    goals_for_total: 19,
    goals_against_total: 8,
    xg_for_avg: 1.84,
    xg_against_avg: 0.92,
  },
  matches: [
    { opponent: 'Valencia',      isHome: true,  result: 'W', score: { for: 2, against: 1 }, xg: { for: 1.6, against: 0.9 }, meta: 'LaLiga', match_date: '2026-04-06' },
    { opponent: 'Atlético',      isHome: false, result: 'D', score: { for: 1, against: 1 }, xg: { for: 1.2, against: 1.4 }, meta: 'LaLiga', match_date: '2026-03-30' },
    { opponent: 'Man City',      isHome: false, result: 'L', score: { for: 0, against: 1 }, xg: { for: 0.8, against: 2.1 }, meta: 'UCL',    match_date: '2026-03-22' },
    { opponent: 'Getafe',        isHome: true,  result: 'W', score: { for: 3, against: 0 }, xg: { for: 2.3, against: 0.4 }, meta: 'LaLiga', match_date: '2026-03-16' },
    { opponent: 'Sevilla',       isHome: false, result: 'W', score: { for: 2, against: 1 }, xg: { for: 1.9, against: 1.1 }, meta: 'LaLiga', match_date: '2026-03-09' },
    { opponent: 'Barcelona',     isHome: true,  result: 'L', score: { for: 0, against: 2 }, xg: { for: 1.0, against: 1.7 }, meta: 'LaLiga', match_date: '2026-03-02' },
    { opponent: 'Villarreal',    isHome: false, result: 'D', score: { for: 1, against: 1 }, xg: { for: 1.3, against: 1.0 }, meta: 'LaLiga', match_date: '2026-02-23' },
    { opponent: 'Arsenal',       isHome: true,  result: 'W', score: { for: 3, against: 1 }, xg: { for: 2.1, against: 0.6 }, meta: 'UCL',    match_date: '2026-02-16' },
    { opponent: 'Real Sociedad', isHome: false, result: 'W', score: { for: 4, against: 0 }, xg: { for: 2.7, against: 0.3 }, meta: 'LaLiga', match_date: '2026-02-09' },
    { opponent: 'Bayern',        isHome: true,  result: 'W', score: { for: 3, against: 1 }, xg: { for: 2.2, against: 1.0 }, meta: 'UCL',    match_date: '2026-02-02' },
  ],
  takeaway: 'Bilan offensif solide ; les deux défaites concentrent les pertes (Clásico + City).',
  source: 'statFoot V4',
};

export default demoData;
