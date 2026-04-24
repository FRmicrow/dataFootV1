/**
 * Data contract for the MatchPreviewCard template.
 * Mirrors the backend MatchPreviewDTOSchema (Zod) — keep in sync with
 * backend/src/schemas/contentPreviewSchemas.js.
 */

const clubShape = {
  club_id: { type: 'string', required: true },
  name: { type: 'string', required: true },
  short_name: { type: 'string', required: false },
  logo_url: { type: 'string', required: false },
  primary_color: { type: 'string', required: false },
  standings: { type: 'object', required: false },
  recent_form: { type: 'array<string>', required: true },
  season_xg_avg: { type: 'number', required: false },
  home_away_record: { type: 'object', required: false },
};

export const contract = {
  match: {
    type: 'object',
    required: true,
    shape: {
      match_id: { type: 'string', required: true },
      competition_id: { type: 'string', required: true },
      competition_name: { type: 'string', required: true },
      competition_logo: { type: 'string', required: false },
      season: { type: 'string', required: true },
      matchday: { type: 'number', required: false },
      round_label: { type: 'string', required: false },
      match_date: { type: 'string', required: true },
      kickoff_time: { type: 'string', required: false },
      venue_name: { type: 'string', required: false },
      venue_city: { type: 'string', required: false },
    },
  },
  home: { type: 'object', required: true, shape: clubShape },
  away: { type: 'object', required: true, shape: clubShape },
  h2h: { type: 'object', required: false },
  prediction: { type: 'object', required: false },
  data_gaps: { type: 'array<string>', required: true },
  generated_at: { type: 'string', required: true },
};
