
import db from '../../config/database.js';
import { cleanParams } from '../../utils/sqlHelpers.js';
import { ResolutionService } from './ResolutionService.js';
import { runImportJob } from './leagueImportService.js';
import { syncLeagueEventsService } from './fixtureService.js';

export class HealthPrescriptionService {
    /**
     * Scans the DB for all types of issues and persists them as prescriptions.
     */
    static async generatePrescriptions() {
        const prescriptions = [];

        // 1. GAP: Missing Seasons for Players in Tracked Leagues
        const missingSeasonGaps = await this.detectMissingPlayerSeasons();
        for (const p of missingSeasonGaps) prescriptions.push(p);

        // 2. DUPLICATES: High confidence duplicates found by ResolutionService
        const duplicateCandidates = await this.detectDuplicateCandidates();
        for (const p of duplicateCandidates) prescriptions.push(p);

        // 3. INCONSISTENCY: Finished fixtures missing events
        const inconsistencyIssues = await this.detectDataInconsistencies();
        for (const p of inconsistencyIssues) prescriptions.push(p);

        // Persist to DB
        let count = 0;
        for (const p of prescriptions) {
            const metaStr = JSON.stringify(p.metadata);
            const exists = await db.get(
                "SELECT id FROM V3_Health_Prescriptions WHERE type = ? AND target_entity_type = ? AND target_entity_id = ? AND status = 'PENDING' AND metadata = ?",
                cleanParams([p.type, p.target_entity_type, p.target_entity_id, metaStr])
            );

            if (!exists) {
                await db.run(
                    "INSERT INTO V3_Health_Prescriptions (type, priority, target_entity_type, target_entity_id, description, metadata) VALUES (?, ?, ?, ?, ?, ?)",
                    cleanParams([p.type, p.priority || 'MEDIUM', p.target_entity_type, p.target_entity_id, p.description, metaStr])
                );
                count++;
            }
        }

        return { total: prescriptions.length, new: count };
    }

    /**
     * Detects missing seasons (data gaps)
     */
    static async detectMissingPlayerSeasons() {
        const minSeasonYear = new Date().getFullYear() - 6;

        // Find players who have a gap in their season history for the same league
        const sql = `
            SELECT
                s1.player_id,
                p.name,
                s1.league_id,
                l.name as league_name,
                MAX(s1.season_year) as year_max,
                MIN(s1.season_year) as year_min
            FROM V3_Player_Stats s1
            JOIN V3_Players p ON s1.player_id = p.player_id
            JOIN V3_Leagues l ON s1.league_id = l.league_id
            WHERE s1.season_year >= ?
            GROUP BY s1.player_id, p.name, s1.league_id, l.name
            HAVING MAX(s1.season_year) > MIN(s1.season_year) + (COUNT(DISTINCT s1.season_year) - 1)
            ORDER BY MAX(s1.season_year) DESC
            LIMIT 150
        `;
        const gaps = await db.all(sql, cleanParams([minSeasonYear]));
        const results = [];

        for (const gap of gaps) {
            for (let year = gap.year_min + 1; year < gap.year_max; year++) {
                const hasStat = await db.get("SELECT 1 FROM V3_Player_Stats WHERE player_id = ? AND league_id = ? AND season_year = ?", cleanParams([gap.player_id, gap.league_id, year]));
                if (!hasStat) {
                    results.push({
                        type: 'MISSING_DATA',
                        priority: 'MEDIUM',
                        target_entity_type: 'PLAYER',
                        target_entity_id: gap.player_id,
                        description: `${gap.name} (ID:${gap.player_id}) is missing statistics for ${gap.league_name} in season ${year}`,
                        metadata: { season: year, league_id: gap.league_id, name: gap.name }
                    });
                }
            }
        }
        return results;
    }

    static async detectDuplicateCandidates() {
        const threshold = 85;
        const candidates = await ResolutionService.findGlobalDuplicates(threshold, { pairLimit: 250 });
        return candidates.map(c => ({
            type: 'DUPLICATE_CANDIDATE',
            priority: 'HIGH',
            target_entity_type: 'PLAYER',
            target_entity_id: c.player1.player_id,
            description: `Duplicate candidate: ${c.player1.name} (ID:${c.player1.player_id}) and ${c.player2.name} (ID:${c.player2.player_id}) with ${c.confidence}% confidence`,
            metadata: { duplicate_id: c.player2.player_id, confidence: c.confidence, name1: c.player1.name, name2: c.player2.name }
        }));
    }

    static async detectDataInconsistencies() {
        // Fixtures marked as Finished but with 0 events
        const sql = `
            SELECT f.league_id, f.season_year, l.name as league_name, COUNT(*) as missing_count
            FROM V3_Fixtures f
            JOIN V3_Leagues l ON f.league_id = l.league_id
            LEFT JOIN V3_Fixture_Events e ON f.fixture_id = e.fixture_id
            WHERE f.status_short IN ('FT', 'AET', 'PEN')
            AND e.id IS NULL
            GROUP BY f.league_id, f.season_year, l.name
        `;
        const fixtures = await db.all(sql);

        return fixtures.map(g => ({
            type: 'DATA_INCONSISTENCY',
            priority: 'LOW',
            target_entity_type: 'LEAGUE_SEASON',
            target_entity_id: g.league_id,
            description: `${g.league_name} (${g.season_year}) has ${g.missing_count} fixtures missing match events.`,
            metadata: { season: g.season_year, league_id: g.league_id, league_name: g.league_name }
        }));
    }

    /**
     * Executes the recovery action for a prescription.
     */
    static async execute(prescriptionId, sendLog) {
        const prescription = await db.get("SELECT * FROM V3_Health_Prescriptions WHERE id = ?", cleanParams([prescriptionId]));
        if (!prescription) throw new Error("Prescription not found");
        if (prescription.status === 'RESOLVED') throw new Error("Prescription already resolved");

        const metadata = JSON.parse(prescription.metadata);
        let result = null;

        sendLog(`🏥 [REPAIR] Processing ${prescription.type} for Prescription #${prescriptionId}`, 'info');

        try {
            switch (prescription.type) {
                case 'MISSING_DATA':
                    // Trigger targeted import
                    await runImportJob(metadata.league_id, metadata.season, sendLog);
                    result = { message: "Targeted import job executed" };
                    break;

                case 'DUPLICATE_CANDIDATE':
                    // Merge logic
                    result = await ResolutionService.performMerge(prescription.target_entity_id, metadata.duplicate_id);
                    break;

                case 'DATA_INCONSISTENCY':
                    // Sync events
                    result = await syncLeagueEventsService(metadata.league_id, metadata.season, 2000, sendLog);
                    break;

                default:
                    throw new Error(`Execution logic not implemented for type: ${prescription.type}`);
            }

            // Mark as RESOLVED
            await db.run("UPDATE V3_Health_Prescriptions SET status = 'RESOLVED', resolved_at = CURRENT_TIMESTAMP WHERE id = ?", cleanParams([prescriptionId]));

            sendLog(`✅ Prescription #${prescriptionId} marked as RESOLVED.`, 'success');
            return result;

        } catch (err) {
            sendLog(`❌ Prescription #${prescriptionId} repair failed: ${err.message}`, 'error');
            throw err;
        }
    }
}
