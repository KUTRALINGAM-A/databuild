import os
from dotenv import load_dotenv
import supabase

load_dotenv()
c = supabase.create_client(os.getenv('SUPABASE_URL'), os.getenv('SUPABASE_SERVICE_KEY'))
r = c.table('Carbon_Credits').select('id, tonnes_offset, credit_type').execute()
print(f'Found {len(r.data)} credits in DB')
for x in r.data:
    print(f'  {x["tonnes_offset"]} t — {x["credit_type"][:60]}')
