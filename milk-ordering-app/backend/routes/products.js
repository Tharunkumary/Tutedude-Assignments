const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const { verifyAdminToken } = require('../middleware/auth');

// Public Product Routes (Customer App)
router.get('/categories', productController.getCategories);
router.get('/', productController.getProducts);
router.get('/:id', productController.getProductById);

// Admin Product Routes (Protected)
router.post('/admin/categories', verifyAdminToken, productController.createCategory);
router.post('/admin/products', verifyAdminToken, productController.createProduct);
router.get('/admin/products', verifyAdminToken, productController.getAllProducts);
router.put('/admin/products/:id', verifyAdminToken, productController.updateProduct);
router.delete('/admin/products/:id', verifyAdminToken, productController.deleteProduct);

module.exports = router;