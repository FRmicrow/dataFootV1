import axios from 'axios';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import db from '../../config/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import os from 'node:os';

const TEMP_DIR = path.join(os.tmpdir(), 'statfoot_logos');

// Helper to convert RGB to Hex
function rgbToHex(r, g, b) {
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase();
}

/**
 * Service to handle color extraction from team logos
 */
class ColorService {
    /**
     * Extracts colors from a logo and updates the team record
     * @param {number} teamId 
     * @param {string} logoUrl 
     */
    async processTeamColors(teamId, logoUrl) {
        if (!logoUrl) return;

        // Ensure temp directory exists
        if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });

        const tempFile = path.join(TEMP_DIR, `logo_${teamId}_${Date.now()}.png`);

        try {
            console.log(`🎨 [ColorService] Extracting colors for team ${teamId}...`);
            const response = await axios.get(logoUrl, {
                responseType: 'arraybuffer',
                timeout: 5000
            });
            fs.writeFileSync(tempFile, Buffer.from(response.data));

            const ColorThief = (await import('colorthief')).default;
            const palette = await ColorThief.getPalette(tempFile, 3);
            const colors = palette.map(color => rgbToHex(color[0], color[1], color[2]));

            if (colors && colors.length > 0) {
                const accent = colors[0];
                const secondary = colors[1] || colors[0];
                const tertiary = colors[2] || colors[1] || colors[0];

                await db.run(`
                    UPDATE V3_Teams 
                    SET accent_color = ?, secondary_color = ?, tertiary_color = ? 
                    WHERE team_id = ?
                `, [accent, secondary, tertiary, teamId]);

                console.log(`  ✅ [ColorService] Colors updated for team ${teamId}: ${accent}, ${secondary}, ${tertiary}`);
                return { accent, secondary, tertiary };
            }
        } catch (error) {
            console.error(`  ❌ [ColorService] Error processing colors for team ${teamId}:`, error.message);
        } finally {
            if (fs.existsSync(tempFile)) {
                try { fs.unlinkSync(tempFile); } catch (e) { }
            }
        }
    }

    /**
     * Batch process teams missing colors
     * @param {number} limit 
     */
    async batchProcessMissingColors(limit = 50) {
        const teams = await db.all(`
            SELECT team_id, name, logo_url 
            FROM V3_Teams 
            WHERE logo_url IS NOT NULL 
            AND (accent_color IS NULL OR secondary_color IS NULL OR tertiary_color IS NULL)
            LIMIT ?
        `, [limit]);

        console.log(`📋 [ColorService] Found ${teams.length} teams to process.`);

        for (const team of teams) {
            await this.processTeamColors(team.team_id, team.logo_url);
        }
    }
}

export default new ColorService();
