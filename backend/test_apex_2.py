import os, supabase as sb
from dotenv import load_dotenv

load_dotenv('.env')
client = sb.create_client(os.getenv('SUPABASE_URL'), os.getenv('SUPABASE_SERVICE_KEY'))
res = client.table('Companies_and_Vendors').select('id, name, created_at, user_id').eq('name', 'Apex Manufacturing').execute().data

for idx, r in enumerate(res):
    print(f"[{idx}] {r}")
