import os
from supabase import create_client, Client
from dotenv import load_dotenv

# Load the environment variables from your .env file
load_dotenv()

url: str = os.environ.get("SUPABASE_URL")
key: str = os.environ.get("SUPABASE_SECRET_KEY")

if not url or not key:
    raise ValueError("Supabase credentials not found in environment variables")

# This creates the connection engine we will use everywhere else
supabase: Client = create_client(url, key)