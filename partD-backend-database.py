from motor.motor_asyncio import AsyncIOMotorClient
from pymongo.server_api import ServerApi

uri = "mongodb+srv://shulamitfried100:HwyzHdTSMvsnQUst@cluster0.deaa0mi.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0"

# --- Establish Connection ---
try:
    # Create async client and connect to the server
    client = AsyncIOMotorClient(uri, server_api=ServerApi('1'))
    db = client["DB"]
    suppliers_collection = db["suppliers"]
    orders_collection = db["orders"]

    print("Connected to MongoDB!")
except Exception as e:
    print(f"Failed to connect to MongoDB: {e}")