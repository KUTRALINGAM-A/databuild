import os, requests
from dotenv import load_dotenv
import supabase as sb

load_dotenv(".env")
client = sb.create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_SERVICE_KEY"))

comp = client.table("Companies_and_Vendors").select("id").eq("name", "Apex Manufacturing").execute().data[0]
print(f"Apex ID: {comp['id']}")
url = f"http://localhost:8000/api/vendors?buyer_id={comp['id']}"
print(f"Fetching {url}")

res = requests.get(url)
print(f"Status: {res.status_code}")
try:
    data = res.json()
    print(f"Response: {data}")
    print(f"Length: {len(data.get('data', []))}")
except Exception as e:
    print(res.text)
