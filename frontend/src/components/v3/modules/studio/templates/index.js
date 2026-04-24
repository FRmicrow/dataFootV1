/**
 * Public API of the Content Templates library.
 *
 * Usage:
 *   import { DuoComparison, TEMPLATES, exportNodeToPNG } from '@/components/v3/modules/studio/templates';
 */

export { default as DuoComparison } from './DuoComparison/DuoComparison';
export { default as StatSupremacy } from './StatSupremacy/StatSupremacy';
export { default as RaceTracker } from './RaceTracker/RaceTracker';
export { default as NarrativeGrid } from './NarrativeGrid/NarrativeGrid';
export { default as PowerGrid } from './PowerGrid/PowerGrid';
export { default as MatchPreviewCard } from './MatchPreviewCard/MatchPreviewCard';

// Hooks backend V4 (chaque template expose son hook optionnel)
export { default as useDuoBackend } from './DuoComparison/useDuoBackend';
export { default as useSupremacyBackend } from './StatSupremacy/useSupremacyBackend';
export { default as useRaceBackend } from './RaceTracker/useRaceBackend';
export { default as useNarrativeBackend } from './NarrativeGrid/useNarrativeBackend';
export { default as usePowerGridBackend } from './PowerGrid/usePowerGridBackend';
export { default as useMatchPreviewBackend } from './MatchPreviewCard/useMatchPreviewBackend';

// Registry, themes, exporters
export {
  TEMPLATES,
  TEMPLATE_CATEGORIES,
  getTemplate,
  getTemplatesByCategory,
} from './TemplateRegistry';

export { themes, THEME_IDS, DEFAULT_THEME, getTheme } from './_shared/themes';
export {
  fontPairs,
  THEME_FONT_MAP,
  DEFAULT_FONT_PAIR,
  getFontPair,
  resolveFontPair,
} from './_shared/fontPairs';
export { validateContract, assertValid } from './_shared/validators';
export { default as TemplateFrame, ASPECT_CONFIG } from './_shared/TemplateFrame';
export { exportNodeToPNG, exportCanvasToWEBM, exportHTMLToWEBM } from './_shared/exporters';
