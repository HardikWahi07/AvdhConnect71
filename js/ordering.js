// Ordering System - Handles checkout and order placement

window.selectedPaymentMethod = 'cod'; // Static default

function openOrderingModal(cart) {
    if (!cart || cart.items.length === 0) {
        showToast('Your cart is empty!', 'error');
        return;
    }

    // Create modal if it doesn't exist
    let modal = document.getElementById('checkoutModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'checkoutModal';
        modal.className = 'checkout-modal';
        document.body.appendChild(modal);
    }

    const totalAmount = cart.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    modal.innerHTML = `
        <div class="checkout-content">
            <div class="flex justify-between items-center mb-lg">
                <h2 style="margin: 0;">Complete Your Order</h2>
                <button class="btn-icon" onclick="closeOrderingModal()" style="font-size: 2rem; background: none; border: none; cursor: pointer;">&times;</button>
            </div>

            <div class="mb-lg">
                <h3 class="mb-md">Order Summary</h3>
                <div id="orderItemsList">
                    ${cart.items.map(item => `
                        <div class="order-item">
                            <span class="order-item-name">${item.name}</span>
                            <div class="order-item-qty">
                                <button class="qty-btn" onclick="updateCartQty('${item.id}', -1)">−</button>
                                <span>${item.quantity}</span>
                                <button class="qty-btn" onclick="updateCartQty('${item.id}', 1)">+</button>
                            </div>
                            <span class="order-item-price">₹${(item.price * item.quantity).toFixed(2)}</span>
                        </div>
                    `).join('')}
                </div>
                <div class="order-total">
                    <span class="order-total-label">Total Amount</span>
                    <span class="order-total-amount">₹${totalAmount.toFixed(2)}</span>
                </div>
            </div>

            <form id="checkoutForm" onsubmit="placeOrder(event)">
                <div class="form-group">
                    <label class="form-label" for="customerName">Full Name *</label>
                    <input type="text" id="customerName" class="form-input" required>
                </div>

                <div class="form-group">
                    <label class="form-label" for="customerPhone">Phone Number *</label>
                    <input type="tel" id="customerPhone" class="form-input" required>
                </div>

                <div class="form-group">
                    <label class="form-label" for="deliveryAddress">Delivery Address *</label>
                    <textarea id="deliveryAddress" class="form-textarea" rows="3" required placeholder="House no, Street, Locality, City, PIN"></textarea>
                </div>

                <div class="form-group">
                    <label class="form-label">Payment Method</label>
                    <div class="p-3 bg-green-50 dark:bg-green-900/10 border border-green-100 dark:border-green-900/30 rounded-lg flex items-center gap-3">
                        <div class="w-5 h-5 rounded-full border-4 border-primary-500 bg-white"></div>
                        <span class="font-medium text-gray-900 dark:text-gray-100">Cash on Delivery</span>
                        <!-- No other options -->
                    </div>
                </div>

                <div class="flex gap-md mt-lg">
                    <button type="submit" class="btn btn-primary" style="flex: 1;">
                        Place Order (₹${totalAmount.toFixed(2)})
                    </button>
                    <button type="button" class="btn btn-secondary" onclick="closeOrderingModal()">Cancel</button>
                </div>
            </form>
        </div>
    `;

    modal.classList.remove('hidden');
}

// selectPaymentMethod removed as there is only one option

function closeOrderingModal() {
    const modal = document.getElementById('checkoutModal');
    if (modal) modal.classList.add('hidden');
}

function updateCartQty(productId, delta) {
    window.cartManager.updateQuantity(productId, delta);
    openOrderingModal(window.cartManager.cart);
}

async function placeOrder(event) {
    event.preventDefault();

    const submitBtn = event.target.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Placing Order...';

    try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            showToast('Please login to place an order', 'error');
            window.location.href = 'login.html';
            return;
        }

        const cart = window.cartManager.cart;
        const totalAmount = cart.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

        // Always COD
        const paymentMethod = 'cod';

        // Create order
        const { data: order, error: orderError } = await supabase
            .from('orders')
            .insert([{
                user_id: session.user.id,
                business_id: cart.businessId,
                total_amount: totalAmount,
                delivery_address: document.getElementById('deliveryAddress').value,
                customer_name: document.getElementById('customerName').value,
                customer_phone: document.getElementById('customerPhone').value,
                status: 'pending',
                payment_method: paymentMethod
            }])
            .select()
            .single();

        if (orderError) throw orderError;

        // Create items
        const orderItems = cart.items.map(item => ({
            order_id: order.id,
            product_id: item.id,
            quantity: item.quantity,
            price_at_time: item.price,
            product_name: item.name
        }));

        const { error: itemsError } = await supabase
            .from('order_items')
            .insert(orderItems);

        if (itemsError) throw itemsError;

        showToast('Order placed successfully! 🎉', 'success');
        window.cartManager.clearCart();
        closeOrderingModal();

        setTimeout(() => {
            window.location.href = 'my-orders.html';
        }, 1500);

    } catch (error) {
        console.error('Error placing order:', error);
        showToast('Failed to place order. ' + (error.message || 'Unknown error'), 'error');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Place Order';
    }
}
