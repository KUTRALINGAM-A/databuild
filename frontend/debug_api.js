import fs from 'fs';
import https from 'https';

const envFile = fs.readFileSync('.env', 'utf-8');
let url = '', key = '';
envFile.split('\n').forEach(line => {
    if (line.startsWith('VITE_SUPABASE_URL=')) url = line.split('=')[1].trim();
    if (line.startsWith('VITE_SUPABASE_ANON_KEY=')) key = line.split('=')[1].trim();
});

const headers = { 'apikey': key, 'Authorization': 'Bearer ' + key };

function fetchJson(path) {
    return new Promise((resolve, reject) => {
        https.get(url + path, { headers }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve(JSON.parse(data)));
        }).on('error', reject);
    });
}

async function run() {
    const rels = await fetchJson('/rest/v1/Supply_Relationships?select=supplier_company_id,Companies_and_Vendors:supplier_company_id(*)&limit=5');
    console.log("==== TEST JOIN SYNTAX (Alias) ====\n", JSON.stringify(rels, null, 2));

    const rels2 = await fetchJson('/rest/v1/Supply_Relationships?select=supplier_company_id,Companies_and_Vendors!supplier_company_id(*)&limit=5');
    console.log("\n==== TEST JOIN SYNTAX (No Alias) ====\n", JSON.stringify(rels2, null, 2));
}
run();
