import os
import io
import base64
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
import supabase
from openai import AsyncOpenAI

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

# Initialize OpenAI Client
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
client = AsyncOpenAI(api_key=OPENAI_API_KEY) if OPENAI_API_KEY else None

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
    metric: float
    unit: str
    calculated_co2e: float
    confidence: float
    emission_factor: float
    factor_source: str

@app.get("/")
async def health_check():
    return {"status": "ok", "message": "Eco-Ledger Backend is Operational."}

@app.post("/api/upload")
async def process_document(file: UploadFile = File(...)):
    if not file.content_type.startswith(('image/', 'application/pdf')):
        raise HTTPException(status_code=400, detail="Only Images and PDFs supported")

    content = await file.read()

    # MOCK BEHAVIOR if NO OpenAI key (for continuous hackathon testing)
    if not client:
        print("Mock extraction: No OPENAI_API_KEY found.")
        ef = EMISSION_FACTORS["electricity_kwh"]
        mock_metric = 1420.0
        return {
            "status": "success",
            "data": ExtractionResult(
                document_type="Energy_Bill",
                metric=mock_metric,
                unit="KWh",
                calculated_co2e=round(mock_metric * ef, 2),
                confidence=0.98,
                emission_factor=ef,
                factor_source=FACTOR_SOURCE
            ).model_dump()
        }

    # REAL OpenAI extraction path
    try:
        if file.content_type.startswith('image/'):
            base64_image = base64.b64encode(content).decode('utf-8')
            prompt = f"""Extract carbon data from this Indian energy bill or shipping document.

India Emission Factors (CEA 2023):
- Electricity: {EMISSION_FACTORS['electricity_kwh']} kg CO2e per kWh
- Diesel transport: {EMISSION_FACTORS['diesel_litre']} kg CO2e per litre

Instructions:
1. Identify if this is an Energy_Bill or Shipping_Log
2. Extract the total consumption (KWh for energy, Litres for shipping)
3. Calculate CO2e using the Indian emission factors above
4. Return JSON only with: document_type, metric (float), unit, calculated_co2e (float), confidence (0.0-1.0), emission_factor (float), factor_source (string "CEA_CO2_Baseline_v18_2023_India_National")"""

            response = await client.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {
                        "role": "user",
                        "content": [
                            {"type": "text", "text": prompt},
                            {"type": "image_url", "image_url": {"url": f"data:{file.content_type};base64,{base64_image}"}}
                        ]
                    }
                ],
                response_format={"type": "json_object"}
            )

            import json
            result_json = json.loads(response.choices[0].message.content)
            return {"status": "success", "data": result_json}

        else:
            # PDF mock (PyMuPDF not installed for speed)
            ef = EMISSION_FACTORS["diesel_litre"]
            mock_metric = 5000.0
            return {
                "status": "success",
                "data": {
                    "document_type": "Shipping_Log",
                    "metric": mock_metric,
                    "unit": "Litres",
                    "calculated_co2e": round(mock_metric * ef, 2),
                    "emission_factor": ef,
                    "factor_source": FACTOR_SOURCE,
                    "mock": True
                }
            }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/vendors")
async def get_vendors(buyer_id: str):
    if not sb_client:
        raise HTTPException(status_code=500, detail="Supabase client not initialized")
    
    try:
        # Step 1: Get supplier IDs
        rels = sb_client.table("Supply_Relationships").select("supplier_company_id").eq("buyer_company_id", buyer_id).eq("is_active", True).execute()
        supplier_ids = [r["supplier_company_id"] for r in rels.data]
        
        if not supplier_ids:
            return {"status": "success", "data": []}
            
        # Step 2: Get company details (bypassing RLS with service_role)
        vendors = sb_client.table("Companies_and_Vendors").select("*").in_("id", supplier_ids).execute()
        return {"status": "success", "data": vendors.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
