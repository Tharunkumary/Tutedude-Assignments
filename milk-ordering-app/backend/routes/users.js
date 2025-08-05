const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { verifyAdminToken } = require('../middleware/auth');

// Admin User Routes (Protected)
router.get('/admin/all', verifyAdminToken, userController.getAllUsers);
router.get('/admin/:id', verifyAdminToken, userController.getUserById);
router.get('/admin/:id/orders', verifyAdminToken, userController.getUserOrders);

module.exports = router;