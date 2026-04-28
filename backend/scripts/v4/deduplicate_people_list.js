
import db from '../../src/config/database.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import logger from '../../src/utils/logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../../.env') });

const NAMES_LIST = [
    "Joël Muller", "Theo Vonk", "Steve Staunton", "Jan van Dijk", "Mohamed Farouk", "Joachim Löw", "Slavoljub Muslin", "Charles Mbabazi", "Dejan Dimitrijevic", "Dietmar Constantini", "Raymond Domenech", "Chaabane Merzekane", "Peter Kobel", "Slavisa Stojanovic", "Marek Petrus", "Ruslan Agalarov", "Jetsada Jitsawad", "Vladimir Vesely", "Tim Clancy", "Tita", "Matthew Taylor", "Ricardo Gomes", "Mohamed Adel", "Ivan Jovanovic", "Ricardinho", "Tarantini", "Zlatomir Zagorcic", "David Jones", "Eusebio", "Joãozinho", "José Luis Soto", "Chris Greenacre", "Károly Palotai", "João Alves", "Zoran Brkovic", "Poli", "Germano", "Luis López", "Luisinho", "Francisco Ramírez", "Georges Leekens", "Veljko Paunovic", "Gary Smith", "Cícero", "Luc Nijholt", "Blagoja Milevski", "Mirandinha", "Fajardo", "Luizão", "Danilo", "José González", "Kevin Morrison", "Franco Pedroni", "Rafael", "Vítor Pereira", "Paulo Duarte", "Óscar Valdez", "Jorge Silva", "Mark Hughes", "Giannis Papadopoulos", "Kevin Keegan", "Johan Cruyff", "Wojciech Rudy", "Ivan Novak", "Zinho", "Pepa", "Fabrício", "Juanito", "John Robertson", "Jon Dahl Tomasson", "Niall Quinn", "Peter Larsson", "Cristian Ledesma", "Valentin Ivanov", "István Vad", "Gustavo Méndez", "Lajos Németh", "Cosmin Olăroiu", "João Paulo", "Wim van der Gijp", "Manuel Fernandes", "Everson", "Matías Rodríguez", "Urs Meier", "Georg Stollenwerk", "Evaristo de Macedo", "Ismail", "Kata", "Christian Gómez", "Paulo Sérgio", "Serginho Chulapa", "João Pedro", "Zé Maria", "Fernando Lopes", "Maurício", "Erick Andino", "Hassan Ashjari", "Castanheira", "Nandinho", "Winfried Schäfer", "Lúcio", "Sergey Kuznetsov", "José Guerra", "Rachid Mekhloufi", "Hideto Suzuki", "Jimmy Kastrup", "João Ferreira", "Cosmin Bodea", "Brandão", "Dong-jin Kim", "Daniel Carreño", "Joachim Müller", "Paulo Gomes", "Joey O'Brien", "Paul Williams", "Pierre Lechantre", "Luigi Allemandi", "Giorgi Chikhradze", "Gennaro Gattuso", "Tae-young Kim", "Sekou Keita", "Mazinho", "Pedro Miguel", "John Jensen", "Jair Pereira", "Ibrahim Salah", "John Caulfield", "Juan Carlos", "Christophe Revault", "Danny Wilson", "Toni", "Danny David", "João Mário", "Paulo Costa", "Thorodd Presberg", "David Smith", "Paulão", "Dudu", "Neri", "Sergey Ivanov", "Hélio", "Hansruedi Fuhrer", "Caló", "Zequinha", "Vladimir Kovacevic", "Peter Jones", "John Hill", "Richard Chaplow", "Marcelo Oliveira", "Óscar Cortés", "Daniel Sanchez", "Chris Coleman", "Luis de la Fuente", "Kevin Miller", "Gheorghe Constantin", "Verza", "Ryszard Wójcik", "Stephen Kelly", "Dimitar Dimitrov", "Iván Guerrero", "József Bozsik", "Luis Teixeira", "Didi", "Fábio", "Kléber", "William Batista", "Chris Williams", "Derek Decamps", "Serginho", "Ricardo Campos", "Francisco Silva", "Vavá", "Michael O'Connor", "Rogério", "Goran Milojevic", "Aykhan Abbasov", "Leão", "Greg Strong", "Esteban García", "Ricardo Silva", "Schürrle", "Tommy Taylor", "José Moreno", "Jim Weir", "Luis Ramos", "Tibor Balog", "Sepp Piontek", "Bruno"
];

const COLUMNS_TO_MERGE = [
    'photo_url', 'source_tm_id', 'source_url', 'birth_date', 'birth_place', 
    'birth_country', 'height', 'nationality_1', 'nationality_2', 'nationality_3', 
    'nationality_4', 'main_position', 'preferred_foot', 'original_name', 
    'first_name', 'last_name'
];

async function main() {
    try {
        await db.init();
        logger.info('🧹 Starting OPTIMIZED Targeted People De-duplication...');

        const losersToWinners = [];

        for (const name of NAMES_LIST) {
            const people = await db.all('SELECT * FROM v4.people WHERE full_name = ?', [name]);
            if (people.length <= 1) continue;

            const byType = {};
            people.forEach(p => {
                if (!byType[p.person_type]) byType[p.person_type] = [];
                byType[p.person_type].push(p);
            });

            // 1. Merge same types
            for (const type in byType) {
                const sameTypePeople = byType[type];
                if (sameTypePeople.length > 1) {
                    sameTypePeople.sort((a, b) => {
                        const countA = COLUMNS_TO_MERGE.filter(col => a[col] && a[col] !== '').length;
                        const countB = COLUMNS_TO_MERGE.filter(col => b[col] && b[col] !== '').length;
                        if (countA !== countB) return countB - countA;
                        return a.person_id - b.person_id;
                    });

                    const winner = sameTypePeople[0];
                    const losers = sameTypePeople.slice(1);

                    for (const loser of losers) {
                        for (const col of COLUMNS_TO_MERGE) {
                            if ((!winner[col] || winner[col] === '') && loser[col] && loser[col] !== '') {
                                winner[col] = loser[col];
                            }
                        }
                        losersToWinners.push({ loser_id: loser.person_id, winner_id: winner.person_id });
                    }

                    const setClause = COLUMNS_TO_MERGE.map(col => `${col} = ?`).join(', ');
                    const values = COLUMNS_TO_MERGE.map(col => winner[col]);
                    await db.run(`UPDATE v4.people SET ${setClause} WHERE person_id = ?`, [...values, winner.person_id]);
                }
            }

            // 2. Cross-enrich different types
            const types = Object.keys(byType);
            if (types.length > 1) {
                for (let i = 0; i < types.length; i++) {
                    for (let j = i + 1; j < types.length; j++) {
                        const p1 = byType[types[i]][0];
                        const p2 = byType[types[j]][0];
                        let p1Updated = false;
                        let p2Updated = false;
                        for (const col of COLUMNS_TO_MERGE) {
                            if ((!p1[col] || p1[col] === '') && p2[col] && p2[col] !== '') {
                                p1[col] = p2[col];
                                p1Updated = true;
                            }
                            if ((!p2[col] || p2[col] === '') && p1[col] && p1[col] !== '') {
                                p2[col] = p1[col];
                                p2Updated = true;
                            }
                        }
                        if (p1Updated) {
                            const setClause = COLUMNS_TO_MERGE.map(col => `${col} = ?`).join(', ');
                            const values = COLUMNS_TO_MERGE.map(col => p1[col]);
                            await db.run(`UPDATE v4.people SET ${setClause} WHERE person_id = ?`, [...values, p1.person_id]);
                        }
                        if (p2Updated) {
                            const setClause = COLUMNS_TO_MERGE.map(col => `${col} = ?`).join(', ');
                            const values = COLUMNS_TO_MERGE.map(col => p2[col]);
                            await db.run(`UPDATE v4.people SET ${setClause} WHERE person_id = ?`, [...values, p2.person_id]);
                        }
                    }
                }
            }
        }

        if (losersToWinners.length > 0) {
            logger.info({ count: losersToWinners.length }, 'Batch redirecting references...');

            // Create temp mapping table for fast updates
            await db.run(`DROP TABLE IF EXISTS tmp_people_dedup`);
            await db.run(`CREATE TABLE tmp_people_dedup (loser_id BIGINT PRIMARY KEY, winner_id BIGINT)`);
            
            // Insert in chunks to avoid large query string
            const CHUNK_SIZE = 50;
            for (let i = 0; i < losersToWinners.length; i += CHUNK_SIZE) {
                const chunk = losersToWinners.slice(i, i + CHUNK_SIZE);
                const placeholders = chunk.map(() => '(?, ?)').join(', ');
                const values = chunk.flatMap(l => [l.loser_id, l.winner_id]);
                await db.run(`INSERT INTO tmp_people_dedup (loser_id, winner_id) VALUES ${placeholders}`, values);
            }

            // Perform batch updates
            await db.run(`
                UPDATE v4.matches m
                SET referee_person_id = t.winner_id
                FROM tmp_people_dedup t
                WHERE m.referee_person_id = t.loser_id
            `);
            logger.info('✅ Matches (Referees) redirected.');

            await db.run(`
                UPDATE v4.match_lineups l
                SET player_id = t.winner_id
                FROM tmp_people_dedup t
                WHERE l.player_id = t.loser_id
            `);
            logger.info('✅ Match Lineups redirected.');

            await db.run(`
                UPDATE v4.match_events e
                SET player_id = t.winner_id
                FROM tmp_people_dedup t
                WHERE e.player_id = t.loser_id
            `);
            await db.run(`
                UPDATE v4.match_events e
                SET related_player_id = t.winner_id
                FROM tmp_people_dedup t
                WHERE e.related_player_id = t.loser_id
            `);
            logger.info('✅ Match Events redirected.');

            await db.run(`
                UPDATE v4.player_season_xg x
                SET person_id = t.winner_id
                FROM tmp_people_dedup t
                WHERE x.person_id = t.loser_id
            `);
            logger.info('✅ Player Season xG redirected.');

            logger.info('Deleting duplicates...');
            await db.run(`
                DELETE FROM v4.people
                WHERE person_id IN (SELECT loser_id FROM tmp_people_dedup)
            `);
            
            await db.run(`DROP TABLE tmp_people_dedup`);
        }

        logger.info('🎉 OPTIMIZED TARGETED DE-DUPLICATION COMPLETE');
        process.exit(0);
    } catch (err) {
        logger.error(err);
        process.exit(1);
    }
}

main();
