/**
 * Add missing competitions for Ronaldo's data
 */

import db from '../src/config/database.js';

async function addMissingCompetitions() {
    console.log('🔍 Initializing database...');
    await db.init();

    console.log('\n📊 Adding missing competitions...\n');

    // Add Carling Cup (English League Cup) to national_cups
    const carlingCup = db.get("SELECT id FROM national_cups WHERE name LIKE '%Carling%' OR name LIKE '%League Cup%'");
    if (!carlingCup) {
        const england = db.get("SELECT id FROM countries WHERE name = 'England'");
        if (england) {
            db.run("INSERT INTO national_cups (api_league_id, name, country_id) VALUES (?, ?, ?)",
                [-1001, "League Cup", england.id]);
            console.log("✓ Added: League Cup (England)");
        }
    } else {
        console.log("✓ League Cup already exists");
    }

    // Add FA Community Shield to national_cups
    const communityShield = db.get("SELECT id FROM national_cups WHERE name LIKE '%Community Shield%'");
    if (!communityShield) {
        const england = db.get("SELECT id FROM countries WHERE name = 'England'");
        if (england) {
            db.run("INSERT INTO national_cups (api_league_id, name, country_id) VALUES (?, ?, ?)",
                [-1002, "FA Community Shield", england.id]);
            console.log("✓ Added: FA Community Shield (England)");
        }
    } else {
        console.log("✓ FA Community Shield already exists");
    }

    // Add FIFA Club World Cup to international_cups
    const clubWorldCup = db.get("SELECT id FROM international_cups WHERE name LIKE '%Club World Cup%'");
    if (!clubWorldCup) {
        db.run("INSERT INTO international_cups (api_league_id, name, region) VALUES (?, ?, ?)",
            [-2001, "FIFA Club World Cup", "World"]);
        console.log("✓ Added: FIFA Club World Cup");
    } else {
        console.log("✓ FIFA Club World Cup already exists");
    }

    // Add World Cup Qualification to national_team_cups
    const wcQualif = db.get("SELECT id FROM national_team_cups WHERE name LIKE '%World Cup%Qualification%' OR name LIKE '%World Cup%Qualifier%'");
    if (!wcQualif) {
        db.run("INSERT INTO national_team_cups (name) VALUES (?)",
            ["World Cup - Qualification"]);
        console.log("✓ Added: World Cup - Qualification");
    } else {
        console.log("✓ World Cup Qualification already exists");
    }

    // Add Euro Qualification to national_team_cups
    const euroQualif = db.get("SELECT id FROM national_team_cups WHERE name LIKE '%Euro%Qualification%'");
    if (!euroQualif) {
        db.run("INSERT INTO national_team_cups (name) VALUES (?)",
            ["Euro - Qualification"]);
        console.log("✓ Added: Euro - Qualification");
    } else {
        console.log("✓ Euro Qualification already exists");
    }

    // Add Euro to national_team_cups if not exists
    const euro = db.get("SELECT id FROM national_team_cups WHERE name = 'Euro' OR name LIKE 'UEFA European%'");
    if (!euro) {
        db.run("INSERT INTO national_team_cups (name) VALUES (?)", ["Euro"]);
        console.log("✓ Added: Euro");
    } else {
        console.log("✓ Euro already exists");
    }

    console.log('\n✅ Competitions setup complete!');
}

addMissingCompetitions()
    .then(() => process.exit(0))
    .catch(error => {
        console.error('❌ Error:', error);
        process.exit(1);
    });
