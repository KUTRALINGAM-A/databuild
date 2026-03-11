import os, supabase, pprint
from dotenv import load_dotenv

load_dotenv(".env")
client = supabase.create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_SERVICE_KEY"))

tests = [
    "supplier_company_id, Companies_and_Vendors!supplier_company_id(*)",
    "supplier_company_id, Companies_and_Vendors!inner(*)",
    "supplier_company_id, Companies_and_Vendors(*)",
    "supplier_company_id, vendor:Companies_and_Vendors!supplier_company_id(*)"
]

for t in tests:
    print(f"\n--- Testing: {t} ---")
    try:
        res = client.table("Supply_Relationships").select(t).limit(1).execute()
        print("SUCCESS:")
        pprint.pprint(res.data)
    except Exception as e:
        print("FAILED:", str(e))
