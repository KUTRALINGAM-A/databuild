import os
from dotenv import load_dotenv
import supabase

load_dotenv()
c = supabase.create_client(os.getenv('SUPABASE_URL'), os.getenv('SUPABASE_SERVICE_KEY'))

# Force clear ALL credits using a gte filter (deletes all rows)
try:
    r = c.table('Carbon_Credits').delete().gte('created_at', '2000-01-01').execute()
    print(f"Deleted credits using gte filter: {r}")
except Exception as e:
    print(f"GTE delete failed: {e}")
    # Fallback: select all IDs and delete by chunk
    r = c.table('Carbon_Credits').select('id').execute()
    ids = [x['id'] for x in r.data]
    print(f"Found {len(ids)} credits to delete")
    for i in range(0, len(ids), 50):
        chunk = ids[i:i+50]
        c.table('Carbon_Credits').delete().in_('id', chunk).execute()
    print(f"Deleted {len(ids)} credits")

# Verify
r2 = c.table('Carbon_Credits').select('id, tonnes_offset').execute()
print(f"\nCredits remaining: {len(r2.data)}")
for x in r2.data:
    print(f"  {x['tonnes_offset']} t")
