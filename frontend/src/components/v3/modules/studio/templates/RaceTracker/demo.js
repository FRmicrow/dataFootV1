/** Demo — Premier League 2025-26 title race (Arsenal vs Liverpool vs City) */
export const demoData = {
  eyebrow: 'Premier League 2025-26',
  headline: 'La course au titre — J1 → J32',
  competitors: [
    { name: 'Arsenal', color: '#EF0107' },
    { name: 'Liverpool', color: '#C8102E' },
    { name: 'Man City', color: '#6CABDD' },
  ],
  timeline: [
    { matchday: 1,  values: { Arsenal: 3,  Liverpool: 3,  'Man City': 1 } },
    { matchday: 4,  values: { Arsenal: 10, Liverpool: 9,  'Man City': 7 } },
    { matchday: 8,  values: { Arsenal: 20, Liverpool: 17, 'Man City': 16 } },
    { matchday: 12, values: { Arsenal: 29, Liverpool: 26, 'Man City': 24 } },
    { matchday: 16, values: { Arsenal: 37, Liverpool: 35, 'Man City': 32 } },
    { matchday: 20, values: { Arsenal: 47, Liverpool: 44, 'Man City': 40 } },
    { matchday: 24, values: { Arsenal: 57, Liverpool: 52, 'Man City': 48 } },
    { matchday: 28, values: { Arsenal: 65, Liverpool: 62, 'Man City': 56 } },
    { matchday: 32, values: { Arsenal: 74, Liverpool: 70, 'Man City': 63 } },
  ],
  events: [
    { matchday: 12, label: 'Derby nord-Londres' },
    { matchday: 24, label: 'Anfield — choc direct' },
  ],
  source: 'statFoot V4',
};

export default demoData;
