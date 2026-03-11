import os
import supabase
from dotenv import load_dotenv

load_dotenv()
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY")

client = supabase.create_client(SUPABASE_URL, SUPABASE_KEY)

apex = client.table("Companies_and_Vendors").select("*").eq("name", "Apex Manufacturing").execute()
print("APEX ID:", apex.data[0]['id'] if apex.data else "NOT FOUND")

if apex.data:
    apex_id = apex.data[0]['id']
    ledger = client.table("Carbon_Ledger").select("*").eq("company_id", apex_id).execute()
    print("LEDGER COUNT:", len(ledger.data))
    
    vendors = client.table("Supply_Relationships").select("*").eq("buyer_company_id", apex_id).execute()
    print("VENDOR COUNT:", len(vendors.data))
