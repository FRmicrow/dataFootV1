/**
 * Helpers purs partagés par les 3 sublayouts NarrativeGrid v2.
 * Aucune dépendance React — facile à tester en unitaire.
 */

/** Détecte si au moins un match a une donnée xG renseignée. */
export function hasAnyXg(matches) {
  if (!Array.isArray(matches)) return false;
  return matches.some(
    (m) => m.xg && (m.xg.for != null || m.xg.against != null),
  );
}

/** Format "2-1" — entiers, tabular-nums via CSS. */
export function formatScore(score) {
  if (!score) return '';
  const f = score.for ?? 0;
  const a = score.against ?? 0;
  return `${f}-${a}`;
}

/** Format "1.84" — toujours 2 décimales pour aligner les chiffres en colonne. */
export function formatXg(value) {
  if (value == null || !Number.isFinite(value)) return '—';
  return value.toFixed(2);
}

/** Badge Dom./Ext. lisible sans bruit visuel. */
export function sideBadge(isHome) {
  return isHome ? 'Dom.' : 'Ext.';
}

/** Trigramme "ATL" depuis "Atlético" (3 premières lettres en majuscules). */
export function shortName(opponent, length = 3) {
  if (!opponent) return '';
  const cleaned = String(opponent).replace(/[^A-Za-zÀ-ÿ]/g, '');
  return cleaned.slice(0, length).toUpperCase();
}
