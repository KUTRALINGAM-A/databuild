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
    allow_origins=["*"], # For hackathon speed
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

class ExtractionResult(BaseModel):
    document_type: str
    metric: float
    unit: str
    calculated_co2e: float
    confidence: float

@app.get("/")
async def health_check():
    return {"status": "ok", "message": "Eco-Ledger Backend is Operational."}

@app.post("/api/upload")
async def process_document(file: UploadFile = File(...)):
    if not file.content_type.startswith(('image/', 'application/pdf')):
        raise HTTPException(status_code=400, detail="Only Images and PDFs supported")

    content = await file.read()
    
    # MOCK BEHAVIOR if NO OpenAI key is provided (Crucial for Hackathon continuous testing)
    if not client:
        print("Mock extraction: No OPENAI_API_KEY found.")
        return {
            "status": "success",
            "data": ExtractionResult(
                document_type="Energy_Bill",
                metric=1420.0,
                unit="KWh",
                calculated_co2e=568.0, # Approx 0.4kg CO2e per KWh
                confidence=0.98
            ).model_dump()
        }

    # REAL Open AI Extraction path
    try:
        # Check if it's an image. If it's a PDF, ideally we'd use PyMuPDF or pdf2image,
        # but for this hackathon speedrun, we will attempt to extract text using vision if it's an image
        if file.content_type.startswith('image/'):
            base64_image = base64.b64encode(content).decode('utf-8')
            response = await client.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {
                        "role": "user",
                        "content": [
                            {"type": "text", "text": "Extract the total energy consumption (KWh) or shipping volume (Liters) from this bill. Calculate exact CO2e (KWh * 0.4 kg, Liters * 2.6 kg). Return JSON only containing: document_type (Energy_Bill or Shipping_Log), metric (float), unit (KWh or Liters), calculated_co2e (float), confidence (0.0 to 1.0)."},
                            {"type": "image_url", "image_url": {"url": f"data:{file.content_type};base64,{base64_image}"}}
                        ]
                    }
                ],
                response_format={ "type": "json_object" }
            )
            
            # Here we just pass the LLM interpretation through
            import json
            result_json = json.loads(response.choices[0].message.content)
            
            return {
                "status": "success",
                "data": result_json
            }
        else:
            # If PDF, return mock (Full PDF parsing requires PyMuPDF which isn't installed to maintain speed)
            return {
                "status": "success",
                "data": {
                    "document_type": "Shipping_Log",
                    "metric": 5000,
                    "unit": "Liters",
                    "calculated_co2e": 13000,
                    "mock": True
                }
            }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
