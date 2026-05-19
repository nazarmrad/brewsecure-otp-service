'use strict';

const Redis = require('ioredis');

const client = new Redis(process.env.REDIS_URL || 'redis://127.0.0.1:6379', {
  lazyConnect: false,
  maxRetriesPerRequest: 3,
});

client.on('error', (err) => {
  console.error('Redis error:', err.message);
});

module.exports = client;
