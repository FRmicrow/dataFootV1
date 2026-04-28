import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import React from 'react';

// Stub the three lazy panels — we only assert routing/tab logic, not their content.
vi.mock('../../components/v3/modules/studio/IdeasHub/IdeasHub', () => ({
    default: () => <div data-testid="panel-ideas">IDEAS_PANEL</div>,
}));
vi.mock('../../components/v3/modules/studio/TemplatesPlayground/TemplatesPlayground', () => ({
    default: () => <div data-testid="panel-templates">TEMPLATES_PANEL</div>,
}));
vi.mock('../../components/v3/modules/studio/MatchPreviewStudio/MatchPreviewStudio', () => ({
    default: () => <div data-testid="panel-preview">PREVIEW_PANEL</div>,
}));

// Import AFTER mocks
const { default: StudioTabs } = await import('../../components/v3/modules/studio/StudioTabs');

const renderAt = (search = '') => render(
    <MemoryRouter initialEntries={[`/studio${search}`]}>
        <StudioTabs />
    </MemoryRouter>
);

describe('StudioTabs (V8.3-01)', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders the three tab triggers', () => {
        renderAt();
        expect(screen.getByRole('tab', { name: /Idées/i })).toBeInTheDocument();
        expect(screen.getByRole('tab', { name: /Templates/i })).toBeInTheDocument();
        expect(screen.getByRole('tab', { name: /Match Preview/i })).toBeInTheDocument();
    });

    it('defaults to the Idées tab when no querystring is provided', async () => {
        renderAt();
        await waitFor(() => {
            expect(screen.getByTestId('panel-ideas')).toBeInTheDocument();
        });
    });

    it('honours ?tab=templates on first render', async () => {
        renderAt('?tab=templates');
        await waitFor(() => {
            expect(screen.getByTestId('panel-templates')).toBeInTheDocument();
        });
    });

    it('honours ?tab=preview on first render', async () => {
        renderAt('?tab=preview');
        await waitFor(() => {
            expect(screen.getByTestId('panel-preview')).toBeInTheDocument();
        });
    });

    it('falls back to ideas on an unknown tab id (no crash, no blank screen)', async () => {
        renderAt('?tab=garbage');
        await waitFor(() => {
            expect(screen.getByTestId('panel-ideas')).toBeInTheDocument();
        });
    });

    it('switches panels when the user clicks a tab', async () => {
        renderAt();
        await waitFor(() => expect(screen.getByTestId('panel-ideas')).toBeInTheDocument());

        fireEvent.click(screen.getByRole('tab', { name: /Templates/i }));
        await waitFor(() => {
            expect(screen.getByTestId('panel-templates')).toBeInTheDocument();
        });

        fireEvent.click(screen.getByRole('tab', { name: /Match Preview/i }));
        await waitFor(() => {
            expect(screen.getByTestId('panel-preview')).toBeInTheDocument();
        });
    });
});
