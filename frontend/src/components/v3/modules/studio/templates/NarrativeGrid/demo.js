/** Demo — Real Madrid saison 2025-26, heatmap narrative */
export const demoData = {
  eyebrow: 'Real Madrid · 2025-26',
  headline: 'La saison vue comme une heatmap',
  subtitle: '10 derniers matchs toutes compétitions — 4 KPIs, une histoire.',
  kpiLabels: ['Résultat', 'xG diff', 'Possession', 'Moral (réseaux)'],
  matches: [
    { opponent: 'Valencia',     result: 'W', isHome: true,  kpis: { 'Résultat': 1.0, 'xG diff': 0.82, 'Possession': 0.72, 'Moral (réseaux)': 0.88 } },
    { opponent: 'Atlético',     result: 'D', isHome: false, kpis: { 'Résultat': 0.5, 'xG diff': 0.48, 'Possession': 0.56, 'Moral (réseaux)': 0.55 } },
    { opponent: 'Man City',     result: 'L', isHome: false, kpis: { 'Résultat': 0.0, 'xG diff': 0.22, 'Possession': 0.49, 'Moral (réseaux)': 0.18 } },
    { opponent: 'Getafe',       result: 'W', isHome: true,  kpis: { 'Résultat': 1.0, 'xG diff': 0.78, 'Possession': 0.68, 'Moral (réseaux)': 0.63 } },
    { opponent: 'Sevilla',      result: 'W', isHome: false, kpis: { 'Résultat': 1.0, 'xG diff': 0.66, 'Possession': 0.62, 'Moral (réseaux)': 0.72 } },
    { opponent: 'Barcelona',    result: 'L', isHome: true,  kpis: { 'Résultat': 0.0, 'xG diff': 0.35, 'Possession': 0.44, 'Moral (réseaux)': 0.05 } },
    { opponent: 'Villarreal',   result: 'D', isHome: false, kpis: { 'Résultat': 0.5, 'xG diff': 0.52, 'Possession': 0.58, 'Moral (réseaux)': 0.4 } },
    { opponent: 'Arsenal',      result: 'W', isHome: true,  kpis: { 'Résultat': 1.0, 'xG diff': 0.72, 'Possession': 0.53, 'Moral (réseaux)': 0.81 } },
    { opponent: 'Real Sociedad',result: 'W', isHome: false, kpis: { 'Résultat': 1.0, 'xG diff': 0.68, 'Possession': 0.71, 'Moral (réseaux)': 0.78 } },
    { opponent: 'Bayern',       result: 'D', isHome: true,  kpis: { 'Résultat': 0.5, 'xG diff': 0.55, 'Possession': 0.58, 'Moral (réseaux)': 0.62 } },
  ],
  takeaway: 'Le Clásico reste la tâche rouge sombre qui obscurcit tout le reste.',
  source: 'statFoot V4',
};

export default demoData;
