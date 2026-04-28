import React, { useMemo, useRef, useState, useCallback } from 'react';
import {
    TEMPLATES,
    getTemplate,
    THEME_IDS,
    TemplateFrame,
    exportNodeToPNG,
} from '../templates';
import { themes } from '../templates/_shared/themes';
import { useFitScale, ASPECT_DIMS } from '../templates/_shared/useFitScale';
import './TemplatesPlayground.css';

const ASPECTS = ['9:16', '1:1', '16:9'];

const aspectClassSuffix = (a) => a.replace(':', 'x'); // "9:16" → "9x16"

/**
 * Playground des 5 templates de contenu.
 * UI sans données V4 : on affiche les demos pour permettre d'iterer DA/format
 * avant de brancher sur une idée précise.
 */
const TemplatesPlayground = () => {
    const [selectedId, setSelectedId] = useState(TEMPLATES[0]?.id || 'duo-comparison');
    const [theme, setTheme] = useState(TEMPLATES[0]?.defaultTheme || 'noir-gold');
    const [aspect, setAspect] = useState('9:16');
    const [accent, setAccent] = useState('');
    const [exporting, setExporting] = useState(false);
    const [error, setError] = useState(null);

    const frameRef = useRef(null);
    const wrapperRef = useRef(null);

    const tpl = useMemo(() => getTemplate(selectedId), [selectedId]);
    const Component = tpl?.component;

    // V8.3-03 — fit-to-wrapper scaling at native resolution
    const { w: nativeW, h: nativeH } = ASPECT_DIMS[aspect] ?? ASPECT_DIMS['9:16'];
    const fitScale = useFitScale(wrapperRef, nativeW, nativeH);

    const handleTemplateSwitch = useCallback((id) => {
        const next = getTemplate(id);
        setSelectedId(id);
        if (next?.defaultTheme) setTheme(next.defaultTheme);
        setAccent('');
        setError(null);
    }, []);

    const handleExport = useCallback(async () => {
        if (!frameRef.current) return;
        setExporting(true);
        setError(null);
        try {
            const filename = `${selectedId}-${theme}-${aspect.replace(':', 'x')}.png`;
            await exportNodeToPNG(frameRef.current, { filename, pixelRatio: 2 });
        } catch (err) {
            setError(err?.message || 'Export PNG impossible');
        } finally {
            setExporting(false);
        }
    }, [selectedId, theme, aspect]);

    if (!tpl || !Component) {
        return (
            <div className="tplpg-empty">
                Aucun template disponible.
            </div>
        );
    }

    return (
        <div className="tplpg">
            <aside className="tplpg-rail">
                <div className="tplpg-rail-header">
                    <span className="tplpg-rail-eyebrow">Templates</span>
                    <h3 className="tplpg-rail-title">Playground</h3>
                    <p className="tplpg-rail-sub">
                        5 templates prêts à brancher — teste la DA, l&apos;aspect et l&apos;accent
                        avant de passer sur une vraie idée.
                    </p>
                </div>

                <div className="tplpg-rail-list">
                    {TEMPLATES.map((t) => (
                        <button
                            key={t.id}
                            type="button"
                            className={`tplpg-rail-item ${selectedId === t.id ? 'is-active' : ''}`}
                            onClick={() => handleTemplateSwitch(t.id)}
                        >
                            <span className="tplpg-rail-item-name">{t.name}</span>
                            <span className="tplpg-rail-item-desc">{t.description}</span>
                            <span className="tplpg-rail-item-tags">
                                {(t.tags || []).slice(0, 3).map((tag) => (
                                    <span key={tag} className="tplpg-rail-tag">#{tag}</span>
                                ))}
                            </span>
                        </button>
                    ))}
                </div>
            </aside>

            <section className="tplpg-stage">
                <div className="tplpg-toolbar">
                    <div className="tplpg-toolbar-group">
                        <span className="tplpg-toolbar-label">DA</span>
                        <div className="tplpg-toolbar-pills">
                            {THEME_IDS.map((id) => (
                                <button
                                    key={id}
                                    type="button"
                                    className={`tplpg-pill ${theme === id ? 'is-active' : ''}`}
                                    style={{
                                        '--pill-accent': themes[id].accent,
                                    }}
                                    onClick={() => setTheme(id)}
                                >
                                    <span className="tplpg-pill-dot" />
                                    {themes[id].label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="tplpg-toolbar-group">
                        <span className="tplpg-toolbar-label">Aspect</span>
                        <div className="tplpg-toolbar-pills">
                            {ASPECTS.map((a) => (
                                <button
                                    key={a}
                                    type="button"
                                    className={`tplpg-pill tplpg-pill--mono ${aspect === a ? 'is-active' : ''}`}
                                    onClick={() => setAspect(a)}
                                >
                                    {a}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="tplpg-toolbar-group tplpg-toolbar-group--accent">
                        <label className="tplpg-toolbar-label" htmlFor="tplpg-accent">
                            Accent override
                        </label>
                        <div className="tplpg-accent-wrap">
                            <input
                                id="tplpg-accent"
                                type="color"
                                value={accent || themes[theme].accent}
                                onChange={(e) => setAccent(e.target.value)}
                                className="tplpg-accent-input"
                            />
                            <button
                                type="button"
                                className="tplpg-accent-reset"
                                onClick={() => setAccent('')}
                                disabled={!accent}
                            >
                                Reset
                            </button>
                        </div>
                    </div>

                    <div className="tplpg-toolbar-spacer" />

                    <button
                        type="button"
                        className="tplpg-export"
                        onClick={handleExport}
                        disabled={exporting}
                    >
                        {exporting ? 'Export…' : 'Exporter PNG'}
                    </button>
                </div>

                {error && (
                    <div className="tplpg-error" role="alert">
                        {error}
                        {error.includes('html-to-image') && (
                            <span className="tplpg-error-hint">
                                Installer : <code>npm i html-to-image</code>
                            </span>
                        )}
                    </div>
                )}

                <div className={`tplpg-canvas tplpg-canvas--${aspectClassSuffix(aspect)}`}>
                    <div ref={wrapperRef} className="tplpg-canvas-wrap">
                        <div
                            className="tplpg-canvas-scaler"
                            style={{
                                width: `${nativeW}px`,
                                height: `${nativeH}px`,
                                transform: `scale(${fitScale})`,
                                transformOrigin: 'top left',
                            }}
                        >
                            <TemplateFrame
                                ref={frameRef}
                                theme={theme}
                                aspectRatio={aspect}
                                accent={accent || undefined}
                                scale={1}
                            >
                                <Component
                                    data={tpl.demo}
                                    theme={theme}
                                    accent={accent || undefined}
                                    aspectRatio={aspect}
                                />
                            </TemplateFrame>
                        </div>
                    </div>
                </div>

                <footer className="tplpg-footer">
                    <span className="tplpg-footer-label">{tpl.name}</span>
                    <span className="tplpg-footer-sep">·</span>
                    <span>{tpl.description}</span>
                </footer>
            </section>
        </div>
    );
};

export default TemplatesPlayground;
