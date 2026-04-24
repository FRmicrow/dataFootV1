export const contract = {
  eyebrow: { type: 'string', required: false },
  headline: { type: 'string', required: true },
  subtitle: { type: 'string', required: false },
  kpiLabels: { type: 'array<string>', required: true },
  matches: {
    type: 'array<Match>',
    required: true,
    shape: {
      opponent: { type: 'string', required: true },
      result: { type: 'enum:W|D|L', required: true },
      isHome: { type: 'boolean', required: false },
      kpis: { type: 'object', required: true }, // map label -> 0..1
      meta: { type: 'string', required: false },
    },
  },
  takeaway: { type: 'string', required: false },
  source: { type: 'string', required: false },
};
