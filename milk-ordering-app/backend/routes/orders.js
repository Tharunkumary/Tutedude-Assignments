const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { verifyToken, requireVerified, verifyAdminToken } = require('../middleware/auth');

// Public Routes
router.get('/time-slots', orderController.getTimeSlots);

// Admin Order Routes (Protected) - These need to come before customer routes
router.get('/admin/all', verifyAdminToken, orderController.getAllOrders);
router.put('/admin/:id/status', verifyAdminToken, orderController.updateOrderStatus);

// Customer Order Routes (Protected)
router.post('/', verifyToken, requireVerified, orderController.placeOrder);
router.get('/my-orders', verifyToken, requireVerified, orderController.getUserOrders);
router.get('/:id', verifyToken, requireVerified, orderController.getOrderById);
router.put('/:id/cancel', verifyToken, requireVerified, orderController.cancelOrder);

module.exports = router;