/**
 * CORS Configuration and Origin Validator
 * Strictly separates allowed origins, handles localhost & 127.0.0.1 explicitly,
 * and rejects wildcards when credentials (cookies) are enabled.
 */

const DEFAULT_DEV_ORIGINS = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:5174',
  'http://127.0.0.1:5174',
  'http://localhost:5175',
  'http://127.0.0.1:5175',
];

function getAllowedOrigins() {
  const envOrigins = process.env.ALLOWED_ORIGINS;
  if (envOrigins && envOrigins.trim()) {
    const list = envOrigins
      .split(',')
      .map((o) => o.trim())
      .filter(Boolean);

    // In development mode, guarantee standard Vite dev origins (5173, 5174, 5175) are present
    if (process.env.NODE_ENV !== 'production') {
      const combined = new Set([...list, ...DEFAULT_DEV_ORIGINS]);
      return Array.from(combined);
    }
    return list;
  }

  // Fallback defaults
  if (process.env.NODE_ENV === 'production') {
    const clientUrl = process.env.CLIENT_URL;
    return clientUrl ? [clientUrl.trim()] : [];
  }

  return DEFAULT_DEV_ORIGINS;
}

const allowedOrigins = getAllowedOrigins();

// Validate that credentials aren't combined with wildcard '*'
if (allowedOrigins.includes('*')) {
  console.warn('[CORS Warning] Wildcard origin "*" should never be used with credentials enabled.');
}

const corsOptions = {
  origin: (origin, callback) => {
    // Allow non-browser requests (e.g. curl, postman, mobile apps, server-to-server)
    if (!origin) {
      return callback(null, true);
    }

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    const error = new Error(`CORS error: Origin '${origin}' is not authorized.`);
    error.statusCode = 403;
    return callback(error);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-CSRF-Token'],
  exposedHeaders: ['Set-Cookie'],
  maxAge: 86400, // 24 hours preflight cache
};

module.exports = { corsOptions, getAllowedOrigins };
