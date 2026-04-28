import { describe, it, expect } from 'vitest';
import {
  buildMatchEntry,
  countResults,
  averageXg,
  buildTakeaway,
} from './useNarrativeBackend';

describe('useNarrativeBackend — helpers (v2)', () => {
  describe('buildMatchEntry', () => {
    it('mappe un fixture domicile victorieux vers un Match v2 complet', () => {
      const fx = {
        home_team: 'Real Madrid',
        away_team: 'Atlético',
        away_team_logo: 'https://cdn/atletico.png',
        goals_home: 2,
        goals_away: 1,
        xg_home: 1.6,
        xg_away: 0.9,
        competition_name: 'LaLiga',
        date: '2026-04-06',
      };
      const m = buildMatchEntry(fx, 'Real Madrid');
      expect(m.opponent).toBe('Atlético');
      expect(m.opponent_logo).toBe('https://cdn/atletico.png');
      expect(m.isHome).toBe(true);
      expect(m.result).toBe('W');
      expect(m.score).toEqual({ for: 2, against: 1 });
      expect(m.xg).toEqual({ for: 1.6, against: 0.9 });
      expect(m.meta).toBe('LaLiga');
      expect(m.match_date).toBe('2026-04-06');
    });

    it('mappe un fixture extérieur défaite avec inversion correcte', () => {
      const fx = {
        home_team: 'Barcelona',
        away_team: 'Real Madrid',
        goals_home: 3,
        goals_away: 1,
        xg_home: 2.4,
        xg_away: 0.7,
        competition_name: 'LaLiga',
      };
      const m = buildMatchEntry(fx, 'Real Madrid');
      expect(m.isHome).toBe(false);
      expect(m.result).toBe('L');
      expect(m.score).toEqual({ for: 1, against: 3 });
      expect(m.xg).toEqual({ for: 0.7, against: 2.4 });
    });

    it('renvoie xg=null quand aucune donnée xG (pas de stub 0.5 silencieux)', () => {
      const fx = {
        home_team: 'Real Madrid',
        away_team: 'Sevilla',
        goals_home: 0,
        goals_away: 1,
        xg_home: null,
        xg_away: null,
      };
      const m = buildMatchEntry(fx, 'Real Madrid');
      expect(m.xg).toBeNull();
      expect(m.result).toBe('L');
    });

    it('détecte un nul', () => {
      const fx = {
        home_team: 'Real Madrid',
        away_team: 'Rayo',
        goals_home: 2,
        goals_away: 2,
      };
      const m = buildMatchEntry(fx, 'Real Madrid');
      expect(m.result).toBe('D');
    });
  });

  describe('countResults', () => {
    it('produit le format "5V-3N-2D"', () => {
      const matches = [
        { result: 'W' }, { result: 'W' }, { result: 'W' }, { result: 'W' }, { result: 'W' },
        { result: 'D' }, { result: 'D' }, { result: 'D' },
        { result: 'L' }, { result: 'L' },
      ];
      expect(countResults(matches)).toBe('5V-3N-2D');
    });

    it('renvoie 0V-0N-0D pour une liste vide', () => {
      expect(countResults([])).toBe('0V-0N-0D');
    });
  });

  describe('averageXg', () => {
    it('moyenne les xG.for sur les matchs avec donnée', () => {
      const matches = [
        { xg: { for: 2.0, against: 0.5 } },
        { xg: { for: 1.0, against: 1.0 } },
        { xg: null },
      ];
      expect(averageXg(matches, 'for')).toBe(1.5);
      expect(averageXg(matches, 'against')).toBe(0.75);
    });

    it('renvoie null si aucun match n\'a de xG', () => {
      const matches = [{ xg: null }, { xg: null }];
      expect(averageXg(matches, 'for')).toBeNull();
    });
  });

  describe('buildTakeaway', () => {
    it('inclut le record et la moyenne xG quand dispo', () => {
      const summary = { record: '5V-3N-2D', xg_for_avg: 1.84, xg_against_avg: 0.92 };
      const matches = [{}, {}, {}];
      expect(buildTakeaway(matches, summary)).toMatch(/5V-3N-2D/);
      expect(buildTakeaway(matches, summary)).toMatch(/1\.84/);
      expect(buildTakeaway(matches, summary)).toMatch(/0\.92/);
    });

    it('reste neutre si xG indisponible (pas de "0.5" stub)', () => {
      const summary = { record: '5V-3N-2D', xg_for_avg: null, xg_against_avg: null };
      const result = buildTakeaway([{}], summary);
      expect(result).not.toMatch(/0\.5/);
      expect(result).toMatch(/5V-3N-2D/);
    });
  });
});
