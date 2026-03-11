import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function sync() {
    const { data: users, error: uErr } = await supabase.auth.admin.listUsers();
    if (uErr) { console.error(uErr); return; }
    console.log(`Found ${users.users.length} Auth users.`);

    const { data: companies, error: cErr } = await supabase.from('Companies_and_Vendors').select('id, name, user_id');
    if (cErr) { console.error(cErr); return; }
    console.log(`Found ${companies.length} Companies.`);

    let updated = 0;
    for (const comp of companies) {
        const base = comp.name.toLowerCase().replace(/ /g, '').replace(/\./g, '');
        const email = `admin@${base}.com`;
        
        const matchedUser = users.users.find(u => u.email === email);
        if (matchedUser) {
            if (comp.user_id !== matchedUser.id) {
                console.log(`Syncing ${comp.name} Auth UID: ${comp.user_id} -> ${matchedUser.id}`);
                await supabase.from('Companies_and_Vendors').update({ user_id: matchedUser.id }).eq('id', comp.id);
                updated++;
            }
        }
    }
    console.log(`Successfully synced ${updated} Company rows.`);
}
sync();
