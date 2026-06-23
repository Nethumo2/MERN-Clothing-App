# LUSH - Luxury Fashion E-Commerce Mobile App

LUSH is a luxury fashion e-commerce mobile application developed for the Web and Mobile Technologies group assignment. The system provides a modern customer shopping flow and an admin management flow using React Native, Node.js, Express.js, MongoDB Atlas, and Railway deployment.

## Project Overview

Customers can register or log in, browse fashion products, view product details, manage cart items, upload vouchers, proceed to checkout, upload payment slips, place orders, and view order history.

Admins can manage products, categories, users, customer cart activity, voucher approvals, payment proofs, and order statuses through role-based access.

## Tech Stack

- Frontend: React Native with Expo
- Backend: Node.js and Express.js
- Database: MongoDB Atlas with Mongoose
- Authentication: JWT and bcrypt
- File Uploads: Multer with Cloudinary storage
- Deployment: Railway
- Testing: Jest

## Folder Structure

```text
WMT-Assignment/
  backend/
    config/
    middleware/
    models/
    routes/
    server.js
  frontend/
    src/
      context/
      navigation/
      screens/
      services/
  testing app/
    Cart.test.js
    Category.test.js
    Checkout.test.js
    Home.test.js
    ProductDetails.test.js
```

## Main Features

- User registration and login
- JWT protected user and admin routes
- Role-based access using `isAdmin`
- Product browsing with categories
- New arrivals and discounts
- Product details with size and quantity selection
- Add to cart, update quantity, remove item, clear cart
- Select specific cart items for checkout
- Voucher image and amount upload from cart
- Admin voucher accept/reject flow
- Checkout with shipping details
- Payment slip upload during checkout
- Order creation and order history
- Admin order status update: Pending, Order Placed, Order Cancelled
- Stock reduction after order placement
- Stock restoration when an order is cancelled
- Product CRUD with image URL or image upload
- Category CRUD with image upload
- Uncategorized product management
- Admin user management and customer cart activity

## Customer Flow

```text
Register/Login
  -> Browse Home Products
  -> View Product Details
  -> Add to Cart
  -> View Cart
  -> Select Items
  -> Optional Voucher Upload
  -> Checkout
  -> Optional Payment Slip Upload
  -> Place Order
  -> View Order History
```

## Admin Flow

```text
Admin Login
  -> Manage Products
  -> Manage Categories
  -> Manage Users
  -> View Customer Cart Activity
  -> Accept/Reject Vouchers
  -> View Payment Slips
  -> Update Order Status
```

## Important Frontend Files

- `frontend/src/screens/HomeScreen.js` - home page, product listing, search/filter display, admin shortcuts
- `frontend/src/screens/ProductDetailsScreen.js` - product details and add-to-cart flow
- `frontend/src/screens/CartScreen.js` - cart CRUD, item selection, voucher upload
- `frontend/src/screens/CheckoutScreen.js` - shipping form, payment method, payment slip upload, place order
- `frontend/src/screens/OrderHistoryScreen.js` - user/admin order list, status display, shipping edit, payment slip display
- `frontend/src/screens/AdminCartsScreen.js` - admin customer cart activity and voucher approval
- `frontend/src/screens/AddProductScreen.js` - admin product creation with URL or image upload
- `frontend/src/screens/EditProductScreen.js` - admin product update
- `frontend/src/screens/CategoriesScreen.js` - category CRUD
- `frontend/src/screens/AdminUsersScreen.js` - admin user management
- `frontend/src/screens/UncategorizedProductsScreen.js` - assign categories to uncategorized products
- `frontend/src/context/AuthContext.js` - login state and user role handling
- `frontend/src/context/CartContext.js` - shared cart state and cart count
- `frontend/src/services/api.js` - all frontend API requests

## Important Backend Files

- `backend/server.js` - Express app setup and route mounting
- `backend/config/db.js` - MongoDB connection
- `backend/middleware/auth.js` - JWT protection and admin authorization
- `backend/middleware/upload.js` - image upload handling through Cloudinary
- `backend/models/User.js` - user schema
- `backend/models/Product.js` - product schema
- `backend/models/Category.js` - category schema
- `backend/models/Cart.js` - cart and voucher schema
- `backend/models/Order.js` - order, payment slip, voucher, and shipping schema
- `backend/routes/authRoutes.js` - authentication and admin user endpoints
- `backend/routes/productRoutes.js` - product CRUD and category assignment
- `backend/routes/categoryRoutes.js` - category CRUD
- `backend/routes/cartRoutes.js` - cart CRUD, admin cart activity, voucher upload/status
- `backend/routes/checkoutRoutes.js` - checkout order placement endpoint
- `backend/routes/orderRoutes.js` - order history, order status, shipping update, shared checkout logic

## API Endpoint Summary

### Authentication

```text
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/guest
GET    /api/auth/users
GET    /api/auth/users/activity
PUT    /api/auth/users/:id
DELETE /api/auth/users/:id
```

### Products

```text
GET    /api/products
GET    /api/products/:id
POST   /api/products
PUT    /api/products/:id
DELETE /api/products/:id
PATCH  /api/products/:id/category
```

### Categories

```text
GET    /api/categories
POST   /api/categories
PUT    /api/categories/:id
DELETE /api/categories/:id
```

### Cart

```text
GET    /api/cart
POST   /api/cart/add
PUT    /api/cart/update/:itemId
DELETE /api/cart/remove/:itemId
DELETE /api/cart/clear
POST   /api/cart/remove-selected
POST   /api/cart/voucher
GET    /api/cart/admin/all
PUT    /api/cart/:cartId/voucher/status
```

### Checkout and Orders

```text
POST   /api/checkout
POST   /api/orders
GET    /api/orders/myorders
GET    /api/orders
PUT    /api/orders/:id/shipping
PATCH  /api/orders/:id/shipping
PUT    /api/orders/:id/status
DELETE /api/orders/:id
```

## Environment Variables

Create `backend/.env` locally. Do not commit real secrets.

```env
PORT=5000
MONGO_URI=your_mongodb_atlas_connection_string
MONGO_DB_NAME=clothingDB
JWT_SECRET=your_jwt_secret
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret
```

For frontend, if using Expo Go on a mobile phone, use your laptop IP address instead of `localhost`.

Create `frontend/.env` if needed:

```env
EXPO_PUBLIC_API_URL=http://YOUR_LAPTOP_IP:5000/api
```

For deployed backend:

```env
EXPO_PUBLIC_API_URL=https://wmt-assignment-production.up.railway.app/api
```

## Installation

Install backend and frontend dependencies:

```bash
npm run install:all
```

Or install separately:

```bash
cd backend
npm install

cd ../frontend
npm install
```

## Run the Backend

```bash
cd backend
npm start
```

For development with nodemon:

```bash
cd backend
npm run dev
```

Expected backend output:

```text
Server running on port 5000
MongoDB Connected: ...
```

## Run the Frontend

```bash
cd frontend
npx expo start -c
```

Other frontend commands:

```bash
npm run android
npm run ios
npm run web
```

For Expo Go mobile testing:

- Keep laptop and phone on the same Wi-Fi
- Use the Expo QR code
- If LAN does not work, use tunnel mode:

```bash
npx expo start --tunnel -c
```

## Testing

Backend tests:

```bash
cd backend
npm test
```

Unit tests are also available in the `testing app` folder:

```bash
cd "testing app"
npm install
npm test
```

Run specific test groups:

```bash
npm run test:cart
npm run test:checkout
npm run test:category
npm run test:home
npm run test:product
```

## Deployment

The backend is deployed on Railway:

```text
https://wmt-assignment-production.up.railway.app/
```

Railway must include the same backend environment variables:

- `MONGO_URI`
- `MONGO_DB_NAME`
- `JWT_SECRET`
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`

## Database Collections

The MongoDB database is `clothingDB`.

Main collections:

- `users`
- `products`
- `categories`
- `carts`
- `orders`

## Role-Based Access

Users have an `isAdmin` field.

```js
isAdmin: true
```

Admin users can access product, category, user, cart activity, voucher, and order management features.

```js
isAdmin: false
```

Normal customers can browse products, manage cart, upload vouchers, checkout, upload payment slips, and view their own orders.

## GitHub Repository

```text
https://github.com/Nethumo2/MERN-Clothing-App
```

## Contributors

This project was completed as a group assignment for Web and Mobile Technologies.
