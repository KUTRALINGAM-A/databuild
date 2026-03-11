const https = require('https');
const dotenv = require('dotenv');
const fs = require('fs');

const env = dotenv.parse(fs.readFileSync('.env'));
const urlStr = env.VITE_SUPABASE_URL + '/rest/v1/Companies_and_Vendors?select=id,name';
const relStr = env.VITE_SUPABASE_URL + '/rest/v1/Supply_Relationships?select=buyer_company_id,supplier_company_id';

const headers = { 'apikey': env.VITE_SUPABASE_ANON_KEY, 'Authorization': 'Bearer ' + env.VITE_SUPABASE_ANON_KEY };

function fetchJson(url) {
    return new Promise((resolve, reject) => {
        https.get(url, { headers }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve(JSON.parse(data)));
        }).on('error', reject);
    });
}

async function run() {
    console.log("Fetching DB...");
    const companies = await fetchJson(urlStr);
    const cmap = {}; companies.forEach(c => cmap[c.id] = c.name);
    const rels = await fetchJson(relStr);
    console.log("\nDATABASE SUPPLY CHAIN: " + rels.length);
    rels.forEach(r => console.log(`${cmap[r.buyer_company_id]} -> ${cmap[r.supplier_company_id]}`));
}
run();
