import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const sb = createClient(process.env.VITE_SUPABASE_URL || '', process.env.VITE_SUPABASE_ANON_KEY || '');

async function test() {
    const { data, error } = await sb
        .from('Supply_Relationships')
        .select(`
            buyer_company_id,
            supplier_company_id,
            Companies_and_Vendors:supplier_company_id (*)
        `)
        .eq('is_active', true)
        .limit(2);
    
    console.log("ERROR:", error);
    console.log("DATA:", JSON.stringify(data, null, 2));
}
test();
