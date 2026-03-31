/**
 * Global Historical Import Orchestrator
 *
 * Scans ExtractionTodo/ for folders matching the league registry,
 * identifies season subdirectories, and executes the master importer
 * in batch mode.
 *
 * Usage:
 *   node scripts/v3/orchestrate_historical_import.js [--master] [--force] [--dry-run]
 */

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const __dirname = path.dirname(new URL(import.meta.url).pathname);
const REGISTRY_PATH = path.join(__dirname, 'historical_league_registry.json');
// In Docker, ExtractionTodo is at /app/externalData_root/ExtractionTodo/
// __dirname is /app/scripts/v3
const EXTRACTION_ROOT = path.join(__dirname, '../../externalData_root/ExtractionTodo');

console.log('--- 🏆 Global Historical Orchestrator ---');

// 1. Load Registry
let registry = {};
try {
    registry = JSON.parse(fs.readFileSync(REGISTRY_PATH, 'utf8'));
} catch (e) {
    console.error('Error loading registry:', e.message);
    process.exit(1);
}

const flags = process.argv.slice(2).join(' ');

// 2. Scan folders
const folders = fs.readdirSync(EXTRACTION_ROOT).filter(f => {
    const fullPath = path.join(EXTRACTION_ROOT, f);
    return fs.statSync(fullPath).isDirectory();
});

let totalJobs = 0;
let successJobs = 0;

for (const folderName of folders) {
    if (!registry[folderName]) {
        console.log(`[Skip] ${folderName} (not in registry)`);
        continue;
    }

    const reg = registry[folderName];
    const leaguePath = path.join(EXTRACTION_ROOT, folderName);
    const seasons = fs.readdirSync(leaguePath).filter(s => {
        const fullPath = path.join(leaguePath, s);
        return fs.statSync(fullPath).isDirectory() && /^\d{4}-\d{4}$/.test(s);
    });

    console.log(`\n[Process] ${folderName} (League ID: ${reg.league_id})`);
    
    for (const season of seasons) {
        const seasonPath = path.join(leaguePath, season);
        const seasonYear = season.split('-')[0];

        console.log(`  -> season ${season}...`);
        
        const cmd = `node scripts/v3/import_historical_master.js --path "${seasonPath}" --league ${reg.league_id} --season ${seasonYear} ${flags}`;
        
        totalJobs++;
        const result = spawnSync('node', [
            'scripts/v3/import_historical_master.js',
            '--path', seasonPath,
            '--league', reg.league_id,
            '--season', seasonYear,
            ...process.argv.slice(2)
        ], { stdio: 'inherit' });

        if (result.status === 0) {
            successJobs++;
            console.log(`  ✅ Done. Syncing metadata...`);
            
            // Post-Import Sync (Standings & Insights)
            spawnSync('node', [
                path.join(__dirname, 'sync_historical_metadata.js'),
                '--league', reg.league_id,
                '--season', seasonYear,
                '--force'
            ], { stdio: 'inherit' });
        } else {
            console.error(`  ❌ Failed (Exit: ${result.status})`);
        }
    }
}

console.log(`\n--- Batch Complete ---`);
console.log(`Total Season Jobs: ${totalJobs}`);
console.log(`Successful:        ${successJobs}`);
console.log(`Failed:            ${totalJobs - successJobs}`);
