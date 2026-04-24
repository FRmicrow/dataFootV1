export const contract = {
  eyebrow: { type: 'string', required: false },
  headline: { type: 'string', required: true },
  heroStat: {
    type: 'object',
    required: true,
    shape: {
      value: { type: 'string', required: true },
      unit: { type: 'string', required: false },
      label: { type: 'string', required: true },
    },
  },
  subjects: {
    type: 'array<Subject>',
    required: true,
    shape: {
      name: { type: 'string', required: true },
      value: { type: 'number', required: true },
      color: { type: 'string', required: false },
      portraitUrl: { type: 'string', required: false },
    },
  },
  trendline: {
    type: 'array<Point>',
    required: false,
    shape: {
      x: { type: 'number', required: true },
      y: { type: 'number', required: true },
    },
  },
  annotations: {
    type: 'array<Annot>',
    required: false,
    shape: {
      x: { type: 'number', required: true },
      y: { type: 'number', required: true },
      text: { type: 'string', required: true },
    },
  },
  source: { type: 'string', required: false },
};
