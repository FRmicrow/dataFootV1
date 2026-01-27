
import initSqlJs from 'sql.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync, writeFileSync } from 'fs';
import { CLUB_MAPPINGS } from '../src/utils/clubMappings.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const dbPath = join(__dirname, '..', 'database.sqlite');

const GERMAN_TROPHIES = [
    // FC Augsburg
    { team: 'FC Augsburg', trophy: '2. Bundesliga', season: '1973–74' },
    { team: 'FC Augsburg', trophy: '2. Bundesliga', season: '1979–80' },
    { team: 'FC Augsburg', trophy: 'Regionalliga Süd', season: '1972–73' },
    { team: 'FC Augsburg', trophy: 'Bayernliga', season: '1968–69' },

    // Bayer Leverkusen
    { team: 'Bayer 04 Leverkusen', trophy: 'Bundesliga', season: '2023–24' },
    { team: 'Bayer 04 Leverkusen', trophy: 'DFB-Pokal', season: '1992–93' },
    { team: 'Bayer 04 Leverkusen', trophy: 'DFB-Pokal', season: '2023–24' },
    { team: 'Bayer 04 Leverkusen', trophy: 'DFL-Supercup', season: '1987' },
    { team: 'Bayer 04 Leverkusen', trophy: 'DFL-Supercup', season: '1993' },
    { team: 'Bayer 04 Leverkusen', trophy: 'DFL-Supercup', season: '2020' },
    { team: 'Bayer 04 Leverkusen', trophy: 'UEFA Cup', season: '1987–88' },

    // Bayern Munich
    { team: 'Bayern Munich', trophy: 'Bundesliga', season: '1931–32' },
    { team: 'Bayern Munich', trophy: 'Bundesliga', season: '1968–69' },
    { team: 'Bayern Munich', trophy: 'Bundesliga', season: '1971–72' },
    { team: 'Bayern Munich', trophy: 'Bundesliga', season: '1972–73' },
    { team: 'Bayern Munich', trophy: 'Bundesliga', season: '1973–74' },
    { team: 'Bayern Munich', trophy: 'Bundesliga', season: '1974–75' },
    { team: 'Bayern Munich', trophy: 'Bundesliga', season: '1975–76' },
    { team: 'Bayern Munich', trophy: 'Bundesliga', season: '1976–77' },
    { team: 'Bayern Munich', trophy: 'Bundesliga', season: '1977–78' },
    { team: 'Bayern Munich', trophy: 'Bundesliga', season: '1978–79' },
    { team: 'Bayern Munich', trophy: 'Bundesliga', season: '1979–80' },
    { team: 'Bayern Munich', trophy: 'Bundesliga', season: '1980–81' },
    { team: 'Bayern Munich', trophy: 'Bundesliga', season: '1984–85' },
    { team: 'Bayern Munich', trophy: 'Bundesliga', season: '1985–86' },
    { team: 'Bayern Munich', trophy: 'Bundesliga', season: '1986–87' },
    { team: 'Bayern Munich', trophy: 'Bundesliga', season: '1988–89' },
    { team: 'Bayern Munich', trophy: 'Bundesliga', season: '1989–90' },
    { team: 'Bayern Munich', trophy: 'Bundesliga', season: '1993–94' },
    { team: 'Bayern Munich', trophy: 'Bundesliga', season: '1996–97' },
    { team: 'Bayern Munich', trophy: 'Bundesliga', season: '1998–99' },
    { team: 'Bayern Munich', trophy: 'Bundesliga', season: '1999–2000' },
    { team: 'Bayern Munich', trophy: 'Bundesliga', season: '2000–01' },
    { team: 'Bayern Munich', trophy: 'Bundesliga', season: '2002–03' },
    { team: 'Bayern Munich', trophy: 'Bundesliga', season: '2004–05' },
    { team: 'Bayern Munich', trophy: 'Bundesliga', season: '2005–06' },
    { team: 'Bayern Munich', trophy: 'Bundesliga', season: '2007–08' },
    { team: 'Bayern Munich', trophy: 'Bundesliga', season: '2009–10' },
    { team: 'Bayern Munich', trophy: 'Bundesliga', season: '2012–13' },
    { team: 'Bayern Munich', trophy: 'Bundesliga', season: '2013–14' },
    { team: 'Bayern Munich', trophy: 'Bundesliga', season: '2014–15' },
    { team: 'Bayern Munich', trophy: 'Bundesliga', season: '2015–16' },
    { team: 'Bayern Munich', trophy: 'Bundesliga', season: '2016–17' },
    { team: 'Bayern Munich', trophy: 'Bundesliga', season: '2017–18' },
    { team: 'Bayern Munich', trophy: 'Bundesliga', season: '2018–19' },
    { team: 'Bayern Munich', trophy: 'Bundesliga', season: '2019–20' },
    { team: 'Bayern Munich', trophy: 'Bundesliga', season: '2020–21' },
    { team: 'Bayern Munich', trophy: 'Bundesliga', season: '2021–22' },
    { team: 'Bayern Munich', trophy: 'Bundesliga', season: '2022–23' },
    { team: 'Bayern Munich', trophy: 'DFB-Pokal', season: '1956–57' },
    { team: 'Bayern Munich', trophy: 'DFB-Pokal', season: '1965–66' },
    { team: 'Bayern Munich', trophy: 'DFB-Pokal', season: '1966–67' },
    { team: 'Bayern Munich', trophy: 'DFB-Pokal', season: '1968–69' },
    { team: 'Bayern Munich', trophy: 'DFB-Pokal', season: '1970–71' },
    { team: 'Bayern Munich', trophy: 'DFB-Pokal', season: '1981–82' },
    { team: 'Bayern Munich', trophy: 'DFB-Pokal', season: '1983–84' },
    { team: 'Bayern Munich', trophy: 'DFB-Pokal', season: '1985–86' },
    { team: 'Bayern Munich', trophy: 'DFB-Pokal', season: '1997–98' },
    { team: 'Bayern Munich', trophy: 'DFB-Pokal', season: '1999–2000' },
    { team: 'Bayern Munich', trophy: 'DFB-Pokal', season: '2002–03' },
    { team: 'Bayern Munich', trophy: 'DFB-Pokal', season: '2004–05' },
    { team: 'Bayern Munich', trophy: 'DFB-Pokal', season: '2005–06' },
    { team: 'Bayern Munich', trophy: 'DFB-Pokal', season: '2007–08' },
    { team: 'Bayern Munich', trophy: 'DFB-Pokal', season: '2009–10' },
    { team: 'Bayern Munich', trophy: 'DFB-Pokal', season: '2012–13' },
    { team: 'Bayern Munich', trophy: 'DFB-Pokal', season: '2013–14' },
    { team: 'Bayern Munich', trophy: 'DFB-Pokal', season: '2015–16' },
    { team: 'Bayern Munich', trophy: 'DFB-Pokal', season: '2018–19' },
    { team: 'Bayern Munich', trophy: 'DFB-Pokal', season: '2019–20' },
    { team: 'Bayern Munich', trophy: 'DFL-Supercup', season: '1987' },
    { team: 'Bayern Munich', trophy: 'DFL-Supercup', season: '1990' },
    { team: 'Bayern Munich', trophy: 'DFL-Supercup', season: '1994' },
    { team: 'Bayern Munich', trophy: 'DFL-Supercup', season: '1995' },
    { team: 'Bayern Munich', trophy: 'DFL-Supercup', season: '1997' },
    { team: 'Bayern Munich', trophy: 'DFL-Supercup', season: '1998' },
    { team: 'Bayern Munich', trophy: 'DFL-Supercup', season: '1999' },
    { team: 'Bayern Munich', trophy: 'DFL-Supercup', season: '2000' },
    { team: 'Bayern Munich', trophy: 'DFL-Supercup', season: '2007' },
    { team: 'Bayern Munich', trophy: 'DFL-Supercup', season: '2010' },
    { team: 'Bayern Munich', trophy: 'DFL-Supercup', season: '2012' },
    { team: 'Bayern Munich', trophy: 'DFL-Supercup', season: '2016' },
    { team: 'Bayern Munich', trophy: 'Champions League', season: '1973–74' },
    { team: 'Bayern Munich', trophy: 'Champions League', season: '1974–75' },
    { team: 'Bayern Munich', trophy: 'Champions League', season: '1975–76' },
    { team: 'Bayern Munich', trophy: 'Champions League', season: '2000–01' },
    { team: 'Bayern Munich', trophy: 'Champions League', season: '2012–13' },
    { team: 'Bayern Munich', trophy: 'Champions League', season: '2019–20' },
    { team: 'Bayern Munich', trophy: 'UEFA Super Cup', season: '1975' },
    { team: 'Bayern Munich', trophy: 'UEFA Super Cup', season: '1976' },
    { team: 'Bayern Munich', trophy: 'UEFA Super Cup', season: '2001' },
    { team: 'Bayern Munich', trophy: 'UEFA Super Cup', season: '2013' },
    { team: 'Bayern Munich', trophy: 'Intercontinental Cup', season: '1976' },
    { team: 'Bayern Munich', trophy: 'Intercontinental Cup', season: '2001' },
    { team: 'Bayern Munich', trophy: 'FIFA Club World Cup', season: '2013' },
    { team: 'Bayern Munich', trophy: 'FIFA Club World Cup', season: '2020' },

    // Borussia Dortmund
    { team: 'Borussia Dortmund', trophy: 'Bundesliga', season: '1955–56' },
    { team: 'Borussia Dortmund', trophy: 'Bundesliga', season: '1956–57' },
    { team: 'Borussia Dortmund', trophy: 'Bundesliga', season: '1962–63' },
    { team: 'Borussia Dortmund', trophy: 'Bundesliga', season: '1994–95' },
    { team: 'Borussia Dortmund', trophy: 'Bundesliga', season: '1995–96' },
    { team: 'Borussia Dortmund', trophy: 'Bundesliga', season: '2001–02' },
    { team: 'Borussia Dortmund', trophy: 'Bundesliga', season: '2010–11' },
    { team: 'Borussia Dortmund', trophy: 'Bundesliga', season: '2011–12' },
    { team: 'Borussia Dortmund', trophy: 'DFB-Pokal', season: '1964–65' },
    { team: 'Borussia Dortmund', trophy: 'DFB-Pokal', season: '1988–89' },
    { team: 'Borussia Dortmund', trophy: 'DFB-Pokal', season: '2011–12' },
    { team: 'Borussia Dortmund', trophy: 'DFB-Pokal', season: '2016–17' },
    { team: 'Borussia Dortmund', trophy: 'DFL-Supercup', season: '1989' },
    { team: 'Borussia Dortmund', trophy: 'DFL-Supercup', season: '1995' },
    { team: 'Borussia Dortmund', trophy: 'DFL-Supercup', season: '1996' },
    { team: 'Borussia Dortmund', trophy: 'DFL-Supercup', season: '2008' },
    { team: 'Borussia Dortmund', trophy: 'DFL-Supercup', season: '2013' },
    { team: 'Borussia Dortmund', trophy: 'DFL-Supercup', season: '2014' },
    { team: 'Borussia Dortmund', trophy: 'Champions League', season: '1996–97' },
    { team: 'Borussia Dortmund', trophy: 'Cup Winners Cup', season: '1965–66' },
    { team: 'Borussia Dortmund', trophy: 'UEFA Super Cup', season: '1997' },

    // Borussia Mönchengladbach
    { team: 'Borussia Mönchengladbach', trophy: 'Bundesliga', season: '1969–70' },
    { team: 'Borussia Mönchengladbach', trophy: 'Bundesliga', season: '1970–71' },
    { team: 'Borussia Mönchengladbach', trophy: 'Bundesliga', season: '1974–75' },
    { team: 'Borussia Mönchengladbach', trophy: 'Bundesliga', season: '1975–76' },
    { team: 'Borussia Mönchengladbach', trophy: 'Bundesliga', season: '1976–77' },
    { team: 'Borussia Mönchengladbach', trophy: 'Bundesliga', season: '1978–79' },
    { team: 'Borussia Mönchengladbach', trophy: 'DFB-Pokal', season: '1969–70' },
    { team: 'Borussia Mönchengladbach', trophy: 'DFB-Pokal', season: '1972–73' },
    { team: 'Borussia Mönchengladbach', trophy: 'DFB-Pokal', season: '1994–95' },
    { team: 'Borussia Mönchengladbach', trophy: 'UEFA Cup', season: '1974–75' },
    { team: 'Borussia Mönchengladbach', trophy: 'UEFA Cup', season: '1978–79' },

    // Eintracht Frankfurt
    { team: 'Eintracht Frankfurt', trophy: 'Bundesliga', season: '1958–59' },
    { team: 'Eintracht Frankfurt', trophy: 'DFB-Pokal', season: '1973–74' },
    { team: 'Eintracht Frankfurt', trophy: 'DFB-Pokal', season: '1974–75' },
    { team: 'Eintracht Frankfurt', trophy: 'DFB-Pokal', season: '1980–81' },
    { team: 'Eintracht Frankfurt', trophy: 'DFB-Pokal', season: '1987–88' },
    { team: 'Eintracht Frankfurt', trophy: 'DFB-Pokal', season: '2017–18' },
    { team: 'Eintracht Frankfurt', trophy: 'UEFA Cup', season: '1979–80' },
    { team: 'Eintracht Frankfurt', trophy: 'Europa League', season: '2021–22' },
    { team: 'Eintracht Frankfurt', trophy: 'UEFA Super Cup', season: '1980' },

    // Sc Freiburg
    { team: 'SC Freiburg', trophy: '2. Bundesliga', season: '1992–93' },
    { team: 'SC Freiburg', trophy: '2. Bundesliga', season: '2002–03' },
    { team: 'SC Freiburg', trophy: '2. Bundesliga', season: '2015–16' },

    // 1. FC Koln
    { team: '1. FC Köln', trophy: 'Bundesliga', season: '1963–64' },
    { team: '1. FC Köln', trophy: 'Bundesliga', season: '1977–78' },
    { team: '1. FC Köln', trophy: 'DFB-Pokal', season: '1967–68' },
    { team: '1. FC Köln', trophy: 'DFB-Pokal', season: '1976–77' },
    { team: '1. FC Köln', trophy: 'DFB-Pokal', season: '1977–78' },
    { team: '1. FC Köln', trophy: 'DFB-Pokal', season: '1982–83' },

    // 1. FC Heidenheim
    { team: '1. FC Heidenheim', trophy: '2. Bundesliga', season: '2022–23' },

    // TSG Hoffenheim
    { team: 'TSG Hoffenheim', trophy: '2. Bundesliga', season: '2007–08' },

    // Hamburger SV
    { team: 'Hamburger SV', trophy: 'Bundesliga', season: '1960–61' },
    { team: 'Hamburger SV', trophy: 'Bundesliga', season: '1978–79' },
    { team: 'Hamburger SV', trophy: 'Bundesliga', season: '1981–82' },
    { team: 'Hamburger SV', trophy: 'DFB-Pokal', season: '1962–63' },
    { team: 'Hamburger SV', trophy: 'DFB-Pokal', season: '1975–76' },
    { team: 'Hamburger SV', trophy: 'DFB-Pokal', season: '1986–87' },
    { team: 'Hamburger SV', trophy: 'DFL-Supercup', season: '1983' },
    { team: 'Hamburger SV', trophy: 'DFL-Supercup', season: '1987' },
    { team: 'Hamburger SV', trophy: 'Champions League', season: '1982–83' },
    { team: 'Hamburger SV', trophy: 'UEFA Cup', season: '1976–77' },
    { team: 'Hamburger SV', trophy: 'Cup Winners Cup', season: '1967–68' },

    // Mainz 05
    { team: 'Mainz 05', trophy: '2. Bundesliga', season: '1999–2000' },
    { team: 'Mainz 05', trophy: '2. Bundesliga', season: '2003–04' },

    // RB Leipzig
    { team: 'RB Leipzig', trophy: 'DFB-Pokal', season: '2021–22' },
    { team: 'RB Leipzig', trophy: 'DFL-Supercup', season: '2023' },

    // FC St. Pauli
    { team: 'FC St. Pauli', trophy: 'Regionalliga Nord', season: '1966–67' },
    { team: 'FC St. Pauli', trophy: 'Regionalliga Nord', season: '1976–77' },
    { team: 'FC St. Pauli', trophy: '2. Bundesliga', season: '1977–78' },

    // VfB Stuttgart
    { team: 'VfB Stuttgart', trophy: 'Bundesliga', season: '1950–51' },
    { team: 'VfB Stuttgart', trophy: 'Bundesliga', season: '1951–52' },
    { team: 'VfB Stuttgart', trophy: 'Bundesliga', season: '1983–84' },
    { team: 'VfB Stuttgart', trophy: 'Bundesliga', season: '1991–92' },
    { team: 'VfB Stuttgart', trophy: 'Bundesliga', season: '2006–07' },
    { team: 'VfB Stuttgart', trophy: 'DFB-Pokal', season: '1953–54' },
    { team: 'VfB Stuttgart', trophy: 'DFB-Pokal', season: '1957–58' },
    { team: 'VfB Stuttgart', trophy: 'DFB-Pokal', season: '1996–97' },
    { team: 'VfB Stuttgart', trophy: 'DFB-Pokal', season: '1997–98' },
    { team: 'VfB Stuttgart', trophy: 'DFL-Supercup', season: '1992' },
    { team: 'VfB Stuttgart', trophy: 'DFL-Supercup', season: '1997' },

    // Union Berlin
    { team: 'Union Berlin', trophy: '2. Bundesliga', season: '2008–09' },
    { team: 'Union Berlin', trophy: '2. Bundesliga', season: '2018–19' },

    // Werder Bremen
    { team: 'Werder Bremen', trophy: 'Bundesliga', season: '1964–65' },
    { team: 'Werder Bremen', trophy: 'Bundesliga', season: '1987–88' },
    { team: 'Werder Bremen', trophy: 'Bundesliga', season: '1992–93' },
    { team: 'Werder Bremen', trophy: 'Bundesliga', season: '2003–04' },
    { team: 'Werder Bremen', trophy: 'Bundesliga', season: '2004–05' },
    { team: 'Werder Bremen', trophy: 'DFB-Pokal', season: '1960–61' },
    { team: 'Werder Bremen', trophy: 'DFB-Pokal', season: '1990–91' },
    { team: 'Werder Bremen', trophy: 'DFB-Pokal', season: '1993–94' },
    { team: 'Werder Bremen', trophy: 'DFB-Pokal', season: '1998–99' },
    { team: 'Werder Bremen', trophy: 'DFB-Pokal', season: '2003–04' },
    { team: 'Werder Bremen', trophy: 'DFB-Pokal', season: '2008–09' },
    { team: 'Werder Bremen', trophy: 'DFL-Supercup', season: '1988' },
    { team: 'Werder Bremen', trophy: 'DFL-Supercup', season: '1993' },
    { team: 'Werder Bremen', trophy: 'DFL-Supercup', season: '1994' },
    { team: 'Werder Bremen', trophy: 'Cup Winners Cup', season: '1991–92' },
    { team: 'Werder Bremen', trophy: 'Intertoto Cup', season: '1998' },

    // VfL Wolfsburg
    { team: 'VfL Wolfsburg', trophy: 'Bundesliga', season: '2008–09' },
    { team: 'VfL Wolfsburg', trophy: 'DFB-Pokal', season: '2014–15' },
    { team: 'VfL Wolfsburg', trophy: 'DFL-Supercup', season: '2015' },
];

async function importGermanTrophies() {
    const SQL = await initSqlJs();
    const buffer = readFileSync(dbPath);
    const db = new SQL.Database(buffer);

    try {
        db.exec("BEGIN TRANSACTION");
        console.log("🏆 Starting German Trophies Import...");

        let addedCount = 0;
        let skippedCount = 0;

        for (const record of GERMAN_TROPHIES) {
            // 1. Normalize Team Name
            const normalizedTeamName = CLUB_MAPPINGS[record.team] || record.team;

            // 2. Find Team in DB (in Clubs table)
            let team = null;
            const teamsRes = db.exec("SELECT id FROM clubs WHERE name = ?", [normalizedTeamName]);
            if (teamsRes.length > 0) {
                team = { id: teamsRes[0].values[0][0] };
            } else {
                console.warn(`⚠️ Team not found: ${record.team} (Normalized: ${normalizedTeamName}) - Skipping trophy`);
                skippedCount++;
                continue;
            }

            // 3. Normalize Trophy Type
            let trophyType = 'Germany';
            if (record.trophy.includes('Bundesliga') || record.trophy.includes('Bayernliga') || record.trophy.includes('Regionalliga')) {
                trophyType = 'championship';
            }
            if (record.trophy.includes('DFB-Pokal') || record.trophy.includes('DFL-Supercup')) {
                trophyType = 'national_cup';
            }
            if (record.trophy.includes('Champions League') || record.trophy.includes('Europa League') || record.trophy.includes('UEFA Cup') || record.trophy.includes('Cup Winners') || record.trophy.includes('Intertoto') || record.trophy.includes('UEFA Super Cup')) {
                trophyType = 'international_cup';
            }
            if (record.trophy.includes('Intercontinental') || record.trophy.includes('Club World Cup')) {
                trophyType = 'international_cup';
            }

            // 4. Get or Create Trophy
            let trophyId;
            const trophyRes = db.exec("SELECT id FROM trophies WHERE name = ?", [record.trophy]);
            if (trophyRes.length > 0) {
                trophyId = trophyRes[0].values[0][0];
            } else {
                let categoryType = 'Germany';
                if (trophyType === 'international_cup') {
                    if (record.trophy.includes('Intercontinental') || record.trophy.includes('Club World Cup')) {
                        categoryType = 'World';
                    } else {
                        categoryType = 'Europe';
                    }
                }

                db.run("INSERT INTO trophies (name, type) VALUES (?, ?)", [record.trophy, categoryType]);
                trophyId = db.exec("SELECT last_insert_rowid()")[0].values[0][0];
            }

            // 5. Get or Create Season
            let seasonId;
            let seasonLabel = record.season.replace('–', '/');
            if (seasonLabel.match(/^\d{4}.\d{2}$/)) {
                const parts = seasonLabel.split(/[/-]/);
                if (parts[1].length === 2) {
                    const prefix = parts[0].substring(0, 2);
                    seasonLabel = `${parts[0]}/${prefix}${parts[1]}`;
                }
            }

            const seasonRes = db.exec("SELECT id FROM seasons WHERE label = ?", [seasonLabel]);
            if (seasonRes.length > 0) {
                seasonId = seasonRes[0].values[0][0];
            } else {
                const year = parseInt(seasonLabel.substring(0, 4));
                db.run("INSERT INTO seasons (label, year) VALUES (?, ?)", [seasonLabel, year]);
                seasonId = db.exec("SELECT last_insert_rowid()")[0].values[0][0];
            }

            // 6. Insert Team Trophy
            try {
                db.run("INSERT OR IGNORE INTO team_trophies (team_id, trophy_id, season_id, place) VALUES (?, ?, ?, ?)", [team.id, trophyId, seasonId, 1]);
                if (db.getRowsModified() > 0) addedCount++;
                else skippedCount++;
            } catch (e) {
                console.error(`Error inserting trophy for ${normalizedTeamName}:`, e);
            }
        }

        db.exec("COMMIT");
        const data = db.export();
        writeFileSync(dbPath, data);
        console.log(`\n🎉 Import Completed! Added: ${addedCount}, Skipped/Duplicate: ${skippedCount}`);

    } catch (err) {
        console.error("❌ Fatal Error:", err);
        db.exec("ROLLBACK");
    } finally {
        db.close();
    }
}

importGermanTrophies();
