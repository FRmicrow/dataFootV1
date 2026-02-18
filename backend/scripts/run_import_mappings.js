
import fs from 'fs';
import path from 'path';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper for Manual Overrides
const COUNTRY_OVERRIDES = {
    'UAE': 'United Arab Emirates',
    'USA/Mexico': 'America', // Map to Region
    'Caribbean': 'America',
    'International': 'World',
    'England': 'England', // 213
    'Scotland': 'Scotland', // 222
    'Wales': 'Wales', // 223
    'Northern Ireland': 'Northern Ireland',
    'Ireland': 'Republic of Ireland', // Prefer Republic of Ireland (265) over Ireland (364)? Let's check DB.
    'Ireland/Northern Ireland': 'Northern Ireland' // Specific fix
};

// Region Names to IDs (from my previous init)
const REGION_MAP = {
    'World': 1,
    'Europe': 2,
    'Asia': 3,
    'Africa': 4,
    'America': 5, // North/South combined in my init
    'North America': 5,
    'South America': 5,
    'Central America': 5,
    'Oceania': 6
};

async function main() {
    const db = await open({
        filename: path.join(__dirname, '../database.sqlite'),
        driver: sqlite3.Database
    });

    try {
        console.log("Loading countries...");
        const countries = await db.all("SELECT country_id, country_name FROM V2_countries");
        const countryMap = {}; // Name -> ID
        countries.forEach(c => {
            countryMap[c.country_name.toLowerCase()] = c.country_id;
        });

        // Add REGION overrides to country map if they exist in DB as countries (1-6)
        for (const [name, id] of Object.entries(REGION_MAP)) {
            // If the region exists as a pseudo-country
            if (countries.find(c => c.country_id === id)) {
                countryMap[name.toLowerCase()] = id;
            }
        }

        console.log("Reading mapping file...");
        const sqlPath = path.join(__dirname, '../../scripts/leagues_countries_mapping.sql');
        const content = fs.readFileSync(sqlPath, 'utf8');

        // Regex to find values: (id, 'Name', 'Country', 'Region')
        // Captures: 1=id, 2=name, 3=country, 4=region
        const regex = /\((\d+),\s*'([^']+)',\s*'([^']+)',\s*'([^']+)'\)/g;

        let match;
        let count = 0;
        let updated = 0;
        let errors = 0;

        while ((match = regex.exec(content)) !== null) {
            count++;
            const compId = parseInt(match[1]);
            const compName = match[2];
            let countryName = match[3]; // The country in the file
            const regionName = match[4];

            let targetCountryId = null;

            // 1. Resolve Country
            // Check overrides first
            if (COUNTRY_OVERRIDES[countryName]) {
                countryName = COUNTRY_OVERRIDES[countryName];
            }

            // specific fix: "Irish Cup" (47549) -> Northern Ireland
            if (compId === 47549) countryName = 'Northern Ireland';
            // specific fix: "FAI Cup" (47389) -> Republic of Ireland
            if (compId === 47389) countryName = 'Republic of Ireland';

            // Try direct match
            if (countryMap[countryName.toLowerCase()]) {
                targetCountryId = countryMap[countryName.toLowerCase()];
            }
            // Try Region fallback for "Various" or "International"
            else if (countryName === 'Various' || countryName === 'International') {
                if (REGION_MAP[regionName]) {
                    targetCountryId = REGION_MAP[regionName];
                } else if (countryName === 'International') {
                    targetCountryId = 1; // World
                }
            }
            // Try finding "USA" if "United States" is needed
            else if (countryName === 'USA' && countryMap['united states']) {
                targetCountryId = countryMap['united states'];
            }

            if (targetCountryId) {
                // Update DB
                // Only update if currently NULL or we want to force? 
                // User said "Import properly", implying existing data might be wrong or missing.
                // Let's force update.

                await db.run("UPDATE V2_competitions SET country_id = ? WHERE competition_id = ?", [targetCountryId, compId]);
                updated++;
                // console.log(`Updated ${compName} (${compId}) -> Country ID ${targetCountryId} (${countryName})`);
            } else {
                console.warn(`Could not resolve country '${countryName}' for competition '${compName}' (${compId})`);
                errors++;
            }
        }

        console.log(`\nProcessing Complete.`);
        console.log(`Total Records Found: ${count}`);
        console.log(`Updated: ${updated}`);
        console.log(`Unresolved/Skipped: ${errors}`);

    } catch (e) {
        console.error("Error:", e);
    } finally {
        await db.close();
    }
}

main();
