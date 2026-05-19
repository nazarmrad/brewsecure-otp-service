'use strict';

const crypto = require('crypto');

module.exports = function apiKey(req, res, next) {
  const provided = req.headers['x-api-key'];
  const expected = process.env.API_KEY;

  if (!provided || !expected) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Use fixed-length buffers to prevent length-leak timing attacks
  if (provided.length !== expected.length) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const a = Buffer.from(provided);
  const b = Buffer.from(expected);

  if (!crypto.timingSafeEqual(a, b)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  next();
};
