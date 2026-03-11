import os
from dotenv import load_dotenv
import supabase as sb

load_dotenv(".env")
client = sb.create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_SERVICE_KEY"))

# 1. Get Apex ID
b = client.table("Companies_and_Vendors").select("id").eq("name", "Apex Manufacturing").execute().data
if not b:
    exit("Apex not found")
apex_id = b[0]["id"]

# 2. Emulate get_vendors(apex_id)
rels = client.table("Supply_Relationships").select("supplier_company_id, product_id").eq("buyer_company_id", apex_id).eq("is_active", True).execute().data
print(f"Rels: {len(rels)}")

if not rels:
    exit("No rels")

supplier_ids = [r["supplier_company_id"] for r in rels]
print(f"Supplier IDs: {len(supplier_ids)}")

supplier_to_product = {r["supplier_company_id"]: r["product_id"] for r in rels}
product_ids = list(set(supplier_to_product.values()))
print(f"Product IDs: {len(product_ids)}")

products = client.table("Products").select("id, name").in_("id", product_ids).execute().data
product_map = {p["id"]: p["name"] for p in products}

vendors = client.table("Companies_and_Vendors").select("*").in_("id", supplier_ids).execute().data
print(f"Vendors fetched: {len(vendors)}")

all_vendors = []
for v in vendors:
    v_copy = dict(v)
    prod_id = supplier_to_product.get(v["id"])
    v_copy["supplied_product_id"] = prod_id
    v_copy["supplied_product_name"] = product_map.get(prod_id)
    all_vendors.append(v_copy)

# Deduplication logic
best_per_product = {}
for v in all_vendors:
    pid = v.get("supplied_product_id")
    if not pid: continue
    
    existing = best_per_product.get(pid)
    if not existing:
        best_per_product[pid] = v
    else:
        def score(vendor):
            status_score = 1 if vendor.get("status") == "Red" else 0
            co2e = vendor.get("total_co2e") or 0
            return (status_score, co2e)
        if score(v) > score(existing):
            best_per_product[pid] = v

print(f"Final Deduplicated count: {len(best_per_product)}")
for k, v in best_per_product.items():
    print(f"  - {v['name']} ({v['supplied_product_name']})")
