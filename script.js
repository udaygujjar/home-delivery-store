document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('item-form');
    const itemsContainer = document.getElementById('items-container');
    const loginBtn = document.getElementById('login-btn');
    const logoutBtn = document.getElementById('logout-btn');
    const resetPasswordBtn = document.getElementById('reset-password-btn');
    const addItemSection = document.getElementById('add-item');
    const modal = document.getElementById('item-modal');
    const modalContent = document.getElementById('modal-content');
    const closeBtn = document.querySelector('.close');
    const customerForm = document.getElementById('customer-form');
    const orderForm = document.getElementById('order-form');
    const cancelOrderBtn = document.getElementById('cancel-order');
    const paymentOptions = document.getElementById('payment-options');
    const onlinePaymentBtn = document.getElementById('online-payment');
    const codPaymentBtn = document.getElementById('cod-payment');
    const backToFormBtn = document.getElementById('back-to-form');
    const onlinePaymentSection = document.getElementById('online-payment-section');
    const placeOrderOnlineBtn = document.getElementById('place-order-online');
    const backToPaymentBtn = document.getElementById('back-to-payment');
    const adminDashboard = document.getElementById('admin-dashboard');
    const ordersContainer = document.getElementById('orders-container');
    const helpUsBtn = document.getElementById('help-us-btn');
    const successModal = document.getElementById('success-modal');
    const successCloseBtn = document.getElementById('success-close');
    const searchInput = document.getElementById('search-input');
    const categoryFilter = document.getElementById('category-filter');
    const cartIcon = document.getElementById('cart-icon');
    const cartCount = document.getElementById('cart-count');
    const cartSection = document.getElementById('cart-section');
    const cartItems = document.getElementById('cart-items');
    const cartTotal = document.getElementById('cart-total');
    const checkoutBtn = document.getElementById('checkout-btn');
    const continueShoppingBtn = document.getElementById('continue-shopping-btn');

    let isAdmin = false;
    let items = [];
    let orders = JSON.parse(localStorage.getItem('orders')) || [];
    let cart = JSON.parse(localStorage.getItem('cart')) || [];
    let currentItem = null;
    let currentCustomer = null;
    let adminPassword = 'admin123'; // Default, will be loaded from Firestore
    let resetAttempts = 0;
    let resetLockTime = localStorage.getItem('resetLockTime');
    let loginAttempts = 0;
    let loginLockTime = localStorage.getItem('loginLockTime');
    let filteredItems = [];
    let countdownInterval;

    // Simple admin login (in real app, use proper authentication)
    loginBtn.addEventListener('click', function() {
        if (loginLockTime && Date.now() < parseInt(loginLockTime)) {
            const remainingTime = Math.ceil((parseInt(loginLockTime) - Date.now()) / 1000);
            alert(`Login is locked due to too many failed attempts. Try again in ${remainingTime} seconds.`);
            return;
        }
        const password = prompt('Enter admin password:');
        if (password === adminPassword) {
            isAdmin = true;
            localStorage.setItem('isAdmin', 'true');
            addItemSection.style.display = 'block';
            adminDashboard.style.display = 'block';
            loginBtn.style.display = 'none';
            logoutBtn.style.display = 'inline-block';
            resetPasswordBtn.style.display = 'inline-block';
            displayOrders();
            displayFilteredItems(); // Refresh items display for admin buttons
            loginAttempts = 0;
            localStorage.removeItem('loginLockTime');
            alert('Logged in as admin.');
        } else {
            loginAttempts++;
            if (loginAttempts >= 3) {
                loginLockTime = Date.now() + 30 * 1000; // 30 seconds
                localStorage.setItem('loginLockTime', loginLockTime);
                startCountdown();
                alert('Too many failed attempts. Login locked for 30 seconds.');
            } else {
                alert(`Incorrect password. ${3 - loginAttempts} attempts remaining.`);
            }
        }
    });

    logoutBtn.addEventListener('click', function() {
        isAdmin = false;
        localStorage.removeItem('isAdmin');
        addItemSection.style.display = 'none';
        adminDashboard.style.display = 'none';
        loginBtn.style.display = 'inline-block';
        logoutBtn.style.display = 'none';
        resetPasswordBtn.style.display = 'none';
        displayFilteredItems(); // Refresh items display to remove admin buttons
        alert('Logged out.');
    });

    // Password reset
    resetPasswordBtn.addEventListener('click', async function() {
        if (resetLockTime && Date.now() < parseInt(resetLockTime)) {
            alert('Password reset is locked for 10 hours due to too many failed attempts.');
            return;
        }
        const oldPassword = prompt('Enter current password:');
        if (oldPassword === adminPassword) {
            const newPassword = prompt('Enter new password:');
            if (newPassword) {
                try {
                    await setDoc(doc(window.db, "admin", "settings"), { password: newPassword });
                    adminPassword = newPassword;
                    resetAttempts = 0;
                    localStorage.removeItem('resetLockTime');
                    alert('Password reset successfully.');
                } catch (error) {
                    console.error("Error updating password:", error);
                    alert('Error resetting password. Please try again.');
                }
            }
        } else {
            resetAttempts++;
            if (resetAttempts >= 3) {
                resetLockTime = Date.now() + 10 * 60 * 60 * 1000; // 10 hours
                localStorage.setItem('resetLockTime', resetLockTime);
                alert('Too many failed attempts. Password reset locked for 10 hours.');
            } else {
                alert(`Incorrect old password. ${3 - resetAttempts} attempts remaining.`);
            }
        }
    });

    // Close modal
    closeBtn.onclick = function() {
        modal.style.display = 'none';
    };

    window.onclick = function(event) {
        if (event.target == modal) {
            modal.style.display = 'none';
        }
    };

    form.addEventListener('submit', async function(e) {
        e.preventDefault();

        if (!isAdmin) {
            alert('Only admin can add items.');
            return;
        }

        const name = document.getElementById('item-name').value;
        const category = document.getElementById('item-category').value;
        const price = document.getElementById('item-price').value;
        const description = document.getElementById('item-description').value;
        const imageFile = document.getElementById('item-image').files[0];

        if (imageFile) {
            const reader = new FileReader();
            reader.onload = async function(e) {
                const imageUrl = e.target.result;
                try {
                    const docRef = await addDoc(collection(window.db, "items"), {
                        name,
                        category,
                        price: parseFloat(price),
                        description,
                        imageUrl
                    });
                    alert('Item added successfully!');
                    loadItems(); // Reload items from Firestore
                    form.reset();
                } catch (error) {
                    console.error("Error adding item: ", error);
                    alert('Error adding item. Please try again.');
                }
            };
            reader.readAsDataURL(imageFile);
        }
    });

    function displayItem(item) {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'item';
        itemDiv.dataset.id = item.id;
        if (isAdmin) {
            itemDiv.innerHTML = `
                <img src="${item.imageUrl}" alt="${item.name}" onclick="showItemDetails(${item.id})">
                <h3>${item.name}</h3>
                <p><strong>Price:</strong> ₹${item.price}</p>
                <p>${item.description}</p>
                <button class="edit-btn" data-id="${item.id}">Edit</button>
                <button class="delete-btn" data-id="${item.id}">Delete</button>
            `;

            // Add edit functionality
            const editBtn = itemDiv.querySelector('.edit-btn');
            editBtn.addEventListener('click', function() {
                editItem(item.id);
            });

            // Add delete functionality
            const deleteBtn = itemDiv.querySelector('.delete-btn');
            deleteBtn.addEventListener('click', function() {
                deleteItem(item.id);
            });
        } else {
            itemDiv.innerHTML = `
                <img src="${item.imageUrl}" alt="${item.name}" onclick="showItemDetails(${item.id})">
                <h3>${item.name}</h3>
                <p><strong>Price:</strong> ₹${item.price}</p>
                <p>${item.description}</p>
                <div class="quantity-controls">
                    <button class="decrease-qty">-</button>
                    <span class="item-qty">1</span>
                    <button class="increase-qty">+</button>
                </div>
                <button class="add-to-cart-btn">Add to Cart</button>
                <button class="buy-btn">Buy Now</button>
            `;

            // Quantity controls
            const decreaseBtn = itemDiv.querySelector('.decrease-qty');
            const increaseBtn = itemDiv.querySelector('.increase-qty');
            const qtySpan = itemDiv.querySelector('.item-qty');
            let qty = 1;

            decreaseBtn.addEventListener('click', function() {
                if (qty > 1) {
                    qty--;
                    qtySpan.textContent = qty;
                }
            });

            increaseBtn.addEventListener('click', function() {
                qty++;
                qtySpan.textContent = qty;
            });

            // Add to cart functionality
            const addToCartBtn = itemDiv.querySelector('.add-to-cart-btn');
            addToCartBtn.addEventListener('click', function() {
                addToCart(item, qty);
            });

            // Add buy functionality
            const buyBtn = itemDiv.querySelector('.buy-btn');
            buyBtn.addEventListener('click', function() {
                currentItem = { ...item, quantity: qty };
                modal.style.display = 'none';
                customerForm.style.display = 'block';
                document.getElementById('items-display').style.display = 'none';
            });
        }

        // Add to container
        itemsContainer.appendChild(itemDiv);
    }

    function showItemDetails(item) {
        const otherItems = items.filter(i => i.id !== item.id).slice(0, 5); // Show up to 5 other items
        modalContent.innerHTML = `
            <img src="${item.imageUrl}" alt="${item.name}">
            <h2>${item.name}</h2>
            <p><strong>Price:</strong> ₹${item.price}</p>
            <p>${item.description}</p>
            ${isAdmin ? `
                <div class="admin-controls">
                    <button class="edit-btn" data-id="${item.id}">Edit</button>
                    <button class="delete-btn" data-id="${item.id}">Delete</button>
                </div>
            ` : ''}
            <h3>Other Items</h3>
            <div class="other-items">
                ${otherItems.map(other => `<img src="${other.imageUrl}" alt="${other.name}" data-id="${other.id}">`).join('')}
            </div>
        `;

        modal.style.display = 'block';

        // Add event listeners for admin controls
        if (isAdmin) {
            const editBtn = modalContent.querySelector('.edit-btn');
            const deleteBtn = modalContent.querySelector('.delete-btn');

            editBtn.addEventListener('click', function() {
                editItem(item.id);
            });

            deleteBtn.addEventListener('click', function() {
                deleteItem(item.id);
            });
        }

        // Add event listeners for other items
        const otherItemImages = modalContent.querySelectorAll('.other-items img');
        otherItemImages.forEach(img => {
            img.addEventListener('click', function() {
                const id = parseInt(this.dataset.id);
                const otherItem = items.find(i => i.id === id);
                showItemDetails(otherItem);
            });
        });
    }

    async function editItem(id) {
        alert("Editing item: " + id);
        const item = items.find(i => i.id === id);
        if (item) {
            const newName = prompt('Enter new name:', item.name);
            const newPrice = prompt('Enter new price:', item.price);
            const newDescription = prompt('Enter new description:', item.description);

            if (newName && newPrice && newDescription) {
                try {
                    await updateDoc(doc(window.db, "items", id), {
                        name: newName,
                        price: parseFloat(newPrice),
                        description: newDescription
                    });
                    alert('Item updated successfully.');
                    loadItems(); // Reload items from Firestore
                    modal.style.display = 'none';
                } catch (error) {
                    console.error("Error updating item: ", error);
                    alert('Error updating item. Please try again.');
                }
            }
        }
    }

    async function deleteItem(id) {
        alert("Deleting item: " + id);
        if (confirm('Are you sure you want to delete this item?')) {
            try {
                await deleteDoc(doc(window.db, "items", id));
                alert('Item deleted successfully.');
                loadItems(); // Reload items from Firestore
                modal.style.display = 'none';
            } catch (error) {
                console.error("Error deleting item: ", error);
                alert('Error deleting item. Please try again.');
            }
        }
    }

    function refreshItems() {
        filteredItems = [...items];
        displayFilteredItems();
    }

    // Customer form submit
    orderForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const name = document.getElementById('customer-name').value;
        const number = document.getElementById('customer-number').value;
        const address = document.getElementById('customer-address').value;
        currentCustomer = { name, number, address };
        customerForm.style.display = 'none';
        paymentOptions.style.display = 'block';
    });

    // Cancel order
    cancelOrderBtn.addEventListener('click', function() {
        customerForm.style.display = 'none';
        document.getElementById('items-display').style.display = 'block';
        orderForm.reset();
    });

    // Payment options
    onlinePaymentBtn.addEventListener('click', function() {
        paymentOptions.style.display = 'none';
        onlinePaymentSection.style.display = 'block';
    });

    codPaymentBtn.addEventListener('click', async function() {
        const orderItems = cart.length > 0 ? cart : [currentItem];
        let orderIds = [];
        try {
            for (const item of orderItems) {
                const docRef = await addDoc(collection(window.db, "orders"), {
                    item: item,
                    customer: currentCustomer,
                    paymentMode: 'Cash on Delivery',
                    status: 'pending',
                    timestamp: new Date()
                });
                orderIds.push(docRef.id);
            }
            // Store order IDs in localStorage for customer to view
            let customerOrders = JSON.parse(localStorage.getItem('customerOrders')) || [];
            customerOrders.push(...orderIds);
            localStorage.setItem('customerOrders', JSON.stringify(customerOrders));
            alert('Order placed successfully!');
            cart = [];
            localStorage.setItem('cart', JSON.stringify(cart));
            updateCartCount();
            if (isAdmin) loadOrders(); // Reload orders from Firestore
            showSuccessModal();
        } catch (error) {
            console.error("Error placing order: ", error);
            alert('Error placing order. Please try again.');
        }
    });

    backToFormBtn.addEventListener('click', function() {
        paymentOptions.style.display = 'none';
        customerForm.style.display = 'block';
    });

    // Online payment
    placeOrderOnlineBtn.addEventListener('click', async function() {
        const screenshot = document.getElementById('payment-screenshot').files[0];
        if (!screenshot) {
            alert('Please upload the payment screenshot.');
            return;
        }
        const reader = new FileReader();
        reader.onload = async function(e) {
            const screenshotUrl = e.target.result;
            const orderItems = cart.length > 0 ? cart : [currentItem];
            let orderIds = [];
            try {
                for (const item of orderItems) {
                    const docRef = await addDoc(collection(window.db, "orders"), {
                        item: item,
                        customer: currentCustomer,
                        paymentMode: 'Online Payment',
                        screenshot: screenshotUrl,
                        status: 'pending',
                        timestamp: new Date()
                    });
                    orderIds.push(docRef.id);
                }
                // Store order IDs in localStorage for customer to view
                let customerOrders = JSON.parse(localStorage.getItem('customerOrders')) || [];
                customerOrders.push(...orderIds);
                localStorage.setItem('customerOrders', JSON.stringify(customerOrders));
                alert('Order placed successfully!');
                cart = [];
                localStorage.setItem('cart', JSON.stringify(cart));
                updateCartCount();
                if (isAdmin) loadOrders(); // Reload orders from Firestore
                showSuccessModal();
            } catch (error) {
                console.error("Error placing order: ", error);
                alert('Error placing order. Please try again.');
            }
        };
        reader.readAsDataURL(screenshot);
    });

    backToPaymentBtn.addEventListener('click', function() {
        onlinePaymentSection.style.display = 'none';
        paymentOptions.style.display = 'block';
    });

    // Load orders from Firestore
    async function loadOrders() {
        try {
            const querySnapshot = await getDocs(collection(window.db, "orders"));
            orders = [];
            querySnapshot.forEach((doc) => {
                orders.push({ id: doc.id, ...doc.data() });
            });
            displayOrders();
        } catch (error) {
            console.error("Error loading orders: ", error);
        }
    }

    // Admin dashboard
    function displayOrders() {
        ordersContainer.innerHTML = '<nav id="admin-nav"><button id="items-nav">Items</button><button id="orders-nav">Orders</button><button id="successful-orders-nav">Successful Orders</button></nav><div id="items-section" style="display:none;"></div><div id="orders-section"></div><div id="successful-orders-section" style="display:none;"></div>';
        const ordersSection = document.getElementById('orders-section');
        ordersSection.innerHTML = '<h3>Orders</h3>';
        if (orders.length === 0) {
            ordersSection.innerHTML += '<p>No orders yet.</p>';
            return;
        }
        const table = document.createElement('table');
        table.innerHTML = `
            <tr>
                <th>Customer Name</th>
                <th>Phone</th>
                <th>Address</th>
                <th>Item</th>
                <th>Quantity</th>
                <th>Price</th>
                <th>Total</th>
                <th>Payment Mode</th>
                <th>Screenshot</th>
                <th>Actions</th>
            </tr>
        `;
        orders.forEach((order, index) => {
            const total = order.item.price * (order.item.quantity || 1);
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${order.customer.name}</td>
                <td>${order.customer.number}</td>
                <td>${order.customer.address}</td>
                <td>${order.item.name}</td>
                <td>${order.item.quantity || 1}</td>
                <td>₹${order.item.price}</td>
                <td>₹${total}</td>
                <td>${order.paymentMode}</td>
                <td>${order.screenshot ? `<img src="${order.screenshot}" alt="Payment Screenshot" style="width: 100px; height: 100px; cursor: pointer; object-fit: cover;" onclick="enlargeImage('${order.screenshot}')">` : 'N/A'}</td>
                <td><button class="delete-order-btn" data-id="${order.id}">Delete</button><button class="mark-successful-btn" data-id="${order.id}">Mark Successful</button></td>
            `;
            table.appendChild(row);
        });
        ordersSection.appendChild(table);

        // Add event listeners for delete buttons
        const deleteBtns = ordersSection.querySelectorAll('.delete-order-btn');
        deleteBtns.forEach(btn => {
            btn.addEventListener('click', function() {
                const id = this.dataset.id;
                deleteOrder(id);
            });
        });

        // Add event listeners for mark successful buttons
        const successfulBtns = ordersSection.querySelectorAll('.mark-successful-btn');
        successfulBtns.forEach(btn => {
            btn.addEventListener('click', function() {
                const id = this.dataset.id;
                markOrderSuccessful(id);
            });
        });

        // Navigation
        document.getElementById('items-nav').addEventListener('click', function() {
            document.getElementById('items-section').style.display = 'block';
            document.getElementById('orders-section').style.display = 'none';
            document.getElementById('successful-orders-section').style.display = 'none';
            displayItemsAdmin();
        });

        document.getElementById('orders-nav').addEventListener('click', function() {
            document.getElementById('items-section').style.display = 'none';
            document.getElementById('orders-section').style.display = 'block';
            document.getElementById('successful-orders-section').style.display = 'none';
        });

        document.getElementById('successful-orders-nav').addEventListener('click', function() {
            document.getElementById('items-section').style.display = 'none';
            document.getElementById('orders-section').style.display = 'none';
            document.getElementById('successful-orders-section').style.display = 'block';
            displaySuccessfulOrders();
        });
    }

    async function deleteOrder(id) {
        if (confirm('Are you sure you want to delete this order?')) {
            try {
                await deleteDoc(doc(window.db, "orders", id));
                alert('Order deleted successfully.');
                loadOrders(); // Reload orders from Firestore
            } catch (error) {
                console.error("Error deleting order: ", error);
                alert('Error deleting order. Please try again.');
            }
        }
    }

    function enlargeImage(src) {
        const modal = document.createElement('div');
        modal.style.position = 'fixed';
        modal.style.top = '0';
        modal.style.left = '0';
        modal.style.width = '100%';
        modal.style.height = '100%';
        modal.style.backgroundColor = 'rgba(0,0,0,0.8)';
        modal.style.display = 'flex';
        modal.style.alignItems = 'center';
        modal.style.justifyContent = 'center';
        modal.style.zIndex = '1000';
        modal.innerHTML = `<img src="${src}" style="max-width: 90%; max-height: 90%; cursor: pointer;" onclick="this.parentElement.remove()">`;
        document.body.appendChild(modal);
    }

    // Success modal functions (kept for potential future use)
    function showSuccessModal() {
        successModal.style.display = 'block';
    }

    successCloseBtn.addEventListener('click', function() {
        successModal.style.display = 'none';
    });

    window.onclick = function(event) {
        if (event.target == successModal) {
            successModal.style.display = 'none';
        }
    };

    // Help Us button
    helpUsBtn.addEventListener('click', function() {
        window.open('https://wa.me/9982154901', '_blank');
    });

    // Search functionality
    searchInput.addEventListener('input', function() {
        filterItems();
    });

    // Category filter
    categoryFilter.addEventListener('change', function() {
        filterItems();
    });

    // Home navigation
    document.getElementById('home-nav').addEventListener('click', function() {
        document.getElementById('items-display').style.display = 'block';
        document.getElementById('cart-section').style.display = 'none';
        document.getElementById('customer-form').style.display = 'none';
        document.getElementById('payment-options').style.display = 'none';
        document.getElementById('online-payment-section').style.display = 'none';
        document.getElementById('your-orders-section').style.display = 'none';
        document.getElementById('admin-dashboard').style.display = 'none';
        document.getElementById('add-item').style.display = 'none';
    });

    // Your Orders navigation
    document.getElementById('your-orders-nav').addEventListener('click', function() {
        document.getElementById('your-orders-section').style.display = 'block';
        document.getElementById('items-display').style.display = 'none';
        document.getElementById('cart-section').style.display = 'none';
        document.getElementById('customer-form').style.display = 'none';
        document.getElementById('payment-options').style.display = 'none';
        document.getElementById('online-payment-section').style.display = 'none';
        document.getElementById('admin-dashboard').style.display = 'none';
        document.getElementById('add-item').style.display = 'none';
        displayCustomerOrders();
    });

    // Cart icon click
    cartIcon.addEventListener('click', function() {
        document.getElementById('cart-section').style.display = 'block';
        document.getElementById('items-display').style.display = 'none';
        displayCart();
    });

    // Checkout button
    checkoutBtn.addEventListener('click', function() {
        if (cart.length === 0) {
            alert('Your cart is empty.');
            return;
        }
        document.getElementById('cart-section').style.display = 'none';
        customerForm.style.display = 'block';
    });

    // Continue shopping
    continueShoppingBtn.addEventListener('click', function() {
        document.getElementById('cart-section').style.display = 'none';
        document.getElementById('items-display').style.display = 'block';
    });

    // Load items from Firestore
    async function loadItems() {
        try {
            console.log("Loading items from Firestore...");
            const querySnapshot = await getDocs(collection(window.db, "items"));
            items = [];
            querySnapshot.forEach((doc) => {
                items.push({ id: doc.id, ...doc.data() });
            });
            console.log("Loaded items:", items);
            filteredItems = [...items];
            updateCategories();
            displayFilteredItems();
        } catch (error) {
            console.error("Error loading items: ", error);
        }
    }

    // Load admin password from Firestore
    async function loadAdminPassword() {
        try {
            const docRef = doc(window.db, "admin", "settings");
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                adminPassword = docSnap.data().password;
            } else {
                // Set default
                await setDoc(docRef, { password: 'admin123' });
                adminPassword = 'admin123';
            }
        } catch (error) {
            console.error("Error loading admin password:", error);
            adminPassword = 'admin123'; // fallback
        }
    }

    // Initialize
    loadAdminPassword().then(() => {
        loadItems();
        updateCartCount();
    });

    // Check if admin is logged in on page load
    if (localStorage.getItem('isAdmin') === 'true') {
        isAdmin = true;
        addItemSection.style.display = 'block';
        adminDashboard.style.display = 'block';
        loginBtn.style.display = 'none';
        logoutBtn.style.display = 'inline-block';
        resetPasswordBtn.style.display = 'inline-block';
        displayOrders();
    }

    // Load orders on page load if admin is logged in (but since login is required, this will be called after login)
    // For now, orders are loaded only when admin logs in

    function updateCategories() {
        const categories = [...new Set(items.map(item => item.category).filter(cat => cat))];
        categoryFilter.innerHTML = '<option value="">All Categories</option>';
        categories.forEach(cat => {
            const option = document.createElement('option');
            option.value = cat;
            option.textContent = cat;
            categoryFilter.appendChild(option);
        });
    }

    function filterItems() {
        const searchTerm = searchInput.value.toLowerCase();
        const selectedCategory = categoryFilter.value;
        filteredItems = items.filter(item => {
            const matchesSearch = item.name.toLowerCase().includes(searchTerm);
            const matchesCategory = !selectedCategory || item.category === selectedCategory;
            return matchesSearch && matchesCategory;
        });
        displayFilteredItems();
    }

    function displayFilteredItems() {
        itemsContainer.innerHTML = '';
        filteredItems.forEach(displayItem);
    }

    function addToCart(item) {
        const existingItem = cart.find(cartItem => cartItem.id === item.id);
        if (existingItem) {
            existingItem.quantity += 1;
        } else {
            cart.push({ ...item, quantity: 1 });
        }
        localStorage.setItem('cart', JSON.stringify(cart));
        updateCartCount();
        alert('Item added to cart!');
    }

    function updateCartCount() {
        const count = cart.reduce((total, item) => total + item.quantity, 0);
        document.getElementById('cart-count').textContent = count;
    }

    function displayCart() {
        const cartItemsContainer = document.getElementById('cart-items');
        cartItemsContainer.innerHTML = '';
        let total = 0;
        cart.forEach((item, index) => {
            const itemTotal = item.price * item.quantity;
            total += itemTotal;
            const cartItemDiv = document.createElement('div');
            cartItemDiv.className = 'cart-item';
            cartItemDiv.innerHTML = `
                <img src="${item.imageUrl}" alt="${item.name}" style="width: 50px; height: 50px; object-fit: cover;">
                <div>
                    <h4>${item.name}</h4>
                    <p>₹${item.price} x ${item.quantity} = ₹${itemTotal}</p>
                    <button class="remove-from-cart-btn" data-index="${index}">Remove</button>
                </div>
            `;
            cartItemsContainer.appendChild(cartItemDiv);
        });
        document.getElementById('cart-total').textContent = `Total: ₹${total}`;

        // Add remove event listeners
        const removeBtns = cartItemsContainer.querySelectorAll('.remove-from-cart-btn');
        removeBtns.forEach(btn => {
            btn.addEventListener('click', function() {
                const index = parseInt(this.dataset.index);
                cart.splice(index, 1);
                localStorage.setItem('cart', JSON.stringify(cart));
                updateCartCount();
                displayCart();
            });
        });
    }



    // Countdown function for login lock
    function startCountdown() {
        if (countdownInterval) clearInterval(countdownInterval);
        const countdownDisplay = document.createElement('div');
        countdownDisplay.id = 'countdown-display';
        countdownDisplay.style.position = 'fixed';
        countdownDisplay.style.top = '50%';
        countdownDisplay.style.left = '50%';
        countdownDisplay.style.transform = 'translate(-50%, -50%)';
        countdownDisplay.style.backgroundColor = 'rgba(0,0,0,0.8)';
        countdownDisplay.style.color = 'white';
        countdownDisplay.style.padding = '20px';
        countdownDisplay.style.borderRadius = '10px';
        countdownDisplay.style.fontSize = '24px';
        countdownDisplay.style.zIndex = '1000';
        document.body.appendChild(countdownDisplay);

        countdownInterval = setInterval(() => {
            if (loginLockTime && Date.now() < parseInt(loginLockTime)) {
                const remainingTime = Math.ceil((parseInt(loginLockTime) - Date.now()) / 1000);
                countdownDisplay.textContent = `Login locked. Try again in ${remainingTime} seconds.`;
            } else {
                clearInterval(countdownInterval);
                document.body.removeChild(countdownDisplay);
                localStorage.removeItem('loginLockTime');
                loginLockTime = null;
            }
        }, 1000);
    }

    // Make showItemDetails global
    window.showItemDetails = function(id) {
        const item = items.find(i => i.id === id);
        if (item) showItemDetails(item);
    };

    // Display customer orders
    async function displayCustomerOrders() {
        const customerOrdersSection = document.getElementById('your-orders-section');
        customerOrdersSection.innerHTML = '<h3>Your Orders</h3>';
        const customerOrderIds = JSON.parse(localStorage.getItem('customerOrders')) || [];
        if (customerOrderIds.length === 0) {
            customerOrdersSection.innerHTML += '<p>No orders yet.</p>';
            return;
        }
        let customerOrders = [];
        try {
            for (const orderId of customerOrderIds) {
                const docRef = doc(window.db, "orders", orderId);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    customerOrders.push({ id: docSnap.id, ...docSnap.data() });
                }
            }
        } catch (error) {
            console.error("Error loading customer orders: ", error);
        }
        if (customerOrders.length === 0) {
            customerOrdersSection.innerHTML += '<p>No orders found.</p>';
            return;
        }
        const table = document.createElement('table');
        table.innerHTML = `
            <tr>
                <th>Item</th>
                <th>Quantity</th>
                <th>Price</th>
                <th>Total</th>
                <th>Payment Mode</th>
                <th>Status</th>
                <th>Date</th>
            </tr>
        `;
        customerOrders.forEach(order => {
            const total = order.item.price * (order.item.quantity || 1);
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${order.item.name}</td>
                <td>${order.item.quantity || 1}</td>
                <td>₹${order.item.price}</td>
                <td>₹${total}</td>
                <td>${order.paymentMode}</td>
                <td>${order.status || 'pending'}</td>
                <td>${order.timestamp ? new Date(order.timestamp.seconds * 1000).toLocaleDateString() : 'N/A'}</td>
            `;
            table.appendChild(row);
        });
        customerOrdersSection.appendChild(table);
    }

    // Mark order as successful
    async function markOrderSuccessful(id) {
        try {
            await updateDoc(doc(window.db, "orders", id), {
                status: 'successful'
            });
            alert('Order marked as successful.');
            loadOrders(); // Reload orders from Firestore
        } catch (error) {
            console.error("Error marking order successful: ", error);
            alert('Error marking order successful. Please try again.');
        }
    }

    // Display items in admin section
    function displayItemsAdmin() {
        const itemsSection = document.getElementById('items-section');
        itemsSection.innerHTML = '<h3>Items</h3>';
        if (items.length === 0) {
            itemsSection.innerHTML += '<p>No items yet.</p>';
            return;
        }
        const table = document.createElement('table');
        table.innerHTML = `
            <tr>
                <th>Name</th>
                <th>Category</th>
                <th>Price</th>
                <th>Description</th>
                <th>Actions</th>
            </tr>
        `;
        items.forEach(item => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${item.name}</td>
                <td>${item.category}</td>
                <td>₹${item.price}</td>
                <td>${item.description}</td>
                <td><button class="edit-btn" data-id="${item.id}">Edit</button><button class="delete-btn" data-id="${item.id}">Delete</button></td>
            `;
            table.appendChild(row);
        });
        itemsSection.appendChild(table);

        // Add event listeners for edit and delete buttons
        const editBtns = itemsSection.querySelectorAll('.edit-btn');
        editBtns.forEach(btn => {
            btn.addEventListener('click', function() {
                editItem(this.dataset.id);
            });
        });

        const deleteBtns = itemsSection.querySelectorAll('.delete-btn');
        deleteBtns.forEach(btn => {
            btn.addEventListener('click', function() {
                deleteItem(this.dataset.id);
            });
        });
    }

    // Display successful orders
    function displaySuccessfulOrders() {
        const successfulOrdersSection = document.getElementById('successful-orders-section');
        successfulOrdersSection.innerHTML = '<h3>Successful Orders</h3>';
        const successfulOrders = orders.filter(order => order.status === 'successful');
        if (successfulOrders.length === 0) {
            successfulOrdersSection.innerHTML += '<p>No successful orders yet.</p>';
            return;
        }
        const table = document.createElement('table');
        table.innerHTML = `
            <tr>
                <th>Customer Name</th>
                <th>Phone</th>
                <th>Address</th>
                <th>Item</th>
                <th>Quantity</th>
                <th>Price</th>
                <th>Total</th>
                <th>Payment Mode</th>
                <th>Screenshot</th>
            </tr>
        `;
        successfulOrders.forEach(order => {
            const total = order.item.price * (order.item.quantity || 1);
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${order.customer.name}</td>
                <td>${order.customer.number}</td>
                <td>${order.customer.address}</td>
                <td>${order.item.name}</td>
                <td>${order.item.quantity || 1}</td>
                <td>₹${order.item.price}</td>
                <td>₹${total}</td>
                <td>${order.paymentMode}</td>
                <td>${order.screenshot ? `<img src="${order.screenshot}" alt="Payment Screenshot" style="width: 100px; height: 100px; cursor: pointer; object-fit: cover;" onclick="enlargeImage('${order.screenshot}')">` : 'N/A'}</td>
            `;
            table.appendChild(row);
        });
        successfulOrdersSection.appendChild(table);
    }
});
