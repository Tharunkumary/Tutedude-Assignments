const { pool } = require('../config/database');
const { 
    generateOrderNumber, 
    sendOrderConfirmationEmail, 
    getDeliveryDate,
    getDeliveryTimeSlots 
} = require('../utils/helpers');

// Place new order
const placeOrder = async (req, res) => {
    const connection = await pool.getConnection();
    
    try {
        await connection.beginTransaction();
        
        const userId = req.user.id;
        const { 
            delivery_address, 
            payment_method, 
            delivery_date, 
            delivery_time_slot, 
            notes 
        } = req.body;

        // Validate required fields
        if (!delivery_address || !payment_method) {
            return res.status(400).json({
                success: false,
                message: 'Delivery address and payment method are required'
            });
        }

        // Validate payment method
        if (!['cod', 'online', 'upi'].includes(payment_method)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid payment method'
            });
        }

        // Get cart items
        const [cartItems] = await connection.execute(
            `SELECT c.product_id, c.quantity, p.name, p.price, p.stock_quantity,
                    (c.quantity * p.price) as total_price
             FROM carts c
             JOIN products p ON c.product_id = p.id
             WHERE c.user_id = ? AND p.is_available = TRUE`,
            [userId]
        );

        if (cartItems.length === 0) {
            await connection.rollback();
            return res.status(400).json({
                success: false,
                message: 'Cart is empty'
            });
        }

        // Check stock availability for all items
        for (const item of cartItems) {
            if (item.stock_quantity < item.quantity) {
                await connection.rollback();
                return res.status(400).json({
                    success: false,
                    message: `Insufficient stock for ${item.name}. Only ${item.stock_quantity} available.`
                });
            }
        }

        // Calculate totals
        const totalAmount = cartItems.reduce((sum, item) => sum + item.total_price, 0);
        const deliveryFee = totalAmount >= 500 ? 0 : 30; // Free delivery for orders above ₹500
        const finalAmount = totalAmount + deliveryFee;

        // Generate order number
        const orderNumber = generateOrderNumber();

        // Use provided delivery date or default to next day
        const orderDeliveryDate = delivery_date || getDeliveryDate();

        // Create order
        const [orderResult] = await connection.execute(
            `INSERT INTO orders (user_id, order_number, total_amount, delivery_fee, 
                               payment_method, delivery_address, delivery_date, 
                               delivery_time_slot, notes) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [userId, orderNumber, finalAmount, deliveryFee, payment_method, 
             JSON.stringify(delivery_address), orderDeliveryDate, 
             delivery_time_slot || '8:00 AM - 10:00 AM', notes || null]
        );

        const orderId = orderResult.insertId;

        // Create order items and update stock
        for (const item of cartItems) {
            // Insert order item
            await connection.execute(
                `INSERT INTO order_items (order_id, product_id, quantity, unit_price, total_price)
                 VALUES (?, ?, ?, ?, ?)`,
                [orderId, item.product_id, item.quantity, item.price, item.total_price]
            );

            // Update product stock
            await connection.execute(
                'UPDATE products SET stock_quantity = stock_quantity - ? WHERE id = ?',
                [item.quantity, item.product_id]
            );
        }

        // Clear user's cart
        await connection.execute(
            'DELETE FROM carts WHERE user_id = ?',
            [userId]
        );

        await connection.commit();

        // Prepare order data for email
        const orderData = {
            order_number: orderNumber,
            total_amount: finalAmount,
            payment_method,
            delivery_date: orderDeliveryDate,
            items: cartItems
        };

        // Send confirmation email if user has email
        if (req.user.email) {
            try {
                await sendOrderConfirmationEmail(req.user.email, req.user.name, orderData);
            } catch (emailError) {
                console.error('Failed to send confirmation email:', emailError);
                // Don't fail the order if email fails
            }
        }

        res.status(201).json({
            success: true,
            message: 'Order placed successfully',
            data: {
                order_id: orderId,
                order_number: orderNumber,
                total_amount: finalAmount,
                delivery_fee: deliveryFee,
                payment_method,
                delivery_date: orderDeliveryDate,
                delivery_time_slot: delivery_time_slot || '8:00 AM - 10:00 AM',
                status: 'pending'
            }
        });

    } catch (error) {
        await connection.rollback();
        console.error('Place order error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while placing order'
        });
    } finally {
        connection.release();
    }
};

// Get user's orders
const getUserOrders = async (req, res) => {
    try {
        const userId = req.user.id;
        const { page = 1, limit = 10, status } = req.query;

        let query = `
            SELECT o.*, 
                   COUNT(oi.id) as item_count,
                   GROUP_CONCAT(CONCAT(p.name, ' (', oi.quantity, ')') SEPARATOR ', ') as items_summary
            FROM orders o
            LEFT JOIN order_items oi ON o.id = oi.order_id
            LEFT JOIN products p ON oi.product_id = p.id
            WHERE o.user_id = ?
        `;
        let params = [userId];

        if (status) {
            query += ' AND o.status = ?';
            params.push(status);
        }

        query += ' GROUP BY o.id ORDER BY o.created_at DESC';
        
        const offset = (page - 1) * limit;
        query += ' LIMIT ? OFFSET ?';
        params.push(parseInt(limit), parseInt(offset));

        const [orders] = await pool.execute(query, params);

        // Get total count
        let countQuery = 'SELECT COUNT(*) as total FROM orders WHERE user_id = ?';
        let countParams = [userId];

        if (status) {
            countQuery += ' AND status = ?';
            countParams.push(status);
        }

        const [countResult] = await pool.execute(countQuery, countParams);
        const total = countResult[0].total;

        // Parse delivery_address JSON for each order
        const formattedOrders = orders.map(order => ({
            ...order,
            delivery_address: JSON.parse(order.delivery_address)
        }));

        res.status(200).json({
            success: true,
            message: 'Orders fetched successfully',
            data: {
                orders: formattedOrders,
                pagination: {
                    total,
                    page: parseInt(page),
                    limit: parseInt(limit),
                    totalPages: Math.ceil(total / limit)
                }
            }
        });
    } catch (error) {
        console.error('Get user orders error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching orders'
        });
    }
};

// Get order details by ID
const getOrderById = async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;

        // Get order details
        const [orders] = await pool.execute(
            'SELECT * FROM orders WHERE id = ? AND user_id = ?',
            [id, userId]
        );

        if (orders.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        const order = orders[0];
        order.delivery_address = JSON.parse(order.delivery_address);

        // Get order items
        const [orderItems] = await pool.execute(
            `SELECT oi.*, p.name, p.unit, p.image_url
             FROM order_items oi
             JOIN products p ON oi.product_id = p.id
             WHERE oi.order_id = ?`,
            [id]
        );

        res.status(200).json({
            success: true,
            message: 'Order details fetched successfully',
            data: {
                order,
                items: orderItems
            }
        });
    } catch (error) {
        console.error('Get order by ID error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching order details'
        });
    }
};

// Cancel order (only if status is pending or confirmed)
const cancelOrder = async (req, res) => {
    const connection = await pool.getConnection();
    
    try {
        await connection.beginTransaction();
        
        const userId = req.user.id;
        const { id } = req.params;
        const { reason } = req.body;

        // Get order details
        const [orders] = await connection.execute(
            'SELECT * FROM orders WHERE id = ? AND user_id = ?',
            [id, userId]
        );

        if (orders.length === 0) {
            await connection.rollback();
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        const order = orders[0];

        // Check if order can be cancelled
        if (!['pending', 'confirmed'].includes(order.status)) {
            await connection.rollback();
            return res.status(400).json({
                success: false,
                message: 'Order cannot be cancelled at this stage'
            });
        }

        // Get order items to restore stock
        const [orderItems] = await connection.execute(
            'SELECT product_id, quantity FROM order_items WHERE order_id = ?',
            [id]
        );

        // Restore stock for each item
        for (const item of orderItems) {
            await connection.execute(
                'UPDATE products SET stock_quantity = stock_quantity + ? WHERE id = ?',
                [item.quantity, item.product_id]
            );
        }

        // Update order status
        await connection.execute(
            'UPDATE orders SET status = ?, notes = CONCAT(COALESCE(notes, ""), "\nCancellation reason: ", ?) WHERE id = ?',
            ['cancelled', reason || 'Cancelled by user', id]
        );

        await connection.commit();

        res.status(200).json({
            success: true,
            message: 'Order cancelled successfully'
        });

    } catch (error) {
        await connection.rollback();
        console.error('Cancel order error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while cancelling order'
        });
    } finally {
        connection.release();
    }
};

// Admin: Get all orders
const getAllOrders = async (req, res) => {
    try {
        const { page = 1, limit = 20, status, date_from, date_to } = req.query;

        let query = `
            SELECT o.*, u.name as customer_name, u.phone as customer_phone,
                   COUNT(oi.id) as item_count,
                   GROUP_CONCAT(CONCAT(p.name, ' (', oi.quantity, ')') SEPARATOR ', ') as items_summary
            FROM orders o
            LEFT JOIN users u ON o.user_id = u.id
            LEFT JOIN order_items oi ON o.id = oi.order_id
            LEFT JOIN products p ON oi.product_id = p.id
            WHERE 1=1
        `;
        let params = [];

        if (status) {
            query += ' AND o.status = ?';
            params.push(status);
        }

        if (date_from) {
            query += ' AND DATE(o.created_at) >= ?';
            params.push(date_from);
        }

        if (date_to) {
            query += ' AND DATE(o.created_at) <= ?';
            params.push(date_to);
        }

        query += ' GROUP BY o.id ORDER BY o.created_at DESC';
        
        const offset = (page - 1) * limit;
        query += ' LIMIT ? OFFSET ?';
        params.push(parseInt(limit), parseInt(offset));

        const [orders] = await pool.execute(query, params);

        // Get total count
        let countQuery = 'SELECT COUNT(*) as total FROM orders WHERE 1=1';
        let countParams = [];

        if (status) {
            countQuery += ' AND status = ?';
            countParams.push(status);
        }

        if (date_from) {
            countQuery += ' AND DATE(created_at) >= ?';
            countParams.push(date_from);
        }

        if (date_to) {
            countQuery += ' AND DATE(created_at) <= ?';
            countParams.push(date_to);
        }

        const [countResult] = await pool.execute(countQuery, countParams);
        const total = countResult[0].total;

        // Parse delivery_address JSON for each order
        const formattedOrders = orders.map(order => ({
            ...order,
            delivery_address: JSON.parse(order.delivery_address)
        }));

        res.status(200).json({
            success: true,
            message: 'All orders fetched successfully',
            data: {
                orders: formattedOrders,
                pagination: {
                    total,
                    page: parseInt(page),
                    limit: parseInt(limit),
                    totalPages: Math.ceil(total / limit)
                }
            }
        });
    } catch (error) {
        console.error('Get all orders error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching orders'
        });
    }
};

// Admin: Update order status
const updateOrderStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, notes } = req.body;

        const validStatuses = ['pending', 'confirmed', 'processing', 'out_for_delivery', 'delivered', 'cancelled'];
        
        if (!status || !validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid order status'
            });
        }

        // Check if order exists
        const [orders] = await pool.execute(
            'SELECT id, status FROM orders WHERE id = ?',
            [id]
        );

        if (orders.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        // Update order status
        let updateQuery = 'UPDATE orders SET status = ?';
        let params = [status];

        if (notes) {
            updateQuery += ', notes = ?';
            params.push(notes);
        }

        updateQuery += ' WHERE id = ?';
        params.push(id);

        await pool.execute(updateQuery, params);

        res.status(200).json({
            success: true,
            message: 'Order status updated successfully'
        });

    } catch (error) {
        console.error('Update order status error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while updating order status'
        });
    }
};

// Get delivery time slots
const getTimeSlots = async (req, res) => {
    try {
        const timeSlots = getDeliveryTimeSlots();
        
        res.status(200).json({
            success: true,
            message: 'Delivery time slots fetched successfully',
            data: timeSlots
        });
    } catch (error) {
        console.error('Get time slots error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching time slots'
        });
    }
};

module.exports = {
    placeOrder,
    getUserOrders,
    getOrderById,
    cancelOrder,
    getAllOrders,
    updateOrderStatus,
    getTimeSlots
};