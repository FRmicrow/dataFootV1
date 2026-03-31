import axios from 'axios';

const testUrl = 'https://www.transfermarkt.fr/spielbericht/index/spielbericht/1036776';

async function testScraping() {
    try {
        console.log(`Testing direct access to: ${testUrl}`);
        const response = await axios.get(testUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7',
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache'
            }
        });
        
        console.log('Status:', response.status);
        console.log('HTML Length:', response.data.length);
        if (response.data.includes('composition')) {
            console.log('SUCCESS: Content seems accessible!');
        } else {
            console.log('WARNING: Content received but looks like a bot challenge page.');
        }
    } catch (error) {
        console.error('FAILED:', error.message);
        if (error.response) {
            console.error('Status:', error.response.status);
        }
    }
}

testScraping();
