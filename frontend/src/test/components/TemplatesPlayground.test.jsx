import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

// jsdom n'a pas ResizeObserver — useFitScale en a besoin.
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

// Stub TemplateFrame & les templates pour ne pas tirer D3 / html-to-image.
vi.mock('../../components/v3/modules/studio/templates', async () => {
    const actual = await vi.importActual('../../components/v3/modules/studio/templates');
    const FakeFrame = React.forwardRef(({ children }, ref) => (
        <div data-testid="fake-frame" ref={ref}>{children}</div>
    ));
    FakeFrame.displayName = 'FakeFrame';
    return {
        ...actual,
        TemplateFrame: FakeFrame,
        exportNodeToPNG: vi.fn(),
        TEMPLATES: [
            {
                id: 'duo-comparison',
                name: 'Duo',
                description: 'Demo duo',
                tags: ['demo'],
                defaultTheme: 'noir-gold',
                component: () => <div data-testid="fake-template-content">FAKE_DUO</div>,
                demo: {},
            },
            {
                id: 'stat-supremacy',
                name: 'Stat',
                description: 'Demo supremacy',
                tags: ['demo'],
                defaultTheme: 'noir-gold',
                component: () => <div>FAKE_STAT</div>,
                demo: {},
            },
        ],
        getTemplate: (id) => ({
            id,
            name: id,
            description: 'demo',
            defaultTheme: 'noir-gold',
            component: () => <div data-testid="fake-template-content">FAKE_{id.toUpperCase()}</div>,
            demo: {},
        }),
    };
});

const { default: TemplatesPlayground } = await import(
    '../../components/v3/modules/studio/TemplatesPlayground/TemplatesPlayground'
);

describe('TemplatesPlayground (V8.3-03)', () => {
    it('renders the canvas wrap + scaler with the expected aspect class on first render', () => {
        const { container } = render(<TemplatesPlayground />);

        // Default aspect = 9:16
        const canvas = container.querySelector('.tplpg-canvas');
        const wrap = container.querySelector('.tplpg-canvas-wrap');
        const scaler = container.querySelector('.tplpg-canvas-scaler');

        expect(canvas).toHaveClass('tplpg-canvas--9x16');
        expect(wrap).not.toBeNull();
        expect(scaler).not.toBeNull();

        // Scaler must carry inline native dims for the chosen aspect (1080x1920)
        expect(scaler.style.width).toBe('1080px');
        expect(scaler.style.height).toBe('1920px');
        // Transform was applied (jsdom has no layout, scale falls back to 1)
        expect(scaler.style.transform).toMatch(/^scale\(/);
        expect(scaler.style.transformOrigin).toBe('top left');
    });

    it('switches scaler native dims when the user picks a new aspect', () => {
        const { container } = render(<TemplatesPlayground />);

        fireEvent.click(screen.getByRole('button', { name: '16:9' }));

        const canvas = container.querySelector('.tplpg-canvas');
        const scaler = container.querySelector('.tplpg-canvas-scaler');
        expect(canvas).toHaveClass('tplpg-canvas--16x9');
        expect(scaler.style.width).toBe('1920px');
        expect(scaler.style.height).toBe('1080px');

        fireEvent.click(screen.getByRole('button', { name: '1:1' }));
        const scaler2 = container.querySelector('.tplpg-canvas-scaler');
        expect(scaler2.style.width).toBe('1080px');
        expect(scaler2.style.height).toBe('1080px');
    });

    it('still renders the active template content inside the scaler', () => {
        render(<TemplatesPlayground />);
        expect(screen.getByTestId('fake-template-content')).toBeInTheDocument();
        expect(screen.getByTestId('fake-frame')).toBeInTheDocument();
    });
});
