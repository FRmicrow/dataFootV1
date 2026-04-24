export const contract = {
  eyebrow: { type: 'string', required: false },
  headline: { type: 'string', required: true },
  subtitle: { type: 'string', required: false },
  columns: { type: 'number', required: false },
  cells: {
    type: 'array<Cell>',
    required: true,
    shape: {
      title: { type: 'string', required: true },
      rank: { type: 'number', required: true },
      subtitle: { type: 'string', required: false },
      logoUrl: { type: 'string', required: false },
      score: { type: 'number', required: true }, // 0..100
      meta: { type: 'string', required: false },
      group: { type: 'string', required: false },
    },
  },
  source: { type: 'string', required: false },
};
