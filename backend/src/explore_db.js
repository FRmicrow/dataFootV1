
import pkg from 'pg';
const { Client } = pkg;
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });
  await client.connect();

  try {
    console.log("Sample TM Competitions:");
    const res = await client.query(`SELECT source_id FROM v4.mapping_competitions WHERE source = 'transfermarkt' LIMIT 5`);
    console.log(res.rows);

    console.log("Sample TM Teams:");
    const res2 = await client.query(`SELECT source_id FROM v4.mapping_teams WHERE source = 'transfermarkt' LIMIT 5`);
    console.log(res2.rows);

  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

run();
