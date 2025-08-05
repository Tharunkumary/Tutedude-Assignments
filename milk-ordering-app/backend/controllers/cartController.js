const { pool } = require('../config/database');

// Get user's cart
const getCart = async (req, res) => {
    try {
        const userId = req.user.id;

        const [cartItems] = await pool.execute(
            `SELECT c.*, p.name, p.description, p.price, p.unit, p.image_url, p.stock_quantity,
                    (c.quantity * p.price) as total_price
             FROM carts c
             JOIN products p ON c.product_id = p.id
             WHERE c.user_id = ? AND p.is_available = TRUE
             ORDER BY c.created_at DESC`,
            [userId]
        );

        // Calculate cart summary
        const cartSummary = {
            total_items: cartItems.reduce((sum, item) => sum + item.quantity, 0),
            total_amount: cartItems.reduce((sum, item) => sum + item.total_price, 0),
            delivery_fee: 0, // Free delivery or calculate based on business logic
        };

        cartSummary.final_amount = cartSummary.total_amount + cartSummary.delivery_fee;

        res.status(200).json({
            success: true,
            message: 'Cart fetched successfully',
            data: {
                items: cartItems,
                summary: cartSummary
            }
        });
    } catch (error) {
        console.error('Get cart error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching cart'
        });
    }
};

// Add item to cart
const addToCart = async (req, res) => {
    try {
        const userId = req.user.id;
        const { product_id, quantity = 1 } = req.body;

        if (!product_id) {
            return res.status(400).json({
                success: false,
                message: 'Product ID is required'
            });
        }

        if (quantity < 1) {
            return res.status(400).json({
                success: false,
                message: 'Quantity must be at least 1'
            });
        }

        // Check if product exists and is available
        const [products] = await pool.execute(
            'SELECT id, name, price, stock_quantity, is_available FROM products WHERE id = ?',
            [product_id]
        );

        if (products.length === 0 || !products[0].is_available) {
            return res.status(404).json({
                success: false,
                message: 'Product not found or not available'
            });
        }

        const product = products[0];

        // Check stock availability
        if (product.stock_quantity < quantity) {
            return res.status(400).json({
                success: false,
                message: `Only ${product.stock_quantity} items available in stock`
            });
        }

        // Check if item already exists in cart
        const [existingCartItems] = await pool.execute(
            'SELECT id, quantity FROM carts WHERE user_id = ? AND product_id = ?',
            [userId, product_id]
        );

        if (existingCartItems.length > 0) {
            // Update existing cart item
            const newQuantity = existingCartItems[0].quantity + quantity;
            
            if (product.stock_quantity < newQuantity) {
                return res.status(400).json({
                    success: false,
                    message: `Cannot add ${quantity} more items. Only ${product.stock_quantity - existingCartItems[0].quantity} items can be added.`
                });
            }

            await pool.execute(
                'UPDATE carts SET quantity = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                [newQuantity, existingCartItems[0].id]
            );
        } else {
            // Add new cart item
            await pool.execute(
                'INSERT INTO carts (user_id, product_id, quantity) VALUES (?, ?, ?)',
                [userId, product_id, quantity]
            );
        }

        // Return updated cart
        const [updatedCartItems] = await pool.execute(
            `SELECT c.*, p.name, p.price, p.unit, p.image_url,
                    (c.quantity * p.price) as total_price
             FROM carts c
             JOIN products p ON c.product_id = p.id
             WHERE c.user_id = ? AND c.product_id = ?`,
            [userId, product_id]
        );

        res.status(200).json({
            success: true,
            message: 'Item added to cart successfully',
            data: updatedCartItems[0]
        });
    } catch (error) {
        console.error('Add to cart error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while adding item to cart'
        });
    }
};

// Update cart item quantity
const updateCartItem = async (req, res) => {
    try {
        const userId = req.user.id;
        const { product_id } = req.params;
        const { quantity } = req.body;

        if (!quantity || quantity < 0) {
            return res.status(400).json({
                success: false,
                message: 'Valid quantity is required'
            });
        }

        // If quantity is 0, remove the item
        if (quantity === 0) {
            await pool.execute(
                'DELETE FROM carts WHERE user_id = ? AND product_id = ?',
                [userId, product_id]
            );

            return res.status(200).json({
                success: true,
                message: 'Item removed from cart successfully'
            });
        }

        // Check if cart item exists
        const [cartItems] = await pool.execute(
            'SELECT id FROM carts WHERE user_id = ? AND product_id = ?',
            [userId, product_id]
        );

        if (cartItems.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Cart item not found'
            });
        }

        // Check product stock
        const [products] = await pool.execute(
            'SELECT stock_quantity, is_available FROM products WHERE id = ?',
            [product_id]
        );

        if (products.length === 0 || !products[0].is_available) {
            return res.status(404).json({
                success: false,
                message: 'Product not found or not available'
            });
        }

        if (products[0].stock_quantity < quantity) {
            return res.status(400).json({
                success: false,
                message: `Only ${products[0].stock_quantity} items available in stock`
            });
        }

        // Update cart item
        await pool.execute(
            'UPDATE carts SET quantity = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ? AND product_id = ?',
            [quantity, userId, product_id]
        );

        // Return updated cart item
        const [updatedCartItems] = await pool.execute(
            `SELECT c.*, p.name, p.price, p.unit, p.image_url,
                    (c.quantity * p.price) as total_price
             FROM carts c
             JOIN products p ON c.product_id = p.id
             WHERE c.user_id = ? AND c.product_id = ?`,
            [userId, product_id]
        );

        res.status(200).json({
            success: true,
            message: 'Cart item updated successfully',
            data: updatedCartItems[0]
        });
    } catch (error) {
        console.error('Update cart item error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while updating cart item'
        });
    }
};

// Remove item from cart
const removeFromCart = async (req, res) => {
    try {
        const userId = req.user.id;
        const { product_id } = req.params;

        // Check if cart item exists
        const [cartItems] = await pool.execute(
            'SELECT id FROM carts WHERE user_id = ? AND product_id = ?',
            [userId, product_id]
        );

        if (cartItems.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Cart item not found'
            });
        }

        // Remove cart item
        await pool.execute(
            'DELETE FROM carts WHERE user_id = ? AND product_id = ?',
            [userId, product_id]
        );

        res.status(200).json({
            success: true,
            message: 'Item removed from cart successfully'
        });
    } catch (error) {
        console.error('Remove from cart error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while removing item from cart'
        });
    }
};

// Clear entire cart
const clearCart = async (req, res) => {
    try {
        const userId = req.user.id;

        await pool.execute(
            'DELETE FROM carts WHERE user_id = ?',
            [userId]
        );

        res.status(200).json({
            success: true,
            message: 'Cart cleared successfully'
        });
    } catch (error) {
        console.error('Clear cart error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while clearing cart'
        });
    }
};

// Get cart item count
const getCartCount = async (req, res) => {
    try {
        const userId = req.user.id;

        const [countResult] = await pool.execute(
            'SELECT SUM(quantity) as total_items FROM carts WHERE user_id = ?',
            [userId]
        );

        const totalItems = countResult[0].total_items || 0;

        res.status(200).json({
            success: true,
            message: 'Cart count fetched successfully',
            data: {
                total_items: totalItems
            }
        });
    } catch (error) {
        console.error('Get cart count error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching cart count'
        });
    }
};

module.exports = {
    getCart,
    addToCart,
    updateCartItem,
    removeFromCart,
    clearCart,
    getCartCount
};