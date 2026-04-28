import React, { Suspense, lazy, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import Tabs from '../../../../design-system/components/Tabs';
import Skeleton from '../../../../design-system/components/Skeleton';
import './StudioTabs.css';

/**
 * StudioTabs — V8.3-01
 * ─────────────────────
 * Three-tab shell for the Content Studio:
 *   - ideas      → IdeasHub      (idea cards + briefing for editorial inspiration)
 *   - templates  → TemplatesPlayground (the 6 visual templates with the form-driven backend)
 *   - preview    → MatchPreviewStudio (the form + Match Preview Card + export)
 *
 * Active tab is mirrored on the URL via `?tab=...` so refreshing or sharing keeps state.
 * Each panel is lazy-loaded to avoid pulling D3 / html-to-image into the initial bundle.
 */

const IdeasHub = lazy(() => import('./IdeasHub/IdeasHub'));
const TemplatesPlayground = lazy(() => import('./TemplatesPlayground/TemplatesPlayground'));
const MatchPreviewStudio = lazy(() => import('./MatchPreviewStudio/MatchPreviewStudio'));

const TAB_DEFS = [
    { id: 'ideas',     label: 'Idées',         icon: '💡' },
    { id: 'templates', label: 'Templates',     icon: '🎨' },
    { id: 'preview',   label: 'Match Preview', icon: '⚽' },
];
const TAB_IDS = TAB_DEFS.map(t => t.id);
const DEFAULT_TAB = 'ideas';

const StudioTabs = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const rawTab = searchParams.get('tab');
    const activeId = TAB_IDS.includes(rawTab) ? rawTab : DEFAULT_TAB;

    const handleChange = useCallback((next) => {
        const params = new URLSearchParams(searchParams);
        params.set('tab', next);
        setSearchParams(params, { replace: true });
    }, [searchParams, setSearchParams]);

    const panel = useMemo(() => {
        switch (activeId) {
            case 'templates': return <TemplatesPlayground />;
            case 'preview':   return <MatchPreviewStudio />;
            case 'ideas':
            default:          return <IdeasHub />;
        }
    }, [activeId]);

    return (
        <div className="studio-tabs">
            <Tabs
                items={TAB_DEFS}
                activeId={activeId}
                onChange={handleChange}
                variant="pills"
                className="studio-tabs__nav"
            />
            <div className="studio-tabs__panel" role="tabpanel" aria-labelledby={activeId}>
                <Suspense fallback={<Skeleton height="420px" />}>
                    {panel}
                </Suspense>
            </div>
        </div>
    );
};

export default StudioTabs;
