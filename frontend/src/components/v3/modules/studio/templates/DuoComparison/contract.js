export const contract = {
  title: { type: 'string', required: true },
  subtitle: { type: 'string', required: false },
  left: {
    type: 'object',
    required: true,
    shape: {
      heading: { type: 'string', required: true },
      subheading: { type: 'string', required: false },
      colorHint: { type: 'string', required: false },
      members: {
        type: 'array<Member>',
        required: true,
        shape: {
          name: { type: 'string', required: true },
          role: { type: 'string', required: false },
          portraitUrl: { type: 'string', required: false },
        },
      },
      stats: {
        type: 'array<Stat>',
        required: true,
        shape: {
          label: { type: 'string', required: true },
          value: { type: 'string', required: true },
          unit: { type: 'string', required: false },
        },
      },
    },
  },
  right: {
    type: 'object',
    required: true,
    shape: {
      heading: { type: 'string', required: true },
      subheading: { type: 'string', required: false },
      colorHint: { type: 'string', required: false },
      members: {
        type: 'array<Member>',
        required: true,
        shape: {
          name: { type: 'string', required: true },
          role: { type: 'string', required: false },
          portraitUrl: { type: 'string', required: false },
        },
      },
      stats: {
        type: 'array<Stat>',
        required: true,
        shape: {
          label: { type: 'string', required: true },
          value: { type: 'string', required: true },
          unit: { type: 'string', required: false },
        },
      },
    },
  },
  verdict: { type: 'string', required: false },
  footer: {
    type: 'object',
    required: false,
    shape: {
      source: { type: 'string', required: false },
      era: { type: 'string', required: false },
    },
  },
};
