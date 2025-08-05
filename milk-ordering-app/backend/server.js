const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config();

const { testConnection, initializeDatabase } = require('./config/database');

// Import routes
const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');
const cartRoutes = require('./routes/cart');
const orderRoutes = require('./routes/orders');
const userRoutes = require('./routes/users');

const app = express();
const PORT = process.env.PORT || 5000;

// Security middleware
app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // limit each IP to 100 requests per windowMs
    message: {
        success: false,
        message: 'Too many requests from this IP, please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false,
});

app.use('/api/', limiter);

// CORS configuration
const corsOptions = {
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);
        
        const allowedOrigins = [
            'http://localhost:3000',
            'http://localhost:3001',
            'http://127.0.0.1:3000',
            'http://127.0.0.1:3001',
            // Add your production domains here
        ];
        
        if (allowedOrigins.indexOf(origin) !== -1 || !origin) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    optionsSuccessStatus: 200,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

app.use(cors(corsOptions));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static files (for uploaded images)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'Milk Ordering API is running!',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development'
    });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/users', userRoutes);

// Welcome route
app.get('/', (req, res) => {
    res.json({
        success: true,
        message: 'Welcome to Milk Ordering App API',
        version: '1.0.0',
        documentation: '/api/docs',
        endpoints: {
            auth: '/api/auth',
            products: '/api/products',
            cart: '/api/cart',
            orders: '/api/orders'
        }
    });
});

// API Documentation endpoint
app.get('/api/docs', (req, res) => {
    res.json({
        success: true,
        message: 'Milk Ordering App API Documentation',
        version: '1.0.0',
        baseUrl: `${req.protocol}://${req.get('host')}/api`,
        endpoints: {
            authentication: {
                'POST /auth/register/phone': 'Register with phone number',
                'POST /auth/register/email': 'Register with email',
                'POST /auth/verify-otp': 'Verify OTP',
                'POST /auth/login': 'User login',
                'POST /auth/resend-otp': 'Resend OTP',
                'POST /auth/admin/login': 'Admin login'
            },
            products: {
                'GET /products/categories': 'Get all categories',
                'GET /products': 'Get all products',
                'GET /products/:id': 'Get product by ID',
                'POST /products/admin/categories': 'Create category (Admin)',
                'POST /products/admin/products': 'Create product (Admin)',
                'PUT /products/admin/products/:id': 'Update product (Admin)',
                'DELETE /products/admin/products/:id': 'Delete product (Admin)'
            },
            cart: {
                'GET /cart': 'Get user cart',
                'GET /cart/count': 'Get cart item count',
                'POST /cart/add': 'Add item to cart',
                'PUT /cart/update/:product_id': 'Update cart item',
                'DELETE /cart/remove/:product_id': 'Remove item from cart',
                'DELETE /cart/clear': 'Clear entire cart'
            },
            orders: {
                'GET /orders/time-slots': 'Get delivery time slots',
                'POST /orders': 'Place new order',
                'GET /orders/my-orders': 'Get user orders',
                'GET /orders/:id': 'Get order details',
                'PUT /orders/:id/cancel': 'Cancel order',
                'GET /orders/admin/all': 'Get all orders (Admin)',
                'PUT /orders/admin/:id/status': 'Update order status (Admin)'
            }
        },
        authentication: {
            type: 'Bearer Token',
            header: 'Authorization',
            format: 'Bearer <token>'
        }
    });
});

// Handle 404 errors
app.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        message: 'API endpoint not found',
        requestedUrl: req.originalUrl,
        method: req.method,
        availableEndpoints: '/api/docs'
    });
});

// Global error handling middleware
app.use((error, req, res, next) => {
    console.error('Global error handler:', error);
    
    // Handle specific error types
    if (error.type === 'entity.parse.failed') {
        return res.status(400).json({
            success: false,
            message: 'Invalid JSON format in request body'
        });
    }
    
    if (error.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({
            success: false,
            message: 'File size too large'
        });
    }
    
    if (error.message === 'Not allowed by CORS') {
        return res.status(403).json({
            success: false,
            message: 'CORS policy violation'
        });
    }
    
    // Default error response
    res.status(error.status || 500).json({
        success: false,
        message: error.message || 'Internal server error',
        ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    });
});

// Graceful shutdown function
const gracefulShutdown = () => {
    console.log('\n🔄 Received shutdown signal, closing server gracefully...');
    
    server.close(() => {
        console.log('✅ HTTP server closed');
        process.exit(0);
    });
    
    // Force close after 30 seconds
    setTimeout(() => {
        console.error('❌ Could not close connections in time, forcefully shutting down');
        process.exit(1);
    }, 30000);
};

// Handle shutdown signals
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});

// Initialize database and start server
const startServer = async () => {
    try {
        console.log('🚀 Starting Milk Ordering App API...');
        
        // Test database connection
        const dbConnected = await testConnection();
        if (!dbConnected) {
            console.error('❌ Failed to connect to database. Exiting...');
            process.exit(1);
        }
        
        // Initialize database tables
        await initializeDatabase();
        
        // Start server
        const server = app.listen(PORT, '0.0.0.0', () => {
            console.log(`\n🎉 Server running successfully!`);
            console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
            console.log(`🌐 Server URL: http://localhost:${PORT}`);
            console.log(`📚 API Documentation: http://localhost:${PORT}/api/docs`);
            console.log(`❤️  Health Check: http://localhost:${PORT}/health`);
            console.log(`\n📋 Available API Endpoints:`);
            console.log(`   🔐 Authentication: http://localhost:${PORT}/api/auth`);
            console.log(`   🛍️  Products: http://localhost:${PORT}/api/products`);
            console.log(`   🛒 Cart: http://localhost:${PORT}/api/cart`);
            console.log(`   📦 Orders: http://localhost:${PORT}/api/orders`);
            console.log(`\n✨ Ready to serve requests!`);
        });
        
        // Store server reference for graceful shutdown
        global.server = server;
        
    } catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
};

// Start the server
startServer();

module.exports = app;