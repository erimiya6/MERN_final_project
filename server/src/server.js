require('dotenv').config();
const http = require('http');
const { Server } = require('socket.io');
const app = require('./app');
const connectDB = require('./config/db');

const PORT = process.env.PORT || 5000;

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.IO with CORS
const { getAllowedOrigins } = require('./config/corsConfig');
const allowedOrigins = getAllowedOrigins();

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST'],
  },
});

// Attach socket.io instance to app for use in controllers
app.set('io', io);

// Socket.IO authentication middleware (verifies JWT from cookie or handshake auth/headers)
const jwt = require('jsonwebtoken');
const User = require('./models/User');

io.use(async (socket, next) => {
  try {
    let token;

    // 1. Check handshake auth token (e.g. { auth: { token: '...' } })
    if (socket.handshake.auth && socket.handshake.auth.token) {
      token = socket.handshake.auth.token;
    }
    // 2. Check cookies in handshake headers
    else if (socket.handshake.headers && socket.handshake.headers.cookie) {
      const cookieHeader = socket.handshake.headers.cookie;
      const match = cookieHeader.match(/(?:^|;\s*)token=([^;]+)/);
      if (match) {
        token = decodeURIComponent(match[1]);
      }
    }
    // 3. Check Authorization header in handshake
    else if (
      socket.handshake.headers &&
      socket.handshake.headers.authorization &&
      socket.handshake.headers.authorization.startsWith('Bearer ')
    ) {
      token = socket.handshake.headers.authorization.split(' ')[1];
    }

    if (!token) {
      // Allow unauthenticated connection for public broadcasts (e.g. community feed)
      socket.user = null;
      return next();
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('_id name email role status');

    if (!user || user.status === 'suspended') {
      socket.user = null;
      return next();
    }

    socket.user = user;
    next();
  } catch (err) {
    // Treat invalid/expired token as unauthenticated guest
    socket.user = null;
    next();
  }
});

// Socket.io connection handling
io.on('connection', (socket) => {
  // If user is authenticated, server automatically joins their verified private room
  if (socket.user && socket.user._id) {
    socket.join(`user:${socket.user._id}`);
  }

  // Join a public announcements room
  socket.on('join_community', () => {
    socket.join('community_feed');
  });

  socket.on('disconnect', () => {
    // Cleaned up automatically by socket.io
  });
});

// Start server after connecting to MongoDB
const startServer = async () => {
  try {
    await connectDB();
    server.listen(PORT, () => {
      console.log(`[Server] SST Lost & Found API listening on port ${PORT} [${process.env.NODE_ENV || 'development'}]`);
      console.log(`[Server] Health check: http://localhost:${PORT}/api/health`);
    });
  } catch (error) {
    console.error('[Server] Failed to start:', error.message);
    process.exit(1);
  }
};

startServer();

module.exports = { server, app };
