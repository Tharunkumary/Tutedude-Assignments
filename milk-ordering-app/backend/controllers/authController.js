const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { pool } = require('../config/database');
const { 
    generateOTP, 
    sendOTPEmail, 
    isValidEmail, 
    isValidPhone, 
    sanitizeString 
} = require('../utils/helpers');

// User Registration with Phone
const registerWithPhone = async (req, res) => {
    try {
        const { phone, name } = req.body;

        // Validate input
        if (!phone || !name) {
            return res.status(400).json({
                success: false,
                message: 'Phone number and name are required'
            });
        }

        if (!isValidPhone(phone)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid phone number format'
            });
        }

        const sanitizedName = sanitizeString(name);
        if (sanitizedName.length < 2) {
            return res.status(400).json({
                success: false,
                message: 'Name must be at least 2 characters'
            });
        }

        // Check if user already exists
        const [existingUsers] = await pool.execute(
            'SELECT id, is_verified FROM users WHERE phone = ?',
            [phone]
        );

        if (existingUsers.length > 0) {
            if (existingUsers[0].is_verified) {
                return res.status(400).json({
                    success: false,
                    message: 'Phone number already registered and verified'
                });
            }
            // User exists but not verified, allow re-registration
        }

        // Generate OTP
        const otp = generateOTP();
        const otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

        // Insert or update user
        if (existingUsers.length > 0) {
            await pool.execute(
                'UPDATE users SET name = ?, otp = ?, otp_expires_at = ? WHERE phone = ?',
                [sanitizedName, otp, otpExpiresAt, phone]
            );
        } else {
            await pool.execute(
                'INSERT INTO users (phone, name, otp, otp_expires_at) VALUES (?, ?, ?, ?)',
                [phone, sanitizedName, otp, otpExpiresAt]
            );
        }

        // In production, send OTP via SMS
        // For demo, we'll return the OTP (remove this in production)
        console.log(`OTP for ${phone}: ${otp}`);

        res.status(200).json({
            success: true,
            message: 'OTP sent successfully',
            data: {
                phone: phone,
                otp: otp // Remove this in production
            }
        });

    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error during registration'
        });
    }
};

// User Registration with Email
const registerWithEmail = async (req, res) => {
    try {
        const { email, name, password } = req.body;

        // Validate input
        if (!email || !name || !password) {
            return res.status(400).json({
                success: false,
                message: 'Email, name, and password are required'
            });
        }

        if (!isValidEmail(email)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid email format'
            });
        }

        const sanitizedName = sanitizeString(name);
        if (sanitizedName.length < 2) {
            return res.status(400).json({
                success: false,
                message: 'Name must be at least 2 characters'
            });
        }

        if (password.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'Password must be at least 6 characters'
            });
        }

        // Check if user already exists
        const [existingUsers] = await pool.execute(
            'SELECT id, is_verified FROM users WHERE email = ?',
            [email.toLowerCase()]
        );

        if (existingUsers.length > 0) {
            if (existingUsers[0].is_verified) {
                return res.status(400).json({
                    success: false,
                    message: 'Email already registered and verified'
                });
            }
        }

        // Hash password
        const passwordHash = await bcrypt.hash(password, 12);

        // Generate OTP
        const otp = generateOTP();
        const otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000);

        // Generate unique phone for email registration
        const uniquePhone = `EMAIL_${Date.now()}`;

        // Insert or update user
        if (existingUsers.length > 0) {
            await pool.execute(
                'UPDATE users SET name = ?, password_hash = ?, otp = ?, otp_expires_at = ? WHERE email = ?',
                [sanitizedName, passwordHash, otp, otpExpiresAt, email.toLowerCase()]
            );
        } else {
            await pool.execute(
                'INSERT INTO users (phone, email, name, password_hash, otp, otp_expires_at) VALUES (?, ?, ?, ?, ?, ?)',
                [uniquePhone, email.toLowerCase(), sanitizedName, passwordHash, otp, otpExpiresAt]
            );
        }

        // Send OTP email
        const emailSent = await sendOTPEmail(email, otp, sanitizedName);
        
        if (!emailSent) {
            return res.status(500).json({
                success: false,
                message: 'Failed to send verification email'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Verification email sent successfully',
            data: {
                email: email
            }
        });

    } catch (error) {
        console.error('Email registration error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error during registration'
        });
    }
};

// Verify OTP
const verifyOTP = async (req, res) => {
    try {
        const { phone, email, otp } = req.body;

        if (!otp) {
            return res.status(400).json({
                success: false,
                message: 'OTP is required'
            });
        }

        if (!phone && !email) {
            return res.status(400).json({
                success: false,
                message: 'Phone number or email is required'
            });
        }

        // Find user
        let query = 'SELECT * FROM users WHERE otp = ? AND otp_expires_at > NOW() AND ';
        let params = [otp];

        if (phone) {
            query += 'phone = ?';
            params.push(phone);
        } else {
            query += 'email = ?';
            params.push(email.toLowerCase());
        }

        const [users] = await pool.execute(query, params);

        if (users.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Invalid or expired OTP'
            });
        }

        const user = users[0];

        // Mark user as verified and clear OTP
        await pool.execute(
            'UPDATE users SET is_verified = TRUE, otp = NULL, otp_expires_at = NULL WHERE id = ?',
            [user.id]
        );

        // Generate JWT token
        const token = jwt.sign(
            { userId: user.id, phone: user.phone, email: user.email },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
        );

        res.status(200).json({
            success: true,
            message: 'Account verified successfully',
            data: {
                token,
                user: {
                    id: user.id,
                    phone: user.phone,
                    email: user.email,
                    name: user.name,
                    is_verified: true
                }
            }
        });

    } catch (error) {
        console.error('OTP verification error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error during OTP verification'
        });
    }
};

// User Login
const login = async (req, res) => {
    try {
        const { phone, email, password } = req.body;

        if (!password) {
            return res.status(400).json({
                success: false,
                message: 'Password is required'
            });
        }

        if (!phone && !email) {
            return res.status(400).json({
                success: false,
                message: 'Phone number or email is required'
            });
        }

        // Find user
        let query = 'SELECT * FROM users WHERE ';
        let params = [];

        if (phone) {
            query += 'phone = ?';
            params.push(phone);
        } else {
            query += 'email = ?';
            params.push(email.toLowerCase());
        }

        const [users] = await pool.execute(query, params);

        if (users.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        const user = users[0];

        if (!user.password_hash) {
            return res.status(401).json({
                success: false,
                message: 'Please register with password or use OTP login'
            });
        }

        // Verify password
        const isPasswordValid = await bcrypt.compare(password, user.password_hash);
        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        if (!user.is_verified) {
            return res.status(401).json({
                success: false,
                message: 'Account not verified. Please verify your account.'
            });
        }

        // Generate JWT token
        const token = jwt.sign(
            { userId: user.id, phone: user.phone, email: user.email },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
        );

        res.status(200).json({
            success: true,
            message: 'Login successful',
            data: {
                token,
                user: {
                    id: user.id,
                    phone: user.phone,
                    email: user.email,
                    name: user.name,
                    is_verified: user.is_verified
                }
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error during login'
        });
    }
};

// Resend OTP
const resendOTP = async (req, res) => {
    try {
        const { phone, email } = req.body;

        if (!phone && !email) {
            return res.status(400).json({
                success: false,
                message: 'Phone number or email is required'
            });
        }

        // Find user
        let query = 'SELECT * FROM users WHERE ';
        let params = [];

        if (phone) {
            query += 'phone = ?';
            params.push(phone);
        } else {
            query += 'email = ?';
            params.push(email.toLowerCase());
        }

        const [users] = await pool.execute(query, params);

        if (users.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        const user = users[0];

        if (user.is_verified) {
            return res.status(400).json({
                success: false,
                message: 'Account already verified'
            });
        }

        // Generate new OTP
        const otp = generateOTP();
        const otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000);

        // Update OTP
        await pool.execute(
            'UPDATE users SET otp = ?, otp_expires_at = ? WHERE id = ?',
            [otp, otpExpiresAt, user.id]
        );

        // Send OTP
        if (email && user.email) {
            const emailSent = await sendOTPEmail(user.email, otp, user.name);
            if (!emailSent) {
                return res.status(500).json({
                    success: false,
                    message: 'Failed to send verification email'
                });
            }
        } else {
            // In production, send SMS
            console.log(`OTP for ${phone}: ${otp}`);
        }

        res.status(200).json({
            success: true,
            message: 'OTP sent successfully',
            data: {
                phone: user.phone,
                email: user.email,
                otp: otp // Remove in production
            }
        });

    } catch (error) {
        console.error('Resend OTP error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while resending OTP'
        });
    }
};

// Admin Login
const adminLogin = async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({
                success: false,
                message: 'Username and password are required'
            });
        }

        // Find admin user
        const [admins] = await pool.execute(
            'SELECT * FROM admin_users WHERE (username = ? OR email = ?) AND is_active = TRUE',
            [username, username]
        );

        if (admins.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        const admin = admins[0];

        // Verify password
        const isPasswordValid = await bcrypt.compare(password, admin.password_hash);
        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        // Generate JWT token
        const token = jwt.sign(
            { adminId: admin.id, username: admin.username, role: admin.role },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
        );

        res.status(200).json({
            success: true,
            message: 'Admin login successful',
            data: {
                token,
                admin: {
                    id: admin.id,
                    username: admin.username,
                    email: admin.email,
                    role: admin.role
                }
            }
        });

    } catch (error) {
        console.error('Admin login error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error during admin login'
        });
    }
};

module.exports = {
    registerWithPhone,
    registerWithEmail,
    verifyOTP,
    login,
    resendOTP,
    adminLogin
};