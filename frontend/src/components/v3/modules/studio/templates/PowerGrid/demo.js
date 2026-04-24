/** Demo — WC 2026 Power Ranking (12 favorites) */
export const demoData = {
  eyebrow: 'Coupe du Monde 2026 · Power Ranking',
  headline: 'Les 12 favoris, par probas de titre',
  subtitle: 'Scores issus du modèle statFoot (Elo ajusté + xG).',
  columns: 3,
  cells: [
    { title: 'Espagne',    rank: 1, subtitle: 'Europe',       score: 88, meta: '18.2%', group: 'A' },
    { title: 'Argentine',  rank: 2, subtitle: 'Amérique S.',  score: 86, meta: '16.7%', group: 'B' },
    { title: 'France',     rank: 3, subtitle: 'Europe',       score: 83, meta: '14.0%', group: 'C' },
    { title: 'Angleterre', rank: 4, subtitle: 'Europe',       score: 80, meta: '10.5%', group: 'D' },
    { title: 'Brésil',     rank: 5, subtitle: 'Amérique S.',  score: 78, meta: '9.2%',  group: 'E' },
    { title: 'Portugal',   rank: 6, subtitle: 'Europe',       score: 75, meta: '6.8%',  group: 'F' },
    { title: 'Allemagne',  rank: 7, subtitle: 'Europe',       score: 73, meta: '5.5%',  group: 'G' },
    { title: 'Pays-Bas',   rank: 8, subtitle: 'Europe',       score: 71, meta: '4.2%',  group: 'H' },
    { title: 'Uruguay',    rank: 9, subtitle: 'Amérique S.',  score: 67, meta: '3.4%',  group: 'I' },
    { title: 'Maroc',      rank: 10, subtitle: 'Afrique',     score: 64, meta: '2.8%',  group: 'J' },
    { title: 'Colombie',   rank: 11, subtitle: 'Amérique S.', score: 62, meta: '2.1%',  group: 'K' },
    { title: 'Croatie',    rank: 12, subtitle: 'Europe',      score: 60, meta: '1.7%',  group: 'L' },
  ],
  source: 'statFoot Foresight V4',
};

export default demoData;
