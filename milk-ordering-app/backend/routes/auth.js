const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// User Authentication Routes
router.post('/register/phone', authController.registerWithPhone);
router.post('/register/email', authController.registerWithEmail);
router.post('/verify-otp', authController.verifyOTP);
router.post('/login', authController.login);
router.post('/resend-otp', authController.resendOTP);

// Admin Authentication Routes
router.post('/admin/login', authController.adminLogin);

module.exports = router;