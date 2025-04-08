const API_URL = "http://127.0.0.1:8000";

// Cache DOM elements
const registerSection = document.getElementById("register");
const loginSection = document.getElementById("login");
const ordersSection = document.getElementById("orders");
const ordersList = document.getElementById("ordersList");
const loggedInSupplierNameSpan = document.getElementById("loggedInSupplierName");
const addProductBtn = document.getElementById("addProductBtn");
const productsListDiv = document.getElementById("productsList");
const registerForm = document.getElementById("registerForm");
const loginForm = document.getElementById("loginForm");

// --- Utility Functions ---

/**
 * @function addProductEntry
 * @description Creates and appends a new set of input fields (product name, price, minimum quantity)
 * and a "Remove Product" button to the `productsListDiv` within the registration form.
 * Adds an event listener to the newly created remove button, allowing it to remove its parent product entry row.
 * It also manages the visibility of a potential "main" remove button (though the provided HTML/JS uses per-row buttons primarily).
 * @param {void}
 * @returns {void} - Modifies the DOM within `productsListDiv`.
 */
function addProductEntry() {
    const newProductEntry = document.createElement("div");
    newProductEntry.className = "product-entry";
    newProductEntry.innerHTML = `
        <input type="text" class="product-name" placeholder="Product Name" required>
        <input type="number" class="product-price" placeholder="Price per Unit" min="0" step="0.01" required>
        <input type="number" class="product-min-qty" placeholder="Minimum Quantity" min="1" required>
        <button type="button" class="remove-product-btn">Remove Product</button>
    `;

    // Add event listener to the remove button in the new row
    const removeBtn = newProductEntry.querySelector(".remove-product-btn");
    removeBtn.addEventListener("click", function() {
        // Check if productsListDiv still exists and contains the element before removing
        if (productsListDiv && productsListDiv.contains(newProductEntry)) {
            productsListDiv.removeChild(newProductEntry);
        }
        // Optional: Hide a main remove button if no products are left (adjust if needed)
        // const mainRemoveBtn = registerForm.querySelector(".remove-product-btn"); // Be specific if there are multiple
        // if (mainRemoveBtn && productsListDiv && productsListDiv.children.length <= 1) { // Example logic
        //     mainRemoveBtn.style.display = 'none';
        // }
    });

    productsListDiv.appendChild(newProductEntry);
    // Optional: Show a main remove button (adjust selector if needed)
    // const mainRemoveBtn = registerForm.querySelector(".remove-product-btn");
    // if(mainRemoveBtn) mainRemoveBtn.style.display = 'inline-block';
}


// --- Event Listeners ---
// Add Product Button
addProductBtn.addEventListener("click", addProductEntry);

/**
 * @description Handles the submission of the supplier registration form (`registerForm`).
 * Prevents the default form submission. Gathers supplier details (company name, phone, representative name)
 * and product details (name, price, minimum quantity) from all `.product-entry` divs.
 * Validates that product fields are filled correctly. Constructs a payload with supplier and product data.
 * Sends the payload to the backend API's registration endpoint via a POST request.
 * On success, displays an alert, resets the form (including dynamically added product entries).
 * On failure, displays an error alert with details from the response.
 * @async
 * @callback registerFormSubmitHandler
 * @param {Event} e - The form submission event object.
 * @returns {Promise<void>} A promise that resolves when the registration attempt is complete.
 */
registerForm.addEventListener("submit", async function (e) {
    e.preventDefault(); // Stop the page from reload

    const companyName = document.getElementById("companyName").value;
    const phone = document.getElementById("phone").value;
    const representativeName = document.getElementById("representative_name").value;

    // Get all product entries
    const productEntries = productsListDiv.querySelectorAll(".product-entry"); // Select only within the list
    const products = [];
    let formIsValid = true; // Flag for validation

    // Loop through each product entry and collect the data
    productEntries.forEach(entry => {
        const productNameInput = entry.querySelector(".product-name");
        const priceInput = entry.querySelector(".product-price");
        const minQtyInput = entry.querySelector(".product-min-qty");

        // Basic check if inputs exist
        if (productNameInput && priceInput && minQtyInput) {
            const productName = productNameInput.value.trim();
            const pricePerItem = parseFloat(priceInput.value);
            const minimumQuantity = parseInt(minQtyInput.value);

            // Add product only if all fields are filled and valid
            if (productName && !isNaN(pricePerItem) && pricePerItem >= 0 && !isNaN(minimumQuantity) && minimumQuantity >= 1) {
                products.push({
                    product_name: productName,
                    price_per_item: pricePerItem,
                    minimum_quantity: minimumQuantity
                });
            } else {
                // If any row is invalid, mark form as invalid but continue processing others
                // to potentially gather multiple errors if backend supports it,
                // or stop here and alert user. For simplicity, we'll just flag it.
                formIsValid = false;
                 console.warn("Invalid product entry skipped:", entry);
                 // Optionally add visual feedback to the invalid row
            }
        } else {
            formIsValid = false; // Row is incomplete
             console.warn("Incomplete product entry skipped:", entry);
        }
    });

    if (!formIsValid) {
         alert("Please ensure all product fields (Name, Price >= 0, Min Qty >= 1) are correctly filled.");
         return;
    }
    if (products.length === 0) {
         alert("Please add at least one valid product.");
         return;
    }


    try {
        const response = await fetch(`${API_URL}/suppliers/register`, {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({
                company_name: companyName,
                phone: phone,
                representative_name: representativeName,
                products: products
            }),
        });

        const data = await response.json(); // Attempt to parse JSON
        if (response.ok) {
            alert(data.message || "Supplier registered successfully!");
            registerForm.reset(); // Clear form fields
            // Clear dynamic product entries (keep the first/template one if needed)
             while (productsListDiv.children.length > 1) { // Adjust if template is not the first child
                 productsListDiv.removeChild(productsListDiv.lastChild);
             }
             // Reset the template row's values if it exists and is kept
             const firstEntry = productsListDiv.querySelector(".product-entry");
             if(firstEntry) {
                 firstEntry.querySelectorAll('input').forEach(input => input.value = '');
             }
             // Hide any per-row remove buttons if they were shown dynamically based on count
             // Or hide a main remove button if applicable

        } else {
            alert(`Registration Error: ${data.detail || response.statusText}`);
        }
    } catch (error) {
        console.error("Registration Error:", error);
        alert("An unexpected error occurred during registration.");
    }
});

/**
 * @description Handles the submission of the supplier login form (`loginForm`).
 * Prevents the default form submission. Gathers the company name and phone number.
 * Sends these credentials to the backend API's login endpoint via a POST request.
 * If the login is successful (based on the API response), it calls `showOrdersView`
 * to switch the UI to the orders view for the logged-in supplier.
 * Displays success or error alerts based on the API response.
 * @async
 * @callback loginFormSubmitHandler
 * @param {Event} e - The form submission event object.
 * @returns {Promise<void>} A promise that resolves when the login attempt is complete.
 */
loginForm.addEventListener("submit", async function (e) {
    e.preventDefault(); // Stop page reload

    const companyName = document.getElementById("loginCompanyName").value.trim();
    const phone = document.getElementById("loginPhone").value.trim();

     if (!companyName || !phone) {
         alert("Please enter both Company Name and Phone Number.");
         return;
     }

    try {
        const response = await fetch(`${API_URL}/suppliers/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                company_name: companyName,
                phone: phone
            })
        });

        const data = await response.json(); // Attempt to parse JSON

        if (response.ok) {
            alert(data.message || "Login successful!");
            // Pass the successfully logged-in company name
            await showOrdersView(companyName); // Load orders and switch view
        } else {
            alert(`Login Error: ${data.detail || response.statusText}`);
        }
    } catch (error) {
        console.error("Login Error:", error);
        alert("An unexpected error occurred during login.");
    }
});


// --- View Logic ---

/**
 * @function showOrdersView
 * @description Switches the user interface to display the orders section for the logged-in supplier.
 * It hides the registration and login sections, makes the orders section visible,
 * displays the supplier's company name, and triggers loading of their orders by calling `loadOrders`.
 * @async
 * @param {string} companyName - The name of the supplier who has logged in.
 * @returns {Promise<void>} A promise that resolves when the view is switched and order loading has been initiated.
 */
async function showOrdersView(companyName) {
    loggedInSupplierNameSpan.textContent = companyName; // Display supplier name

    // Hide login/register sections and show orders section
    if(loginSection) loginSection.style.display = "none";
    if(registerSection) registerSection.style.display = "none";
    if(ordersSection) ordersSection.style.display = "block";

    await loadOrders(companyName); // Load orders for the logged-in supplier
}

/**
 * @function loadOrders
 * @description Fetches orders specifically for the given supplier company name from the backend API.
 * Displays a loading message in the `ordersList` element initially.
 * Upon receiving the response, it clears the loading message and populates the `ordersList`
 * with list items (`<li>`), each representing an order.
 * Each list item shows order details (ID, products, status, total amount).
 * If an order has the status 'Pending', an "Approve Order" button is added, which calls `approveOrder` when clicked.
 * If no orders are found, it displays an appropriate message. Handles and displays errors if the API call fails.
 * @async
 * @param {string} companyName - The name of the supplier whose orders should be fetched. The name is URL-encoded before being sent.
 * @returns {Promise<void>} A promise that resolves when orders are loaded and displayed, or rejects on error.
 */
async function loadOrders(companyName) {
    ordersList.innerHTML = "<p>Loading orders...</p>"; // Show loading indicator

    try {
        // Ensure companyName is properly encoded for the URL path
        const response = await fetch(`${API_URL}/orders/supplier/${encodeURIComponent(companyName)}`);
        if (!response.ok) {
            // Try to get error detail from response body
            let errorDetail = response.statusText;
            try {
                const errorData = await response.json();
                errorDetail = errorData.detail || errorDetail;
            } catch (parseError) {
                // Ignore if response is not JSON
            }
            throw new Error(`Error loading orders: ${errorDetail} (Status: ${response.status})`);
        }

        const data = await response.json();
        ordersList.innerHTML = ""; // Clear loading/previous content

        if (data.orders && data.orders.length > 0) {
            data.orders.forEach(order => {
                const li = document.createElement("li");
                li.dataset.orderId = order.order_reference_id; // Store ref id for easy access
                li.innerHTML = `
                    <p><strong>Order ID:</strong> ${order.order_reference_id}</p>
                    <p><strong>Products:</strong> ${order.items.map(item => `${item.product_name} (Qty: ${item.quantity}, Price/Unit: ${item.price_per_item.toFixed(2)})`).join("<br>")}</p>
                    <p><strong>Status:</strong> <span class="order-status status-${order.status.toLowerCase().replace(' ', '-')}">${order.status}</span></p>
                    <p><strong>Total Amount:</strong> ${order.total_amount ? order.total_amount.toFixed(2) : 'Not calculated'}</p>
                    <div class="order-actions">
                        ${order.status === "Pending" ?
                          // IMPORTANT: Ensure approveOrder is globally accessible or use event listeners
                          `<button class="approve-btn" onclick="approveOrder('${order.order_reference_id}')">Approve Order</button>` : ""}
                   </div>
                `;
                // Apply status styling class (also done via inline class above now)
                const statusSpan = li.querySelector('.order-status');
                // statusSpan?.classList.add(`status-${order.status.toLowerCase().replace(' ', '-')}`); // Already added inline

                ordersList.appendChild(li);
            });
        } else {
            ordersList.innerHTML = "<p>No orders to display for this supplier.</p>";
        }
    } catch (error) {
        console.error("Error loading orders:", error);
        ordersList.innerHTML = `<p style="color: red;">${error.message || "Error loading orders."}</p>`;
    }
}


/**
 * @function approveOrder
 * @description Approves a specific order by sending a PUT request to the backend API.
 * The order status is expected to change from 'Pending' to 'In Process'.
 * It first prompts the supplier for confirmation.
 * If confirmed and the API call is successful, it displays a success message and refreshes the orders list
 * for the current supplier by calling `loadOrders` again (retrieving the company name from the login form input field - ideally, store logged-in state better).
 * If the API call fails or an error occurs, it displays an error alert.
 * Note: This function needs to be accessible globally if called directly via `onclick` attributes.
 * @async
 * @param {string} orderRefId - The reference ID of the order to be approved.
 * @returns {Promise<void>} A promise that resolves when the approval attempt is complete.
 */
async function approveOrder(orderRefId) {
    if (!confirm(`Are you sure you want to approve order ${orderRefId}?`)) {
        return;
    }

    try {
        // Note: The original endpoint `/orders/approve/{order_id}?order_ref_id=${orderRefId}` seems redundant.
        // Assuming the backend correctly uses the query parameter or a path parameter like `/orders/${orderRefId}/approve`.
        // Using the query parameter version as provided. Adjust if the API endpoint differs.
        const response = await fetch(`${API_URL}/orders/approve/placeholder?order_ref_id=${orderRefId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" }
             // No body is typically needed for this type of update if the ID is in the URL
        });

        const data = await response.json(); // Attempt to parse JSON response

        if (response.ok) {
            alert(data.message || "Order approved successfully!");
            // Reload orders for the currently viewed supplier
            // Retrieving company name from the login input is not ideal after login.
            // It's better to store the logged-in supplier's name globally or in session storage.
            const companyName = loggedInSupplierNameSpan.textContent; // Use the displayed name
            if (companyName) {
                await loadOrders(companyName);
            } else {
                console.error("Could not determine the company name to reload orders.");
                // Maybe force a page reload or redirect to login as a fallback
            }
        } else {
            alert(`Error approving order: ${data.detail || response.statusText}`);
        }
    } catch (error) {
        console.error("Error approving order:", error);
        alert("An unexpected error occurred while approving the order.");
    }
}


// Initially hide the orders section until login
// Ensure this runs after the DOM is ready if the script is in <head>
// If script is at the end of <body>, this is fine.
if (ordersSection) {
    ordersSection.style.display = "none";
} else {
     // Add defensive check for DOM readiness if needed
     document.addEventListener('DOMContentLoaded', () => {
         const ordersSectionElem = document.getElementById("orders");
         if(ordersSectionElem) ordersSectionElem.style.display = "none";
     });
}