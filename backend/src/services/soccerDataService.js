import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BRIDGE_PATH = path.join(__dirname, 'soccerDataBridge.py');

/**
 * SoccerData Service
 * Bridge to Python's soccerdata library
 */
const soccerDataService = {
    /**
     * Fetch data from FBref using soccerdata
     * @param {string} league - League ID (e.g. 'ENG-Premier League')
     * @param {string} season - Season year (e.g. '2021')
     * @param {string} type - Data type ('players', 'teams', 'schedule')
     * @returns {Promise<Array>}
     */
    fetchData: (league, season, type = 'players') => {
        return new Promise((resolve, reject) => {
            console.log(`🚀 Executing SoccerData bridge: --league=${league} --season=${season} --type=${type}`);

            const pythonProcess = spawn('python3', [
                BRIDGE_PATH,
                '--league', league,
                '--season', season,
                '--type', type
            ]);

            let data = '';
            let error = '';

            pythonProcess.stdout.on('data', (chunk) => {
                data += chunk.toString();
            });

            pythonProcess.stderr.on('data', (chunk) => {
                error += chunk.toString();
            });

            pythonProcess.on('close', (code) => {
                if (code !== 0) {
                    console.error(`❌ SoccerData bridge failed with code ${code}: ${error}`);
                    reject(new Error(`SoccerData bridge failed: ${error}`));
                    return;
                }

                try {
                    const result = JSON.parse(data);
                    resolve(result);
                } catch (parseError) {
                    console.error(`❌ Failed to parse SoccerData output: ${parseError.message}`);
                    reject(new Error(`Failed to parse SoccerData output: ${parseError.message}`));
                }
            });
        });
    }
};

export default soccerDataService;
