import React, { forwardRef, useMemo } from 'react';
import PropTypes from 'prop-types';
import { getTheme, DEFAULT_THEME } from './themes';
import { resolveFontPair } from './fontPairs';
import './TemplateFrame.css';

const ASPECT_CONFIG = {
  '9:16': { w: 1080, h: 1920, className: 'template-9x16' },
  '1:1': { w: 1080, h: 1080, className: 'template-1x1' },
  '16:9': { w: 1920, h: 1080, className: 'template-16x9' },
};

/**
 * TemplateFrame
 *
 * Cadre commun à tous les templates : fixe le ratio, applique la DA,
 * expose via CSS variables locales (`--tpl-*`) les valeurs du thème,
 * et sert de root pour les exports (html-to-image / MediaRecorder).
 *
 * Via ref, le parent peut capturer le DOM node.
 */
const TemplateFrame = forwardRef(function TemplateFrame(
  { children, theme = DEFAULT_THEME, fontPair, aspectRatio = '9:16', accent, scale = 1, brandLabel = 'statFoot', className = '' },
  ref,
) {
  const t = getTheme(theme);
  const fp = resolveFontPair(theme, fontPair);
  const ratio = ASPECT_CONFIG[aspectRatio] || ASPECT_CONFIG['9:16'];

  const style = useMemo(() => {
    const accentFinal = accent || t.accent;
    return {
      // Dimensions
      width: `${ratio.w}px`,
      height: `${ratio.h}px`,
      transform: scale !== 1 ? `scale(${scale})` : undefined,
      transformOrigin: 'top left',
      // DA tokens — exposés à tous les enfants en CSS vars locales
      '--tpl-bg': t.bg,
      '--tpl-bg-gradient': t.bgGradient,
      '--tpl-surface': t.surface,
      '--tpl-surface-soft': t.surfaceSoft,
      '--tpl-border': t.border,
      '--tpl-text': t.text,
      '--tpl-text-soft': t.textSoft,
      '--tpl-accent': accentFinal,
      '--tpl-accent-soft': t.accentSoft,
      '--tpl-accent-glow': t.accentGlow,
      '--tpl-shadow': t.shadow,
      '--tpl-radius': t.radius,
      '--tpl-grid': t.grid,
      // Typo
      '--tpl-font-display': fp.display,
      '--tpl-font-body': fp.body,
      '--tpl-font-display-weight': fp.displayWeight,
      '--tpl-font-body-weight': fp.bodyWeight,
    };
  }, [t, fp, ratio, accent, scale]);

  return (
    <div
      ref={ref}
      className={`template-frame ${ratio.className} tpl-theme-${t.id} ${className}`}
      style={style}
      data-template-aspect={aspectRatio}
      data-template-theme={t.id}
    >
      <div className="template-frame-bg" aria-hidden />
      <div className="template-frame-grid" aria-hidden />
      <div className="template-frame-inner">{children}</div>
      <div className="template-frame-brand" aria-hidden>
        <span className="template-frame-brand-dot" />
        <span className="template-frame-brand-text">{brandLabel}</span>
      </div>
    </div>
  );
});

TemplateFrame.propTypes = {
  children: PropTypes.node,
  theme: PropTypes.string,
  fontPair: PropTypes.string,
  aspectRatio: PropTypes.oneOf(['9:16', '1:1', '16:9']),
  accent: PropTypes.string,
  scale: PropTypes.number,
  brandLabel: PropTypes.string,
  className: PropTypes.string,
};

export default TemplateFrame;
export { ASPECT_CONFIG };
