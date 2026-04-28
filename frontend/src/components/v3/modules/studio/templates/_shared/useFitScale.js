import { useEffect, useState } from 'react';

/**
 * useFitScale — V8.3-03
 * ─────────────────────
 * ResizeObserver-driven scale factor for native-resolution template frames.
 *
 * Templates are authored at fixed pixel dimensions (1080×1920, 1080×1080,
 * 1920×1080) so they export crisply to PNG. To preview them inside an
 * arbitrary container we wrap the natural-size element and apply a
 * `transform: scale(...)` that fits the wrapper bounding box.
 *
 * Mounting pattern:
 *
 *   const wrapperRef = useRef(null);
 *   const { w, h } = ASPECT_DIMS[aspect];
 *   const fitScale = useFitScale(wrapperRef, w, h);
 *
 *   <div ref={wrapperRef} className="...wrap"> // fixed aspect-ratio box
 *     <div style={{ width: w, height: h, transform: `scale(${fitScale})`, transformOrigin: 'top left' }}>
 *       <TemplateFrame ... />
 *     </div>
 *   </div>
 */
export function useFitScale(wrapperRef, nativeW, nativeH) {
    const [scale, setScale] = useState(1);

    useEffect(() => {
        const el = wrapperRef.current;
        if (!el) return undefined;

        const update = () => {
            const { width, height } = el.getBoundingClientRect();
            if (width <= 0 || height <= 0) return;
            const s = Math.min(width / nativeW, height / nativeH);
            setScale(Number.isFinite(s) && s > 0 ? s : 1);
        };

        update();
        const observer = new ResizeObserver(update);
        observer.observe(el);
        return () => observer.disconnect();
    }, [wrapperRef, nativeW, nativeH]);

    return scale;
}

/**
 * Native pixel dimensions per aspect — single source of truth.
 * Used by Match Preview Studio + Templates Playground (V8.3-03).
 */
export const ASPECT_DIMS = {
    '9:16': { w: 1080, h: 1920 },
    '1:1': { w: 1080, h: 1080 },
    '16:9': { w: 1920, h: 1080 },
};

export default useFitScale;
