const http = require('http');

const payload = JSON.stringify({
    selection: [
        {
            leagueId: 135, // Serie A (Italy)
            seasons: Array.from({ length: 17 }, (_, i) => 2010 + i), // 2010-2026
            forceApiId: true
        },
        {
            leagueId: 71, // Serie A (Brazil)
            seasons: Array.from({ length: 17 }, (_, i) => 2010 + i), // 2010-2026
            forceApiId: true
        }
    ]
});

const options = {
    hostname: 'localhost',
    port: 3001,
    path: '/api/v3/import/batch',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': payload.length
    }
};

console.log("🚀 Triggering Batch Import for Serie A (Italy) & (Brazil) [2010-2026]...");

const req = http.request(options, (res) => {
    console.log(`STATUS: ${res.statusCode}`);

    res.setEncoding('utf8');
    res.on('data', (chunk) => {
        // Simple log of SSE events
        const lines = chunk.split('\n').filter(l => l.startsWith('data: '));
        lines.forEach(line => {
            try {
                const data = JSON.parse(line.substring(6));
                if (data.type === 'info') console.log(`[INFO] ${data.message}`);
                else if (data.type === 'success') console.log(`[SUCCESS] ${data.message}`);
                else if (data.type === 'error') console.error(`[ERROR] ${data.message}`);
                else if (data.type === 'complete') console.log(`[COMPLETE] ${data.message || 'Done'}`);
            } catch (e) {
                console.log(line);
            }
        });
    });

    res.on('end', () => {
        console.log('No more data in response.');
    });
});

req.on('error', (e) => {
    console.error(`problem with request: ${e.message}`);
});

req.write(payload);
req.end();
