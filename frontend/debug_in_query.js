const dotenv = require('dotenv');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const env = dotenv.parse(fs.readFileSync('.env'));
const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

async function run() {
    const ids = ["c3b18ea5-2183-496f-9181-ae6e31162985", "147a6f53-99cd-4ccc-bf68-79026b9637c1"];
    
    console.log("Fetching those two specific IDs...");
    const { data: res1, error: err1 } = await supabase
        .from('Companies_and_Vendors')
        .select('*')
        .in('id', ids);
        
    console.log("Result explicitly by ID:", res1?.length, err1);
    
    console.log("\nFetching ALL companies to see if they are missing entirely...");
    const { data: res2 } = await supabase.from('Companies_and_Vendors').select('id, name').limit(50);
    console.log("Total companies returned:", res2?.length);
    
    const found1 = res2?.find(c => c.id === ids[0]);
    const found2 = res2?.find(c => c.id === ids[1]);
    console.log("Are they in the full list?", !!found1, !!found2);
}
run();
