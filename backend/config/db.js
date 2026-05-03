const mongoose = require('mongoose');

mongoose.set('bufferCommands', false);

const connectDB = async () => {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error('MONGO_URI is missing from backend/.env');
    }

    const dbName = process.env.MONGO_DB_NAME || 'clothingDB';

    const conn = await mongoose.connect(process.env.MONGO_URI, {
      dbName,
      serverSelectionTimeoutMS: 10000,
    });
    console.log(`MongoDB Connected: ${conn.connection.host}/${conn.connection.name}`);
  } catch (error) {
    console.error(`MongoDB connection error: ${error.message}`);
  }
};

module.exports = connectDB;
