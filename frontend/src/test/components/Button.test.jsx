import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Button from '../../design-system/components/Button';

// CSS imports are no-ops in jsdom — vitest handles them via config
describe('Button component', () => {
    it('renders children text', () => {
        render(<Button>Click me</Button>);
        expect(screen.getByText('Click me')).toBeInTheDocument();
    });

    it('applies default variant class (primary)', () => {
        render(<Button>Test</Button>);
        const btn = screen.getByRole('button');
        expect(btn.className).toContain('ds-button--primary');
    });

    it('applies custom variant class', () => {
        render(<Button variant="secondary">Test</Button>);
        const btn = screen.getByRole('button');
        expect(btn.className).toContain('ds-button--secondary');
    });

    it('applies size class', () => {
        render(<Button size="lg">Test</Button>);
        const btn = screen.getByRole('button');
        expect(btn.className).toContain('ds-button--lg');
    });

    it('calls onClick handler when clicked', () => {
        const handleClick = vi.fn();
        render(<Button onClick={handleClick}>Click</Button>);
        fireEvent.click(screen.getByRole('button'));
        expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('is disabled when disabled prop is true', () => {
        render(<Button disabled>Disabled</Button>);
        expect(screen.getByRole('button')).toBeDisabled();
    });

    it('does not fire onClick when disabled', () => {
        const handleClick = vi.fn();
        render(<Button disabled onClick={handleClick}>Click</Button>);
        fireEvent.click(screen.getByRole('button'));
        expect(handleClick).not.toHaveBeenCalled();
    });

    it('is disabled and shows spinner when loading', () => {
        render(<Button loading>Loading</Button>);
        const btn = screen.getByRole('button');
        expect(btn).toBeDisabled();
        expect(btn.className).toContain('ds-button--loading');
    });

    it('renders icon when provided and not loading', () => {
        render(<Button icon="⭐">With icon</Button>);
        expect(screen.getByText('⭐')).toBeInTheDocument();
    });

    it('hides icon when loading', () => {
        render(<Button loading icon="⭐">Loading</Button>);
        expect(screen.queryByText('⭐')).not.toBeInTheDocument();
    });

    it('uses button type by default', () => {
        render(<Button>Default</Button>);
        expect(screen.getByRole('button')).toHaveAttribute('type', 'button');
    });

    it('respects custom type prop', () => {
        render(<Button type="submit">Submit</Button>);
        expect(screen.getByRole('button')).toHaveAttribute('type', 'submit');
    });
});
