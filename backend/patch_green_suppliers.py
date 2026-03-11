"""
patch_green_suppliers.py
========================
This script is APPEND-ONLY — it NEVER deletes or modifies existing rows.
It adds new Green supplier companies and supply relationships to ensure
every product in the database has at least one Green alternative vendor.

Run from the backend directory:
    python patch_green_suppliers.py
"""
import os
import uuid
import random
from dotenv import load_dotenv
import supabase as sb

load_dotenv(".env")
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("ERROR: Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in .env")
    exit(1)

client = sb.create_client(SUPABASE_URL, SUPABASE_KEY)

# ─── Step 1: Fetch current state ─────────────────────────────────────────────
print("\n[1/4] Reading existing products and relationships...")
existing_products = client.table("Products").select("id, name").execute().data
product_map = {p["name"]: p["id"] for p in existing_products}

print(f"  Found {len(product_map)} products: {list(product_map.keys())}")

existing_companies = client.table("Companies_and_Vendors").select("id, name").execute().data
company_map = {c["name"]: c["id"] for c in existing_companies}
print(f"  Found {len(company_map)} companies")

# Find which product IDs already have at least one GREEN supplier via Supply_Relationships
print("\n[2/4] Checking which products already have a Green alternative...")
all_rels = client.table("Supply_Relationships").select("buyer_company_id, supplier_company_id, product_id").execute().data
all_green_companies = client.table("Companies_and_Vendors").select("id").eq("status", "Green").execute().data
green_ids = {c["id"] for c in all_green_companies}

# Build a set of product_ids that have a green supplier
products_with_green = set()
for rel in all_rels:
    if rel["supplier_company_id"] in green_ids:
        products_with_green.add(rel["product_id"])

print(f"  Products already with a Green supplier: {len(products_with_green)}")
for pid in products_with_green:
    pname = next((p["name"] for p in existing_products if p["id"] == pid), pid)
    print(f"    ✅ {pname}")

products_without_green = [p for p in existing_products if p["id"] not in products_with_green]
print(f"\n  Products MISSING a Green supplier: {len(products_without_green)}")
for p in products_without_green:
    print(f"    ❌ {p['name']}")

# ─── Step 2: Define new Green vendors to add ──────────────────────────────────

# Map: product name -> list of new Green vendor defs
# We ensure each covers the missing products and also add more for robustness.
NEW_GREEN_VENDORS = {
    "Iron Ore": [
        {"name": "GreenRock Mining Co",     "industry": "Mining",     "employee_count": 300,  "annual_revenue_cr": 800,  "production_volume": 200000, "production_unit": "Tonnes of Ore",         "industry_emission_factor": 0.12},
        {"name": "EcoMine Solutions",        "industry": "Mining",     "employee_count": 180,  "annual_revenue_cr": 420,  "production_volume": 120000, "production_unit": "Tonnes of Ore",         "industry_emission_factor": 0.11},
    ],
    "Diesel": [
        {"name": "BioFuel Energy Ltd",       "industry": "Energy",     "employee_count": 120,  "annual_revenue_cr": 600,  "production_volume": 40000,  "production_unit": "Thousand Litres",       "industry_emission_factor": 1.8},
        {"name": "CleanFuel India",          "industry": "Energy",     "employee_count": 95,   "annual_revenue_cr": 380,  "production_volume": 25000,  "production_unit": "Thousand Litres",       "industry_emission_factor": 1.5},
    ],
    "Industrial Glue": [
        {"name": "BioAdhesive Labs",         "industry": "Chemicals",  "employee_count": 80,   "annual_revenue_cr": 200,  "production_volume": 10000,  "production_unit": "Tonnes of Chem",       "industry_emission_factor": 1.2},
        {"name": "GreenBond Chemicals",      "industry": "Chemicals",  "employee_count": 65,   "annual_revenue_cr": 160,  "production_volume": 7000,   "production_unit": "Tonnes of Chem",       "industry_emission_factor": 1.0},
    ],
    "Microchips": [
        {"name": "NanoGreen Semiconductors", "industry": "Technology", "employee_count": 500,  "annual_revenue_cr": 1200, "production_volume": 15000,  "production_unit": "Thousand Chips",       "industry_emission_factor": 0.3},
        {"name": "EcoSilicon Works",         "industry": "Technology", "employee_count": 320,  "annual_revenue_cr": 750,  "production_volume": 8000,   "production_unit": "Thousand Chips",       "industry_emission_factor": 0.28},
    ],
    "Steel Beams": [
        {"name": "GreenSteel India",         "industry": "Manufacturing", "employee_count": 2000, "annual_revenue_cr": 8000, "production_volume": 15000, "production_unit": "Tonnes of Steel",    "industry_emission_factor": 2.8},
        {"name": "EcoAlloy Corp",            "industry": "Manufacturing", "employee_count": 1200, "annual_revenue_cr": 4500, "production_volume": 9000,  "production_unit": "Tonnes of Steel",    "industry_emission_factor": 2.5},
    ],
    "Freight Shipping": [
        {"name": "GreenMile Logistics",      "industry": "Transport",  "employee_count": 800,  "annual_revenue_cr": 2000, "production_volume": 100000, "production_unit": "1000 km",              "industry_emission_factor": 0.25},
        {"name": "EcoCarrier Network",       "industry": "Transport",  "employee_count": 600,  "annual_revenue_cr": 1400, "production_volume": 70000,  "production_unit": "1000 km",              "industry_emission_factor": 0.22},
    ],
    "Server Racks": [
        {"name": "SustainServer Works",      "industry": "Technology", "employee_count": 250,  "annual_revenue_cr": 900,  "production_volume": 3000,   "production_unit": "Servers",              "industry_emission_factor": 3.5},
    ],
    "Plastic Casings": [
        {"name": "RecyclePlast India",       "industry": "Manufacturing", "employee_count": 180, "annual_revenue_cr": 400, "production_volume": 4000,  "production_unit": "Tonnes of Plastic",    "industry_emission_factor": 1.5},
    ],
}

# ─── Step 3: Insert new companies and relationships ───────────────────────────
print("\n[3/4] Adding new Green supplier companies and supply relationships...")

for product_name, vendors in NEW_GREEN_VENDORS.items():
    pid = product_map.get(product_name)
    if not pid:
        print(f"  SKIP: Product '{product_name}' not found in Products table")
        continue

    for vendor_def in vendors:
        # Skip if this company already exists
        if vendor_def["name"] in company_map:
            print(f"  SKIP (exists): {vendor_def['name']}")
            continue

        # Calculate a realistic carbon cap and low CO2e (they are Green)
        dynamic_cap = vendor_def["production_volume"] * vendor_def["industry_emission_factor"]
        # Green companies emit 60-85% of their cap
        total_co2e = dynamic_cap * random.uniform(0.60, 0.85)

        # Create Auth user for login
        email = f"admin@{vendor_def['name'].lower().replace(' ', '').replace('.', '')}.com"
        user_id = None
        try:
            auth_res = client.auth.admin.create_user({
                "email": email,
                "password": "Password123!",
                "email_confirm": True,
                "user_metadata": {"company_name": vendor_def["name"], "role": "Supplier"}
            })
            user_id = auth_res.user.id
            print(f"  [AUTH] {vendor_def['name']} -> {email} / Password123!")
        except Exception as e:
            print(f"  [AUTH WARN] {vendor_def['name']}: {e}")

        # Insert company
        company_record = {
            "name": vendor_def["name"],
            "role": "Supplier",
            "industry": vendor_def["industry"],
            "user_id": user_id,
            "employee_count": vendor_def["employee_count"],
            "annual_revenue_cr": vendor_def["annual_revenue_cr"],
            "production_volume": vendor_def["production_volume"],
            "production_unit": vendor_def["production_unit"],
            "industry_emission_factor": vendor_def["industry_emission_factor"],
            "carbon_cap": round(dynamic_cap, 2),
            "total_co2e": round(total_co2e, 2),
            "baseline_co2e": round(dynamic_cap * 1.1, 2),
            "target_co2e": round(dynamic_cap * 0.9, 2),
            "target_year": 2026,
            "status": "Green",
        }

        res = client.table("Companies_and_Vendors").insert(company_record).execute()
        new_id = res.data[0]["id"]
        company_map[vendor_def["name"]] = new_id
        print(f"  ✅ INSERT Company: {vendor_def['name']} ({vendor_def['industry']}) -> CO2e: {round(total_co2e):,}kg / Cap: {round(dynamic_cap):,}kg")

        # Add a few carbon ledger entries
        ledger_entries = []
        remaining = total_co2e
        for _ in range(3):
            amount = remaining * random.uniform(0.2, 0.4)
            if amount < 1:
                continue
            from datetime import datetime, timedelta
            date = datetime.now() - timedelta(days=random.randint(1, 300))
            ledger_entries.append({
                "company_id": new_id,
                "scope_type": random.choice([1, 2]),
                "raw_metric": round(amount / 0.82, 2),
                "metric_unit": "KWh",
                "calculated_co2e": round(amount, 2),
                "emission_factor": 0.82,
                "factor_source": "CEA_CO2_Baseline_v18_2023_India_National",
                "date_recorded": date.strftime("%Y-%m-%d"),
            })
            remaining -= amount
        if ledger_entries:
            client.table("Carbon_Ledger").insert(ledger_entries).execute()

        # Link to EVERY existing buyer who buys this product (as an alternative)
        existing_buyers_for_product = [
            r["buyer_company_id"] for r in all_rels if r["product_id"] == pid
        ]
        unique_buyers = list(set(existing_buyers_for_product))

        for buyer_id in unique_buyers:
            # Don't create a self-referential relationship
            if buyer_id == new_id:
                continue
            rel_res = client.table("Supply_Relationships").insert({
                "buyer_company_id": buyer_id,
                "supplier_company_id": new_id,
                "product_id": pid,
                "quantity_per_year": random.randint(1000, 30000),
                "co2e_per_unit": round(random.uniform(0.05, 1.5), 2),
                "is_active": True
            }).execute()
            buyer_name = next((c["name"] for c in existing_companies if c["id"] == buyer_id), buyer_id)
            print(f"    🔗 LINK: {buyer_name} -> {vendor_def['name']} for {product_name}")

# ─── Step 4: Summary ──────────────────────────────────────────────────────────
print("\n[4/4] DONE! Patch applied without touching any existing data.")
print("      Existing companies, vendors, credits, and relationships are UNCHANGED.")
print("      New Green vendors have been added as alternatives for all products.\n")
