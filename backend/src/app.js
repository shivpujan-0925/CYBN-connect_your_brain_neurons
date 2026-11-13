const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');

const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const problemRoutes = require('./routes/problem.routes');
const { notFound, errorHandler } = require('./middleware/error.middleware');
const ApiError = require('./utils/ApiError');

const app = express();
app.set('trust proxy', 1);

app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

// CLIENT_ORIGIN can be a single URL or a comma-separated list, e.g.
// "https://cybn.app,https://www.cybn.app" — so the same backend can serve
// a production domain and its www variant, or a staging URL alongside prod.
const allowedOrigins = (process.env.CLIENT_ORIGIN || 'http://localhost:3000')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // requests with no Origin header (curl, server-to-server, some mobile clients) are allowed
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new ApiError(403, 'Not allowed by CORS'));
    }
  },
  credentials: true,
}));
app.use(express.json({ limit: '100kb' }));
app.use(cookieParser());

app.get('/api/health', (req, res) => res.json({ ok: true, service: 'cybn-backend' }));

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/problems', problemRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
