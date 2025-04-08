import uuid
from pydantic import BaseModel, Field
from typing import List, Optional

class ProductItem(BaseModel):
    """
    Represents a single product offered by a supplier.

    Attributes:
        product_name (str): Name of the product.
        price_per_item (float): Price per single unit of the product.
        minimum_quantity (int): Minimum quantity required for an order.
    """
    product_name: str
    price_per_item: float
    minimum_quantity: int

class Supplier(BaseModel):
    """
    Represents a supplier and their details.

    Attributes:
        company_name (str): Name of the supplier's company.
        phone (str): Contact phone number of the supplier.
        representative_name (str): Name of the supplier's representative.
        products (List[ProductItem]): List of products offered by the supplier.
    """
    company_name: str
    phone: str
    representative_name: str
    products: List[ProductItem]

class SupplierLogin(BaseModel):
    """
    Model used for supplier login.

    Attributes:
        company_name (str): Name of the supplier's company.
        phone (str): Contact phone number used for authentication.
    """
    company_name: str
    phone: str

class OrderItem(BaseModel):
    """
    Represents a single item within an order.

    Attributes:
        product_name (str): Name of the ordered product.
        quantity (int): Quantity of the product ordered.
        price_per_item (float): Price per single unit of the product at the time of ordering.
    """
    product_name: str
    quantity: int
    price_per_item: float

class Order(BaseModel):
    """
    Represents a complete order placed by a supplier.

    Attributes:
        order_reference_id (str): Unique reference ID for the order. Automatically generated.
        supplier_name (str): Name of the supplier who placed the order.
        items (List[OrderItem]): List of items included in the order.
        status (str): Current status of the order (e.g., Pending, In Process, Completed).
        total_amount (Optional[float]): Total amount of the order, calculated automatically.
    """
    order_reference_id: str = Field(default_factory=lambda: f"ORD-{uuid.uuid4().hex[:8].upper()}")
    supplier_name: str
    items: List[OrderItem]
    status: str = "Pending"
    total_amount: Optional[float] = 0.0
