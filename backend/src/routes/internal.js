'use strict';

const express = require('express');
const router = express.Router();

// This file is meant to be dropped into the brewsecure-backend repo.
// Register it in app.js: app.use('/internal', require('./routes/internal'));
//
// Bind the server to the private VLAN interface and/or use the IP guard below
// so this route is never reachable from the public internet.

function requireInternalSecret(req, res, next) {
  if (req.headers['x-internal-secret'] !== process.env.INTERNAL_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

// POST /internal/user-lookup
router.post('/user-lookup', requireInternalSecret, (req, res) => {
  const { email, phone } = req.body || {};

  if (!email && !phone) {
    return res.status(400).json({ error: 'email or phone required' });
  }

  // `db` is the better-sqlite3 instance already configured in the host app.
  // Import it the same way the rest of the app does, e.g.:
  //   const db = require('../db');
  const db = req.app.get('db');

  let user;
  if (email) {
    user = db.prepare('SELECT id, name FROM users WHERE email = ?').get(email);
  } else {
    // Phone is not in the current schema; extend users table if needed.
    user = null;
  }

  if (!user) {
    return res.status(200).json({ exists: false });
  }

  return res.status(200).json({ exists: true, userId: user.id, name: user.name });
});

module.exports = router;
