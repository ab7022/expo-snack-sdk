require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();
const port = process.env.PORT || 3001;

// Enable CORS for all routes
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://devlop.app']
    : ['http://localhost:3099'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Proxy middleware configuration
const snackProxyConfig = {
  target: 'https://snack.expo.dev',
  changeOrigin: true,
  ws: true,
  secure: true,
  pathRewrite: {
    '^/snack': '',
  },
  onProxyRes: function (proxyRes, req, res) {
    proxyRes.headers['Access-Control-Allow-Origin'] = process.env.NODE_ENV === 'production'
      ? 'https://devlop.app'
      : 'http://localhost:3099';
  },
  onError: (err, req, res) => {
    console.error('Proxy error:', err);
    res.status(500).send('Proxy Error');
  }
};

const apiProxyConfig = {
  target: 'https://api.snack.expo.dev',
  changeOrigin: true,
  secure: true,
  pathRewrite: {
    '^/api': '',
  },
  onProxyRes: function (proxyRes, req, res) {
    proxyRes.headers['Access-Control-Allow-Origin'] = process.env.NODE_ENV === 'production'
      ? 'https://devlop.app'
      : 'http://localhost:3099';
  },
  onError: (err, req, res) => {
    console.error('Proxy error:', err);
    res.status(500).send('Proxy Error');
  }
};

// Use the proxy middleware
app.use('/snack', createProxyMiddleware(snackProxyConfig));
app.use('/api', createProxyMiddleware(apiProxyConfig));

// Health check endpoint
app.get('/health', (req, res) => {
  res.send('Proxy server is running');
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).send('Internal Server Error');
});

const server = app.listen(port, () => {
  console.log(`Proxy server running on port ${port}`);
});

// Handle WebSocket upgrade
server.on('upgrade', (req, socket, head) => {
  if (req.url.startsWith('/snack')) {
    const proxy = createProxyMiddleware(snackProxyConfig);
    proxy.upgrade(req, socket, head);
  }
}); 