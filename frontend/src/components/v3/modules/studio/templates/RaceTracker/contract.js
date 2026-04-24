export const contract = {
  eyebrow: { type: 'string', required: false },
  headline: { type: 'string', required: true },
  competitors: {
    type: 'array<Competitor>',
    required: true,
    shape: {
      name: { type: 'string', required: true },
      color: { type: 'string', required: false },
      logoUrl: { type: 'string', required: false },
    },
  },
  timeline: {
    type: 'array<Step>',
    required: true,
    // shape.values est un map dynamique — validation structurelle uniquement
    shape: {
      matchday: { type: 'number', required: true },
      values: { type: 'object', required: true },
    },
  },
  events: {
    type: 'array<Event>',
    required: false,
    shape: {
      matchday: { type: 'number', required: true },
      label: { type: 'string', required: true },
    },
  },
  source: { type: 'string', required: false },
};
