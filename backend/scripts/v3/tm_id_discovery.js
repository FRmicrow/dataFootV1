import 'dotenv/config';
import axios from 'axios';
import db from '../../src/config/database.js';
import logger from '../../src/utils/logger.js';
import { resolveTeamId } from './team_resolver.js';

const log = logger.child({ script: 'tm_id_discovery' });

const ACCOUNT_ID = process.env.CF_ACCOUNT_ID;
const API_TOKEN = process.env.CF_API_TOKEN;

if (!ACCOUNT_ID || !API_TOKEN) {
    console.log('Error: CF_ACCOUNT_ID and CF_API_TOKEN must be set in .env');
    process.exit(1);
}

const LEAGUE_MAP = {
    1: { name: 'ligue-1', code: 'FR1', country: 'France' },
    15: { name: 'serie-a', code: 'IT1', country: 'Italy' }
};

const getArg = (name) => {
    const idx = process.argv.indexOf(name);
    return idx !== -1 ? process.argv[idx + 1] : null;
};

const LEAGUE_ID = parseInt(getArg('--league'));
const SEASON_YEAR = parseInt(getArg('--season'));

if (!LEAGUE_ID || !SEASON_YEAR) {
    console.log('Usage: node tm_id_discovery.js --league <id> --season <year>');
    process.exit(1);
}

const config = LEAGUE_MAP[LEAGUE_ID];
if (!config) {
    log.error(`League ID ${LEAGUE_ID} not mapped for discovery`);
    process.exit(1);
}

async function discover() {
    try {
        await db.init();
        const url = `https://www.transfermarkt.fr/${config.name}/spieltag/wettbewerb/${config.code}/plus/0?saison_id=${SEASON_YEAR}`;
        log.info({ url }, 'Initiating Cloudflare Crawl for match IDs');

        const cfUrl = `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/browser-rendering/crawl`;
        const crawlResponse = await axios.post(cfUrl, {
            url: url,
            render: true
        }, {
            headers: { 'Authorization': `Bearer ${API_TOKEN}`, 'Content-Type': 'application/json' }
        });

        if (!crawlResponse.data.success) throw new Error('Cloudflare crawl failed to start');
        
        const jobId = crawlResponse.data.result.jobId;
        log.info({ jobId }, 'Crawl job started. Polling for results...');

        let results = null;
        while (true) {
            const poll = await axios.get(`${cfUrl}/${jobId}`, {
                headers: { 'Authorization': `Bearer ${API_TOKEN}` }
            });
            if (poll.data.result.status === 'complete') {
                results = poll.data.result;
                break;
            } else if (poll.data.result.status === 'failed') {
                throw new Error('Cloudflare crawl job failed');
            }
            log.info('Crawl in progress...');
            await new Promise(resolve => setTimeout(resolve, 5000));
        }

        const html = results.response_body;
        // Simple regex to find /spielbericht/index/spielbericht/XXXXXX
        const matchIds = [...html.matchAll(/\/spielbericht\/index\/spielbericht\/(\d+)/g)].map(m => m[1]);
        const uniqueIds = [...new Set(matchIds)];

        log.info({ count: uniqueIds.length }, 'Discovered match IDs');

        // Logic to match these IDs with DB fixtures and update 'tm_match_id'
        log.info('Discovery script ready. Match-to-DB mapping logic to be completed upon verification of ID list.');
        console.log(JSON.stringify(uniqueIds));

    } catch (error) {
        log.error({ err: error.message }, 'Discovery failed');
    } finally {
        process.exit();
    }
}

discover();
