const nodemailer = require('nodemailer');
const crypto = require('crypto');

// Generate random OTP
const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

// Generate order number
const generateOrderNumber = () => {
    const timestamp = Date.now().toString();
    const random = Math.floor(1000 + Math.random() * 9000);
    return `MO${timestamp.slice(-6)}${random}`;
};

// Email transporter configuration
const createEmailTransporter = () => {
    return nodemailer.createTransporter({
        host: process.env.EMAIL_HOST,
        port: process.env.EMAIL_PORT,
        secure: false, // true for 465, false for other ports
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        },
        tls: {
            rejectUnauthorized: false
        }
    });
};

// Send OTP email
const sendOTPEmail = async (email, otp, name) => {
    try {
        const transporter = createEmailTransporter();
        
        const mailOptions = {
            from: `"Milk Ordering App" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: 'Your OTP for Milk Ordering App',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #4CAF50;">Milk Ordering App</h2>
                    <p>Hello ${name},</p>
                    <p>Your OTP for verification is:</p>
                    <div style="background: #f5f5f5; padding: 20px; text-align: center; margin: 20px 0;">
                        <h1 style="color: #4CAF50; font-size: 36px; margin: 0;">${otp}</h1>
                    </div>
                    <p>This OTP is valid for 5 minutes only.</p>
                    <p>If you didn't request this, please ignore this email.</p>
                    <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
                    <p style="color: #666; font-size: 12px;">
                        This is an automated email. Please do not reply.
                    </p>
                </div>
            `
        };

        await transporter.sendMail(mailOptions);
        return true;
    } catch (error) {
        console.error('Email sending error:', error);
        return false;
    }
};

// Send order confirmation email
const sendOrderConfirmationEmail = async (email, name, orderData) => {
    try {
        const transporter = createEmailTransporter();
        
        const itemsHtml = orderData.items.map(item => `
            <tr>
                <td style="padding: 10px; border-bottom: 1px solid #eee;">${item.name}</td>
                <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
                <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">₹${item.unit_price}</td>
                <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">₹${item.total_price}</td>
            </tr>
        `).join('');

        const mailOptions = {
            from: `"Milk Ordering App" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: `Order Confirmation - ${orderData.order_number}`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #4CAF50;">Order Confirmed!</h2>
                    <p>Hello ${name},</p>
                    <p>Thank you for your order. Here are the details:</p>
                    
                    <div style="background: #f9f9f9; padding: 20px; margin: 20px 0;">
                        <h3>Order #${orderData.order_number}</h3>
                        <p><strong>Total Amount:</strong> ₹${orderData.total_amount}</p>
                        <p><strong>Payment Method:</strong> ${orderData.payment_method.toUpperCase()}</p>
                        <p><strong>Delivery Date:</strong> ${orderData.delivery_date}</p>
                    </div>

                    <h3>Order Items:</h3>
                    <table style="width: 100%; border-collapse: collapse;">
                        <thead>
                            <tr style="background: #f5f5f5;">
                                <th style="padding: 10px; text-align: left;">Item</th>
                                <th style="padding: 10px; text-align: center;">Qty</th>
                                <th style="padding: 10px; text-align: right;">Price</th>
                                <th style="padding: 10px; text-align: right;">Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${itemsHtml}
                        </tbody>
                    </table>

                    <p style="margin-top: 30px;">We'll deliver your fresh dairy products on the scheduled date.</p>
                    
                    <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
                    <p style="color: #666; font-size: 12px;">
                        Thank you for choosing Milk Ordering App!
                    </p>
                </div>
            `
        };

        await transporter.sendMail(mailOptions);
        return true;
    } catch (error) {
        console.error('Order confirmation email error:', error);
        return false;
    }
};

// Validate email format
const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

// Validate phone number format
const isValidPhone = (phone) => {
    const phoneRegex = /^[6-9]\d{9}$/;
    return phoneRegex.test(phone);
};

// Sanitize string input
const sanitizeString = (str) => {
    if (typeof str !== 'string') return '';
    return str.trim().replace(/[<>]/g, '');
};

// Format currency
const formatCurrency = (amount) => {
    return `₹${parseFloat(amount).toFixed(2)}`;
};

// Calculate delivery date (next day)
const getDeliveryDate = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
};

// Get available delivery time slots
const getDeliveryTimeSlots = () => {
    return [
        '6:00 AM - 8:00 AM',
        '8:00 AM - 10:00 AM',
        '10:00 AM - 12:00 PM',
        '2:00 PM - 4:00 PM',
        '4:00 PM - 6:00 PM',
        '6:00 PM - 8:00 PM'
    ];
};

// Check if current time is within business hours
const isBusinessHour = () => {
    const now = new Date();
    const hour = now.getHours();
    return hour >= 6 && hour <= 22; // 6 AM to 10 PM
};

module.exports = {
    generateOTP,
    generateOrderNumber,
    sendOTPEmail,
    sendOrderConfirmationEmail,
    isValidEmail,
    isValidPhone,
    sanitizeString,
    formatCurrency,
    getDeliveryDate,
    getDeliveryTimeSlots,
    isBusinessHour
};