from fastapi import FastAPI, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
from database import suppliers_collection, orders_collection
from models import Supplier, SupplierLogin, Order
from bson import ObjectId
from typing import Dict, Any

app = FastAPI()

origins = [
    "http://localhost",
    "http://localhost:8080",
    "http://127.0.0.1:5500",
    "null",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def serialize_doc(doc: Dict[str, Any]) -> Dict[str, Any]:
    """
    Serialize a MongoDB document by converting the ObjectId to string.

    Parameters:
    - doc (Dict[str, Any]): The MongoDB document to serialize.

    Returns:
    - Dict[str, Any]: The serialized document with string 'id' instead of ObjectId.
    """
    if doc and "_id" in doc and isinstance(doc["_id"], ObjectId):
        doc["_id"] = str(doc["_id"])
    return doc

@app.get("/")
async def root():
    """
    Root endpoint for checking server status.

    Returns:
    - dict: Welcome message.
    """
    return {"message": "Welcome to Grocery Management System!"}

# === Supplier Endpoints ===

@app.post("/suppliers/register")
async def register_supplier(supplier: Supplier):
    """
    Register a new supplier.

    Parameters:
    - supplier (Supplier): Supplier data submitted from frontend.

    Returns:
    - dict: Success message or error if supplier already exists.
    """
    try:
        supplier_dict = supplier.model_dump()
        existing_supplier = await suppliers_collection.find_one({"company_name": supplier.company_name})
        if existing_supplier:
            raise HTTPException(status_code=400, detail="Supplier already exists")
        await suppliers_collection.insert_one(supplier_dict)
        return {"message": "Supplier registered successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@app.post("/suppliers/login")
async def login_supplier(login_data: SupplierLogin = Body(...)):
    """
    Log in an existing supplier.

    Parameters:
    - login_data (SupplierLogin): Supplier credentials including company_name and phone.

    Returns:
    - dict: Login status message.
    """
    try:
        supplier = await suppliers_collection.find_one({
            "company_name": login_data.company_name,
            "phone": login_data.phone
        })
        if not supplier:
            raise HTTPException(status_code=401, detail="Supplier doesn't exist")
        return {"message": "Login successful"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@app.get("/suppliers")
async def get_all_suppliers():
    """
    Retrieve all suppliers from the database.

    Returns:
    - dict: A list of all registered suppliers.
    """
    try:
        suppliers = await suppliers_collection.find().to_list(length=None)
        serialized_suppliers = [serialize_doc(supplier) for supplier in suppliers]
        return {"suppliers": serialized_suppliers}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

# === Order Endpoints ===

@app.post("/orders/")
async def place_order(order: Order):
    """
    Place a new order with items and quantities.

    Parameters:
    - order (Order): The order data including supplier, items, and reference ID.

    Returns:
    - dict: Confirmation message with reference ID.
    """
    try:
        order_dict = order.model_dump()
        total = sum(item.quantity * item.price_per_item for item in order.items)
        order_dict["total_amount"] = total
        order_dict["status"] = "Pending"
        insert_result = await orders_collection.insert_one(order_dict)
        if insert_result.acknowledged:
            return {
                "message": "Order placed successfully",
                "order_reference_id": order_dict["order_reference_id"]
            }
        else:
            raise HTTPException(status_code=500,
                                detail="Database did not acknowledge the order insertion.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@app.get("/orders/")
async def get_all_orders():
    """
    Retrieve all orders from the database.

    Returns:
    - dict: A list of all orders including completed and pending.
    """
    try:
        orders = await orders_collection.find().to_list(length=None)
        serialized_orders = [Order.model_validate(serialize_doc(o)) for o in orders]
        return {"orders": serialized_orders}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@app.get("/orders/supplier/{company_name}")
async def get_supplier_orders(company_name: str):
    """
    Retrieve all orders placed to a specific supplier.

    Parameters:
    - company_name (str): The name of the supplier.

    Returns:
    - dict: A list of orders for the given supplier.
    """
    try:
        orders = await orders_collection.find({"supplier_name": company_name}).to_list(length=None)
        serialized_orders = [Order.model_validate(serialize_doc(o)) for o in orders]
        return {"orders": serialized_orders}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@app.put("/orders/approve/{order_id}")
async def approve_order(order_ref_id: str):
    """
    Approve a pending order and move it to 'In Process' status.

    Parameters:
    - order_ref_id (str): The reference ID of the order.

    Returns:
    - dict: Confirmation message if order status was updated.
    """
    try:
        result = await orders_collection.update_one(
            {"order_reference_id": order_ref_id, "status": "Pending"},
            {"$set": {"status": "In Process"}}
        )

        if result.modified_count == 0:
            raise HTTPException(status_code=404, detail="Order not found")

        return {"message": "Order approved"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@app.put("/orders/complete/{order_id}")
async def complete_order(order_ref_id: str):
    """
    Mark an 'In Process' order as 'Completed'.

    Parameters:
    - order_ref_id (str): The reference ID of the order.

    Returns:
    - dict: Confirmation message if the order status was successfully updated.
    """
    try:
        result = await orders_collection.update_one(
            {
                "order_reference_id": order_ref_id,
                "status": "In Process"
            },
            {
                "$set": {"status": "Completed"}
            }
        )

        if result.modified_count == 0:
            raise HTTPException(status_code=404, detail="Order not found")

        return {"message": "Order completed"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")
