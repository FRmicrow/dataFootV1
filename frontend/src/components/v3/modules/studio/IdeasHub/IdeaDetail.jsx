import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import {
    getTemplate,
    TemplateFrame,
    exportNodeToPNG,
    THEME_IDS,
} from '../templates';
import { themes } from '../templates/_shared/themes';
import useBackendForIdea from './useBackendForIdea';

const ASPECTS = ['9:16', '1:1', '16:9'];

// Dimensions natives des templates (doivent matcher ASPECT_CONFIG côté TemplateFrame)
const NATIVE_SIZES = {
    '9:16': { w: 1080, h: 1920 },
    '1:1': { w: 1080, h: 1080 },
    '16:9': { w: 1920, h: 1080 },
};

const IdeaDetail = ({ idea }) => {
    const tpl = useMemo(() => getTemplate(idea?.templateId), [idea]);
    const { data, loading, error: fetchError } = useBackendForIdea(idea);

    const [theme, setTheme] = useState(idea?.theme || tpl?.defaultTheme || 'noir-gold');
    const [aspect, setAspect] = useState(idea?.aspectDefault || '9:16');
    const [lang, setLang] = useState('fr');
    const [copyHint, setCopyHint] = useState('');
    const [exporting, setExporting] = useState(false);
    const [exportError, setExportError] = useState(null);

    const frameRef = useRef(null);
    const wrapRef = useRef(null);
    const [tplScale, setTplScale] = useState(1);
    const Component = tpl?.component;

    // Calcule dynamiquement le scale du template pour remplir le wrap.
    // wrapWidth / nativeWidth → on scale uniformément (top-left origin).
    useEffect(() => {
        if (!wrapRef.current) return undefined;
        const nativeW = NATIVE_SIZES[aspect]?.w ?? 1080;

        const computeScale = () => {
            const el = wrapRef.current;
            if (!el) return;
            const w = el.clientWidth;
            if (w > 0) setTplScale(w / nativeW);
        };

        computeScale();
        const ro = new ResizeObserver(computeScale);
        ro.observe(wrapRef.current);
        return () => ro.disconnect();
    }, [aspect]);

    const handleCopy = useCallback(async (text, label) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopyHint(`Copié — ${label}`);
            setTimeout(() => setCopyHint(''), 1800);
        } catch {
            setCopyHint('Copie impossible (autoriser clipboard).');
            setTimeout(() => setCopyHint(''), 2400);
        }
    }, []);

    const handleExport = useCallback(async () => {
        if (!frameRef.current) return;
        setExporting(true);
        setExportError(null);
        try {
            const filename = `${idea.id}-${theme}-${aspect.replace(':', 'x')}.png`;
            const native = NATIVE_SIZES[aspect] || NATIVE_SIZES['9:16'];
            // On capture le .template-frame à sa taille native (pas scaled),
            // html-to-image utilise une copie isolée donc le transform du
            // .ihub-frame-scaler parent n'affecte pas le rendu.
            await exportNodeToPNG(frameRef.current, {
                filename,
                pixelRatio: 2,
                width: native.w,
                height: native.h,
            });
        } catch (err) {
            setExportError(err?.message || 'Export PNG impossible');
        } finally {
            setExporting(false);
        }
    }, [idea, theme, aspect]);

    if (!idea || !tpl) {
        return (
            <div className="ihub-empty">
                Sélectionne une idée à gauche pour prévisualiser son template.
            </div>
        );
    }

    const twitterVariants = idea.copies?.twitter?.[lang] || [];
    const igCaption = idea.copies?.instagram?.[lang] || '';

    return (
        <section className="ihub-detail">
            <header className="ihub-detail-head">
                <div>
                    <span className={`ihub-status ihub-status--${idea.status}`}>
                        {idea.status === 'ready' && 'Prêt à publier'}
                        {idea.status === 'draft' && 'Draft'}
                        {idea.status === 'live' && 'En ligne'}
                    </span>
                    <h2 className="ihub-detail-title">{idea.title}</h2>
                    <p className="ihub-detail-sub">{idea.subtitle} · {idea.hookAngle}</p>
                </div>
                <div className="ihub-detail-meta">
                    <span className="ihub-detail-meta-label">Template</span>
                    <span className="ihub-detail-meta-value">{tpl.name}</span>
                </div>
            </header>

            <div className="ihub-detail-body">
                <div className="ihub-preview-col">
                    <div className="ihub-toolbar">
                        <div className="ihub-toolbar-group">
                            <span className="ihub-toolbar-label">DA</span>
                            <div className="ihub-pills">
                                {THEME_IDS.map((id) => (
                                    <button
                                        key={id}
                                        type="button"
                                        className={`ihub-pill ${theme === id ? 'is-active' : ''}`}
                                        style={{ '--pill-accent': themes[id].accent }}
                                        onClick={() => setTheme(id)}
                                    >
                                        <span className="ihub-pill-dot" />
                                        {themes[id].label}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="ihub-toolbar-group">
                            <span className="ihub-toolbar-label">Aspect</span>
                            <div className="ihub-pills">
                                {ASPECTS.map((a) => (
                                    <button
                                        key={a}
                                        type="button"
                                        className={`ihub-pill ihub-pill--mono ${aspect === a ? 'is-active' : ''}`}
                                        onClick={() => setAspect(a)}
                                    >
                                        {a}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <button
                            type="button"
                            className="ihub-export"
                            onClick={handleExport}
                            disabled={exporting || loading}
                        >
                            {exporting ? 'Export…' : 'Exporter PNG'}
                        </button>
                    </div>

                    <div className="ihub-data-status">
                        {loading && (
                            <span className="ihub-data-badge ihub-data-badge--loading">
                                Chargement V4…
                            </span>
                        )}
                        {!loading && fetchError && (
                            <span className="ihub-data-badge ihub-data-badge--warn">
                                Data V4 indispo → demo utilisée ({fetchError})
                            </span>
                        )}
                        {!loading && !fetchError && data && (
                            <span className="ihub-data-badge ihub-data-badge--ok">
                                Data V4 OK
                            </span>
                        )}
                        {exportError && (
                            <span className="ihub-data-badge ihub-data-badge--warn">
                                {exportError}
                            </span>
                        )}
                    </div>

                    <div className="ihub-canvas">
                        <div
                            ref={wrapRef}
                            className={`ihub-frame-wrap ihub-frame-wrap--${aspect.replace(':', 'x')}`}
                        >
                            <div
                                className="ihub-frame-scaler"
                                style={{ '--ihub-tpl-scale': tplScale }}
                            >
                                <TemplateFrame
                                    ref={frameRef}
                                    theme={theme}
                                    aspectRatio={aspect}
                                >
                                    <Component
                                        data={data || idea.demoFallback}
                                        theme={theme}
                                        aspectRatio={aspect}
                                    />
                                </TemplateFrame>
                            </div>
                        </div>
                    </div>
                </div>

                <aside className="ihub-copy-col">
                    <div className="ihub-copy-head">
                        <h3 className="ihub-copy-title">Copies sociales</h3>
                        <div className="ihub-lang-switch">
                            <button
                                type="button"
                                className={`ihub-lang ${lang === 'fr' ? 'is-active' : ''}`}
                                onClick={() => setLang('fr')}
                            >
                                🇫🇷 FR
                            </button>
                            <button
                                type="button"
                                className={`ihub-lang ${lang === 'en' ? 'is-active' : ''}`}
                                onClick={() => setLang('en')}
                            >
                                🇬🇧 EN
                            </button>
                        </div>
                    </div>

                    {copyHint && <div className="ihub-copy-hint">{copyHint}</div>}

                    <div className="ihub-copy-section">
                        <h4 className="ihub-copy-section-title">Tweets (3 variantes)</h4>
                        <ul className="ihub-tweets">
                            {twitterVariants.map((v) => (
                                <li key={v.variant} className="ihub-tweet">
                                    <header className="ihub-tweet-head">
                                        <span className="ihub-tweet-variant">{v.variant}</span>
                                        <span className="ihub-tweet-count">
                                            {v.body.length} / 280
                                        </span>
                                    </header>
                                    <pre className="ihub-tweet-body">{v.body}</pre>
                                    <button
                                        type="button"
                                        className="ihub-copy-btn"
                                        onClick={() => handleCopy(v.body, `tweet ${v.variant}`)}
                                    >
                                        Copier
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div className="ihub-copy-section">
                        <h4 className="ihub-copy-section-title">Caption Instagram</h4>
                        <pre className="ihub-tweet-body ihub-ig-body">{igCaption}</pre>
                        <button
                            type="button"
                            className="ihub-copy-btn"
                            onClick={() => handleCopy(igCaption, 'caption IG')}
                        >
                            Copier caption
                        </button>
                    </div>

                    <div className="ihub-copy-section">
                        <h4 className="ihub-copy-section-title">Hashtags suggérés</h4>
                        <div className="ihub-hashtags">
                            {(idea.hashtags || []).map((h) => (
                                <button
                                    key={h}
                                    type="button"
                                    className="ihub-hash"
                                    onClick={() => handleCopy(h, h)}
                                >
                                    {h}
                                </button>
                            ))}
                            <button
                                type="button"
                                className="ihub-hash ihub-hash--all"
                                onClick={() => handleCopy((idea.hashtags || []).join(' '), 'tous les hashtags')}
                            >
                                Tout copier
                            </button>
                        </div>
                    </div>
                </aside>
            </div>
        </section>
    );
};

IdeaDetail.propTypes = {
    idea: PropTypes.object,
};

export default IdeaDetail;
