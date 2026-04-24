/**
 * Résout le hook V4 associé à une idée.
 * Chaque idée déclare `hookName` + `hookParams`. Ici on dispatch vers
 * le bon hook (tous les hooks retournent { data, loading, error }).
 *
 * Important : les hooks React doivent être appelés dans un ordre stable.
 * On appelle donc TOUS les hooks, et on renvoie le résultat de celui qui
 * matche. Params passés inactifs → hook return demo quasi-instantanément.
 */
import useDuoBackend from '../templates/DuoComparison/useDuoBackend';
import useSupremacyBackend from '../templates/StatSupremacy/useSupremacyBackend';
import useRaceBackend from '../templates/RaceTracker/useRaceBackend';
import useNarrativeBackend from '../templates/NarrativeGrid/useNarrativeBackend';
import usePowerGridBackend from '../templates/PowerGrid/usePowerGridBackend';

const EMPTY = {};

export default function useBackendForIdea(idea) {
    const active = idea?.hookName;
    const params = idea?.hookParams || EMPTY;

    // On appelle chaque hook UNE FOIS, avec params neutres si pas actif.
    // Les hooks eux-mêmes no-op si params manquants (return demo fallback).
    const duo = useDuoBackend(active === 'useDuoBackend' ? params : EMPTY);
    const sup = useSupremacyBackend(active === 'useSupremacyBackend' ? params : EMPTY);
    const race = useRaceBackend(active === 'useRaceBackend' ? params : EMPTY);
    const narr = useNarrativeBackend(active === 'useNarrativeBackend' ? params : EMPTY);
    const pg = usePowerGridBackend(active === 'usePowerGridBackend' ? params : EMPTY);

    switch (active) {
        case 'useDuoBackend':
            return duo;
        case 'useSupremacyBackend':
            return sup;
        case 'useRaceBackend':
            return race;
        case 'useNarrativeBackend':
            return narr;
        case 'usePowerGridBackend':
            return pg;
        default:
            return { data: idea?.demoFallback, loading: false, error: null };
    }
}
