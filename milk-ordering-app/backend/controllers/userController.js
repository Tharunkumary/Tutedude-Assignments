const { pool } = require('../config/database');

// Admin: Get all users
const getAllUsers = async (req, res) => {
    try {
        const { page = 1, limit = 20, search } = req.query;
        
        let query = `
            SELECT id, phone, email, name, is_verified, created_at
            FROM users 
            WHERE 1=1
        `;
        let params = [];

        // Add search filter
        if (search) {
            query += ' AND (name LIKE ? OR phone LIKE ? OR email LIKE ?)';
            const searchTerm = `%${search}%`;
            params.push(searchTerm, searchTerm, searchTerm);
        }

        // Add pagination
        const offset = (page - 1) * limit;
        query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
        params.push(parseInt(limit), parseInt(offset));

        const [users] = await pool.execute(query, params);

        // Get total count for pagination
        let countQuery = 'SELECT COUNT(*) as total FROM users WHERE 1=1';
        let countParams = [];

        if (search) {
            countQuery += ' AND (name LIKE ? OR phone LIKE ? OR email LIKE ?)';
            const searchTerm = `%${search}%`;
            countParams.push(searchTerm, searchTerm, searchTerm);
        }

        const [countResult] = await pool.execute(countQuery, countParams);
        const total = countResult[0].total;

        res.status(200).json({
            success: true,
            message: 'Users fetched successfully',
            data: {
                users,
                pagination: {
                    total,
                    page: parseInt(page),
                    limit: parseInt(limit),
                    totalPages: Math.ceil(total / limit)
                }
            }
        });
    } catch (error) {
        console.error('Get all users error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching users'
        });
    }
};

// Admin: Get user details by ID
const getUserById = async (req, res) => {
    try {
        const { id } = req.params;

        // Get user details
        const [users] = await pool.execute(
            'SELECT id, phone, email, name, is_verified, created_at FROM users WHERE id = ?',
            [id]
        );

        if (users.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        const user = users[0];

        // Get user's addresses
        const [addresses] = await pool.execute(
            'SELECT * FROM addresses WHERE user_id = ? ORDER BY is_default DESC, created_at DESC',
            [id]
        );

        // Get user's order summary
        const [orderSummary] = await pool.execute(
            `SELECT 
                COUNT(*) as total_orders,
                SUM(CASE WHEN status = 'delivered' THEN total_amount ELSE 0 END) as total_spent,
                MAX(created_at) as last_order_date
             FROM orders WHERE user_id = ?`,
            [id]
        );

        user.addresses = addresses;
        user.order_summary = orderSummary[0];

        res.status(200).json({
            success: true,
            message: 'User details fetched successfully',
            data: user
        });
    } catch (error) {
        console.error('Get user by ID error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching user details'
        });
    }
};

// Admin: Get user's orders
const getUserOrders = async (req, res) => {
    try {
        const { id } = req.params;
        const { page = 1, limit = 10 } = req.query;

        // Check if user exists
        const [users] = await pool.execute(
            'SELECT id FROM users WHERE id = ?',
            [id]
        );

        if (users.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        const offset = (page - 1) * limit;

        const [orders] = await pool.execute(
            `SELECT o.*, 
                    COUNT(oi.id) as item_count,
                    GROUP_CONCAT(CONCAT(p.name, ' (', oi.quantity, ')') SEPARATOR ', ') as items_summary
             FROM orders o
             LEFT JOIN order_items oi ON o.id = oi.order_id
             LEFT JOIN products p ON oi.product_id = p.id
             WHERE o.user_id = ?
             GROUP BY o.id 
             ORDER BY o.created_at DESC
             LIMIT ? OFFSET ?`,
            [id, parseInt(limit), parseInt(offset)]
        );

        // Get total count
        const [countResult] = await pool.execute(
            'SELECT COUNT(*) as total FROM orders WHERE user_id = ?',
            [id]
        );
        const total = countResult[0].total;

        // Parse delivery_address JSON for each order
        const formattedOrders = orders.map(order => ({
            ...order,
            delivery_address: JSON.parse(order.delivery_address)
        }));

        res.status(200).json({
            success: true,
            message: 'User orders fetched successfully',
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
            message: 'Server error while fetching user orders'
        });
    }
};

module.exports = {
    getAllUsers,
    getUserById,
    getUserOrders
};