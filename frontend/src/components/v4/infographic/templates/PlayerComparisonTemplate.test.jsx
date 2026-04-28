import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import PlayerComparisonTemplate from './PlayerComparisonTemplate';

const happyResolved = {
    season: '2025-26',
    players: [
        {
            name: 'Kylian Mbappé',
            photo: 'https://cdn.example.com/mbappe.png',
            club_name: 'Real Madrid',
            goals: 31,
            assists: 8,
            xG: 28.42,
            minutes_played: 2700,
        },
        {
            name: 'Erling Haaland',
            photo: 'https://cdn.example.com/haaland.png',
            club_name: 'Manchester City',
            goals: 28,
            assists: 5,
            xG: 26.11,
            minutes_played: 2580,
        },
    ],
};

describe('PlayerComparisonTemplate — happy path', () => {
    it('renders both player names and club names', () => {
        render(<PlayerComparisonTemplate resolved={happyResolved} missing={[]} styleVariant="dark-observatory" />);
        expect(screen.getByText('Kylian Mbappé')).toBeInTheDocument();
        expect(screen.getByText('Erling Haaland')).toBeInTheDocument();
        expect(screen.getByText('Real Madrid')).toBeInTheDocument();
        expect(screen.getByText('Manchester City')).toBeInTheDocument();
    });

    it('renders the season header', () => {
        render(<PlayerComparisonTemplate resolved={happyResolved} missing={[]} styleVariant="dark-observatory" />);
        expect(screen.getByText('SAISON 2025-26')).toBeInTheDocument();
        expect(screen.getByText('COMPARATIF')).toBeInTheDocument();
    });

    it('renders all 4 stat rows for each player', () => {
        const { container } = render(<PlayerComparisonTemplate resolved={happyResolved} missing={[]} />);
        // 4 stat rows × 2 players = 8 rows
        expect(container.querySelectorAll('.pct-stat-row').length).toBe(8);
        // Tabular numbers visible
        expect(screen.getAllByText('31').length).toBeGreaterThanOrEqual(1);
        expect(screen.getAllByText('28').length).toBeGreaterThanOrEqual(1);
        // xG formatted to 2 decimals
        expect(screen.getByText('28.42')).toBeInTheDocument();
        expect(screen.getByText('26.11')).toBeInTheDocument();
    });

    it('renders both player photos', () => {
        const { container } = render(<PlayerComparisonTemplate resolved={happyResolved} missing={[]} />);
        const imgs = container.querySelectorAll('img.pct-photo');
        expect(imgs).toHaveLength(2);
        expect(imgs[0].getAttribute('src')).toBe('https://cdn.example.com/mbappe.png');
        expect(imgs[0].getAttribute('alt')).toBe('Kylian Mbappé');
    });

    it('does not render any MissingDataBadge when data is complete', () => {
        const { container } = render(<PlayerComparisonTemplate resolved={happyResolved} missing={[]} />);
        expect(container.querySelectorAll('.ds-missing-badge').length).toBe(0);
    });
});

describe('PlayerComparisonTemplate — missing data behaviour', () => {
    it('renders MissingDataBadge for stats listed in `missing[]`', () => {
        const partialResolved = {
            ...happyResolved,
            players: [
                { ...happyResolved.players[0], xG: null },
                happyResolved.players[1],
            ],
        };
        const missing = [
            { fieldPath: 'players[0].xG', severity: 'critical', humanLabel: 'xG (Mbappé, 2025-26)' },
        ];
        const { container } = render(<PlayerComparisonTemplate resolved={partialResolved} missing={missing} />);
        // The badge must appear with the human label
        expect(screen.getByText(/xG \(Mbappé, 2025-26\)/)).toBeInTheDocument();
        // Critical severity → danger variant
        expect(container.querySelector('.ds-badge--danger')).not.toBeNull();
    });

    it('renders MissingDataBadge in lieu of a missing photo', () => {
        const noPhoto = {
            ...happyResolved,
            players: [
                { ...happyResolved.players[0], photo: null },
                happyResolved.players[1],
            ],
        };
        const missing = [
            { fieldPath: 'players[0].photo', severity: 'optional', humanLabel: 'Photo (Mbappé)' },
        ];
        const { container } = render(<PlayerComparisonTemplate resolved={noPhoto} missing={missing} />);
        expect(container.querySelector('.pct-photo--missing')).not.toBeNull();
        expect(screen.getByText(/Photo \(Mbappé\)/)).toBeInTheDocument();
    });

    it('treats null value as missing even if not listed in missing[]', () => {
        const partialResolved = {
            ...happyResolved,
            players: [
                { ...happyResolved.players[0], xG: null },
                happyResolved.players[1],
            ],
        };
        // No missing[] entry for xG — but value is null → should still render a badge
        const { container } = render(<PlayerComparisonTemplate resolved={partialResolved} missing={[]} />);
        expect(container.querySelectorAll('.ds-missing-badge').length).toBeGreaterThanOrEqual(1);
    });

    it('renders the season as MissingDataBadge when season is null', () => {
        const noSeason = { ...happyResolved, season: null };
        render(<PlayerComparisonTemplate resolved={noSeason} missing={[]} />);
        expect(screen.queryByText(/SAISON/)).not.toBeInTheDocument();
        expect(screen.getByText('Saison')).toBeInTheDocument();
    });

    it('survives an empty resolved object', () => {
        const { container } = render(<PlayerComparisonTemplate resolved={undefined} missing={[]} />);
        expect(container.querySelector('.pct-canvas')).not.toBeNull();
        // 4 stats × 2 cols = 8 missing badges + photos + names + clubs
        expect(container.querySelectorAll('.ds-missing-badge').length).toBeGreaterThanOrEqual(8);
    });
});

describe('PlayerComparisonTemplate — style variants', () => {
    const variants = ['dark-observatory', 'editorial', 'tactical'];

    it.each(variants)('applies the right theme class for "%s"', (variant) => {
        const { container } = render(
            <PlayerComparisonTemplate resolved={happyResolved} missing={[]} styleVariant={variant} />
        );
        const canvas = container.querySelector('.pct-canvas');
        expect(canvas.classList.contains(`template-theme--${variant}`)).toBe(true);
        expect(canvas.getAttribute('data-style-variant')).toBe(variant);
    });

    it('falls back to dark-observatory when an invalid variant is provided', () => {
        const { container } = render(
            <PlayerComparisonTemplate resolved={happyResolved} missing={[]} styleVariant="neon-bingo" />
        );
        const canvas = container.querySelector('.pct-canvas');
        expect(canvas.classList.contains('template-theme--dark-observatory')).toBe(true);
    });
});
