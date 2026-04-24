/**
 * Source unique de vérité des templates disponibles.
 * Pour ajouter un template : import + pousser une entrée ici + exporter
 * dans index.js. Aucune autre modification du code existant.
 */

import DuoComparison from './DuoComparison/DuoComparison';
import { contract as duoContract } from './DuoComparison/contract';
import duoDemo from './DuoComparison/demo';

import StatSupremacy from './StatSupremacy/StatSupremacy';
import { contract as supContract } from './StatSupremacy/contract';
import supDemo from './StatSupremacy/demo';

import RaceTracker from './RaceTracker/RaceTracker';
import { contract as raceContract } from './RaceTracker/contract';
import raceDemo from './RaceTracker/demo';

import NarrativeGrid from './NarrativeGrid/NarrativeGrid';
import { contract as narContract } from './NarrativeGrid/contract';
import narDemo from './NarrativeGrid/demo';

import PowerGrid from './PowerGrid/PowerGrid';
import { contract as pgContract } from './PowerGrid/contract';
import pgDemo from './PowerGrid/demo';

import MatchPreviewCard from './MatchPreviewCard/MatchPreviewCard';
import { contract as mpcContract } from './MatchPreviewCard/contract';
import mpcDemo from './MatchPreviewCard/demo';

export const TEMPLATE_CATEGORIES = {
  COMPARISON: 'comparison',
  RANKING: 'ranking',
  RACE: 'race',
  HEATMAP: 'heatmap',
  POWER: 'power',
  MATCH_PREVIEW: 'match-preview',
};

export const TEMPLATES = [
  {
    id: 'duo-comparison',
    name: 'Duo Comparison',
    description: 'Comparer deux duos/équipes à armes égales (stats + portraits).',
    category: TEMPLATE_CATEGORIES.COMPARISON,
    component: DuoComparison,
    defaultTheme: 'noir-gold',
    aspectRatios: ['9:16', '1:1', '16:9'],
    contract: duoContract,
    demo: duoDemo,
    supportsWEBM: false, // V8.1
    tags: ['duo', 'comparison', 'legend', 'premium'],
  },
  {
    id: 'stat-supremacy',
    name: 'Stat Supremacy',
    description: 'Un chiffre énorme, un classement, une sparkline — le one-shot stat magazine.',
    category: TEMPLATE_CATEGORIES.RANKING,
    component: StatSupremacy,
    defaultTheme: 'editorial',
    aspectRatios: ['9:16', '1:1', '16:9'],
    contract: supContract,
    demo: supDemo,
    supportsWEBM: false,
    tags: ['ranking', 'headline', 'editorial'],
  },
  {
    id: 'race-tracker',
    name: 'Race Tracker',
    description: 'Course cumulée sur N journées — idéal title race / course au top scorer.',
    category: TEMPLATE_CATEGORIES.RACE,
    component: RaceTracker,
    defaultTheme: 'dark-observatory',
    aspectRatios: ['9:16', '1:1', '16:9'],
    contract: raceContract,
    demo: raceDemo,
    supportsWEBM: true, // animation native via SVG + MediaRecorder → V8.1
    tags: ['race', 'evolution', 'line-chart', 'title-race'],
  },
  {
    id: 'narrative-grid',
    name: 'Narrative Grid',
    description: 'Heatmap KPI × matchs — une saison racontée en intensités.',
    category: TEMPLATE_CATEGORIES.HEATMAP,
    component: NarrativeGrid,
    defaultTheme: 'red-alert',
    aspectRatios: ['9:16', '1:1', '16:9'],
    contract: narContract,
    demo: narDemo,
    supportsWEBM: false,
    tags: ['heatmap', 'narrative', 'form', 'crise'],
  },
  {
    id: 'power-grid',
    name: 'Power Grid',
    description: 'Grille de classements / probas — power ranking visuel.',
    category: TEMPLATE_CATEGORIES.POWER,
    component: PowerGrid,
    defaultTheme: 'tactical-board',
    aspectRatios: ['9:16', '1:1', '16:9'],
    contract: pgContract,
    demo: pgDemo,
    supportsWEBM: false,
    tags: ['ranking', 'power', 'foresight', 'groups'],
  },
  {
    id: 'match-preview-card',
    name: 'Match Preview Card',
    description:
      "Infographie J-1 — versus + formes + stats + H2H + prédiction ML, toutes sources V4 tracées via data_gaps.",
    category: TEMPLATE_CATEGORIES.MATCH_PREVIEW,
    component: MatchPreviewCard,
    defaultTheme: 'dark-observatory',
    aspectRatios: ['9:16', '1:1', '16:9'],
    contract: mpcContract,
    demo: mpcDemo,
    supportsWEBM: false,
    tags: ['match', 'preview', 'prediction', 'versus', 'h2h', 'v4'],
  },
];

/** @param {string} id */
export function getTemplate(id) {
  return TEMPLATES.find((t) => t.id === id) || null;
}

/** @param {string} category */
export function getTemplatesByCategory(category) {
  return TEMPLATES.filter((t) => t.category === category);
}
