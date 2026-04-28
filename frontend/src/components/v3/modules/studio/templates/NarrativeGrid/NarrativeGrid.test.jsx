import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import React from 'react';
import NarrativeGrid from './NarrativeGrid';
import demoData from './demo';

// jsdom n'a pas ResizeObserver — useFitScale en dépend en aval.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

beforeAll(() => {
  vi.stubGlobal('ResizeObserver', ResizeObserverStub);
});
afterAll(() => {
  vi.unstubAllGlobals();
});

describe('NarrativeGrid v2 — rendering', () => {
  it('rend le layout 9:16 (vertical strip) avec scores réels lisibles', () => {
    const { container } = render(<NarrativeGrid data={demoData} aspectRatio="9:16" />);
    expect(container.querySelector('.ng-strip')).not.toBeNull();
    // Scores réels présents
    expect(container.textContent).toContain('2-1');
    expect(container.textContent).toContain('0-1');
    // Record summary visible
    expect(container.textContent).toContain('6V-2N-2D');
  });

  it('rend le layout 1:1 (square grid)', () => {
    const { container } = render(<NarrativeGrid data={demoData} aspectRatio="1:1" />);
    expect(container.querySelector('.ng-square')).not.toBeNull();
    expect(container.querySelector('.ng-square-grid')).not.toBeNull();
    expect(container.textContent).toContain('2-1');
  });

  it('rend le layout 16:9 (horizontal list) avec colonne summary à gauche', () => {
    const { container } = render(<NarrativeGrid data={demoData} aspectRatio="16:9" />);
    expect(container.querySelector('.ng-horiz')).not.toBeNull();
    expect(container.querySelector('.ng-horiz-left')).not.toBeNull();
    expect(container.querySelector('.ng-horiz-list')).not.toBeNull();
    expect(container.textContent).toContain('Bilan');
  });

  it('aucune trace des KPIs invented "Possession" ou "Moral" dans le DOM (v1 -> v2)', () => {
    const { container: c1 } = render(<NarrativeGrid data={demoData} aspectRatio="9:16" />);
    expect(c1.textContent).not.toMatch(/Possession/i);
    expect(c1.textContent).not.toMatch(/Moral/i);

    const { container: c2 } = render(<NarrativeGrid data={demoData} aspectRatio="1:1" />);
    expect(c2.textContent).not.toMatch(/Possession/i);
    expect(c2.textContent).not.toMatch(/Moral/i);

    const { container: c3 } = render(<NarrativeGrid data={demoData} aspectRatio="16:9" />);
    expect(c3.textContent).not.toMatch(/Possession/i);
    expect(c3.textContent).not.toMatch(/Moral/i);
  });

  it('aucune valeur 100/50/0 fantôme dans les cellules (corrige bug v1)', () => {
    const { container } = render(<NarrativeGrid data={demoData} aspectRatio="9:16" />);
    // Pas de cellule isolée affichant juste "100", "50" ou "0" comme intensité
    const cells = container.querySelectorAll('.ng-cell-value');
    expect(cells.length).toBe(0);
  });

  it('masque la ligne xG quand aucun match n\'a de xG', () => {
    const noXgData = {
      ...demoData,
      summary: { record: '6V-2N-2D', goals_for_total: 19, goals_against_total: 8 },
      matches: demoData.matches.map((m) => ({ ...m, xg: null })),
    };
    const { container } = render(<NarrativeGrid data={noXgData} aspectRatio="9:16" />);
    // Pas de bloc xG par match
    expect(container.querySelector('.ng-strip-xg')).toBeNull();
  });

  it('affiche la bannière "Couverture incomplète" quand coverage.partial', () => {
    const partialData = {
      ...demoData,
      coverage: { requested: 10, received: 3, partial: true },
      matches: demoData.matches.slice(0, 3),
    };
    render(<NarrativeGrid data={partialData} aspectRatio="9:16" />);
    expect(screen.getByText(/Couverture incomplète — 3\/10 matchs\./)).toBeTruthy();
  });

  it('utilise le contrat v2 (score.for/against) — pas l\'ancien kpis', () => {
    // demo v2 ne contient plus kpiLabels
    expect(demoData.kpiLabels).toBeUndefined();
    expect(demoData.matches[0].kpis).toBeUndefined();
    expect(demoData.matches[0].score).toBeDefined();
    expect(demoData.matches[0].score.for).toBeTypeOf('number');
    expect(demoData.matches[0].score.against).toBeTypeOf('number');
  });
});
