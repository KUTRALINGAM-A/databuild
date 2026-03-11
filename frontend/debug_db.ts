import * as dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkRelationships() {
    console.log("Fetching Companies...");
    const { data: companies } = await supabase.from('Companies_and_Vendors').select('id, name');
    const compMap: Record<string, string> = {};
    if (companies) {
        companies.forEach(c => compMap[c.id] = c.name);
    }

    console.log("Fetching Relationships...");
    const { data: rels } = await supabase.from('Supply_Relationships').select('buyer_company_id, supplier_company_id');
    
    if (rels) {
        console.log("\nDATABASE SUPPLY CHAIN:");
        rels.forEach(r => {
            console.log(`${compMap[r.buyer_company_id] || r.buyer_company_id} -> ${compMap[r.supplier_company_id] || r.supplier_company_id}`);
        });
    } else {
        console.log("No relationships found.");
    }
}

checkRelationships();
