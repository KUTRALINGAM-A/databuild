import os, supabase as sb
from dotenv import load_dotenv

load_dotenv(".env")
client = sb.create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_SERVICE_KEY"))

# 1. Fetch all auth users
res = client.auth.admin.list_users()
users = getattr(res, "users", [])
if not users and isinstance(res, tuple):
    users = res[0].users

print(f"Found {len(users)} auth users.")

# 2. Fetch all companies
comps = client.table("Companies_and_Vendors").select("id, name, user_id").execute().data

# 3. Match and sync by email derived from company name
updated_count = 0
for comp in comps:
    base_name = comp["name"].lower().replace(' ', '').replace('.', '')
    expected_email = f"admin@{base_name}.com"
    
    # Find user with this email
    matching_user = next((u for u in users if u.email == expected_email), None)
    if matching_user:
        if comp["user_id"] != matching_user.id:
            print(f"SYNCING {comp['name']}: {comp['user_id']} -> {matching_user.id}")
            client.table("Companies_and_Vendors").update({"user_id": matching_user.id}).eq("id", comp["id"]).execute()
            updated_count += 1
    else:
        # User doesn't exist in auth, let's create it to be safe
        try:
            auth_res = client.auth.admin.create_user({
                "email": expected_email,
                "password": "Password123!",
                "email_confirm": True,
                "user_metadata": {"company_name": comp["name"]}
            })
            new_uid = auth_res.user.id
            if comp["user_id"] != new_uid:
                client.table("Companies_and_Vendors").update({"user_id": new_uid}).eq("id", comp["id"]).execute()
                print(f"CREATED & SYNCED {comp['name']} -> {new_uid}")
                updated_count += 1
        except Exception as e:
            print(f"Failed to create auth for {comp['name']}: {e}")

print(f"Done. Updated {updated_count} companies.")
