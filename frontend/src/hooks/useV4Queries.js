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

            const { data } = await api.get(`/api/v4/clubs/${identifier}`, { params });
            return data.data;
        },
        staleTime: 5 * 60 * 1000,
        enabled: !!identifier,
    });
}

/**
 * Hook: Fetch club stats for a specific season/competition/view
 * Cache: 5 minutes per combination
 */
export function useClubStats(clubId, season, compId, view = 'overview') {
    return useQuery({
        queryKey: ['club-stats', clubId, season, compId, view],
        queryFn: async () => {
            const { data } = await api.get(`/api/v4/clubs/${clubId}/stats`, {
                params: { season, competitionId: compId, view },
            });
            return data.data;
        },
        staleTime: 5 * 60 * 1000,
        enabled: !!clubId && !!season,
    });
}

/**
 * Hook: Fetch fixture lineups
 * Cache: 30 minutes (immutable after match ends)
 */
export function useFixtureLineups(fixtureId) {
    return useQuery({
        queryKey: ['fixture-lineups', fixtureId],
        queryFn: async () => {
            const { data } = await api.get(`/api/v4/matches/${fixtureId}/lineups`);
            return data.data;
        },
        staleTime: 30 * 60 * 1000,
        enabled: !!fixtureId,
    });
}

/**
 * Hook: Fetch fixture events (goals, cards, etc.)
 * Cache: 30 minutes (immutable after match ends)
 */
export function useFixtureEvents(fixtureId) {
    return useQuery({
        queryKey: ['fixture-events', fixtureId],
        queryFn: async () => {
            const { data } = await api.get(`/api/v4/matches/${fixtureId}/events`);
            return data.data;
        },
        staleTime: 30 * 60 * 1000,
        enabled: !!fixtureId,
    });
}

/**
 * Hook: Fetch fixture tactical stats
 * Cache: 30 minutes (immutable after match ends)
 */
export function useFixtureTactical(fixtureId) {
    return useQuery({
        queryKey: ['fixture-tactical', fixtureId],
        queryFn: async () => {
            const { data } = await api.get(`/api/v4/matches/${fixtureId}/tactical`);
            return data.data;
        },
        staleTime: 30 * 60 * 1000,
        enabled: !!fixtureId,
    });
}

/**
 * Hook: Fetch league squad with client-side filtering/sorting
 * Cache: 10 minutes (updated frequently)
 */
export function useLeagueSquad(leagueId, season, filters = {}) {
    const { teamId, position, sortBy = 'appearances', order = 'desc' } = filters;

    return useQuery({
        queryKey: ['league-squad', leagueId, season],
        queryFn: async () => {
            const { data } = await api.get(`/api/v4/leagues/${leagueId}/squad`, {
                params: { season },
            });
            return data.data;
        },
        staleTime: 10 * 60 * 1000,
        enabled: !!leagueId && !!season,
        select: (data) => {
            let filtered = Array.isArray(data) ? data : [];

            // Apply client-side filters (no API call needed)
            if (teamId) {
                filtered = filtered.filter(p => p.team_id === teamId);
            }
            if (position) {
                filtered = filtered.filter(p => p.position?.toLowerCase() === position.toLowerCase());
            }

            // Apply client-side sort
            filtered.sort((a, b) => {
                let aVal = a[sortBy] ?? 0;
                let bVal = b[sortBy] ?? 0;
                const cmp = aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
                return order === 'asc' ? cmp : -cmp;
            });

            return filtered;
        },
    });
}

/**
 * Hook: Fetch available leagues
 * Cache: 24 hours (very stable)
 */
export function useLeagues() {
    return useQuery({
        queryKey: ['leagues'],
        queryFn: async () => {
            const { data } = await api.get('/api/v4/leagues');
            return data.data;
        },
        staleTime: 24 * 60 * 60 * 1000,
    });
}

/**
 * Hook: Fetch season fixtures for a league
 * Cache: 5 minutes (updated frequently during season)
 */
export function useSeasonFixtures(leagueId, season) {
    return useQuery({
        queryKey: ['season-fixtures', leagueId, season],
        queryFn: async () => {
            const { data } = await api.get(`/api/v4/leagues/${leagueId}/fixtures`, {
                params: { season },
            });
            return data.data;
        },
        staleTime: 5 * 60 * 1000,
        enabled: !!leagueId && !!season,
    });
}

/**
 * Hook: Fetch fixture details (scores, formations, etc.)
 * Cache: 30 minutes (immutable after match ends)
 */
export function useFixtureDetails(fixtureId) {
    return useQuery({
        queryKey: ['fixture-details', fixtureId],
        queryFn: async () => {
            const { data } = await api.get(`/api/v4/matches/${fixtureId}`);
            return data.data;
        },
        staleTime: 30 * 60 * 1000,
        enabled: !!fixtureId,
    });
}
