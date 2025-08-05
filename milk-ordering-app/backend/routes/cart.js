const express = require('express');
const router = express.Router();
const cartController = require('../controllers/cartController');
const { verifyToken, requireVerified } = require('../middleware/auth');

// All cart routes require authentication and verification
router.use(verifyToken);
router.use(requireVerified);

// Cart Routes
router.get('/', cartController.getCart);
router.get('/count', cartController.getCartCount);
router.post('/add', cartController.addToCart);
router.put('/update/:product_id', cartController.updateCartItem);
router.delete('/remove/:product_id', cartController.removeFromCart);
router.delete('/clear', cartController.clearCart);

module.exports = router;