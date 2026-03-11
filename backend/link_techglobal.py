import os
from dotenv import load_dotenv
import supabase as sb

load_dotenv(".env")
client = sb.create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_SERVICE_KEY"))

# 1. Get TechGlobal ID
b = client.table("Companies_and_Vendors").select("id").eq("name", "TechGlobal Systems").execute().data
if not b:
    exit("TechGlobal not found")
tech_id = b[0]["id"]

# 2. Get Suppliers we want to link
suppliers_to_add = [
    ("IronOre Miners Ltd", "Iron Ore"),
    ("Diesel Fuel Co", "Diesel"),
    ("SteelWorks India", "Steel Beams"),
    ("EcoMine Solutions", "Iron Ore"),
    ("BioFuel Energy Ltd", "Diesel"),
    ("GreenSteel India", "Steel Beams"),
]

for s_name, p_name in suppliers_to_add:
    # Get Supplier ID
    s_data = client.table("Companies_and_Vendors").select("id").eq("name", s_name).execute().data
    if not s_data:
        continue
    sid = s_data[0]["id"]
    
    # Get Product ID
    p_data = client.table("Products").select("id").eq("name", p_name).execute().data
    if not p_data:
        continue
    pid = p_data[0]["id"]
    
    # Check if rel exists
    existing = client.table("Supply_Relationships").select("id").eq("buyer_company_id", tech_id).eq("supplier_company_id", sid).execute().data
    if not existing:
        client.table("Supply_Relationships").insert({
            "buyer_company_id": tech_id,
            "supplier_company_id": sid,
            "product_id": pid,
            "quantity_per_year": 5000,
            "co2e_per_unit": 1.5,
            "is_active": True
        }).execute()
        print(f"Added constraint: TechGlobal -> {s_name} ({p_name})")
