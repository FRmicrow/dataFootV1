import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

const API_KEY = process.env.API_FOOTBALL_KEY;
const BASE_URL = 'https://v3.football.api-sports.io';

async function testSearch(name) {
    try {
        console.log(`Searching for "${name}"...`);
        const response = await axios.get(`${BASE_URL}/players`, {
            headers: { 'x-apisports-key': API_KEY },
            params: { search: name }
        });
        console.log('Response with just search:', JSON.stringify(response.data, null, 2));

        const responseWithSeason = await axios.get(`${BASE_URL}/players`, {
            headers: { 'x-apisports-key': API_KEY },
            params: { search: name, season: 2023 }
        });
        console.log('Response with search + season 2023:', JSON.stringify(responseWithSeason.data, null, 2));

    } catch (error) {
        console.error('Error:', error.response?.data || error.message);
    }
}

testSearch(process.argv[2] || 'Messi');
