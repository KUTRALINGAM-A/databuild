import os, supabase, pprint
from dotenv import load_dotenv

load_dotenv(".env")
client = supabase.create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_ANON_KEY"))

# Sign in as Apex
res = client.auth.sign_in_with_password({"email": "admin@apexmanufacturing.com", "password": "Password123!"})
print("Logged in as:", res.user.email)

# Get Company ID
apex = client.table("Companies_and_Vendors").select("id").eq("name", "Apex Manufacturing").execute()
if apex.data:
    apex_id = apex.data[0]["id"]
    print("Apex ID:", apex_id)
    
    # Get Relationships
    rels = client.table("Supply_Relationships").select("supplier_company_id, Companies_and_Vendors!supplier_company_id(*)").eq("buyer_company_id", apex_id).eq("is_active", True).execute()
    print("Relationships:")
    pprint.pprint(rels.data)
else:
    print("Apex company not found for this user. RLS might be blocking Companies_and_Vendors read.")
