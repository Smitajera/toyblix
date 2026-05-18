const Sentry = require("@sentry/node");

// Safely load Sentry Profiling to prevent crashes on unsupported Node versions
let sentryIntegrations = [];
try {
  const { nodeProfilingIntegration } = require("@sentry/profiling-node");
  sentryIntegrations.push(nodeProfilingIntegration());
} catch (error) {
  console.warn("⚠️ @sentry/profiling-node binary missing. Starting server without profiling integration.");
}

// Telemetry & Error Tracking
Sentry.init({
  dsn: process.env.SENTRY_DSN || '',
  integrations: sentryIntegrations,
  tracesSampleRate: 1.0,
  profilesSampleRate: 1.0,
});

const express = require('express');
const dotenv = require('dotenv');
const dns = require('dns'); // <--- ADD THIS
dns.setDefaultResultOrder('ipv4first'); // <--- ADD THIS TO FORCE IPv4
dotenv.config();
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const compression = require('compression');
const rateLimit = require('express-rate-limit');

const connectDB = require('./config/db');
const { notFound, errorHandler } = require('./middleware/errorMiddleware');
const { assignRequestId, requestLogger } = require('./middleware/requestContext'); 

// Routes
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const productRoutes = require('./routes/productRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const cartRoutes = require('./routes/cartRoutes'); 
const orderRoutes = require('./routes/orderRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const contactRoutes = require('./routes/contactRoutes');
const couponRoutes = require('./routes/couponRoutes');
const toyCategoryRoutes = require('./routes/toyCategoryRoutes');
const comboRoutes = require('./routes/comboRoutes');

dotenv.config();

connectDB();

const app = express();

// Trust the AWS load balancer/proxy (Step A - Fixes the AWS Image mixed-content URL issue)
app.set('trust proxy', 1);

// ==========================================
// PRODUCTION OPTIMIZATIONS & SECURITY
// ==========================================

// 1. GZIP Compression: Shrinks response bodies for faster load times
app.use(compression());

// CORS configuration (must be BEFORE rate limiter so preflight OPTIONS requests get headers)
app.use(cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173', 
    credentials: true, 
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Idempotency-Key']
}));

// 2. Global Rate Limiter: Prevents DDoS attacks and API spam
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 2000, // Limit each IP to 2000 requests per windowMs (Increased to support frontend RTK polling)
  message: 'Too many requests from this IP, please try again after 15 minutes',
  standardHeaders: true, 
  legacyHeaders: false, 
});

// Apply rate limiter to all API routes
app.use('/api/', apiLimiter);

// Razorpay webhook must receive raw body for signature verification (before express.json)
const { handleRazorpayWebhook } = require('./controllers/paymentController');
app.post(
  '/api/payments/razorpay/webhook',
  express.raw({ type: 'application/json', limit: '1mb' }),
  (req, res, next) => {
    req.rawBody = req.body;
    try {
      req.body = req.body?.length ? JSON.parse(req.body.toString('utf8')) : {};
    } catch {
      return res.status(400).json({ message: 'Invalid JSON payload.' });
    }
    next();
  },
  handleRazorpayWebhook
);

// Body parsing middlewares
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Apply the correct Request Context (Logging) middlewares
app.use(assignRequestId);
app.use(requestLogger);

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/products', productRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/cart', cartRoutes); 
app.use('/api/orders', orderRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/coupons', couponRoutes);
app.use('/api/toy-categories', toyCategoryRoutes);
app.use('/api/combos', comboRoutes);
app.use('/api/chat', require('./routes/chatRoutes'));
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)){
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Serve static files from the uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.get('/', (req, res) => {
  res.send('ToyBlix API is running smoothly...');
});

// Error Handling Middlewares
if (process.env.SENTRY_DSN) {
  Sentry.setupExpressErrorHandler(app);
}
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);

  // Start background cron jobs
  const { startAbandonedCartCron } = require('./utils/abandonedCartCron');
  startAbandonedCartCron();
});