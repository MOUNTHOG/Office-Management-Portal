const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const authRoutes = require('./routes/auth');
const crypto = require('crypto');
const cookieParser = require('cookie-parser');
const app = express();
const tasksRouter = require('./routes/tasks');

dotenv.config();
app.use(express.json());
app.use(cookieParser());
app.use(cors({
  origin: "http://localhost:3000", 
  credentials: true
}));

app.use('/', authRoutes);
app.use('/tasks', tasksRouter);

mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('Connected to MongoDB');
    app.listen(process.env.PORT, () => {
      console.log(`Server running on port ${process.env.PORT}`);
    });
  })
  .catch(err => {
    console.error('MongoDB connection error:', err);
});

