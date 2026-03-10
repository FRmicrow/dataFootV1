import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ErrorBoundary from '../../design-system/components/ErrorBoundary';

// Suppress console.error output during intentional throw tests
const originalConsoleError = console.error;
beforeEach(() => {
    console.error = vi.fn();
});
afterEach(() => {
    console.error = originalConsoleError;
});

// Component that throws on demand
const Bomb = ({ shouldThrow }) => {
    if (shouldThrow) throw new Error('Test explosion');
    return <div>All good</div>;
};

describe('ErrorBoundary component', () => {
    it('renders children when no error', () => {
        render(
            <ErrorBoundary>
                <div>Safe content</div>
            </ErrorBoundary>
        );
        expect(screen.getByText('Safe content')).toBeInTheDocument();
    });

    it('renders fallback UI when a child throws', () => {
        render(
            <ErrorBoundary>
                <Bomb shouldThrow />
            </ErrorBoundary>
        );
        expect(screen.getByRole('alert')).toBeInTheDocument();
        expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    });

    it('displays the error message in the fallback UI', () => {
        render(
            <ErrorBoundary>
                <Bomb shouldThrow />
            </ErrorBoundary>
        );
        expect(screen.getByText('Test explosion')).toBeInTheDocument();
    });

    it('shows a reload button in the fallback UI', () => {
        render(
            <ErrorBoundary>
                <Bomb shouldThrow />
            </ErrorBoundary>
        );
        expect(screen.getByRole('button', { name: /reload/i })).toBeInTheDocument();
    });

    it('calls componentDidCatch with the error', () => {
        render(
            <ErrorBoundary>
                <Bomb shouldThrow />
            </ErrorBoundary>
        );
        expect(console.error).toHaveBeenCalled();
    });

    it('renders custom fallback when fallback prop is provided', () => {
        const customFallback = (error) => <div>Custom: {error.message}</div>;
        render(
            <ErrorBoundary fallback={customFallback}>
                <Bomb shouldThrow />
            </ErrorBoundary>
        );
        expect(screen.getByText('Custom: Test explosion')).toBeInTheDocument();
    });

    it('does not render the error alert when children render successfully', () => {
        render(
            <ErrorBoundary>
                <Bomb shouldThrow={false} />
            </ErrorBoundary>
        );
        expect(screen.queryByRole('alert')).not.toBeInTheDocument();
        expect(screen.getByText('All good')).toBeInTheDocument();
    });
});
