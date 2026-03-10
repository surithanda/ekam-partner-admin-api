require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const { setupSwagger } = require('./docs/swagger');
const errorHandler = require('./middleware/errorHandler');
const { initErrorCodes } = require('./config/errorCodes');
const authRoutes = require('./routes/authRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const profileRoutes = require('./routes/profileRoutes');
const partnerRoutes = require('./routes/partnerRoutes');
const backgroundCheckRoutes = require('./routes/backgroundCheckRoutes');
const adminUserRoutes = require('./routes/adminUserRoutes');
const auditRoutes = require('./routes/auditRoutes');
const accountRoutes = require('./routes/accountRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const addressRoutes = require('./routes/addressRoutes');

const app = express();
const PORT = process.env.PORT || 4000;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3001',
  credentials: true,
  methods: ['POST'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key']
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { success: false, message: 'Too many requests, please try again later' }
});
app.use('/api/auth/login', limiter);

// Stripe webhook needs raw body — mount BEFORE json parser
app.use('/api/payments/webhook', express.raw({ type: 'application/json' }));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// API Documentation
setupSwagger(app);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/profiles', profileRoutes);
app.use('/api/partner', partnerRoutes);
app.use('/api/background-check', backgroundCheckRoutes);
app.use('/api/admin-users', adminUserRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/accounts', accountRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/address', addressRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'EKam Admin API is running', timestamp: new Date().toISOString() });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// Global error handler
app.use(errorHandler);

if (require.main === module) {
  initErrorCodes().then(() => {
    app.listen(PORT, () => {
      console.log(`🚀 EKam Admin API running on port ${PORT}`);
    });
  });
}

module.exports = app;
