
import initSqlJs from 'sql.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync, writeFileSync } from 'fs';
import { CLUB_MAPPINGS } from '../src/utils/clubMappings.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const dbPath = join(__dirname, '..', 'database.sqlite');

const FRENCH_TROPHIES = [
    // Auxerre
    { team: 'Auxerre', trophy: 'Championnat de France / Ligue 1', season: '1995–96' },
    { team: 'Auxerre', trophy: 'Coupe de France', season: '1993–94' },
    { team: 'Auxerre', trophy: 'Coupe de France', season: '1995–96' },
    { team: 'Auxerre', trophy: 'Coupe de France', season: '2002–03' },
    { team: 'Auxerre', trophy: 'Coupe de France', season: '2004–05' },
    { team: 'Auxerre', trophy: 'Coupe de la Ligue', season: '1995–96' },
    { team: 'Auxerre', trophy: 'Trophée des Champions', season: '1996' },

    // Angers SCO
    { team: 'Angers SCO', trophy: 'Ligue 2', season: '1968–69' },
    { team: 'Angers SCO', trophy: 'Ligue 2', season: '1975–76' },

    // AS Monaco
    { team: 'AS Monaco', trophy: 'Ligue 1', season: '1960–61' },
    { team: 'AS Monaco', trophy: 'Ligue 1', season: '1962–63' },
    { team: 'AS Monaco', trophy: 'Ligue 1', season: '1977–78' },
    { team: 'AS Monaco', trophy: 'Ligue 1', season: '1981–82' },
    { team: 'AS Monaco', trophy: 'Ligue 1', season: '1987–88' },
    { team: 'AS Monaco', trophy: 'Ligue 1', season: '1996–97' },
    { team: 'AS Monaco', trophy: 'Ligue 1', season: '1999–2000' },
    { team: 'AS Monaco', trophy: 'Ligue 1', season: '2016–17' },
    { team: 'AS Monaco', trophy: 'Coupe de France', season: '1960–61' },
    { team: 'AS Monaco', trophy: 'Coupe de France', season: '1962–63' },
    { team: 'AS Monaco', trophy: 'Coupe de France', season: '1979–80' },
    { team: 'AS Monaco', trophy: 'Coupe de France', season: '1984–85' },
    { team: 'AS Monaco', trophy: 'Coupe de France', season: '1990–91' },
    { team: 'AS Monaco', trophy: 'Coupe de France', season: '1991–92' },
    { team: 'AS Monaco', trophy: 'Coupe de la Ligue', season: '2002–03' },
    { team: 'AS Monaco', trophy: 'Trophée des Champions', season: '1961' },
    { team: 'AS Monaco', trophy: 'Trophée des Champions', season: '1985' },
    { team: 'AS Monaco', trophy: 'Trophée des Champions', season: '1997' },
    { team: 'AS Monaco', trophy: 'Trophée des Champions', season: '2000' },
    { team: 'AS Monaco', trophy: 'Trophée des Champions', season: '2017' },

    // Stade Brestois 29
    { team: 'Stade Brestois 29', trophy: 'Ligue 2', season: '1980–81' },
    { team: 'Stade Brestois 29', trophy: 'Coupe Gambardella', season: '1990' },

    // Le Havre AC
    { team: 'Le Havre AC', trophy: 'Ligue 2', season: '1990–91' },
    { team: 'Le Havre AC', trophy: 'Ligue 2', season: '1993–94' },
    { team: 'Le Havre AC', trophy: 'Ligue 2', season: '2007–08' },
    { team: 'Le Havre AC', trophy: 'Ligue 2', season: '2017–18' },

    // Lille OSC
    { team: 'Lille OSC', trophy: 'Ligue 1', season: '1945–46' },
    { team: 'Lille OSC', trophy: 'Ligue 1', season: '1953–54' },
    { team: 'Lille OSC', trophy: 'Ligue 1', season: '2010–11' },
    { team: 'Lille OSC', trophy: 'Ligue 1', season: '2020–21' },
    { team: 'Lille OSC', trophy: 'Coupe de France', season: '1945–46' },
    { team: 'Lille OSC', trophy: 'Coupe de France', season: '1946–47' },
    { team: 'Lille OSC', trophy: 'Coupe de France', season: '1947–48' },
    { team: 'Lille OSC', trophy: 'Coupe de France', season: '1952–53' },
    { team: 'Lille OSC', trophy: 'Coupe de France', season: '1954–55' },
    { team: 'Lille OSC', trophy: 'Coupe de France', season: '2010–11' },
    { team: 'Lille OSC', trophy: 'Trophée des Champions', season: '1946' },
    { team: 'Lille OSC', trophy: 'Trophée des Champions', season: '1955' },
    { team: 'Lille OSC', trophy: 'Trophée des Champions', season: '2021' },

    // RC Lens
    { team: 'RC Lens', trophy: 'Ligue 1', season: '1997–98' },
    { team: 'RC Lens', trophy: 'Ligue 2', season: '1936–37' },
    { team: 'RC Lens', trophy: 'Ligue 2', season: '1948–49' },
    { team: 'RC Lens', trophy: 'Ligue 2', season: '1972–73' },
    { team: 'RC Lens', trophy: 'Coupe de France', season: '1998–99' },
    { team: 'RC Lens', trophy: 'Coupe de la Ligue', season: '1998–99' },
    { team: 'RC Lens', trophy: 'Trophée des Champions', season: '1998' },

    // FC Lorient
    { team: 'FC Lorient', trophy: 'Coupe de France', season: '2001–02' },
    { team: 'FC Lorient', trophy: 'Coupe de la Ligue', season: '2001–02' },
    { team: 'FC Lorient', trophy: 'Ligue 2', season: '1994–95' },
    { team: 'FC Lorient', trophy: 'Ligue 2', season: '2005–06' },

    // Olympique Lyonnais
    { team: 'Olympique Lyonnais', trophy: 'Ligue 1', season: '2001–02' },
    { team: 'Olympique Lyonnais', trophy: 'Ligue 1', season: '2002–03' },
    { team: 'Olympique Lyonnais', trophy: 'Ligue 1', season: '2003–04' },
    { team: 'Olympique Lyonnais', trophy: 'Ligue 1', season: '2004–05' },
    { team: 'Olympique Lyonnais', trophy: 'Ligue 1', season: '2005–06' },
    { team: 'Olympique Lyonnais', trophy: 'Ligue 1', season: '2006–07' },
    { team: 'Olympique Lyonnais', trophy: 'Ligue 1', season: '2007–08' },
    { team: 'Olympique Lyonnais', trophy: 'Ligue 1', season: '2008–09' },
    { team: 'Olympique Lyonnais', trophy: 'Coupe de France', season: '1963–64' },
    { team: 'Olympique Lyonnais', trophy: 'Coupe de France', season: '1966–67' },
    { team: 'Olympique Lyonnais', trophy: 'Coupe de France', season: '1972–73' },
    { team: 'Olympique Lyonnais', trophy: 'Coupe de France', season: '2007–08' },
    { team: 'Olympique Lyonnais', trophy: 'Coupe de France', season: '2011–12' },
    { team: 'Olympique Lyonnais', trophy: 'Coupe de la Ligue', season: '2000–01' },
    { team: 'Olympique Lyonnais', trophy: 'Trophée des Champions', season: '1973' },
    { team: 'Olympique Lyonnais', trophy: 'Trophée des Champions', season: '2002' },
    { team: 'Olympique Lyonnais', trophy: 'Trophée des Champions', season: '2003' },
    { team: 'Olympique Lyonnais', trophy: 'Trophée des Champions', season: '2004' },
    { team: 'Olympique Lyonnais', trophy: 'Trophée des Champions', season: '2005' },
    { team: 'Olympique Lyonnais', trophy: 'Trophée des Champions', season: '2006' },
    { team: 'Olympique Lyonnais', trophy: 'Trophée des Champions', season: '2007' },
    { team: 'Olympique Lyonnais', trophy: 'Trophée des Champions', season: '2012' },

    // Olympique de Marseille
    { team: 'Olympique de Marseille', trophy: 'Ligue 1', season: '1936–37' },
    { team: 'Olympique de Marseille', trophy: 'Ligue 1', season: '1947–48' },
    { team: 'Olympique de Marseille', trophy: 'Ligue 1', season: '1970–71' },
    { team: 'Olympique de Marseille', trophy: 'Ligue 1', season: '1971–72' },
    { team: 'Olympique de Marseille', trophy: 'Ligue 1', season: '1988–89' },
    { team: 'Olympique de Marseille', trophy: 'Ligue 1', season: '1989–90' },
    { team: 'Olympique de Marseille', trophy: 'Ligue 1', season: '1990–91' },
    { team: 'Olympique de Marseille', trophy: 'Ligue 1', season: '1991–92' },
    { team: 'Olympique de Marseille', trophy: 'Ligue 1', season: '1992–93' },
    { team: 'Olympique de Marseille', trophy: 'Ligue 1', season: '1993–94' },
    { team: 'Olympique de Marseille', trophy: 'Coupe de France', season: '1923–24' },
    { team: 'Olympique de Marseille', trophy: 'Coupe de France', season: '1924–25' },
    { team: 'Olympique de Marseille', trophy: 'Coupe de France', season: '1925–26' },
    { team: 'Olympique de Marseille', trophy: 'Coupe de France', season: '1926–27' },
    { team: 'Olympique de Marseille', trophy: 'Coupe de France', season: '1934–35' },
    { team: 'Olympique de Marseille', trophy: 'Coupe de France', season: '1937–38' },
    { team: 'Olympique de Marseille', trophy: 'Coupe de France', season: '1942–43' },
    { team: 'Olympique de Marseille', trophy: 'Coupe de France', season: '1968–69' },
    { team: 'Olympique de Marseille', trophy: 'Coupe de France', season: '1971–72' },
    { team: 'Olympique de Marseille', trophy: 'Coupe de France', season: '1975–76' },
    { team: 'Olympique de Marseille', trophy: 'Coupe de France', season: '1988–89' },
    { team: 'Olympique de Marseille', trophy: 'Coupe de France', season: '1989–90' },
    { team: 'Olympique de Marseille', trophy: 'Coupe de France', season: '1990–91' },
    { team: 'Olympique de Marseille', trophy: 'Coupe de France', season: '1991–92' },
    { team: 'Olympique de Marseille', trophy: 'Coupe de France', season: '1998–99' },
    { team: 'Olympique de Marseille', trophy: 'Coupe de France', season: '2005–06' },
    { team: 'Olympique de Marseille', trophy: 'Coupe de la Ligue', season: '2010–11' },
    { team: 'Olympique de Marseille', trophy: 'Coupe de la Ligue', season: '2011–12' },
    { team: 'Olympique de Marseille', trophy: 'Coupe de la Ligue', season: '2012–13' },
    { team: 'Olympique de Marseille', trophy: 'Trophée des Champions', season: '1971' },
    { team: 'Olympique de Marseille', trophy: 'Trophée des Champions', season: '2010' },
    { team: 'Olympique de Marseille', trophy: 'Trophée des Champions', season: '2011' },
    { team: 'Olympique de Marseille', trophy: 'Trophée des Champions', season: '2012' },
    { team: 'Olympique de Marseille', trophy: 'Trophée des Champions', season: '2013' },
    { team: 'Olympique de Marseille', trophy: 'Champions League', season: '1992–93' },

    // FC Metz
    { team: 'FC Metz', trophy: 'Ligue 2', season: '1933–34' },
    { team: 'FC Metz', trophy: 'Ligue 2', season: '2006–07' },
    { team: 'FC Metz', trophy: 'Coupe de France', season: '1983–84' },
    { team: 'FC Metz', trophy: 'Coupe de France', season: '1987–88' },
    { team: 'FC Metz', trophy: 'Coupe de la Ligue', season: '1995–96' },
    { team: 'FC Metz', trophy: 'Trophée des Champions', season: '1984' },

    // FC Nantes
    { team: 'FC Nantes', trophy: 'Ligue 1', season: '1964–65' },
    { team: 'FC Nantes', trophy: 'Ligue 1', season: '1965–66' },
    { team: 'FC Nantes', trophy: 'Ligue 1', season: '1972–73' },
    { team: 'FC Nantes', trophy: 'Ligue 1', season: '1976–77' },
    { team: 'FC Nantes', trophy: 'Ligue 1', season: '1979–80' },
    { team: 'FC Nantes', trophy: 'Ligue 1', season: '1982–83' },
    { team: 'FC Nantes', trophy: 'Ligue 1', season: '1994–95' },
    { team: 'FC Nantes', trophy: 'Ligue 1', season: '2000–01' },
    { team: 'FC Nantes', trophy: 'Coupe de France', season: '1978–79' },
    { team: 'FC Nantes', trophy: 'Coupe de France', season: '1998–99' },
    { team: 'FC Nantes', trophy: 'Coupe de France', season: '1999–2000' },
    { team: 'FC Nantes', trophy: 'Coupe de la Ligue', season: '1964–65' },
    { team: 'FC Nantes', trophy: 'Trophée des Champions', season: '1965' },
    { team: 'FC Nantes', trophy: 'Trophée des Champions', season: '1966' },
    { team: 'FC Nantes', trophy: 'Trophée des Champions', season: '1973' },
    { team: 'FC Nantes', trophy: 'Trophée des Champions', season: '1977' },
    { team: 'FC Nantes', trophy: 'Trophée des Champions', season: '1999' },

    // OGC Nice
    { team: 'OGC Nice', trophy: 'Ligue 1', season: '1950–51' },
    { team: 'OGC Nice', trophy: 'Ligue 1', season: '1951–52' },
    { team: 'OGC Nice', trophy: 'Ligue 1', season: '1955–56' },
    { team: 'OGC Nice', trophy: 'Ligue 1', season: '1958–59' },
    { team: 'OGC Nice', trophy: 'Coupe de France', season: '1951–52' },
    { team: 'OGC Nice', trophy: 'Coupe de France', season: '1953–54' },
    { team: 'OGC Nice', trophy: 'Coupe de France', season: '1963–64' },
    { team: 'OGC Nice', trophy: 'Trophée des Champions', season: '1952' },
    { team: 'OGC Nice', trophy: 'Trophée des Champions', season: '1956' },

    // Paris Saint-Germain
    { team: 'Paris Saint-Germain', trophy: 'Ligue 1', season: '1985–86' },
    { team: 'Paris Saint-Germain', trophy: 'Ligue 1', season: '1993–94' },
    { team: 'Paris Saint-Germain', trophy: 'Ligue 1', season: '2012–13' },
    { team: 'Paris Saint-Germain', trophy: 'Ligue 1', season: '2013–14' },
    { team: 'Paris Saint-Germain', trophy: 'Ligue 1', season: '2014–15' },
    { team: 'Paris Saint-Germain', trophy: 'Ligue 1', season: '2015–16' },
    { team: 'Paris Saint-Germain', trophy: 'Ligue 1', season: '2017–18' },
    { team: 'Paris Saint-Germain', trophy: 'Ligue 1', season: '2018–19' },
    { team: 'Paris Saint-Germain', trophy: 'Ligue 1', season: '2019–20' },
    { team: 'Paris Saint-Germain', trophy: 'Ligue 1', season: '2021–22' },
    { team: 'Paris Saint-Germain', trophy: 'Ligue 1', season: '2022–23' },
    { team: 'Paris Saint-Germain', trophy: 'Coupe de France', season: '1981–82' },
    { team: 'Paris Saint-Germain', trophy: 'Coupe de France', season: '1982–83' },
    { team: 'Paris Saint-Germain', trophy: 'Coupe de France', season: '1992–93' },
    { team: 'Paris Saint-Germain', trophy: 'Coupe de France', season: '1994–95' },
    { team: 'Paris Saint-Germain', trophy: 'Coupe de France', season: '1997–98' },
    { team: 'Paris Saint-Germain', trophy: 'Coupe de France', season: '2003–04' },
    { team: 'Paris Saint-Germain', trophy: 'Coupe de France', season: '2005–06' },
    { team: 'Paris Saint-Germain', trophy: 'Coupe de France', season: '2009–10' },
    { team: 'Paris Saint-Germain', trophy: 'Coupe de France', season: '2014–15' },
    { team: 'Paris Saint-Germain', trophy: 'Coupe de France', season: '2015–16' },
    { team: 'Paris Saint-Germain', trophy: 'Coupe de France', season: '2016–17' },
    { team: 'Paris Saint-Germain', trophy: 'Coupe de France', season: '2017–18' },
    { team: 'Paris Saint-Germain', trophy: 'Coupe de France', season: '2019–20' },
    { team: 'Paris Saint-Germain', trophy: 'Coupe de France', season: '2020–21' },
    { team: 'Paris Saint-Germain', trophy: 'Coupe de France', season: '2022–23' },
    { team: 'Paris Saint-Germain', trophy: 'Coupe de la Ligue', season: '1994–95' },
    { team: 'Paris Saint-Germain', trophy: 'Coupe de la Ligue', season: '1997–98' },
    { team: 'Paris Saint-Germain', trophy: 'Coupe de la Ligue', season: '2007–08' },
    { team: 'Paris Saint-Germain', trophy: 'Coupe de la Ligue', season: '2013–14' },
    { team: 'Paris Saint-Germain', trophy: 'Coupe de la Ligue', season: '2014–15' },
    { team: 'Paris Saint-Germain', trophy: 'Coupe de la Ligue', season: '2015–16' },
    { team: 'Paris Saint-Germain', trophy: 'Coupe de la Ligue', season: '2016–17' },
    { team: 'Paris Saint-Germain', trophy: 'Coupe de la Ligue', season: '2017–18' },
    { team: 'Paris Saint-Germain', trophy: 'Trophée des Champions', season: '1995' },
    { team: 'Paris Saint-Germain', trophy: 'Trophée des Champions', season: '1998' },
    { team: 'Paris Saint-Germain', trophy: 'Trophée des Champions', season: '2013' },
    { team: 'Paris Saint-Germain', trophy: 'Trophée des Champions', season: '2014' },
    { team: 'Paris Saint-Germain', trophy: 'Trophée des Champions', season: '2015' },
    { team: 'Paris Saint-Germain', trophy: 'Trophée des Champions', season: '2016' },
    { team: 'Paris Saint-Germain', trophy: 'Trophée des Champions', season: '2017' },
    { team: 'Paris Saint-Germain', trophy: 'Trophée des Champions', season: '2018' },
    { team: 'Paris Saint-Germain', trophy: 'Trophée des Champions', season: '2019' },
    { team: 'Paris Saint-Germain', trophy: 'Trophée des Champions', season: '2020' },
    { team: 'Paris Saint-Germain', trophy: 'Trophée des Champions', season: '2022' },
    { team: 'Paris Saint-Germain', trophy: 'UEFA Cup Winners’ Cup', season: '1995–96' },

    // Stade Rennais
    { team: 'Stade Rennais', trophy: 'Coupe de France', season: '1964–65' },
    { team: 'Stade Rennais', trophy: 'Coupe de France', season: '1970–71' },
    { team: 'Stade Rennais', trophy: 'Coupe de France', season: '2018–19' },
    { team: 'Stade Rennais', trophy: 'Trophée des Champions', season: '1971' },

    // RC Strasbourg
    { team: 'RC Strasbourg', trophy: 'Ligue 1', season: '1978–79' },
    { team: 'RC Strasbourg', trophy: 'Ligue 2', season: '1938–39' },
    { team: 'RC Strasbourg', trophy: 'Ligue 2', season: '1965–66' },
    { team: 'RC Strasbourg', trophy: 'Coupe de France', season: '1950–51' },
    { team: 'RC Strasbourg', trophy: 'Coupe de France', season: '1965–66' },
    { team: 'RC Strasbourg', trophy: 'Coupe de France', season: '2000–01' },
    { team: 'RC Strasbourg', trophy: 'Coupe de la Ligue', season: '1997–98' },
    { team: 'RC Strasbourg', trophy: 'Trophée des Champions', season: '1979' },

    // Toulouse FC
    { team: 'Toulouse FC', trophy: 'Coupe de France', season: '1956–57' },
    { team: 'Toulouse FC', trophy: 'Coupe de France', season: '1970–71' },
    { team: 'Toulouse FC', trophy: 'Ligue 2', season: '1953–54' },
    { team: 'Toulouse FC', trophy: 'Ligue 2', season: '1981–82' },
    { team: 'Toulouse FC', trophy: 'Ligue 2', season: '1982–83' },
    { team: 'Toulouse FC', trophy: 'Ligue 2', season: '2002–03' },
    { team: 'Toulouse FC', trophy: 'Ligue 2', season: '2006–07' },
];

async function importFrenchTrophies() {
    const SQL = await initSqlJs();
    const buffer = readFileSync(dbPath);
    const db = new SQL.Database(buffer);

    try {
        db.exec("BEGIN TRANSACTION");
        console.log("🏆 Starting French Trophies Import...");

        let addedCount = 0;
        let skippedCount = 0;

        for (const record of FRENCH_TROPHIES) {
            // 1. Normalize Team Name
            const normalizedTeamName = CLUB_MAPPINGS[record.team] || record.team;

            // 2. Find Team in DB (in Clubs table)
            // Try both name and specific checks
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
            let trophyType = 'France'; // Default
            if (record.trophy.includes('Ligue 1') || record.trophy.includes('Ligue 2')) trophyType = 'championship';
            if (record.trophy.includes('Champions League') || record.trophy.includes('European Cup') || record.trophy.includes('Cup Winners')) trophyType = 'international_cup';
            if (record.trophy.includes('Coupe de France') || record.trophy.includes('Coupe de la Ligue') || record.trophy.includes('Trophée des Champions') || record.trophy.includes('Gambardella')) trophyType = 'national_cup';

            // 4. Get or Create Trophy
            let trophyId;
            const trophyRes = db.exec("SELECT id FROM trophies WHERE name = ?", [record.trophy]);
            if (trophyRes.length > 0) {
                trophyId = trophyRes[0].values[0][0];
            } else {
                // Determine category/country type for the 'type' column in trophies table
                // For simplified display, we often put 'France' or 'Europe' there
                let categoryType = 'France';
                if (trophyType === 'international_cup') categoryType = 'Europe';

                db.run("INSERT INTO trophies (name, type) VALUES (?, ?)", [record.trophy, categoryType]);
                trophyId = db.exec("SELECT last_insert_rowid()")[0].values[0][0];
            }

            // 5. Get or Create Season
            let seasonId;
            // Clean season format (e.g. "1995-96" -> "1995/1996" or just use label)
            let seasonLabel = record.season.replace('–', '/');
            // If format is like 1995-96, make it 1995/1996 if possible, or leave as is.
            // Simple expansion: 1995-96 -> 1995/1996
            if (seasonLabel.match(/^\d{4}.\d{2}$/)) {
                // e.g. 1995/96
                const parts = seasonLabel.split(/[/-]/); // split by / or -
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
                db.run("INSERT OR IGNORE INTO team_trophies (team_id, trophy_id, season_id, place) VALUES (?, ?, ?, ?)", [team.id, trophyId, seasonId, 1]); // Place 1 for winner
                if (db.getRowsModified() > 0) addedCount++;
                else skippedCount++; // duplicate
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

importFrenchTrophies();
