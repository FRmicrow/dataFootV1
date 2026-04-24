import { useEffect, useState } from 'react';
import api from '../../../../../../services/api';
import demoData from './demo';

/**
 * Hook V4 — charge un Match Preview depuis le backend V4
 * (endpoint GET /v4/content/match-preview/:matchId).
 *
 * Règle de fiabilité (V8.2) :
 * - AUCUNE valeur inventée : si l'API échoue ou renvoie un shape invalide,
 *   on retombe sur `demoData` (signalé clairement comme démo) ET on log
 *   l'erreur dans `error` pour que le studio affiche un badge de warning.
 * - `dataGaps` est remonté tel quel depuis le DTO V4 (array d'enum) pour
 *   permettre à la UI d'afficher quelles sources sont absentes.
 *
 * @param {object} params
 * @param {string} [params.matchId] - ID du match V4 (v4.matches.id)
 * @returns {{ data, loading, error, dataGaps, isDemo }}
 */
export function useMatchPreviewBackend({ matchId } = {}) {
  const [state, setState] = useState({
    data: demoData,
    loading: false,
    error: null,
    dataGaps: demoData.data_gaps || [],
    isDemo: true,
  });

  useEffect(() => {
    let cancelled = false;

    if (!matchId) {
      // Pas de matchId → on reste en mode démo, pas d'appel réseau.
      setState({
        data: demoData,
        loading: false,
        error: null,
        dataGaps: demoData.data_gaps || [],
        isDemo: true,
      });
      return undefined;
    }

    setState((s) => ({ ...s, loading: true, error: null }));

    (async () => {
      try {
        // Le response interceptor de api.js unwrap {success:true,data:X} → X
        // On reçoit donc directement le DTO. Si la forme est cassée, fallback.
        const dto = await api.getMatchPreviewV4(matchId);

        if (!dto || !dto.match || !dto.home || !dto.away) {
          if (!cancelled) {
            setState({
              data: demoData,
              loading: false,
              error: 'Payload V4 invalide — fallback démo.',
              dataGaps: demoData.data_gaps || [],
              isDemo: true,
            });
          }
          return;
        }

        if (!cancelled) {
          setState({
            data: dto,
            loading: false,
            error: null,
            dataGaps: Array.isArray(dto.data_gaps) ? dto.data_gaps : [],
            isDemo: false,
          });
        }
      } catch (err) {
        if (!cancelled) {
          const message = err?.response?.data?.error || err?.message || 'API V4 error';
          setState({
            data: demoData,
            loading: false,
            error: message,
            dataGaps: demoData.data_gaps || [],
            isDemo: true,
          });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [matchId]);

  return state;
}

export default useMatchPreviewBackend;
