
import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

const API_KEY = process.env.API_FOOTBALL_KEY || process.env.API_INITIAL_KEY;
const API_BASE_URL = 'https://v3.football.api-sports.io';

async function check() {
    try {
        const res = await axios.get(`${API_BASE_URL}/leagues`, {
            params: { name: 'UEFA Champions League' },
            headers: { 'x-rapidapi-key': API_KEY }
        });
        console.log("CL:", res.data.response[0]?.league?.id);

        const res2 = await axios.get(`${API_BASE_URL}/leagues`, {
            params: { name: 'UEFA Europa League' },
            headers: { 'x-rapidapi-key': API_KEY }
        });
        console.log("EL:", res2.data.response[0]?.league?.id);

        const res3 = await axios.get(`${API_BASE_URL}/leagues`, {
            params: { search: 'Premier League' }, // just 'Premier League' matches many, but let's see
            headers: { 'x-rapidapi-key': API_KEY }
        });
        // We can just rely on country mapping for leagues.
    } catch (e) {
        console.error(e);
    }
}

check();
