# Milk & Dairy Products Ordering App - Setup Guide

This guide will help you set up and run the complete Milk Ordering App system locally.

## 🗂️ Project Structure

```
milk-ordering-app/
├── backend/              # Node.js Express API
├── android-app/          # Kotlin/Jetpack Compose (Planned)
├── admin-panel/          # React.js Admin Dashboard
└── docs/                 # Documentation
```

## 📋 Prerequisites

Before setting up the project, ensure you have the following installed:

- **Node.js** (v14 or higher)
- **MySQL Server** (v5.7 or higher)
- **Git**
- **Android Studio** (for Android development)

## 🚀 Quick Start

### 1. Clone the Repository

```bash
git clone <repository-url>
cd milk-ordering-app
```

### 2. Setup MySQL Database

1. **Install MySQL** (if not already installed):
   - Download from [MySQL Official Website](https://dev.mysql.com/downloads/)
   - Follow installation instructions for your OS

2. **Create Database**:
   ```sql
   CREATE DATABASE milk_ordering_db;
   ```

3. **Create MySQL User** (optional but recommended):
   ```sql
   CREATE USER 'milk_user'@'localhost' IDENTIFIED BY 'secure_password';
   GRANT ALL PRIVILEGES ON milk_ordering_db.* TO 'milk_user'@'localhost';
   FLUSH PRIVILEGES;
   ```

### 3. Setup Backend API

1. **Navigate to backend directory**:
   ```bash
   cd backend
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure environment variables**:
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` file with your database credentials:
   ```env
   DB_HOST=localhost
   DB_USER=milk_user
   DB_PASS=secure_password
   DB_NAME=milk_ordering_db
   DB_PORT=3306
   
   JWT_SECRET=your_very_long_jwt_secret_key_here
   PORT=5000
   ```

4. **Seed the database**:
   ```bash
   npm run seed
   ```

5. **Start the backend server**:
   ```bash
   npm run dev
   ```

   The API will be available at `http://localhost:5000`

### 4. Setup Admin Panel

1. **Open new terminal** and navigate to admin panel:
   ```bash
   cd admin-panel
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure environment**:
   ```bash
   cp .env.example .env
   ```
   
   The `.env` file should contain:
   ```env
   REACT_APP_API_URL=http://localhost:5000/api
   ```

4. **Start the admin panel**:
   ```bash
   npm start
   ```

   The admin panel will be available at `http://localhost:3000`

## 🔐 Default Credentials

### Admin Panel Login
- **Username**: `admin`
- **Password**: `admin123`

## 📖 API Documentation

The API documentation is available at:
- **Base URL**: `http://localhost:5000`
- **Documentation**: `http://localhost:5000/api/docs`
- **Health Check**: `http://localhost:5000/health`

### Key API Endpoints

#### Authentication
- `POST /api/auth/register/phone` - Register with phone number
- `POST /api/auth/register/email` - Register with email
- `POST /api/auth/verify-otp` - Verify OTP
- `POST /api/auth/login` - User login
- `POST /api/auth/admin/login` - Admin login

#### Products
- `GET /api/products/categories` - Get all categories
- `GET /api/products` - Get all products
- `GET /api/products/:id` - Get product by ID
- `POST /api/products/admin/products` - Create product (Admin)

#### Cart (Authenticated)
- `GET /api/cart` - Get user cart
- `POST /api/cart/add` - Add item to cart
- `PUT /api/cart/update/:product_id` - Update cart item
- `DELETE /api/cart/remove/:product_id` - Remove from cart

#### Orders (Authenticated)
- `POST /api/orders` - Place new order
- `GET /api/orders/my-orders` - Get user orders
- `GET /api/orders/:id` - Get order details
- `GET /api/orders/admin/all` - Get all orders (Admin)

#### Users (Admin)
- `GET /api/users/admin/all` - Get all users
- `GET /api/users/admin/:id` - Get user details

## 🛠️ Development Workflow

### Backend Development

1. **Start development server**:
   ```bash
   cd backend
   npm run dev
   ```

2. **Add new endpoints**:
   - Create controller in `controllers/`
   - Add routes in `routes/`
   - Update `server.js` if needed

3. **Database changes**:
   - Modify `config/database.js` for schema changes
   - Update seed data in `scripts/seedData.js`

### Admin Panel Development

1. **Start development server**:
   ```bash
   cd admin-panel
   npm start
   ```

2. **Add new pages**:
   - Create components in `src/pages/`
   - Add routes in `src/App.tsx`
   - Update navigation in `src/components/Layout/Layout.tsx`

### Testing API Endpoints

You can test API endpoints using:

1. **Postman** or **Insomnia**
2. **curl** commands
3. **Admin Panel** interface

Example curl command:
```bash
# Get all products
curl -X GET http://localhost:5000/api/products

# Login as admin
curl -X POST http://localhost:5000/api/auth/admin/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "admin123"}'
```

## 🗄️ Database Schema

The application uses the following main tables:

- **users** - Customer information and authentication
- **admin_users** - Admin user accounts
- **categories** - Product categories
- **products** - Product catalog
- **carts** - Shopping cart items
- **orders** - Order information
- **order_items** - Individual order items
- **addresses** - Customer delivery addresses
- **reviews** - Product reviews and ratings

## 🐛 Troubleshooting

### Common Issues

1. **Database connection fails**:
   - Verify MySQL is running
   - Check database credentials in `.env`
   - Ensure database exists

2. **Port already in use**:
   - Change port in `.env` file
   - Kill process using the port: `lsof -ti:5000 | xargs kill -9`

3. **CORS errors**:
   - Verify admin panel URL is in backend CORS settings
   - Check `REACT_APP_API_URL` in admin panel `.env`

4. **Admin login fails**:
   - Ensure seed script has run successfully
   - Check database for admin_users table

### Logs and Debugging

- **Backend logs**: Check terminal running `npm run dev`
- **Admin panel logs**: Check browser console (F12)
- **Database logs**: Check MySQL error logs

## 📱 Android App (Planned)

The Android app development is planned for the next phase and will include:

- Kotlin with Jetpack Compose
- Customer registration and login
- Product browsing and cart management
- Order placement and tracking
- Payment integration
- Push notifications

## 🔄 Next Steps

1. **Complete Android app development**
2. **Integrate payment gateways (Razorpay/UPI)**
3. **Implement push notifications**
4. **Add real-time order tracking**
5. **Deploy to production servers**

## 📞 Support

If you encounter any issues during setup:

1. Check the troubleshooting section above
2. Verify all prerequisites are installed
3. Ensure all environment variables are configured
4. Check that all services are running on correct ports

For additional help, refer to the API documentation at `http://localhost:5000/api/docs` when the backend is running.