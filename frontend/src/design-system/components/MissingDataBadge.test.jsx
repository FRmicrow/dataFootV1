import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import MissingDataBadge from './MissingDataBadge';

describe('MissingDataBadge', () => {
    it('renders critical severity with the danger variant + ⚠ icon', () => {
        const { container } = render(<MissingDataBadge label="xG saison 2025-26" severity="critical" />);
        const badge = container.querySelector('.ds-badge');
        expect(badge).not.toBeNull();
        expect(badge.classList.contains('ds-badge--danger')).toBe(true);
        expect(badge.classList.contains('ds-missing-badge--critical')).toBe(true);
        expect(screen.getByText(/⚠/)).toBeInTheDocument();
        expect(screen.getByText('Donnée requise')).toBeInTheDocument();
        expect(screen.getByText('xG saison 2025-26')).toBeInTheDocument();
    });

    it('renders optional severity with the neutral variant + ℹ icon', () => {
        const { container } = render(<MissingDataBadge label="Photo de profil" severity="optional" />);
        const badge = container.querySelector('.ds-badge');
        expect(badge).not.toBeNull();
        expect(badge.classList.contains('ds-badge--neutral')).toBe(true);
        expect(badge.classList.contains('ds-missing-badge--optional')).toBe(true);
        expect(screen.getByText(/ℹ/)).toBeInTheDocument();
        expect(screen.getByText('Optionnel')).toBeInTheDocument();
        expect(screen.getByText('Photo de profil')).toBeInTheDocument();
    });

    it('defaults to optional when severity is omitted', () => {
        const { container } = render(<MissingDataBadge label="Foo" />);
        expect(container.querySelector('.ds-badge--neutral')).not.toBeNull();
    });

    it('falls back to optional config when severity is invalid', () => {
        // PropTypes will warn, but the component should not crash
        const { container } = render(<MissingDataBadge label="Foo" severity="weird" />);
        const badge = container.querySelector('.ds-badge');
        expect(badge.classList.contains('ds-badge--neutral')).toBe(true);
    });

    it('applies a custom className alongside the DS class', () => {
        const { container } = render(
            <MissingDataBadge label="Buts" severity="critical" className="my-custom-class" />
        );
        const badge = container.querySelector('.ds-badge');
        expect(badge.classList.contains('my-custom-class')).toBe(true);
        expect(badge.classList.contains('ds-missing-badge')).toBe(true);
    });

    it('respects the size prop on the inner Badge', () => {
        const { container } = render(<MissingDataBadge label="Foo" severity="optional" size="xs" />);
        expect(container.querySelector('.ds-badge--xs')).not.toBeNull();
    });

    it('icon and separator are aria-hidden (only the label is read)', () => {
        const { container } = render(<MissingDataBadge label="Buts" severity="critical" />);
        const icon = container.querySelector('.ds-missing-badge-icon');
        const sep  = container.querySelector('.ds-missing-badge-sep');
        expect(icon.getAttribute('aria-hidden')).toBe('true');
        expect(sep.getAttribute('aria-hidden')).toBe('true');
    });
});
