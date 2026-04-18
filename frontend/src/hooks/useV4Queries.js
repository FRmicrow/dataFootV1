import { useQuery } from '@tanstack/react-query';
import api from '../services/api';

/**
 * Hook: Fetch club profile by identifier (ID, slug, or short_name)
 * Cache: 5 minutes per combination (season + competition affect roster/summary)
 */
export function useClubProfile(identifier, season, compId) {
    return useQuery({
        queryKey: ['club', identifier, season, compId],
        queryFn: async () => {
            const params = {};
            if (season) params.season = season;
            if (compId && compId !== 'all') params.competitionId = compId;

            const result = await api.getV4ClubProfile(identifier, params);
            return result;
        },
        staleTime: 5 * 60 * 1000,
        enabled: !!identifier,
    });
}

/**
 * Hook: Fetch club matches
 * Cache: 5 minutes per combination
 */
export function useClubMatches(clubId, season, compId) {
    return useQuery({
        queryKey: ['club-matches', clubId, season, compId],
        queryFn: async () => {
            const params = {};
            if (season) params.season = season;
            if (compId && compId !== 'all') params.competitionId = compId;

            const result = await api.getV4ClubMatches(clubId, params);
            return result;
        },
        staleTime: 5 * 60 * 1000,
        enabled: !!clubId,
    });
}

/**
 * Hook: Fetch club squad
 * Cache: 10 minutes (updated frequently)
 */
export function useClubSquad(clubId, season, compId) {
    return useQuery({
        queryKey: ['club-squad', clubId, season, compId],
        queryFn: async () => {
            const params = {};
            if (season) params.season = season;
            if (compId && compId !== 'all') params.competitionId = compId;

            const result = await api.getV4ClubSquad(clubId, params);
            return result;
        },
        staleTime: 10 * 60 * 1000,
        enabled: !!clubId && !!season,
    });
}

/**
 * Hook: Fetch typical lineup
 * Cache: 15 minutes
 */
export function useTypicalLineup(clubId, season, compId) {
    return useQuery({
        queryKey: ['typical-lineup', clubId, season, compId],
        queryFn: async () => {
            const params = {};
            if (season) params.season = season;
            if (compId && compId !== 'all') params.competitionId = compId;

            const result = await api.getV4TypicalLineup(clubId, params);
            return result;
        },
        staleTime: 15 * 60 * 1000,
        enabled: !!clubId && !!season,
    });
}

/**
 * Hook: Fetch tactical summary
 * Cache: 15 minutes
 */
export function useTacticalSummary(clubId, season, compId) {
    return useQuery({
        queryKey: ['tactical-summary', clubId, season, compId],
        queryFn: async () => {
            const params = {};
            if (season) params.season = season;
            if (compId && compId !== 'all') params.competitionId = compId;

            const result = await api.getV4ClubTacticalSummary(clubId, params);
            return result;
        },
        staleTime: 15 * 60 * 1000,
        enabled: !!clubId && !!season,
    });
}

/**
 * Hook: Fetch available leagues (V4)
 * Cache: 24 hours (very stable)
 */
export function useLeaguesV4() {
    return useQuery({
        queryKey: ['leagues-v4'],
        queryFn: async () => {
            const result = await api.getLeaguesV4();
            return result;
        },
        staleTime: 24 * 60 * 60 * 1000,
    });
}
