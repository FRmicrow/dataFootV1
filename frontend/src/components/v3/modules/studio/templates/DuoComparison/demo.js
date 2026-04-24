/**
 * Demo data — Díaz × Olise vs Robben × Ribéry (Bayern 2012-13).
 * Stats 2025-26 via V4 ; stats 2012-13 stubbed (pas de rétro en V4).
 */
export const demoData = {
  title: 'Wings of a Generation',
  subtitle: 'Bayern 2012-13 vs 2025-26 — le duel des duos',
  left: {
    heading: 'Díaz × Olise',
    subheading: 'Bayern 2025-26',
    colorHint: '#DC0000',
    members: [
      { name: 'Luis Díaz', role: 'LW', portraitUrl: null },
      { name: 'Michael Olise', role: 'RW', portraitUrl: null },
    ],
    stats: [
      { label: 'Buts cumulés', value: '24', unit: 'BL' },
      { label: 'Passes D', value: '19', unit: 'BL' },
      { label: 'xG combiné', value: '21.7' },
      { label: 'Dribbles / 90', value: '6.3' },
    ],
  },
  right: {
    heading: 'Robben × Ribéry',
    subheading: 'Bayern 2012-13 (Treble)',
    colorHint: '#C9A24C',
    members: [
      { name: 'Arjen Robben', role: 'RW', portraitUrl: null },
      { name: 'Franck Ribéry', role: 'LW', portraitUrl: null },
    ],
    stats: [
      { label: 'Buts cumulés', value: '22', unit: 'BL' },
      { label: 'Passes D', value: '24', unit: 'BL' },
      { label: 'xG combiné', value: '—' },
      { label: 'Dribbles / 90', value: '7.4' },
    ],
  },
  verdict: 'Le nouveau duo frôle déjà la prod des légendes — sans le Treble… pour l\'instant.',
  footer: {
    source: 'statFoot V4 / Opta',
    era: '2025-26 vs 2012-13',
  },
};

export default demoData;
