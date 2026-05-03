# Deployment Guide: Clothing Store App

## Backend Deployment (Render)
Render is a great free option for deploying Node.js apps for student projects.

### Step 1: Prepare the Node.js App
1. Ensure your `package.json` in the `backend` folder has a start script:
   ```json
   "scripts": {
     "start": "node server.js",
     "dev": "nodemon server.js"
   }
   ```
2. Make sure you use `process.env.PORT` in your `server.js` (We already added this!).
3. Push your `backend` folder to a new GitHub repository.

### Step 2: Deploy to Render
1. Go to [Render.com](https://render.com) and sign in with GitHub.
2. Click **New** -> **Web Service**.
3. Connect your GitHub repository.
4. Fill in the details:
   - **Name**: e.g., `clothing-store-api`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
5. Scroll down to **Advanced** -> **Environment Variables**.
6. Add your local `.env` variables:
   - `MONGO_URI`: Use a MongoDB Atlas connection string (since local MongoDB won't work on the cloud).
   - `JWT_SECRET`: Your secret key.
7. Click **Create Web Service**. Render will build and deploy your API. Note the URL (e.g., `https://clothing-store-api.onrender.com`).

---

## Database (MongoDB Atlas)
Since your API will be hosted on Render, it needs a cloud database.
1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) and create a free account.
2. Create a free cluster.
3. Under **Database Access**, create a user and password.
4. Under **Network Access**, add `0.0.0.0/0` (Allow access from anywhere).
5. Click **Connect** -> **Connect your application** and copy the URI string. Replace `<password>` with the user's password.
6. Use this URI in the Render Environment Variables (`MONGO_URI`).

---

## Connecting Frontend to Backend
Once your backend is deployed, you must tell the React Native app to use the live URL instead of Localhost.

1. Open `frontend/src/services/api.js`.
2. Change the `BASE_URL` to your Render API URL:
   ```javascript
   // Change from localhost to production:
   // const BASE_URL = Platform.OS === 'android' ? 'http://10.0.2.2:5000/api' : 'http://localhost:5000/api';
   const BASE_URL = 'https://clothing-store-api.onrender.com/api';
   ```
3. Save the file.
4. Run your Expo app using `npx expo start`.
5. Your mobile app is now connected to the live backend!
