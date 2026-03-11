import os, supabase, pprint
from dotenv import load_dotenv

load_dotenv(".env")
client = supabase.create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_SERVICE_KEY"))

apex = client.table("Companies_and_Vendors").select("id").eq("name", "Apex Manufacturing").execute().data
apex_id = apex[0]["id"]
print("Apex ID:", apex_id)

rels = client.table("Supply_Relationships").select("supplier_company_id, Companies_and_Vendors!supplier_company_id(*)").eq("buyer_company_id", apex_id).eq("is_active", True).execute().data

pprint.pprint(rels)
