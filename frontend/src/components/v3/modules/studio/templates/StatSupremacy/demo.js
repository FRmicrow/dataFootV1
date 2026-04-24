/** Demo — "Haaland et Kane ont explosé un cap historique" */
export const demoData = {
  eyebrow: 'Premier League · 2025-26',
  headline: 'Haaland & Kane ont réécrit le Big-Five.',
  heroStat: {
    value: '71',
    unit: 'buts',
    label: 'cumulés avant la 32ᵉ journée — plus que toute saison depuis 1995',
  },
  subjects: [
    { name: 'Erling Haaland', value: 38, color: '#6CABDD' },
    { name: 'Harry Kane', value: 33, color: '#DC052D' },
    { name: 'Salah (ref 2024-25)', value: 27, color: '#C8102E' },
    { name: 'Watkins (ref 2024-25)', value: 22, color: '#670E36' },
  ],
  trendline: [
    { x: 1, y: 3 }, { x: 4, y: 9 }, { x: 8, y: 17 }, { x: 12, y: 24 },
    { x: 16, y: 31 }, { x: 20, y: 42 }, { x: 24, y: 54 }, { x: 28, y: 65 }, { x: 32, y: 71 },
  ],
  annotations: [
    { x: 20, y: 42, text: 'Cap historique franchi à J20' },
  ],
  source: 'statFoot V4 · Opta',
};

export default demoData;
