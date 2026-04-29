import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock DB and logger BEFORE importing the service
vi.mock('../../config/database.js', () => ({
    default: {
        get: vi.fn(),
        all: vi.fn(),
        run: vi.fn(),
    },
}));
vi.mock('../../utils/logger.js', () => ({
    default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

const ResolverService = (await import('./InfographicResolverServiceV4.js')).default;
const {
    resolve,
    resolvePlayerComparison,
    TemplateNotFoundError,
    EntityNotFoundError,
} = await import('./InfographicResolverServiceV4.js');
const db = (await import('../../config/database.js')).default;

// ─── Test fixtures ──────────────────────────────────────────────────────────

const PERSON_A = {
    person_id:     '123',
    full_name:     'Kylian Mbappé',
    photo_url:     'https://cdn.example.com/mbappe.png',
    birth_date:    '1998-12-20',
    nationality_1: 'France',
};
const PERSON_B = {
    person_id:     '456',
    full_name:     'Erling Haaland',
    photo_url:     'https://cdn.example.com/haaland.png',
    birth_date:    '2000-07-21',
    nationality_1: 'Norway',
};

const STATS_A = {
    row_count: '2', apps: '32', minutes: '2700',
    goals: '31', assists: '8', xg: '28.42', xa: '7.10', xg_90: '0.95',
};
const STATS_B = {
    row_count: '2', apps: '30', minutes: '2580',
    goals: '28', assists: '5', xg: '26.11', xa: '4.20', xg_90: '0.91',
};
const CLUB_A = { club_id: '11', club_name: 'Real Madrid',     club_logo: 'https://cdn/madrid.png' };
const CLUB_B = { club_id: '22', club_name: 'Manchester City', club_logo: 'https://cdn/citizen.png' };

const validForm = {
    player_a_id: 123,
    player_b_id: 456,
    season: '2025-26',
};

/**
 * Helper to wire up the 6 db.get calls per resolvePlayerComparison run.
 *
 * Resolver dispatches both players via Promise.all, so the actual call
 * order is interleaved :
 *   1. person  for A  (block A's first await)
 *   2. person  for B  (block B's first await — runs while A awaits)
 *   3. stats   for A  (block A's inner Promise.all kicks off after person)
 *   4. club    for A  (same Promise.all)
 *   5. stats   for B
 *   6. club    for B
 *
 * If you change resolvePlayerBlock's structure, update this comment.
 */
function setupHappyMocks() {
    db.get
        .mockResolvedValueOnce(PERSON_A) // 1. A.person
        .mockResolvedValueOnce(PERSON_B) // 2. B.person
        .mockResolvedValueOnce(STATS_A)  // 3. A.aggregate
        .mockResolvedValueOnce(CLUB_A)   // 4. A.top_club
        .mockResolvedValueOnce(STATS_B)  // 5. B.aggregate
        .mockResolvedValueOnce(CLUB_B);  // 6. B.top_club
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('resolvePlayerComparison — happy path', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('resolves both players with empty missing[] when all data is present', async () => {
        setupHappyMocks();
        const result = await resolvePlayerComparison(validForm);

        expect(result.missing).toEqual([]);
        expect(result.resolved.season).toBe('2025-26');
        expect(result.resolved.players).toHaveLength(2);

        const [a, b] = result.resolved.players;
        expect(a).toMatchObject({
            id: 123,
            name: 'Kylian Mbappé',
            photo: 'https://cdn.example.com/mbappe.png',
            club_name: 'Real Madrid',
            goals: 31,
            assists: 8,
            xG: 28.42,
            minutes_played: 2700,
        });
        expect(b).toMatchObject({
            id: 456,
            name: 'Erling Haaland',
            goals: 28,
            xG: 26.11,
        });
    });

    it('coerces stat fields to numbers (Postgres returns BIGINT as string)', async () => {
        setupHappyMocks();
        const { resolved } = await resolvePlayerComparison(validForm);
        expect(typeof resolved.players[0].goals).toBe('number');
        expect(typeof resolved.players[0].xG).toBe('number');
        expect(typeof resolved.players[0].id).toBe('number');
    });
});

describe('resolvePlayerComparison — missing fields', () => {
    beforeEach(() => vi.clearAllMocks());

    it('reports photo as optional missing when photo_url IS NULL', async () => {
        db.get
            .mockResolvedValueOnce({ ...PERSON_A, photo_url: null }) // 1. A.person
            .mockResolvedValueOnce(PERSON_B)                          // 2. B.person
            .mockResolvedValueOnce(STATS_A)                           // 3. A.stats
            .mockResolvedValueOnce(CLUB_A)                            // 4. A.club
            .mockResolvedValueOnce(STATS_B)                           // 5. B.stats
            .mockResolvedValueOnce(CLUB_B);                           // 6. B.club

        const { resolved, missing } = await resolvePlayerComparison(validForm);
        expect(resolved.players[0].photo).toBeNull();
        expect(missing).toContainEqual(expect.objectContaining({
            fieldPath: 'players[0].photo',
            severity:  'optional',
        }));
    });

    it('reports xG as critical missing when xg IS NULL across all rows', async () => {
        db.get
            .mockResolvedValueOnce(PERSON_A)
            .mockResolvedValueOnce(PERSON_B)
            .mockResolvedValueOnce({ ...STATS_A, xg: null, xg_90: null })
            .mockResolvedValueOnce(CLUB_A)
            .mockResolvedValueOnce(STATS_B)
            .mockResolvedValueOnce(CLUB_B);

        const { resolved, missing } = await resolvePlayerComparison(validForm);
        expect(resolved.players[0].xG).toBeNull();
        expect(missing).toContainEqual(expect.objectContaining({
            fieldPath: 'players[0].xG',
            severity:  'critical',
        }));
    });

    it('reports critical missings on goals/assists/xG when no row exists for the season', async () => {
        db.get
            .mockResolvedValueOnce(PERSON_A)
            .mockResolvedValueOnce(PERSON_B)
            .mockResolvedValueOnce({ row_count: '0' }) // A.stats — no row
            .mockResolvedValueOnce(undefined)           // A.club — none
            .mockResolvedValueOnce(STATS_B)
            .mockResolvedValueOnce(CLUB_B);

        const { resolved, missing } = await resolvePlayerComparison(validForm);
        expect(resolved.players[0].goals).toBeNull();
        expect(resolved.players[0].xG).toBeNull();

        const fieldPaths = missing.map(m => m.fieldPath);
        expect(fieldPaths).toContain('players[0].goals');
        expect(fieldPaths).toContain('players[0].assists');
        expect(fieldPaths).toContain('players[0].xG');
        expect(fieldPaths).toContain('players[0].minutes_played');
        expect(fieldPaths).toContain('players[0].apps');
        expect(fieldPaths).toContain('players[0].club_name');

        // Critical severities on the must-haves
        const goalsMiss = missing.find(m => m.fieldPath === 'players[0].goals');
        expect(goalsMiss.severity).toBe('critical');
    });

    it('reports name as critical missing when full_name IS NULL', async () => {
        db.get
            .mockResolvedValueOnce({ ...PERSON_A, full_name: null })
            .mockResolvedValueOnce(PERSON_B)
            .mockResolvedValueOnce(STATS_A)
            .mockResolvedValueOnce(CLUB_A)
            .mockResolvedValueOnce(STATS_B)
            .mockResolvedValueOnce(CLUB_B);

        const { missing } = await resolvePlayerComparison(validForm);
        expect(missing).toContainEqual(expect.objectContaining({
            fieldPath: 'players[0].name',
            severity:  'critical',
        }));
    });
});

describe('resolvePlayerComparison — error paths', () => {
    beforeEach(() => vi.clearAllMocks());

    it('throws EntityNotFoundError when player_a_id is unknown', async () => {
        db.get
            .mockResolvedValueOnce(undefined); // no row in v4.people

        await expect(resolvePlayerComparison(validForm)).rejects.toBeInstanceOf(EntityNotFoundError);
        await expect(resolvePlayerComparison(validForm)).rejects.toMatchObject({ entityType: 'player' });
    });

    it('throws ZodError when player_a_id == player_b_id', async () => {
        await expect(resolvePlayerComparison({
            player_a_id: 123,
            player_b_id: 123,
            season: '2025-26',
        })).rejects.toThrow(/must differ/);
        // No DB call should have been made before validation fails
        expect(db.get).not.toHaveBeenCalled();
    });

    it('throws ZodError on invalid season format', async () => {
        await expect(resolvePlayerComparison({
            player_a_id: 123,
            player_b_id: 456,
            season: 'last-season',
        })).rejects.toThrow();
        expect(db.get).not.toHaveBeenCalled();
    });
});

describe('resolvePlayerComparison — season=current', () => {
    beforeEach(() => vi.clearAllMocks());

    it('resolves "current" per player via MAX(season_label)', async () => {
        // Player A's "current" → 2025-26 ; Player B's "current" → 2024-25
        db.get
            .mockResolvedValueOnce(PERSON_A)
            .mockResolvedValueOnce({ season_label: '2025-26' }) // resolveSeasonLabel A
            .mockResolvedValueOnce(STATS_A)                     // aggregate A
            .mockResolvedValueOnce(CLUB_A)                      // top club A
            .mockResolvedValueOnce(PERSON_B)
            .mockResolvedValueOnce({ season_label: '2024-25' }) // resolveSeasonLabel B
            .mockResolvedValueOnce(STATS_B)
            .mockResolvedValueOnce(CLUB_B);

        const { resolved } = await resolvePlayerComparison({
            player_a_id: 123,
            player_b_id: 456,
            season: 'current',
        });

        // Top-level season = player A's resolved (2025-26)
        expect(resolved.season).toBe('2025-26');
        expect(resolved.players[0].season_used).toBe('2025-26');
        expect(resolved.players[1].season_used).toBe('2024-25');
    });
});

describe('resolve dispatcher', () => {
    beforeEach(() => vi.clearAllMocks());

    it('throws TemplateNotFoundError for unknown templateId', async () => {
        await expect(resolve('totally-fake-template', validForm))
            .rejects.toBeInstanceOf(TemplateNotFoundError);
    });

    it('routes player-comparison to resolvePlayerComparison', async () => {
        setupHappyMocks();
        const result = await resolve('player-comparison', validForm);
        expect(result.resolved.players).toHaveLength(2);
    });
});

describe('Service exports the expected error classes', () => {
    it('default export contains the error classes for controllers to instanceof-check', () => {
        expect(ResolverService.TemplateNotFoundError).toBe(TemplateNotFoundError);
        expect(ResolverService.EntityNotFoundError).toBe(EntityNotFoundError);
    });
});
