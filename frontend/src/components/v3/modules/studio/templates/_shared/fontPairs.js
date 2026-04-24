/**
 * Paires typographiques (display / body) mappées aux DA.
 * Les familles doivent être chargées via Google Fonts dans `frontend/index.html`.
 * Fallback system-ui partout pour éviter les FOUT catastrophiques à l'export.
 */

export const fontPairs = {
  'space-inter': {
    id: 'space-inter',
    display: '"Space Grotesk", "Inter", system-ui, sans-serif',
    body: '"Inter", system-ui, sans-serif',
    displayWeight: 700,
    bodyWeight: 400,
  },
  'fraunces-inter': {
    id: 'fraunces-inter',
    display: '"Fraunces", "Times New Roman", serif',
    body: '"Inter", system-ui, sans-serif',
    displayWeight: 800,
    bodyWeight: 400,
  },
  'sora-inter': {
    id: 'sora-inter',
    display: '"Sora", "Inter", system-ui, sans-serif',
    body: '"Inter", system-ui, sans-serif',
    displayWeight: 700,
    bodyWeight: 400,
  },
  'dm-inter': {
    id: 'dm-inter',
    display: '"DM Sans", "Inter", system-ui, sans-serif',
    body: '"Inter", system-ui, sans-serif',
    displayWeight: 700,
    bodyWeight: 400,
  },
  'outfit-inter': {
    id: 'outfit-inter',
    display: '"Outfit", "Inter", system-ui, sans-serif',
    body: '"Inter", system-ui, sans-serif',
    displayWeight: 700,
    bodyWeight: 400,
  },
};

/** DA → fontPair par défaut */
export const THEME_FONT_MAP = {
  'dark-observatory': 'space-inter',
  editorial: 'fraunces-inter',
  'noir-gold': 'sora-inter',
  'red-alert': 'dm-inter',
  'tactical-board': 'outfit-inter',
};

export const DEFAULT_FONT_PAIR = 'sora-inter';

/**
 * @param {string} fontPairId
 * @returns {object} fontPair, fallback DEFAULT_FONT_PAIR
 */
export function getFontPair(fontPairId) {
  return fontPairs[fontPairId] || fontPairs[DEFAULT_FONT_PAIR];
}

/**
 * Résout la paire typo à utiliser : prop explicite > DA par défaut > fallback.
 */
export function resolveFontPair(themeId, fontPairOverride) {
  if (fontPairOverride && fontPairs[fontPairOverride]) {
    return fontPairs[fontPairOverride];
  }
  const mapped = THEME_FONT_MAP[themeId];
  if (mapped) return fontPairs[mapped];
  return fontPairs[DEFAULT_FONT_PAIR];
}
