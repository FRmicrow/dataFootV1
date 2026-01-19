import initSqlJs from 'sql.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync, writeFileSync, existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbPath = join(__dirname, '..', 'database.sqlite');

console.log('🔧 Adding league classifications to database...');

// Initialize SQL.js
const SQL = await initSqlJs();

// Load existing database
if (!existsSync(dbPath)) {
    console.error('❌ Database not found at:', dbPath);
    process.exit(1);
}

const buffer = readFileSync(dbPath);
const db = new SQL.Database(buffer);

// Create league_classifications table
const createTableSQL = `
CREATE TABLE IF NOT EXISTS league_classifications (
  league_id INTEGER PRIMARY KEY,
  competition_type TEXT NOT NULL CHECK(competition_type IN ('championship', 'cup', 'international')),
  FOREIGN KEY (league_id) REFERENCES leagues(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_league_classifications_type ON league_classifications(competition_type);
`;

db.run(createTableSQL);
console.log('✅ Created league_classifications table');

// Auto-classification function
function classifyLeague(leagueName) {
    const name = leagueName.toLowerCase();

    // National team competitions (should be excluded from club stats, but for reference)
    if (name.includes('world cup') ||
        name.includes('euro championship') ||
        name.includes('copa america') ||
        name.includes('african cup of nations') ||
        name.includes('asian cup') ||
        name.includes('friendlies') ||
        name.includes('nations league') ||
        name.includes('qualification') ||
        name.includes('qualifier')) {
        return null; // Skip national team competitions for club stats
    }

    // International Club Competitions
    if (name.includes('champions league') ||
        name.includes('europa league') ||
        name.includes('conference league') ||
        name.includes('uefa super cup') ||
        name.includes('european cup') ||
        name.includes('club world cup') ||
        name.includes('fifa club world cup') ||
        name.includes('libertadores') ||
        name.includes('sudamericana') ||
        name.includes('recopa') ||
        name.includes('intercontinental')) {
        return 'international';
    }

    // National Cups
    if (name.includes('cup') ||
        name.includes('coupe') ||
        name.includes('copa del rey') ||
        name.includes('copa') ||
        name.includes('pokal') ||
        name.includes('taça') ||
        name.includes('coppa') ||
        name.includes('trophée') ||
        name.includes('super cup') ||
        name.includes('supercopa') ||
        name.includes('supercoppa') ||
        name.includes('shield') ||
        name.includes('charity shield') ||
        name.includes('trofeo') ||
        name.includes('trophy')) {
        return 'cup';
    }

    // Championships (Leagues)
    if (name.includes('liga') ||
        name.includes('league') ||
        name.includes('ligue') ||
        name.includes('serie') ||
        name.includes('bundesliga') ||
        name.includes('eredivisie') ||
        name.includes('primeira') ||
        name.includes('premier') ||
        name.includes('championship') ||
        name.includes('division') ||
        name.includes('süper lig') ||
        name.includes('superliga') ||
        name.includes('allsvenskan') ||
        name.includes('eliteserien') ||
        name.includes('pro league') ||
        name.includes('jupiler')) {
        return 'championship';
    }

    // Default fallback (for ambiguous cases)
    return null;
}

// Get all leagues
const leagues = db.exec('SELECT id, name FROM leagues')[0];

if (!leagues || !leagues.values.length) {
    console.log('⚠️ No leagues found in database');
} else {
    let classified = 0;
    let skipped = 0;
    let unclassified = [];

    console.log(`\n📊 Processing ${leagues.values.length} leagues...\n`);

    leagues.values.forEach(([leagueId, leagueName]) => {
        const competitionType = classifyLeague(leagueName);

        if (competitionType) {
            // Insert classification
            const stmt = db.prepare('INSERT OR REPLACE INTO league_classifications (league_id, competition_type) VALUES (?, ?)');
            stmt.run([leagueId, competitionType]);
            stmt.free();

            console.log(`✓ ${leagueName} → ${competitionType}`);
            classified++;
        } else {
            // Check if it's a national team competition
            const name = leagueName.toLowerCase();
            if (name.includes('world cup') || name.includes('euro') || name.includes('qualifier') || name.includes('friendlies')) {
                console.log(`⏭️  Skipped (national team): ${leagueName}`);
                skipped++;
            } else {
                console.log(`⚠️  Could not classify: ${leagueName}`);
                unclassified.push(leagueName);
            }
        }
    });

    console.log(`\n📈 Summary:`);
    console.log(`   Classified: ${classified}`);
    console.log(`   Skipped (national): ${skipped}`);
    console.log(`   Unclassified: ${unclassified.length}`);

    if (unclassified.length > 0) {
        console.log(`\n⚠️  Unclassified leagues (will need manual classification during import):`);
        unclassified.forEach(name => console.log(`   - ${name}`));
    }
}

// Save database
const data = db.export();
writeFileSync(dbPath, data);

console.log('\n✅ Migration completed successfully!');
db.close();
