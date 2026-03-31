import 'dotenv/config';
import axios from 'axios';
import fs from 'node:fs';
import path from 'node:path';
import logger from '../../src/utils/logger.js';

const log = logger.child({ script: 'tm_detail_scraper' });

const ACCOUNT_ID = process.env.CF_ACCOUNT_ID;
const API_TOKEN = process.env.CF_API_TOKEN;

if (!ACCOUNT_ID || !API_TOKEN) {
    console.log('Error: CF_ACCOUNT_ID and CF_API_TOKEN must be set in .env');
    process.exit(1);
}

const getArg = (name) => {
    const idx = process.argv.indexOf(name);
    return idx !== -1 ? process.argv[idx + 1] : null;
};

const MATCH_ID = getArg('--id');
const OUTPUT_DIR = getArg('--out') || './externalData/ExtractionTodo/';

if (!MATCH_ID) {
    console.log('Usage: node tm_detail_scraper.js --id <match_id> [--out <dir>]');
    process.exit(1);
}

async function scrapeDetail() {
    try {
        const url = `https://www.transfermarkt.fr/spielbericht/index/spielbericht/${MATCH_ID}`;
        log.info({ url }, 'Initiating Cloudflare Crawl for match details');

        const cfUrl = `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/browser-rendering/crawl`;
        
        // Use a more complex crawl request with rendering enabled for coordinates
        const crawlResponse = await axios.post(cfUrl, {
            url: url,
            render: true,
            format: 'html'
        }, {
            headers: { 'Authorization': `Bearer ${API_TOKEN}`, 'Content-Type': 'application/json' }
        });

        if (!crawlResponse.data.success) throw new Error('Cloudflare crawl failed to start');
        
        const jobId = crawlResponse.data.result.jobId;
        log.info({ jobId }, 'Crawl job started. Polling...');

        let html = null;
        while (true) {
            const poll = await axios.get(`${cfUrl}/${jobId}`, {
                headers: { 'Authorization': `Bearer ${API_TOKEN}` }
            });
            if (poll.data.result.status === 'complete') {
                html = poll.data.result.response_body;
                break;
            } else if (poll.data.result.status === 'failed') {
                throw new Error('Cloudflare crawl job failed');
            }
            log.info('Crawl in progress...');
            await new Promise(resolve => setTimeout(resolve, 5000));
        }

        // --- Parsing logic (placeholder for detailed DOM parsing) ---
        // This will be completed once we verify the HTML structure returned by Cloudflare br-crawl.
        // The goal is to produce the JSON format with 'scorebox', 'events', and 'lineups'.
        
        const data = {
            _parser: { match_id: MATCH_ID, date: 'unknown' },
            scorebox: { home_team: 'TBD', away_team: 'TBD' },
            events: [],
            lineups: { home: {}, away: {} }
        };

        const fileName = `spielbericht_${MATCH_ID}.json`;
        const filePath = path.join(OUTPUT_DIR, fileName);
        fs.mkdirSync(OUTPUT_DIR, { recursive: true });
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));

        log.info({ filePath }, 'Scrape successful! Detail parsing to be refined.');

    } catch (error) {
        log.error({ err: error.message }, 'Scrape failed');
    } finally {
        process.exit();
    }
}

scrapeDetail();
