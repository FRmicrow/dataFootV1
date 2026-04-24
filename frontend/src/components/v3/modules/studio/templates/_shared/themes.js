/**
 * 5 DA (Directions Artistiques) packagées pour les templates de contenu.
 * Values in raw hex — volontaire : l'export PNG/WEBM capture hors arbre DOM
 * et ne résout pas les CSS variables. Tout ce qui n'est pas thème (spacing,
 * radius de layout, etc.) reste en tokens CSS via tokens.css.
 */

export const themes = {
  'dark-observatory': {
    id: 'dark-observatory',
    label: 'Dark Observatory',
    mood: 'Analytique, dense, data-rich',
    bg: '#0A0E1A',
    bgGradient: 'radial-gradient(120% 80% at 50% 0%, #111A2E 0%, #0A0E1A 60%)',
    surface: '#131A2B',
    surfaceSoft: 'rgba(255,255,255,0.03)',
    border: 'rgba(0, 229, 196, 0.18)',
    text: '#E6F1FF',
    textSoft: '#8FA2C4',
    accent: '#00E5C4',
    accentSoft: 'rgba(0, 229, 196, 0.16)',
    accentGlow: '0 0 24px rgba(0, 229, 196, 0.45)',
    shadow: '0 24px 60px -20px rgba(0, 229, 196, 0.25)',
    radius: '18px',
    grid: 'rgba(0, 229, 196, 0.08)',
  },
  editorial: {
    id: 'editorial',
    label: 'Editorial Sports',
    mood: 'Magazine, typo-first, high contrast',
    bg: '#F5F1E8',
    bgGradient: 'linear-gradient(180deg, #FAF6EC 0%, #EDE7D6 100%)',
    surface: '#FFFFFF',
    surfaceSoft: 'rgba(17, 17, 17, 0.04)',
    border: 'rgba(17, 17, 17, 0.12)',
    text: '#111111',
    textSoft: '#4A4A4A',
    accent: '#D4302A',
    accentSoft: 'rgba(212, 48, 42, 0.12)',
    accentGlow: 'none',
    shadow: '0 12px 40px -18px rgba(0, 0, 0, 0.25)',
    radius: '6px',
    grid: 'rgba(17, 17, 17, 0.08)',
  },
  'noir-gold': {
    id: 'noir-gold',
    label: 'Noir & Gold',
    mood: 'Premium duel, high-end',
    bg: '#0B0B0C',
    bgGradient: 'radial-gradient(140% 100% at 50% 0%, #1A1612 0%, #0B0B0C 60%)',
    surface: '#151516',
    surfaceSoft: 'rgba(201, 162, 76, 0.06)',
    border: 'rgba(201, 162, 76, 0.28)',
    text: '#F5E8C7',
    textSoft: '#A8977C',
    accent: '#C9A24C',
    accentSoft: 'rgba(201, 162, 76, 0.2)',
    accentGlow: '0 0 30px rgba(201, 162, 76, 0.5)',
    shadow: '0 24px 60px -20px rgba(201, 162, 76, 0.3)',
    radius: '20px',
    grid: 'rgba(201, 162, 76, 0.08)',
  },
  'red-alert': {
    id: 'red-alert',
    label: 'Red Alert',
    mood: 'Crise, urgence, intensité',
    bg: '#1A0000',
    bgGradient: 'radial-gradient(140% 120% at 50% 0%, #3D0505 0%, #1A0000 55%)',
    surface: '#260606',
    surfaceSoft: 'rgba(255, 55, 55, 0.08)',
    border: 'rgba(255, 55, 55, 0.3)',
    text: '#FFE8E8',
    textSoft: '#E3A6A6',
    accent: '#FF3737',
    accentSoft: 'rgba(255, 55, 55, 0.22)',
    accentGlow: '0 0 26px rgba(255, 55, 55, 0.55)',
    shadow: '0 24px 60px -20px rgba(255, 55, 55, 0.4)',
    radius: '14px',
    grid: 'rgba(255, 55, 55, 0.1)',
  },
  'tactical-board': {
    id: 'tactical-board',
    label: 'Tactical Board',
    mood: 'Grille, précision, minimaliste',
    bg: '#12151C',
    bgGradient: 'linear-gradient(180deg, #141822 0%, #10131A 100%)',
    surface: '#1A1F2B',
    surfaceSoft: 'rgba(107, 163, 255, 0.06)',
    border: 'rgba(107, 163, 255, 0.22)',
    text: '#E8F0FF',
    textSoft: '#91A4C2',
    accent: '#6BA3FF',
    accentSoft: 'rgba(107, 163, 255, 0.16)',
    accentGlow: '0 0 20px rgba(107, 163, 255, 0.4)',
    shadow: '0 24px 60px -20px rgba(107, 163, 255, 0.25)',
    radius: '10px',
    grid: 'rgba(107, 163, 255, 0.1)',
  },
};

export const THEME_IDS = Object.keys(themes);
export const DEFAULT_THEME = 'noir-gold';

/**
 * @param {string} themeId
 * @returns {object} theme object, fallback to DEFAULT_THEME if invalid
 */
export function getTheme(themeId) {
  return themes[themeId] || themes[DEFAULT_THEME];
}
