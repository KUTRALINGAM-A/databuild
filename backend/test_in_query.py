import os, supabase, pprint
from dotenv import load_dotenv

load_dotenv(".env")
# Using the ANON key to simulate the frontend
client = supabase.create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_ANON_KEY"))

ids = ["c3b18ea5-2183-496f-9181-ae6e31162985", "147a6f53-99cd-4ccc-bf68-79026b9637c1"]

print("Fetching explicitly by ID...")
res1 = client.table("Companies_and_Vendors").select("*").in_("id", ids).execute()
print("Result explicit ID count:", len(res1.data))

print("Fetching ALL companies...")
res2 = client.table("Companies_and_Vendors").select("id, name").execute()
print("Result all count:", len(res2.data))

found = [c for c in res2.data if c["id"] in ids]
print("Found in full list?", found)
