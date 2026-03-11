import os
from dotenv import load_dotenv
import supabase as sb

load_dotenv(".env")
client = sb.create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_SERVICE_KEY"))

company = client.table("Companies_and_Vendors").select("*").eq("name", "Apex Manufacturing").execute().data
if not company:
    print("Apex not found")
    exit()

cid = company[0]["id"]
print(f"Company: {company[0]['name']} | ID: {cid}")
print(f"Role: {company[0]['role']}")
print(f"Status: {company[0]['status']}")
print(f"Emissions: {company[0]['total_co2e']} / {company[0]['carbon_cap']}")

rels_as_supplier = client.table("Supply_Relationships").select("*").eq("supplier_company_id", cid).execute().data
rels_as_buyer = client.table("Supply_Relationships").select("*").eq("buyer_company_id", cid).execute().data

print(f"\nSupplies {len(rels_as_supplier)} buyers")
print(f"Buys from {len(rels_as_buyer)} suppliers")

ledger = client.table("Carbon_Ledger").select("*").eq("company_id", cid).execute().data
print(f"\nLedger entries: {len(ledger)}")
