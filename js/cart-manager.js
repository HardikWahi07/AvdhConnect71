// Cart Manager - Handles persistent cart for Blinkit-style ordering
class CartManager {
    constructor() {
        this.cart = JSON.parse(localStorage.getItem('bizhub_cart')) || {
            businessId: null,
            businessName: null,
            items: []
        };
        this.initUI();
    }

    initUI() {
        // Create floating cart bar if it doesn't exist
        if (!document.getElementById('floatingCartBar')) {
            const bar = document.createElement('div');
            bar.id = 'floatingCartBar';
            bar.className = 'floating-cart-bar hidden';
            bar.innerHTML = `
                <div class="container flex justify-between items-center">
                    <div class="cart-info">
                        <span id="cartCount">0 Items</span>
                        <span class="cart-divider">|</span>
                        <span id="cartTotal">₹0</span>
                    </div>
                    <button class="btn btn-primary" onclick="window.cartManager.openCheckout()">
                        View Cart & Checkout 🛒
                    </button>
                </div>
            `;
            document.body.appendChild(bar);
        }
        this.updateUI();
    }

    addItem(product, businessId, businessName) {
        // If adding from a different business, ask to clear cart
        if (this.cart.businessId && this.cart.businessId !== businessId) {
            if (!confirm('You already have items from another business. Clear cart and add this item?')) {
                return;
            }
            this.clearCart();
        }

        this.cart.businessId = businessId;
        this.cart.businessName = businessName;

        const existingItem = this.cart.items.find(item => item.id === product.id);
        if (existingItem) {
            existingItem.quantity += 1;
        } else {
            this.cart.items.push({
                id: product.id,
                name: product.name,
                price: product.price,
                quantity: 1
            });
        }

        this.save();
        this.updateUI();
        showToast(`Added ${product.name} to cart`, 'success');
    }

    removeItem(productId) {
        this.cart.items = this.cart.items.filter(item => item.id !== productId);
        if (this.cart.items.length === 0) {
            this.cart.businessId = null;
            this.cart.businessName = null;
        }
        this.save();
        this.updateUI();
    }

    updateQuantity(productId, delta) {
        const item = this.cart.items.find(i => i.id === productId);
        if (item) {
            item.quantity += delta;
            if (item.quantity <= 0) {
                this.removeItem(productId);
            } else {
                this.save();
                this.updateUI();
            }
        }
    }

    clearCart() {
        this.cart = { businessId: null, businessName: null, items: [] };
        this.save();
        this.updateUI();
    }

    save() {
        localStorage.setItem('bizhub_cart', JSON.stringify(this.cart));
    }

    updateUI() {
        const totalItems = this.cart.items.reduce((sum, item) => sum + item.quantity, 0);
        const totalPrice = this.cart.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

        const bar = document.getElementById('floatingCartBar');
        if (totalItems > 0) {
            bar.classList.remove('hidden');
            document.getElementById('cartCount').textContent = `${totalItems} Item${totalItems > 1 ? 's' : ''}`;
            document.getElementById('cartTotal').textContent = `₹${totalPrice}`;
        } else {
            bar.classList.add('hidden');
        }
    }

    openCheckout() {
        // We'll implement ordering.js later, for now just a simple modal
        if (typeof openOrderingModal === 'function') {
            openOrderingModal(this.cart);
        } else {
            alert('Checkout feature is still loading. Please try again in a moment.');
        }
    }
}

// Initialize globally
window.cartManager = new CartManager();
