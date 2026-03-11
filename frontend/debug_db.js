import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config({ path: '.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';

async function run() {
    console.log("Fetching Companies...");
    const res1 = await fetch(`${supabaseUrl}/rest/v1/Companies_and_Vendors?select=id,name`, {
        headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
    });
    const companies = await res1.json();
    const compMap = {};
    companies.forEach(c => compMap[c.id] = c.name);

    console.log("Fetching Relationships...");
    const res2 = await fetch(`${supabaseUrl}/rest/v1/Supply_Relationships?select=*`, {
        headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
    });
    const rels = await res2.json();

    console.log("\nDATABASE SUPPLY CHAIN:");
    rels.forEach(r => {
        console.log(`${compMap[r.buyer_company_id]} -> ${compMap[r.supplier_company_id]}`);
    });
}
run();
