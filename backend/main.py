import os
import io
import base64
import re
import PyPDF2
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
import supabase
import google.generativeai as genai
import PIL.Image

load_dotenv()

app = FastAPI(title="Eco-Ledger Extraction API")

# Setup CORS for Frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Supabase Client
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY")
sb_client: supabase.Client | None = None
if SUPABASE_URL and SUPABASE_KEY:
    try:
        sb_client = supabase.create_client(SUPABASE_URL, SUPABASE_KEY)
    except Exception as e:
        print(f"Warning: Supabase client initialization failed: {str(e)}")

# Initialize Gemini Client
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)

# ── India CEA 2023 National Average Emission Factors ─────────────────────────
# Source: Central Electricity Authority, CO2 Baseline Database v18 (2023)
EMISSION_FACTORS = {
    "electricity_kwh":  0.82,   # kg CO2e per kWh  (India national grid avg)
    "diesel_litre":     2.68,   # kg CO2e per litre diesel
    "petrol_litre":     2.31,   # kg CO2e per litre petrol
    "lpg_kg":           2.98,   # kg CO2e per kg LPG
    "cng_kg":           2.21,   # kg CO2e per kg CNG
}
FACTOR_SOURCE = "CEA_CO2_Baseline_v18_2023_India_National"

class ExtractionResult(BaseModel):
    document_type: str
    billing_month: str
    metric: float
    unit: str
    calculated_co2e: float
    confidence: float
    emission_factor: float
    factor_source: str
    mock: bool = False

@app.get("/")
async def health_check():
    return {"status": "ok", "message": "Eco-Ledger Backend is Operational."}

@app.post("/api/upload")
async def process_document(file: UploadFile = File(...)):
    if not file.content_type.startswith(('image/', 'application/pdf')):
        raise HTTPException(status_code=400, detail="Only Images and PDFs supported")

    content = await file.read()
    pdf_text = ""

    if file.content_type == 'application/pdf':
        try:
            reader = PyPDF2.PdfReader(io.BytesIO(content))
            for page in reader.pages:
                pdf_text += page.extract_text() + "\n"
        except Exception as e:
            print(f"Error reading PDF: {e}")

    # MOCK BEHAVIOR if NO GEMINI API key (for continuous hackathon testing)
    if not GEMINI_API_KEY:
        print("Mock extraction: No GEMINI_API_KEY found. Using PyPDF2 smart fallback.")
        text_to_search = pdf_text.lower() if pdf_text else file.filename.lower()
        
        # Automatically detect Document Type based on text context
        if "energy" in text_to_search or "kwh" in text_to_search or "power" in text_to_search:
            doc_type = "Energy_Bill"
            ef = EMISSION_FACTORS["electricity_kwh"]
            unit = "KWh"
            match = re.search(r'consumption:\s*([\d,]+)\s*kwh', text_to_search)
            metric = float(match.group(1).replace(',', '')) if match else 1420.0
        else:
            doc_type = "Shipping_Log"
            ef = EMISSION_FACTORS["diesel_litre"]
            unit = "Litres"
            match = re.search(r'consumption:\s*([\d,]+)\s*litres', text_to_search)
            metric = float(match.group(1).replace(',', '')) if match else 5000.0

        return {
            "status": "success",
            "data": ExtractionResult(
                document_type=doc_type,
                billing_month="Estimated Period",
                metric=metric,
                unit=unit,
                calculated_co2e=round(metric * ef, 2),
                confidence=0.98,
                emission_factor=ef,
                factor_source=FACTOR_SOURCE,
                mock=True
            ).model_dump()
        }

    # REAL Gemini extraction path
    try:
        model = genai.GenerativeModel('gemini-2.5-flash', generation_config={"response_mime_type": "application/json"})
        
        if file.content_type.startswith('image/'):
            image_obj = PIL.Image.open(io.BytesIO(content))
            prompt = f"""Extract carbon data from this Indian energy bill or shipping document.

India Emission Factors (CEA 2023):
- Electricity: {EMISSION_FACTORS['electricity_kwh']} kg CO2e per kWh
- Diesel transport: {EMISSION_FACTORS['diesel_litre']} kg CO2e per litre

Instructions:
1. Identify if this is an Energy_Bill or Shipping_Log
2. Extract the billing month, date, or period (e.g., "January 2024", "October"). If not found, guess based on context or return "Unknown"
3. Extract the total consumption (KWh for energy, Litres for shipping)
4. Calculate CO2e using the Indian emission factors above
5. Return JSON only with: document_type (String), billing_month (String), metric (float), unit (String), calculated_co2e (float), confidence (0.0-1.0), emission_factor (float), factor_source (string "CEA_CO2_Baseline_v18_2023_India_National")"""

            response = model.generate_content([prompt, image_obj])

            import json
            result_json = json.loads(response.text)
            return {"status": "success", "data": result_json}
            
        elif file.content_type == 'application/pdf':
            prompt = f"""Extract carbon data from this Document text.
            Text: "{pdf_text[:2000]}"
            
            India Emission Factors (CEA 2023):
            - Electricity: {EMISSION_FACTORS['electricity_kwh']} kg CO2e per kWh
            - Diesel transport: {EMISSION_FACTORS['diesel_litre']} kg CO2e per litre
            
            Return JSON only with: document_type (Energy_Bill or Shipping_Log), billing_month (String like "January 2024" or "Unknown"), metric (float), unit (String), calculated_co2e (float), confidence (0.0-1.0), emission_factor (float), factor_source (string "CEA_CO2_Baseline_v18_2023_India_National")"""
            
            response = model.generate_content(prompt)
            import json
            result_json = json.loads(response.text)
            return {"status": "success", "data": result_json}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/vendors")
async def get_vendors(buyer_id: str):
    if not sb_client:
        raise HTTPException(status_code=500, detail="Supabase client not initialized")
    
    try:
        rels = sb_client.table("Supply_Relationships").select("supplier_company_id").eq("buyer_company_id", buyer_id).eq("is_active", True).execute()
        supplier_ids = [r["supplier_company_id"] for r in rels.data]
        
        if not supplier_ids:
            return {"status": "success", "data": []}
            
        vendors = sb_client.table("Companies_and_Vendors").select("*").in_("id", supplier_ids).execute()
        return {"status": "success", "data": vendors.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class BuyCreditRequest(BaseModel):
    credit_id: str
    buyer_company_id: str
    tonnes_to_buy: float  # Partial purchase support — buyer picks how much they want

@app.get("/api/credits")
async def get_available_credits():
    if not sb_client:
        raise HTTPException(status_code=500, detail="Supabase client not initialized")
    
    try:
        # Query directly by credit_type prefix — stable regardless of who owns the credit.
        # Purchased credits get type "Retired / Claimed Offset" so they drop off automatically.
        credits = sb_client.table("Carbon_Credits") \
            .select("*") \
            .like("credit_type", "Verified Surplus%") \
            .execute()
        
        # Extract supplier name from: "Verified Surplus Credit — <Name> (EcoLedger Exchange)"
        result = []
        for cred in credits.data:
            cred_data = dict(cred)
            match = re.search(r"Verified Surplus Credit — (.+?) \(EcoLedger", cred["credit_type"])
            cred_data["supplier_name"] = match.group(1) if match else "Green SME"
            result.append(cred_data)
            
        return {"status": "success", "data": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/credits/buy")
async def buy_carbon_credit(req: BuyCreditRequest):
    if not sb_client:
        raise HTTPException(status_code=500, detail="Supabase client not initialized")
        
    try:
        # 1. Fetch the credit listing to validate
        credit_res = sb_client.table("Carbon_Credits").select("*").eq("id", req.credit_id).single().execute()
        if not credit_res.data:
            raise HTTPException(status_code=404, detail="Credit not found")
        
        credit = credit_res.data
        available = credit["tonnes_offset"]
        
        if req.tonnes_to_buy <= 0 or req.tonnes_to_buy > available:
            raise HTTPException(status_code=400, detail=f"Invalid quantity. Available: {available} kg")
        
        remaining = round(available - req.tonnes_to_buy, 3)
        
        # 2. Update the credit: retire fully if all consumed, else reduce quantity
        if remaining <= 0:
            sb_client.table("Carbon_Credits").update({
                "company_id": req.buyer_company_id,
                "credit_type": "Retired / Claimed Offset",
                "tonnes_offset": 0,
            }).eq("id", req.credit_id).execute()
        else:
            # Partial purchase — just reduce the available tonnes, keep listing active
            sb_client.table("Carbon_Credits").update({
                "tonnes_offset": remaining,
            }).eq("id", req.credit_id).execute()
        
        # 3. Deduct offset from buyer's total_co2e and recalculate Green/Red status
        new_co2e = 0.0
        company_res = sb_client.table("Companies_and_Vendors").select("total_co2e, carbon_cap").eq("id", req.buyer_company_id).single().execute()
        if company_res.data:
            current_co2e = company_res.data["total_co2e"] or 0
            cap = company_res.data["carbon_cap"] or 10000
            # tonnes_to_buy is in TONNES; total_co2e is in KG — convert before deducting
            kg_offset = req.tonnes_to_buy * 1000
            new_co2e = max(0.0, round(current_co2e - kg_offset, 2))
            new_status = "Red" if new_co2e > cap else "Green"
            sb_client.table("Companies_and_Vendors").update({
                "total_co2e": new_co2e,
                "status": new_status,
            }).eq("id", req.buyer_company_id).execute()
            
        return {
            "status": "success",
            "message": f"Successfully offset {req.tonnes_to_buy} tonnes CO\u2082e ({req.tonnes_to_buy * 1000:.0f} kg).",
            "new_total_co2e": new_co2e,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
