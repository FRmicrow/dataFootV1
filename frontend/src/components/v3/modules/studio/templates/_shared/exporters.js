/**
 * Exporters — PNG (html-to-image) et WEBM (MediaRecorder).
 *
 * html-to-image est importé en dynamique pour permettre à vite de
 * code-splitter et éviter que le dev-server échoue si la dep n'était
 * pas encore installée. Depuis V8.1 le paquet est une dépendance dure
 * du frontend (cf. frontend/package.json).
 */

/**
 * Télécharge un dataURL sous forme de fichier.
 * @param {string} dataUrl
 * @param {string} filename
 */
function triggerDownload(dataUrl, filename) {
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Exporte un node DOM en PNG.
 *
 * @param {HTMLElement} node - la ref du TemplateFrame
 * @param {object} opts
 * @param {string} [opts.filename='template'] - sans extension
 * @param {number} [opts.pixelRatio=2]
 * @param {string} [opts.backgroundColor]
 * @returns {Promise<string>} dataUrl PNG
 */
export async function exportNodeToPNG(node, opts = {}) {
  if (!node) throw new Error('exportNodeToPNG: node is required');

  // Import dynamique standard (vite code-split) — la dep est présente dans
  // package.json V8.1. Si jamais elle manque, on expose un message parlant.
  let toPng;
  try {
    ({ toPng } = await import('html-to-image'));
  } catch (err) {
    throw new Error(
      'html-to-image introuvable. Exécute `cd frontend && npm install html-to-image` puis réessaie.',
    );
  }

  const {
    filename = 'template',
    pixelRatio = 2,
    backgroundColor,
    width,
    height,
  } = opts;

  // Priorité : largeur/hauteur explicites (taille native du template) ;
  // sinon fallback sur offsetWidth/offsetHeight (node non-scalé).
  const captureWidth = typeof width === 'number' ? width : node.offsetWidth;
  const captureHeight = typeof height === 'number' ? height : node.offsetHeight;

  const dataUrl = await toPng(node, {
    pixelRatio,
    cacheBust: true,
    backgroundColor,
    width: captureWidth,
    height: captureHeight,
    // Annule tout transform parent hérité dans le clone html-to-image.
    style: {
      transform: 'none',
      transformOrigin: 'top left',
      margin: 0,
      width: `${captureWidth}px`,
      height: `${captureHeight}px`,
    },
  });

  triggerDownload(dataUrl, `${filename}.png`);
  return dataUrl;
}

/**
 * Exporte un canvas animé en WEBM via MediaRecorder.
 * Réutilise le pattern de Step3_PreviewExport.jsx.
 *
 * @param {HTMLCanvasElement} canvas
 * @param {object} opts
 * @param {number} [opts.durationMs=6000]
 * @param {number} [opts.fps=30]
 * @param {string} [opts.filename='template']
 * @param {number} [opts.bitsPerSecond=8_000_000]
 * @returns {Promise<Blob>}
 */
export async function exportCanvasToWEBM(canvas, opts = {}) {
  if (!canvas || !canvas.captureStream) {
    throw new Error('exportCanvasToWEBM: canvas must support captureStream()');
  }

  const { durationMs = 6000, fps = 30, filename = 'template', bitsPerSecond = 8_000_000 } = opts;

  const stream = canvas.captureStream(fps);
  const mimeType =
    typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
      ? 'video/webm;codecs=vp9'
      : 'video/webm';

  const recorder = new MediaRecorder(stream, { mimeType, bitsPerSecond });
  const chunks = [];

  return new Promise((resolve, reject) => {
    recorder.ondataavailable = (e) => e.data.size > 0 && chunks.push(e.data);
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: mimeType });
      const url = URL.createObjectURL(blob);
      triggerDownload(url, `${filename}.webm`);
      // revokeObjectURL after the click tick
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      resolve(blob);
    };
    recorder.onerror = (e) => reject(e.error || new Error('MediaRecorder error'));

    recorder.start();
    setTimeout(() => recorder.stop(), durationMs);
  });
}

/**
 * Version MVP : snapshot HTML → canvas → WEBM via frames figés.
 * Utile pour les templates non-canvas (DuoComparison, PowerGrid).
 * Non implémenté en V8.0 — marqué @STUB pour V8.1.
 */
export async function exportHTMLToWEBM(/* node, opts */) {
  throw new Error('exportHTMLToWEBM: not implemented in V8.0 (scheduled for V8.1)');
}
