/**
 * NarrativeGrid v2 contract.
 *
 * Replaces the v1 KPI-based shape with a factual contract :
 *   - per-match score (for/against)
 *   - per-match xG (nullable when not available — never stubbed)
 *   - global summary (record, goals totals, xG averages)
 *   - optional coverage indicator when fewer matches were resolved
 */
export const contract = {
  eyebrow:  { type: 'string', required: false },
  headline: { type: 'string', required: true },
  subtitle: { type: 'string', required: false },
  summary: {
    type: 'object',
    required: false,
    shape: {
      record:               { type: 'string', required: false },
      goals_for_total:      { type: 'number', required: false },
      goals_against_total:  { type: 'number', required: false },
      xg_for_avg:           { type: 'number', required: false },
      xg_against_avg:       { type: 'number', required: false },
    },
  },
  coverage: {
    type: 'object',
    required: false,
    shape: {
      requested: { type: 'number', required: false },
      received:  { type: 'number', required: false },
      partial:   { type: 'boolean', required: false },
    },
  },
  matches: {
    type: 'array<Match>',
    required: true,
    shape: {
      opponent:      { type: 'string', required: true },
      opponent_logo: { type: 'string', required: false },
      result:        { type: 'enum:W|D|L', required: true },
      isHome:        { type: 'boolean', required: true },
      score: {
        type: 'object',
        required: true,
        shape: {
          for:     { type: 'number', required: true },
          against: { type: 'number', required: true },
        },
      },
      xg: {
        type: 'object',
        required: false,
        nullable: true,
        shape: {
          for:     { type: 'number', required: false, nullable: true },
          against: { type: 'number', required: false, nullable: true },
        },
      },
      meta:       { type: 'string', required: false },
      match_date: { type: 'string', required: false },
    },
  },
  takeaway: { type: 'string', required: false },
  source:   { type: 'string', required: false },
};
