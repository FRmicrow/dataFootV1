
import initSqlJs from 'sql.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync, writeFileSync } from 'fs';
import { CLUB_MAPPINGS } from '../src/utils/clubMappings.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const dbPath = join(__dirname, '..', 'database.sqlite');

const PORTUGUESE_TROPHIES = [
    // Benfica
    { team: 'Benfica', trophy: 'Primeira Liga', season: '1935–36' },
    { team: 'Benfica', trophy: 'Primeira Liga', season: '1936–37' },
    { team: 'Benfica', trophy: 'Primeira Liga', season: '1937–38' },
    { team: 'Benfica', trophy: 'Primeira Liga', season: '1941–42' },
    { team: 'Benfica', trophy: 'Primeira Liga', season: '1942–43' },
    { team: 'Benfica', trophy: 'Primeira Liga', season: '1944–45' },
    { team: 'Benfica', trophy: 'Primeira Liga', season: '1949–50' },
    { team: 'Benfica', trophy: 'Primeira Liga', season: '1954–55' },
    { team: 'Benfica', trophy: 'Primeira Liga', season: '1956–57' },
    { team: 'Benfica', trophy: 'Primeira Liga', season: '1959–60' },
    { team: 'Benfica', trophy: 'Primeira Liga', season: '1960–61' },
    { team: 'Benfica', trophy: 'Primeira Liga', season: '1962–63' },
    { team: 'Benfica', trophy: 'Primeira Liga', season: '1963–64' },
    { team: 'Benfica', trophy: 'Primeira Liga', season: '1964–65' },
    { team: 'Benfica', trophy: 'Primeira Liga', season: '1966–67' },
    { team: 'Benfica', trophy: 'Primeira Liga', season: '1967–68' },
    { team: 'Benfica', trophy: 'Primeira Liga', season: '1968–69' },
    { team: 'Benfica', trophy: 'Primeira Liga', season: '1970–71' },
    { team: 'Benfica', trophy: 'Primeira Liga', season: '1971–72' },
    { team: 'Benfica', trophy: 'Primeira Liga', season: '1972–73' },
    { team: 'Benfica', trophy: 'Primeira Liga', season: '1974–75' },
    { team: 'Benfica', trophy: 'Primeira Liga', season: '1975–76' },
    { team: 'Benfica', trophy: 'Primeira Liga', season: '1976–77' },
    { team: 'Benfica', trophy: 'Primeira Liga', season: '1980–81' },
    { team: 'Benfica', trophy: 'Primeira Liga', season: '1982–83' },
    { team: 'Benfica', trophy: 'Primeira Liga', season: '1983–84' },
    { team: 'Benfica', trophy: 'Primeira Liga', season: '1986–87' },
    { team: 'Benfica', trophy: 'Primeira Liga', season: '1988–89' },
    { team: 'Benfica', trophy: 'Primeira Liga', season: '1990–91' },
    { team: 'Benfica', trophy: 'Primeira Liga', season: '1993–94' },
    { team: 'Benfica', trophy: 'Primeira Liga', season: '2004–05' },
    { team: 'Benfica', trophy: 'Primeira Liga', season: '2009–10' },
    { team: 'Benfica', trophy: 'Primeira Liga', season: '2013–14' },
    { team: 'Benfica', trophy: 'Primeira Liga', season: '2014–15' },
    { team: 'Benfica', trophy: 'Primeira Liga', season: '2015–16' },
    { team: 'Benfica', trophy: 'Primeira Liga', season: '2016–17' },
    { team: 'Benfica', trophy: 'Primeira Liga', season: '2018–19' },
    { team: 'Benfica', trophy: 'Taça de Portugal', season: '1939–40' },
    { team: 'Benfica', trophy: 'Taça de Portugal', season: '1942–43' },
    { team: 'Benfica', trophy: 'Taça de Portugal', season: '1943–44' },
    { team: 'Benfica', trophy: 'Taça de Portugal', season: '1948–49' },
    { team: 'Benfica', trophy: 'Taça de Portugal', season: '1950–51' },
    { team: 'Benfica', trophy: 'Taça de Portugal', season: '1951–52' },
    { team: 'Benfica', trophy: 'Taça de Portugal', season: '1952–53' },
    { team: 'Benfica', trophy: 'Taça de Portugal', season: '1954–55' },
    { team: 'Benfica', trophy: 'Taça de Portugal', season: '1956–57' },
    { team: 'Benfica', trophy: 'Taça de Portugal', season: '1958–59' },
    { team: 'Benfica', trophy: 'Taça de Portugal', season: '1961–62' },
    { team: 'Benfica', trophy: 'Taça de Portugal', season: '1963–64' },
    { team: 'Benfica', trophy: 'Taça de Portugal', season: '1968–69' },
    { team: 'Benfica', trophy: 'Taça de Portugal', season: '1969–70' },
    { team: 'Benfica', trophy: 'Taça de Portugal', season: '1971–72' },
    { team: 'Benfica', trophy: 'Taça de Portugal', season: '1979–80' },
    { team: 'Benfica', trophy: 'Taça de Portugal', season: '1980–81' },
    { team: 'Benfica', trophy: 'Taça de Portugal', season: '1982–83' },
    { team: 'Benfica', trophy: 'Taça de Portugal', season: '1984–85' },
    { team: 'Benfica', trophy: 'Taça de Portugal', season: '1985–86' },
    { team: 'Benfica', trophy: 'Taça de Portugal', season: '1986–87' },
    { team: 'Benfica', trophy: 'Taça de Portugal', season: '1992–93' },
    { team: 'Benfica', trophy: 'Taça de Portugal', season: '1995–96' },
    { team: 'Benfica', trophy: 'Taça de Portugal', season: '2003–04' },
    { team: 'Benfica', trophy: 'Taça de Portugal', season: '2013–14' },
    { team: 'Benfica', trophy: 'Taça de Portugal', season: '2016–17' },
    { team: 'Benfica', trophy: 'Supertaça Cândido de Oliveira', season: '1980' },
    { team: 'Benfica', trophy: 'Supertaça Cândido de Oliveira', season: '1985' },
    { team: 'Benfica', trophy: 'Supertaça Cândido de Oliveira', season: '1989' },
    { team: 'Benfica', trophy: 'Supertaça Cândido de Oliveira', season: '2005' },
    { team: 'Benfica', trophy: 'Supertaça Cândido de Oliveira', season: '2014' },
    { team: 'Benfica', trophy: 'Supertaça Cândido de Oliveira', season: '2016' },
    { team: 'Benfica', trophy: 'Champions League', season: '1960–61' },
    { team: 'Benfica', trophy: 'Champions League', season: '1961–62' },

    // FC Porto
    { team: 'FC Porto', trophy: 'Primeira Liga', season: '1934–35' },
    { team: 'FC Porto', trophy: 'Primeira Liga', season: '1938–39' },
    { team: 'FC Porto', trophy: 'Primeira Liga', season: '1955–56' },
    { team: 'FC Porto', trophy: 'Primeira Liga', season: '1958–59' },
    { team: 'FC Porto', trophy: 'Primeira Liga', season: '1959–60' },
    { team: 'FC Porto', trophy: 'Primeira Liga', season: '1977–78' },
    { team: 'FC Porto', trophy: 'Primeira Liga', season: '1978–79' },
    { team: 'FC Porto', trophy: 'Primeira Liga', season: '1984–85' },
    { team: 'FC Porto', trophy: 'Primeira Liga', season: '1985–86' },
    { team: 'FC Porto', trophy: 'Primeira Liga', season: '1987–88' },
    { team: 'FC Porto', trophy: 'Primeira Liga', season: '1989–90' },
    { team: 'FC Porto', trophy: 'Primeira Liga', season: '1991–92' },
    { team: 'FC Porto', trophy: 'Primeira Liga', season: '1992–93' },
    { team: 'FC Porto', trophy: 'Primeira Liga', season: '1994–95' },
    { team: 'FC Porto', trophy: 'Primeira Liga', season: '1995–96' },
    { team: 'FC Porto', trophy: 'Primeira Liga', season: '1996–97' },
    { team: 'FC Porto', trophy: 'Primeira Liga', season: '1997–98' },
    { team: 'FC Porto', trophy: 'Primeira Liga', season: '1998–99' },
    { team: 'FC Porto', trophy: 'Primeira Liga', season: '2002–03' },
    { team: 'FC Porto', trophy: 'Primeira Liga', season: '2003–04' },
    { team: 'FC Porto', trophy: 'Primeira Liga', season: '2005–06' },
    { team: 'FC Porto', trophy: 'Primeira Liga', season: '2006–07' },
    { team: 'FC Porto', trophy: 'Primeira Liga', season: '2007–08' },
    { team: 'FC Porto', trophy: 'Primeira Liga', season: '2008–09' },
    { team: 'FC Porto', trophy: 'Primeira Liga', season: '2010–11' },
    { team: 'FC Porto', trophy: 'Primeira Liga', season: '2011–12' },
    { team: 'FC Porto', trophy: 'Primeira Liga', season: '2012–13' },
    { team: 'FC Porto', trophy: 'Primeira Liga', season: '2017–18' },
    { team: 'FC Porto', trophy: 'Primeira Liga', season: '2019–20' },
    { team: 'FC Porto', trophy: 'Taça de Portugal', season: '1955–56' },
    { team: 'FC Porto', trophy: 'Taça de Portugal', season: '1957–58' },
    { team: 'FC Porto', trophy: 'Taça de Portugal', season: '1967–68' },
    { team: 'FC Porto', trophy: 'Taça de Portugal', season: '1976–77' },
    { team: 'FC Porto', trophy: 'Taça de Portugal', season: '1983–84' },
    { team: 'FC Porto', trophy: 'Taça de Portugal', season: '1987–88' },
    { team: 'FC Porto', trophy: 'Taça de Portugal', season: '1990–91' },
    { team: 'FC Porto', trophy: 'Taça de Portugal', season: '1993–94' },
    { team: 'FC Porto', trophy: 'Taça de Portugal', season: '1997–98' },
    { team: 'FC Porto', trophy: 'Taça de Portugal', season: '1999–2000' },
    { team: 'FC Porto', trophy: 'Taça de Portugal', season: '2002–03' },
    { team: 'FC Porto', trophy: 'Taça de Portugal', season: '2005–06' },
    { team: 'FC Porto', trophy: 'Taça de Portugal', season: '2008–09' },
    { team: 'FC Porto', trophy: 'Taça de Portugal', season: '2009–10' },
    { team: 'FC Porto', trophy: 'Taça de Portugal', season: '2010–11' },
    { team: 'FC Porto', trophy: 'Taça de Portugal', season: '2019–20' },
    { team: 'FC Porto', trophy: 'Supertaça Cândido de Oliveira', season: '1981' },
    { team: 'FC Porto', trophy: 'Supertaça Cândido de Oliveira', season: '1983' },
    { team: 'FC Porto', trophy: 'Supertaça Cândido de Oliveira', season: '1984' },
    { team: 'FC Porto', trophy: 'Supertaça Cândido de Oliveira', season: '1986' },
    { team: 'FC Porto', trophy: 'Supertaça Cândido de Oliveira', season: '1990' },
    { team: 'FC Porto', trophy: 'Supertaça Cândido de Oliveira', season: '1991' },
    { team: 'FC Porto', trophy: 'Supertaça Cândido de Oliveira', season: '1993' },
    { team: 'FC Porto', trophy: 'Supertaça Cândido de Oliveira', season: '1994' },
    { team: 'FC Porto', trophy: 'Supertaça Cândido de Oliveira', season: '1996' },
    { team: 'FC Porto', trophy: 'Supertaça Cândido de Oliveira', season: '1998' },
    { team: 'FC Porto', trophy: 'Supertaça Cândido de Oliveira', season: '1999' },
    { team: 'FC Porto', trophy: 'Supertaça Cândido de Oliveira', season: '2001' },
    { team: 'FC Porto', trophy: 'Supertaça Cândido de Oliveira', season: '2003' },
    { team: 'FC Porto', trophy: 'Supertaça Cândido de Oliveira', season: '2004' },
    { team: 'FC Porto', trophy: 'Supertaça Cândido de Oliveira', season: '2006' },
    { team: 'FC Porto', trophy: 'Supertaça Cândido de Oliveira', season: '2009' },
    { team: 'FC Porto', trophy: 'Supertaça Cândido de Oliveira', season: '2010' },
    { team: 'FC Porto', trophy: 'Supertaça Cândido de Oliveira', season: '2011' },
    { team: 'FC Porto', trophy: 'Supertaça Cândido de Oliveira', season: '2012' },
    { team: 'FC Porto', trophy: 'Supertaça Cândido de Oliveira', season: '2013' },
    { team: 'FC Porto', trophy: 'Supertaça Cândido de Oliveira', season: '2018' },
    { team: 'FC Porto', trophy: 'Supertaça Cândido de Oliveira', season: '2020' },
    { team: 'FC Porto', trophy: 'Champions League', season: '1986–87' },
    { team: 'FC Porto', trophy: 'Champions League', season: '2003–04' },
    { team: 'FC Porto', trophy: 'UEFA Cup', season: '2002–03' },
    { team: 'FC Porto', trophy: 'Intercontinental Cup', season: '1987' },
    { team: 'FC Porto', trophy: 'Intercontinental Cup', season: '2004' },

    // Sporting CP
    { team: 'Sporting CP', trophy: 'Primeira Liga', season: '1940–41' },
    { team: 'Sporting CP', trophy: 'Primeira Liga', season: '1943–44' },
    { team: 'Sporting CP', trophy: 'Primeira Liga', season: '1946–47' },
    { team: 'Sporting CP', trophy: 'Primeira Liga', season: '1947–48' },
    { team: 'Sporting CP', trophy: 'Primeira Liga', season: '1948–49' },
    { team: 'Sporting CP', trophy: 'Primeira Liga', season: '1950–51' },
    { team: 'Sporting CP', trophy: 'Primeira Liga', season: '1951–52' },
    { team: 'Sporting CP', trophy: 'Primeira Liga', season: '1952–53' },
    { team: 'Sporting CP', trophy: 'Primeira Liga', season: '1953–54' },
    { team: 'Sporting CP', trophy: 'Primeira Liga', season: '1957–58' },
    { team: 'Sporting CP', trophy: 'Primeira Liga', season: '1958–59' },
    { team: 'Sporting CP', trophy: 'Primeira Liga', season: '1961–62' },
    { team: 'Sporting CP', trophy: 'Primeira Liga', season: '1965–66' },
    { team: 'Sporting CP', trophy: 'Primeira Liga', season: '1969–70' },
    { team: 'Sporting CP', trophy: 'Primeira Liga', season: '1973–74' },
    { team: 'Sporting CP', trophy: 'Primeira Liga', season: '1979–80' },
    { team: 'Sporting CP', trophy: 'Primeira Liga', season: '1981–82' },
    { team: 'Sporting CP', trophy: 'Primeira Liga', season: '1999–2000' },
    { team: 'Sporting CP', trophy: 'Primeira Liga', season: '2001–02' },
    { team: 'Sporting CP', trophy: 'Primeira Liga', season: '2020–21' },
    { team: 'Sporting CP', trophy: 'Taça de Portugal', season: '1940–41' },
    { team: 'Sporting CP', trophy: 'Taça de Portugal', season: '1944–45' },
    { team: 'Sporting CP', trophy: 'Taça de Portugal', season: '1945–46' },
    { team: 'Sporting CP', trophy: 'Taça de Portugal', season: '1947–48' },
    { team: 'Sporting CP', trophy: 'Taça de Portugal', season: '1953–54' },
    { team: 'Sporting CP', trophy: 'Taça de Portugal', season: '1962–63' },
    { team: 'Sporting CP', trophy: 'Taça de Portugal', season: '1970–71' },
    { team: 'Sporting CP', trophy: 'Taça de Portugal', season: '1973–74' },
    { team: 'Sporting CP', trophy: 'Taça de Portugal', season: '1977–78' },
    { team: 'Sporting CP', trophy: 'Taça de Portugal', season: '1981–82' },
    { team: 'Sporting CP', trophy: 'Taça de Portugal', season: '1994–95' },
    { team: 'Sporting CP', trophy: 'Taça de Portugal', season: '2001–02' },
    { team: 'Sporting CP', trophy: 'Taça de Portugal', season: '2006–07' },
    { team: 'Sporting CP', trophy: 'Taça de Portugal', season: '2007–08' },
    { team: 'Sporting CP', trophy: 'Supertaça Cândido de Oliveira', season: '1982' },
    { team: 'Sporting CP', trophy: 'Supertaça Cândido de Oliveira', season: '1995' },
    { team: 'Sporting CP', trophy: 'Supertaça Cândido de Oliveira', season: '2000' },
    { team: 'Sporting CP', trophy: 'Supertaça Cândido de Oliveira', season: '2002' },
    { team: 'Sporting CP', trophy: 'Supertaça Cândido de Oliveira', season: '2007' },
    { team: 'Sporting CP', trophy: 'Supertaça Cândido de Oliveira', season: '2008' },
    { team: 'Sporting CP', trophy: 'Cup Winners Cup', season: '1963–64' },

    // SC Braga
    { team: 'SC Braga', trophy: 'Taça de Portugal', season: '1965–66' },
    { team: 'SC Braga', trophy: 'Taça de Portugal', season: '2015–16' },
    { team: 'SC Braga', trophy: 'Taça da Liga', season: '2012–13' },
    { team: 'SC Braga', trophy: 'Taça da Liga', season: '2019–20' },
    { team: 'SC Braga', trophy: 'Supertaça Cândido de Oliveira', season: '1982' },
    { team: 'SC Braga', trophy: 'Supertaça Cândido de Oliveira', season: '2020' },

    // Boavista FC
    { team: 'Boavista FC', trophy: 'Primeira Liga', season: '2000–01' },
    { team: 'Boavista FC', trophy: 'Taça de Portugal', season: '1974–75' },
    { team: 'Boavista FC', trophy: 'Taça de Portugal', season: '1975–76' },
    { team: 'Boavista FC', trophy: 'Taça de Portugal', season: '1978–79' },
    { team: 'Boavista FC', trophy: 'Taça de Portugal', season: '1991–92' },
    { team: 'Boavista FC', trophy: 'Taça de Portugal', season: '1996–97' },
    { team: 'Boavista FC', trophy: 'Supertaça Cândido de Oliveira', season: '1979' },
    { team: 'Boavista FC', trophy: 'Supertaça Cândido de Oliveira', season: '1992' },
    { team: 'Boavista FC', trophy: 'Supertaça Cândido de Oliveira', season: '1997' },

    // Maritimo
    { team: 'Marítimo', trophy: 'Taça da Madeira', season: '1927–28' },
    { team: 'Marítimo', trophy: 'Taça da Madeira', season: '1928–29' },
    { team: 'Marítimo', trophy: 'Taça da Madeira', season: '1929–30' },
    { team: 'Marítimo', trophy: 'Taça da Madeira', season: '1930–31' },
    { team: 'Marítimo', trophy: 'Taça da Madeira', season: '1931–32' },
    { team: 'Marítimo', trophy: 'Taça da Madeira', season: '1932–33' },
    { team: 'Marítimo', trophy: 'Taça da Madeira', season: '1933–34' },
    { team: 'Marítimo', trophy: 'Taça da Madeira', season: '1934–35' },

    // Vitória SC
    { team: 'Vitória SC', trophy: 'Taça de Portugal', season: '1948–49' },
    { team: 'Vitória SC', trophy: 'Taça de Portugal', season: '1962–63' },
    { team: 'Vitória SC', trophy: 'Supertaça Cândido de Oliveira', season: '1988' },

    // Vitória FC
    { team: 'Vitória FC', trophy: 'Taça de Portugal', season: '1964–65' },
    { team: 'Vitória FC', trophy: 'Taça de Portugal', season: '1966–67' },
    { team: 'Vitória FC', trophy: 'Taça de Portugal', season: '2004–05' },
    { team: 'Vitória FC', trophy: 'Supertaça Cândido de Oliveira', season: '1967' },

    // Santa Clara
    { team: 'Santa Clara', trophy: 'Liga Portugal 2', season: '1998–99' },

    // Gil Vicente
    { team: 'Gil Vicente', trophy: 'Liga Portugal 2', season: '1998–99' },
    { team: 'Gil Vicente', trophy: 'Taça de Portugal', season: '1964–65' }, // Finalist

    // Estoril Praia
    { team: 'Estoril Praia', trophy: 'Liga Portugal 2', season: '1946–47' },
    { team: 'Estoril Praia', trophy: 'Liga Portugal 2', season: '1990–91' },

    // Moreirense
    { team: 'Moreirense', trophy: 'Liga Portugal 2', season: '2013–14' },
    { team: 'Moreirense', trophy: 'Taça da Liga', season: '2016–17' },

    // Portimonense
    { team: 'Portimonense', trophy: 'Liga Portugal 2', season: '1978–79' },

    // Paços de Ferreira
    { team: 'Paços de Ferreira', trophy: 'Liga Portugal 2', season: '1990–91' },
    { team: 'Paços de Ferreira', trophy: 'Liga Portugal 2', season: '1997–98' },

    // Famalicão
    { team: 'Famalicão', trophy: 'Liga Portugal 2', season: '1959–60' },
];

async function importPortugueseTrophies() {
    const SQL = await initSqlJs();
    const buffer = readFileSync(dbPath);
    const db = new SQL.Database(buffer);

    try {
        db.exec("BEGIN TRANSACTION");
        console.log("🏆 Starting Portuguese Trophies Import...");

        let addedCount = 0;
        let skippedCount = 0;

        for (const record of PORTUGUESE_TROPHIES) {
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
            let trophyType = 'Portugal';
            if (record.trophy.includes('Primeira Liga') || record.trophy.includes('Liga Portugal 2') || record.trophy.includes('Segunda Divisão')) {
                trophyType = 'championship';
            }
            if (record.trophy.includes('Taça de Portugal') || record.trophy.includes('Taça da Liga') || record.trophy.includes('Supertaça')) {
                trophyType = 'national_cup';
            }
            if (record.trophy.includes('Champions League') || record.trophy.includes('UEFA Cup') || record.trophy.includes('Cup Winners')) {
                trophyType = 'international_cup';
            }
            if (record.trophy.includes('Intercontinental')) {
                trophyType = 'international_cup';
            }

            // 4. Get or Create Trophy
            let trophyId;
            const trophyRes = db.exec("SELECT id FROM trophies WHERE name = ?", [record.trophy]);
            if (trophyRes.length > 0) {
                trophyId = trophyRes[0].values[0][0];
            } else {
                let categoryType = 'Portugal';
                if (trophyType === 'international_cup') {
                    if (record.trophy.includes('Intercontinental')) {
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
                // Place 1 for winner
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

importPortugueseTrophies();
