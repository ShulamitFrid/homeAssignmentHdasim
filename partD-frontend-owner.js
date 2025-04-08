const API_URL = "http://127.0.0.1:8000";

// DOM Elements
const supplierSelect = document.getElementById('supplierSelect');
const productsForOrderDiv = document.getElementById('productsForOrder');
const newOrderForm = document.getElementById('newOrderForm');
const allOrdersListDiv = document.getElementById('allOrdersList');
const refreshOrdersBtn = document.getElementById('refreshOrdersBtn');

let suppliersData = []; // To store fetched suppliers data including products

// --- Functions ---

/**
 * @function fetchSuppliers
 * @description Fetches the list of all suppliers from the backend API.
 * Populates the supplier selection dropdown (`supplierSelect`) with the fetched company names.
 * Stores the full supplier data (including products) in the `suppliersData` array for later use.
 * Handles potential errors during the API request and updates the dropdown accordingly.
 * @async
 * @param {void}
 * @returns {Promise<void>} A promise that resolves when suppliers are fetched and the dropdown is populated, or rejects on error.
 */
async function fetchSuppliers() {
    try {
        const response = await fetch(`${API_URL}/suppliers`);
        if (!response.ok) throw new Error('Failed to fetch suppliers');
        const data = await response.json();
        suppliersData = data.suppliers || []; // Store the data

        supplierSelect.innerHTML = '<option value="">Select supplier...</option>'; // Clear previous options
        suppliersData.forEach(supplier => {
            // Ensure supplier object and company_name exist
            if (supplier && supplier.company_name) {
                const option = document.createElement('option');
                option.value = supplier.company_name; // Use company name as value
                option.textContent = supplier.company_name;
                // Store the full supplier data reference (optional but useful)
                option.dataset.supplierInfo = JSON.stringify(supplier);
                supplierSelect.appendChild(option);
            } else {
                 console.warn("Skipping supplier with missing data:", supplier);
            }
        });
    } catch (error) {
        console.error("Error fetching suppliers:", error);
        supplierSelect.innerHTML = '<option value="">Error loading suppliers</option>';
    }
}

/**
 * @function displayProductsForOrder
 * @description Displays the products available from the currently selected supplier in the `productsForOrderDiv`.
 * It retrieves the selected supplier's data from the `suppliersData` array based on the value of `supplierSelect`.
 * For each product, it creates a checkbox, label (with name and price), and a disabled quantity input field.
 * An event listener is added to each checkbox to enable/disable the corresponding quantity input and set a default value of 1 when checked.
 * If no supplier is selected or the selected supplier has no products, it displays an appropriate message.
 * @param {void} - Reads the value from `supplierSelect` and uses the global `suppliersData`.
 * @returns {void} - Modifies the DOM within `productsForOrderDiv`.
 */
function displayProductsForOrder() {
    const selectedSupplierName = supplierSelect.value;
    productsForOrderDiv.innerHTML = ''; // Clear previous products

    if (!selectedSupplierName) {
        productsForOrderDiv.innerHTML = '<p>Please select a supplier to see products.</p>';
        return;
    }

     // Find the selected supplier's data
     const selectedSupplier = suppliersData.find(s => s.company_name === selectedSupplierName);

     if (selectedSupplier && selectedSupplier.products && selectedSupplier.products.length > 0) {
        selectedSupplier.products.forEach(product => {
            const productDiv = document.createElement('div');
            productDiv.classList.add('product-order-item'); // Add a class for styling
            productDiv.innerHTML = `
                <label>
                    <input type="checkbox" name="product" value="${product.product_name}" data-price="${product.price_per_item}">
                    ${product.product_name} (Price: ${product.price_per_item.toFixed(2)})
                </label>
                <input type="number" name="quantity_${product.product_name}" min="1" placeholder="Qty" style="width: 70px; margin-right: 10px;" disabled>
            `;
            // Enable quantity input when checkbox is checked
            const checkbox = productDiv.querySelector('input[type="checkbox"]');
            const quantityInput = productDiv.querySelector('input[type="number"]');
            checkbox.addEventListener('change', () => {
                quantityInput.disabled = !checkbox.checked;
                if (!checkbox.checked) {
                    quantityInput.value = ''; // Clear quantity if unchecked
                } else {
                    quantityInput.value = '1'; // Default to 1 when checked
                }
            });
            productsForOrderDiv.appendChild(productDiv);
        });
    } else {
        productsForOrderDiv.innerHTML = '<p>No products found for this supplier.</p>';
    }
}

/**
 * @function submitNewOrder
 * @description Handles the submission of the new order form (`newOrderForm`).
 * It prevents the default form submission behavior. Validates that a supplier and at least one product with a valid quantity (>0) are selected.
 * Constructs an order payload containing the supplier name and an array of items (product name, quantity, price).
 * Sends the order payload to the backend API via a POST request.
 * On success, displays an alert with the order reference ID, resets the form, clears the product display area, and refreshes the list of all orders by calling `loadAllOrders`.
 * On failure, displays an error alert.
 * @async
 * @param {Event} event - The form submission event object.
 * @returns {Promise<void>} A promise that resolves when the order submission attempt is complete, or rejects on unexpected errors.
 */
async function submitNewOrder(event) {
    event.preventDefault();
    const selectedSupplierName = supplierSelect.value;
    if (!selectedSupplierName) {
        alert("Please select a supplier.");
        return;
    }

    const items = [];
    const checkedProducts = productsForOrderDiv.querySelectorAll('input[type="checkbox"]:checked');

    if (checkedProducts.length === 0) {
        alert("Please select at least one product to order.");
        return;
    }

    checkedProducts.forEach(checkbox => {
        const productName = checkbox.value;
        const quantityInput = productsForOrderDiv.querySelector(`input[name="quantity_${productName}"]`);
        const quantity = parseInt(quantityInput.value);
        const price = parseFloat(checkbox.dataset.price);

        if (quantity > 0) {
            items.push({
                product_name: productName,
                quantity: quantity,
                price_per_item: price // Send price from frontend data
            });
        } else {
             console.warn(`Invalid quantity for ${productName}`);
         }
    });

     if (items.length === 0) {
         alert("Please ensure all selected products have a quantity greater than 0.");
         return;
     }


    const orderPayload = {
        supplier_name: selectedSupplierName,
        items: items
        // status and total_amount will be set by the backend
    };

    try {
        const response = await fetch(`${API_URL}/orders/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(orderPayload)
        });

        const data = await response.json();

        if (response.ok) {
            alert(`Order ${data.order_reference_id || ''} created successfully!`);
            newOrderForm.reset(); // Clear the form
            productsForOrderDiv.innerHTML = '<p>Please select a supplier to see products.</p>'; // Reset products display
            loadAllOrders(); // Refresh the orders list
        } else {
            alert(`Error creating order: ${data.detail || response.statusText}`);
        }
    } catch (error) {
        console.error("Error submitting order:", error);
        alert("An unexpected error occurred while submitting the order.");
    }
}

/**
 * @function loadAllOrders
 * @description Fetches all orders from the backend API and displays them in a table within the `allOrdersListDiv`.
 * It shows a loading message initially and replaces it with the order table or a "no orders found" message.
 * For each order, it displays the reference ID, supplier name, item details, total amount, and status.
 * It dynamically adds CSS rules to style the status badges based on the order status (Pending, In Process, Completed).
 * If an order has the status 'In Process', it adds a "Mark as Completed" button, which calls `markOrderComplete` when clicked.
 * Handles potential errors during the API request and displays an error message.
 * @async
 * @param {void}
 * @returns {Promise<void>} A promise that resolves when the orders are loaded and displayed, or rejects on error.
 */
async function loadAllOrders() {
    allOrdersListDiv.innerHTML = '<p>Loading orders...</p>';
    try {
        const response = await fetch(`${API_URL}/orders/`);
        if (!response.ok) throw new Error('Failed to fetch orders');
        const data = await response.json();
        const orders = data.orders || [];

        allOrdersListDiv.innerHTML = ''; // Clear previous list

        if (orders.length === 0) {
            allOrdersListDiv.innerHTML = '<p>No orders found.</p>';
            return;
        }

        const ordersTable = document.createElement('table');
        ordersTable.innerHTML = `
            <thead>
                <tr>
                    <th>Order ID</th>
                    <th>Supplier</th>
                    <th>Order Details</th>
                    <th>Total Amount</th>
                    <th>Status</th>
                </tr>
            </thead>
            <tbody>
            </tbody>
        `;
        const tbody = ordersTable.querySelector('tbody');

        orders.forEach(order => {
            const row = tbody.insertRow();
            row.innerHTML = `
                <td>${order.order_reference_id}</td>
                <td>${order.supplier_name}</td>
                <td>${order.items.map(item => `${item.product_name} (x${item.quantity})`).join(', ')}</td>
                <td>${order.total_amount ? order.total_amount.toFixed(2) : 'N/A'}</td>
                <td><span class="order-status">${order.status}</span></td>
                <td class="order-actions">
                    ${order.status === 'In Process' ?
                        // IMPORTANT: Ensure markOrderComplete is globally accessible or use event listeners
                        `<button onclick="markOrderComplete('${order.order_reference_id}')">Confirm Receipt (Complete)</button>`
                        : '' // No action for other statuses from owner perspective
                    }
                </td>
            `;
             // Apply status styling
             const statusSpan = row.querySelector('.order-status');
             if (statusSpan) { // Check if element exists
                 statusSpan.classList.add(`status-${order.status.toLowerCase().replace(' ', '-')}`);
             } else {
                 console.warn("Could not find status span for order:", order.order_reference_id);
             }
        });

         // Dynamically add CSS rules for status if not already present
         const styleSheet = document.styleSheets[0];
         try {
             const rules = [...styleSheet.cssRules].map(r => r.selectorText);
             if (!rules.includes('.status-pending')) {
                 styleSheet.insertRule('.status-pending { background-color: #ffc107; color: #333; padding: 2px 5px; border-radius: 3px; display: inline-block; text-align: center;}', styleSheet.cssRules.length);
             }
             if (!rules.includes('.status-in-process')) {
                 styleSheet.insertRule('.status-in-process { background-color: #17a2b8; color: white; padding: 2px 5px; border-radius: 3px; display: inline-block; text-align: center;}', styleSheet.cssRules.length);
             }
             if (!rules.includes('.status-completed')) {
                 styleSheet.insertRule('.status-completed { background-color: #28a745; color: white; padding: 2px 5px; border-radius: 3px; display: inline-block; text-align: center;}', styleSheet.cssRules.length);
             }
         } catch(e) {
             console.warn("Could not insert dynamic CSS rules for status:", e);
         }


        allOrdersListDiv.appendChild(ordersTable);

    } catch (error) {
        console.error("Error loading orders:", error);
        allOrdersListDiv.innerHTML = '<p style="color: red;">Error loading orders.</p>';
    }
}

/**
 * @function markOrderComplete
 * @description Marks a specific order as 'Completed' by sending a PUT request to the backend API.
 * It first prompts the user for confirmation.
 * If confirmed and the API call is successful, it displays a success message and refreshes the orders list using `loadAllOrders` to reflect the change.
 * If the API call fails or an error occurs, it displays an error alert.
 * Note: This function needs to be accessible globally if called directly via `onclick` attributes.
 * @async
 * @param {string} orderRefId - The reference ID of the order to be marked as complete.
 * @returns {Promise<void>} A promise that resolves when the update attempt is complete, or rejects on unexpected errors.
 */
async function markOrderComplete(orderRefId) {
    if (!confirm(`Confirm receipt of order ${orderRefId}? This will mark it as 'Completed'.`)) {
        return;
    }

    try {
        // Note: The original endpoint `/orders/complete/{order_id}?order_ref_id=${orderRefId}` seems redundant.
        // Assuming the backend correctly uses the query parameter or a path parameter like `/orders/${orderRefId}/complete`.
        // Using the query parameter version as provided in the original code. Adjust if the API endpoint differs.
        const response = await fetch(`${API_URL}/orders/complete/placeholder?order_ref_id=${orderRefId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' }
            // No body is typically needed for this type of update if the ID is in the URL
        });

        const data = await response.json(); // Attempt to parse JSON regardless of status code

        if (response.ok) {
            alert(data.message || 'Order marked as completed!');
            loadAllOrders(); // Refresh the list
        } else {
            // Use detail from JSON response if available, otherwise fallback to statusText
            alert(`Error marking order as complete: ${data.detail || response.statusText}`);
        }
    } catch (error) {
        console.error("Error completing order:", error);
        alert("An unexpected error occurred while marking the order as complete.");
    }
}


// --- Initial Load and Event Listeners ---

// Load initial data when the page loads
document.addEventListener('DOMContentLoaded', () => {
    fetchSuppliers();
    loadAllOrders();
});

// Update products when supplier selection changes
supplierSelect.addEventListener('change', displayProductsForOrder);

// Handle new order form submission
newOrderForm.addEventListener('submit', submitNewOrder);

// Refresh button listener
refreshOrdersBtn.addEventListener('click', loadAllOrders);