const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const { seedDatabase } = require('./utils/seed');
const errorHandler = require('./middleware/errorHandler');

// Route imports
const authRoutes = require('./routes/authRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const productRoutes = require('./routes/productRoutes');
const machineRoutes = require('./routes/machineRoutes');
const rentalRoutes = require('./routes/rentalRoutes');
const orderRoutes = require('./routes/orderRoutes');
const bannerRoutes = require('./routes/bannerRoutes');
const posterRoutes = require('./routes/posterRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const supportRoutes = require('./routes/supportRoutes');
const adminRoutes = require('./routes/adminRoutes');
const fileRoutes = require('./routes/fileRoutes');
const creativeRoutes = require('./routes/creativeRoutes');
const homeRoutes = require('./routes/homeRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS for React Native Web & mobile clients
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded assets
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    app: 'Farmer E-Commerce & Farm Machinery Rental Backend',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/products', productRoutes);
app.use('/api/machines', machineRoutes);
app.use('/api/rentals', rentalRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/banners', bannerRoutes);
app.use('/api/posters', posterRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/support', supportRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/creatives', creativeRoutes);
app.use('/api/home', homeRoutes);

// Global Farmer-Friendly Error Handler
app.use(errorHandler);

// Start server and seed database
app.listen(PORT, async () => {
  console.log(`🌾 Farmer App Backend running on http://localhost:${PORT}`);
  await seedDatabase(false);
});

module.exports = app;
