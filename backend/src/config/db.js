const mongoose = require('mongoose');

let connected = false;

async function connectDB() {
  if (connected) return mongoose.connection;

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error(
      'MONGODB_URI is not set. Add it to backend/.env — see backend/.env.example for the format.'
    );
  }

  // Security: sanitize query selectors globally to prevent NoSQL injection
  mongoose.set('sanitizeFilter', true);

  await mongoose.connect(uri);
  connected = true;
  console.log('Connected to MongoDB');
  return mongoose.connection;
}

module.exports = connectDB;
