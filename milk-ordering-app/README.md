# Milk & Dairy Products Ordering App

A complete mobile and web application for ordering fresh milk and dairy products with home delivery.

## 🏗️ Project Structure

```
milk-ordering-app/
├── backend/              # Node.js Express API
├── android-app/          # Kotlin/Jetpack Compose Android App
├── admin-panel/          # React.js Admin Dashboard
└── docs/                 # Documentation
```

## 🚀 Features

### Customer App (Android)
- User Registration/Login (OTP & Email)
- Browse dairy products (milk, curd, paneer, butter)
- Shopping cart management
- Delivery address management
- Order placement and tracking
- Payment integration (Razorpay/UPI/COD)
- Order history and notifications
- Product ratings and reviews

### Admin Panel (Web)
- Admin authentication
- Product management (CRUD operations)
- Order management and tracking
- User management
- Inventory control
- Sales reports and analytics

### Backend API
- RESTful APIs for all operations
- User authentication and authorization
- Product and order management
- Payment processing
- Real-time notifications
- MySQL database integration

## 🛠️ Tech Stack

- **Android**: Kotlin, Jetpack Compose, Retrofit, Room DB
- **Backend**: Node.js, Express.js, MySQL, JWT Authentication
- **Admin Panel**: React.js, Material-UI, Axios
- **Payment**: Razorpay integration
- **Notifications**: Firebase Cloud Messaging
- **Database**: MySQL with proper normalization

## 📱 Getting Started

### Prerequisites
- Node.js (v14+)
- MySQL Server
- Android Studio
- Git

### Installation

1. Clone the repository
```bash
git clone <repo-url>
cd milk-ordering-app
```

2. Set up Backend
```bash
cd backend
npm install
npm run dev
```

3. Set up Admin Panel
```bash
cd admin-panel
npm install
npm start
```

4. Set up Android App
- Open `android-app` in Android Studio
- Sync project with Gradle files
- Run on device/emulator

## 🔧 Configuration

### Environment Variables
Create `.env` files in respective directories with required configurations:

**Backend (.env)**
```
DB_HOST=localhost
DB_USER=your_db_user
DB_PASS=your_db_password
DB_NAME=milk_ordering_db
JWT_SECRET=your_jwt_secret
RAZORPAY_KEY=your_razorpay_key
RAZORPAY_SECRET=your_razorpay_secret
```

## 📖 API Documentation
Detailed API documentation available in `/docs/api.md`

## 🤝 Contributing
1. Fork the repository
2. Create feature branch
3. Commit changes
4. Push to branch
5. Create Pull Request

## 📄 License
This project is licensed under the MIT License.