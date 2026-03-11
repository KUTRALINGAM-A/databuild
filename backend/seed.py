import os
import random
from datetime import datetime, timedelta
import supabase
from dotenv import load_dotenv
from pprint import pprint

# Load Environment Variables
load_dotenv(".env")
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("Error: Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in .env")
    exit(1)

# Initialize Supabase Client
client = supabase.create_client(SUPABASE_URL, SUPABASE_KEY)

# ─── MOCK DATA TEMPLATES ──────────────────────────────────────────────────────

GIANTS = [
    {"name": "TechGlobal Systems", "industry": "Technology", "employee_count": 50000, "annual_revenue_cr": 80000, "production_volume": 12000, "production_unit": "Servers", "industry_emission_factor": 8.5},
    {"name": "Apex Manufacturing", "industry": "Manufacturing", "employee_count": 35000, "annual_revenue_cr": 55000, "production_volume": 45000, "production_unit": "Tonnes of Steel", "industry_emission_factor": 5.5},
    {"name": "Nova Logistics Co", "industry": "Transport", "employee_count": 22000, "annual_revenue_cr": 30000, "production_volume": 160000, "production_unit": "1000 km", "industry_emission_factor": 0.5},
]

TIER1_SUPPLIERS = [
    {"name": "CloudNine Servers AI", "industry": "Technology", "employee_count": 1200, "annual_revenue_cr": 5000, "production_volume": 4000, "production_unit": "Servers", "industry_emission_factor": 5.0},
    {"name": "SteelWorks India", "industry": "Manufacturing", "employee_count": 8000, "annual_revenue_cr": 12000, "production_volume": 12000, "production_unit": "Tonnes of Steel", "industry_emission_factor": 4.1},
    {"name": "Global Fleet Transport", "industry": "Transport", "employee_count": 4500, "annual_revenue_cr": 8000, "production_volume": 75000, "production_unit": "1000 km", "industry_emission_factor": 0.53},
    {"name": "PlastiPack Solutions", "industry": "Manufacturing", "employee_count": 1500, "annual_revenue_cr": 2500, "production_volume": 5000, "production_unit": "Tonnes of Plastic", "industry_emission_factor": 3.0},
]

TIER2_SUPPLIERS = [
    {"name": "Silicon Microchips", "industry": "Technology", "employee_count": 400, "annual_revenue_cr": 800, "production_volume": 10000, "production_unit": "Thousand Chips", "industry_emission_factor": 0.5},
    {"name": "IronOre Miners Ltd", "industry": "Mining", "employee_count": 2500, "annual_revenue_cr": 3500, "production_volume": 150000, "production_unit": "Tonnes of Ore", "industry_emission_factor": 0.2},
    {"name": "Diesel Fuel Co", "industry": "Energy", "employee_count": 800, "annual_revenue_cr": 4000, "production_volume": 30000, "production_unit": "Thousand Litres", "industry_emission_factor": 3.3},
    {"name": "ChemSynthetics", "industry": "Chemicals", "employee_count": 650, "annual_revenue_cr": 1200, "production_volume": 8000, "production_unit": "Tonnes of Chem", "industry_emission_factor": 2.25},
]

GREEN_SMES = [
    {"name": "EcoThread Cotton Mills", "industry": "Textiles", "employee_count": 120, "annual_revenue_cr": 45, "production_volume": 400, "production_unit": "Tonnes of Cloth", "industry_emission_factor": 1.25, "co2e_variance": -350}, # Highly negative (surplus credits)
    {"name": "GreenLeaf Organic Farms", "industry": "Agriculture", "employee_count": 50, "annual_revenue_cr": 10, "production_volume": 200, "production_unit": "Tonnes of Produce", "industry_emission_factor": 0.5, "co2e_variance": -80},
    {"name": "SolarPower Installers", "industry": "Energy", "employee_count": 85, "annual_revenue_cr": 25, "production_volume": 1500, "production_unit": "kW Installed", "industry_emission_factor": 0.1, "co2e_variance": -120},
    {"name": "BioPak Packaging", "industry": "Manufacturing", "employee_count": 200, "annual_revenue_cr": 60, "production_volume": 2500, "production_unit": "Tonnes of BioPlastic", "industry_emission_factor": 0.32, "co2e_variance": -500},
]

PRODUCTS = [
    {"name": "Server Racks", "category": "Hardware", "unit": "units", "hscode": "847141"},
    {"name": "Steel Beams", "category": "Raw Material", "unit": "tonnes", "hscode": "730890"},
    {"name": "Freight Shipping", "category": "Services", "unit": "km", "hscode": "996511"},
    {"name": "Plastic Casings", "category": "Components", "unit": "1000 units", "hscode": "392390"},
    {"name": "Microchips", "category": "Electronics", "unit": "1000 units", "hscode": "854231"},
    {"name": "Iron Ore", "category": "Raw Material", "unit": "tonnes", "hscode": "260111"},
    {"name": "Diesel", "category": "Fuel", "unit": "litres", "hscode": "271019"},
    {"name": "Industrial Glue", "category": "Chemicals", "unit": "litres", "hscode": "350691"},
]

def clear_database():
    print("Clearing database...")
    tables = ["Carbon_Credits", "Supply_Relationships", "Carbon_Ledger", "Raw_Uploads", "Products", "Companies_and_Vendors", "Industry_Averages"]
    
    # Supabase REST API has limited bulk delete capabilities without exact match conditions.
    # The safest way is to select all IDs and delete them.
    for table in tables:
        print(f"  Clearing {table}...")
        try:
            # Delete all (might fail if foreign keys restrict, so we do it in dependency order backwards)
            res = client.table(table).select("id").execute()
            ids = [r["id"] for r in res.data]
            
            # Batch delete in chunks of 50
            for i in range(0, len(ids), 50):
                chunk = ids[i:i+50]
                client.table(table).delete().in_("id", chunk).execute()
        except Exception as e:
            print(f"Warning clearing {table}: {str(e)}")

def clear_auth_users():
    print("  Clearing seeded Auth users...")
    try:
        # Get all users (paginated in real life, but fine for hackathon scale)
        users = client.auth.admin.list_users()
        # Delete only our seeded ones (they all have "admin@" emails, but just to be safe we'll delete all for clean slate)
        for u in users:
            client.auth.admin.delete_user(u.id)
    except Exception as e:
        print(f"Warning clearing auth users: {str(e)}")


def seed():
    clear_database()
    clear_auth_users()
    
    # 1. ADD PRODUCTS
    print("\nAdding Products...")
    inserted_products = client.table("Products").insert(PRODUCTS).execute().data
    product_map = {p["name"]: p["id"] for p in inserted_products}

    company_ids = {}

    def insert_company(group, role, is_green_sme=False):
        for c in group:
            variance = c.get("co2e_variance", 0)
            
            # Create predictable login credentials
            base_name = c["name"].lower().replace(' ', '').replace(',', '').replace('.', '')
            email = f"admin@{base_name}.com"
            password = "Password123!"
            
            user_id = None
            try:
                # 1. Try to create the user in Supabase Auth
                auth_res = client.auth.admin.create_user({
                    "email": email,
                    "password": password,
                    "email_confirm": True,
                    "user_metadata": {"company_name": c["name"], "role": role}
                })
                user_id = auth_res.user.id
                print(f"  [AUTH] Created credentials for {c['name']} -> {email} / {password}")
            except Exception as e:
                print(f"  [AUTH ERROR] Could not create auth user for {c['name']} (might already exist): {e}")
                # We'll continue even if auth creation fails, but they won't be able to log in easily
            
            # Calculate DYNAMIC Carbon Cap based on Production Volume * Industry Factor
            dynamic_carbon_cap = c["production_volume"] * c["industry_emission_factor"]
            
            # ... existing logic ...
            if not is_green_sme:
                if random.random() < 0.3:
                    total_co2e = dynamic_carbon_cap * random.uniform(1.05, 1.25)
                else:
                    total_co2e = dynamic_carbon_cap * random.uniform(0.70, 0.98)
            else:
                total_co2e = dynamic_carbon_cap + variance 
                if total_co2e < 0: total_co2e = 10
            
            status = 'Red' if total_co2e > dynamic_carbon_cap else 'Green'

            record = {
                "name": c["name"],
                "role": role,
                "industry": c["industry"],
                "user_id": user_id,  # Link to the newly generated Auth UUID
                "employee_count": c["employee_count"],
                "annual_revenue_cr": c["annual_revenue_cr"],
                "production_volume": c["production_volume"],
                "production_unit": c["production_unit"],
                "industry_emission_factor": c["industry_emission_factor"],
                "carbon_cap": round(dynamic_carbon_cap, 2),
                "total_co2e": round(total_co2e, 2),
                "baseline_co2e": round(dynamic_carbon_cap * 1.1, 2),
                "target_co2e": round(dynamic_carbon_cap * 0.9, 2),
                "target_year": 2026,
                "status": status,
            }
            res = client.table("Companies_and_Vendors").insert(record).execute()
            company_ids[c["name"]] = res.data[0]["id"]
            
            # Generate random ledger entries that add up roughly to total_co2e
            print(f"  Inserted {c['name']} - Status: {status} ({round(total_co2e)} / {round(dynamic_carbon_cap)} kg)")
            
            ledger_entries = []
            remaining_co2e = total_co2e
            
            # Scope 1 & 2 (Energy & Travel)
            for _ in range(5):
                amount = remaining_co2e * random.uniform(0.1, 0.3)
                if amount < 1: continue
                
                date = datetime.now() - timedelta(days=random.randint(1, 300))
                
                ledger_entries.append({
                    "company_id": company_ids[c["name"]],
                    "scope_type": random.choice([1, 2]),
                    "raw_metric": round(amount / 0.82, 2), # Reverse calculate KWh
                    "metric_unit": "KWh",
                    "calculated_co2e": round(amount, 2),
                    "emission_factor": 0.82,
                    "factor_source": "CEA_CO2_Baseline_v18_2023_India_National",
                    "date_recorded": date.strftime("%Y-%m-%d"),
                })
                remaining_co2e -= amount

            if ledger_entries:
                client.table("Carbon_Ledger").insert(ledger_entries).execute()

    print("\nAdding Companies...")
    insert_company(GIANTS, "Enterprise")
    insert_company(TIER1_SUPPLIERS, "Supplier")
    insert_company(TIER2_SUPPLIERS, "Supplier")
    insert_company(GREEN_SMES, "Supplier", is_green_sme=True)


    # 2. ADD SUPPLY RELATIONSHIPS
    print("\nAdding Supply Relationships...")
    relationships = [
        # Giants -> Tier 1
        {"buyer": "TechGlobal Systems", "supplier": "CloudNine Servers AI", "product": "Server Racks"},
        {"buyer": "TechGlobal Systems", "supplier": "PlastiPack Solutions", "product": "Plastic Casings"},
        {"buyer": "Apex Manufacturing", "supplier": "SteelWorks India", "product": "Steel Beams"},
        {"buyer": "Nova Logistics Co", "supplier": "Global Fleet Transport", "product": "Freight Shipping"},
        
        # Tier 1 -> Tier 2
        {"buyer": "CloudNine Servers AI", "supplier": "Silicon Microchips", "product": "Microchips"},
        {"buyer": "SteelWorks India", "supplier": "IronOre Miners Ltd", "product": "Iron Ore"},
        {"buyer": "Global Fleet Transport", "supplier": "Diesel Fuel Co", "product": "Diesel"},
        {"buyer": "PlastiPack Solutions", "supplier": "ChemSynthetics", "product": "Industrial Glue"},
        
        # Green SMEs mixed in
        {"buyer": "TechGlobal Systems", "supplier": "SolarPower Installers", "product": "Server Racks"}, # Eco alternative!
        {"buyer": "Apex Manufacturing", "supplier": "BioPak Packaging", "product": "Plastic Casings"}, # Eco alternative!
    ]

    for rel in relationships:
        client.table("Supply_Relationships").insert({
            "buyer_company_id": company_ids[rel["buyer"]],
            "supplier_company_id": company_ids[rel["supplier"]],
            "product_id": product_map[rel["product"]],
            "quantity_per_year": random.randint(1000, 50000),
            "co2e_per_unit": round(random.uniform(0.1, 5.0), 2),
            "is_active": True
        }).execute()
        
    # 3. GENERATE CARBON CREDITS (The Market!)
    print("\nGenerating Carbon Credit Transactions...")
    
    # Find all Green SMEs and calculate their surplus
    sme_data = client.table("Companies_and_Vendors").select("*").in_("name", [c["name"] for c in GREEN_SMES]).execute().data
    red_giants = client.table("Companies_and_Vendors").select("*").eq("status", "Red").execute().data
    
    if not red_giants:
        print("  Notice: No giants randomly became Red. Forcing TechGlobal Systems to Red for demo.")
        client.table("Companies_and_Vendors").update({"status": "Red", "total_co2e": 120000}).eq("id", company_ids["TechGlobal Systems"]).execute()
        red_giants = client.table("Companies_and_Vendors").select("*").eq("name", "TechGlobal Systems").execute().data

    for sme in sme_data:
        surplus = sme["carbon_cap"] - sme["total_co2e"]
        if surplus > 50:
            # Create a certificate for the SME
            print(f"  {sme['name']} generated {round(surplus)} tonnes of Carbon Credits!")
            
            # Sell a chunk of it to a Red company
            buyer = random.choice(red_giants)
            tonnes_sold = min(surplus * 0.8, buyer["total_co2e"] - buyer["carbon_cap"])
            if tonnes_sold < 10: tonnes_sold = 50
            
            cost = tonnes_sold * random.uniform(1500, 3000) # INR per tonne
            
            client.table("Carbon_Credits").insert({
                "company_id": buyer["id"], # The buyer owns the retired credit
                "credit_type": f"Verified Offset from {sme['name']} (EcoLedger Exchange)",
                "tonnes_offset": round(tonnes_sold, 2),
                "cost_inr": round(cost, 2),
                "certificate_url": f"https://ecoledger.app/certificates/cert_{random.randint(10000,99999)}.pdf",
                "purchased_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            }).execute()
            
            print(f"    -> Sold {round(tonnes_sold)} tonnes to {buyer['name']} for INR {round(cost)}")
            
    print("\nDatabase successfully seeded!")

if __name__ == "__main__":
    seed()
