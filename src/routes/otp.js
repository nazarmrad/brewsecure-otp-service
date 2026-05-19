'use strict';

const express = require('express');
const { lookupUser } = require('../services/userLookup');
const { generateOtp, verifyOtp } = require('../services/otp');

const router = express.Router();

// POST /otp/generate
router.post('/generate', async (req, res) => {
  const { email, phone } = req.body || {};

  if (!email && !phone) {
    return res.status(400).json({ success: false, reason: 'missing_identifier' });
  }

  let lookup;
  try {
    lookup = await lookupUser({ email, phone });
  } catch (err) {
    console.error('User lookup failed:', err.message);
    return res.status(502).json({ success: false, reason: 'user_lookup_failed' });
  }

  if (!lookup.exists) {
    return res.status(200).json({ success: false, reason: 'user_not_found' });
  }

  await generateOtp({ email, phone, userId: lookup.userId });

  return res.status(200).json({ success: true, message: 'OTP sent' });
});

// POST /otp/verify
router.post('/verify', async (req, res) => {
  const { email, phone, code } = req.body || {};

  if (!email && !phone) {
    return res.status(400).json({ success: false, reason: 'missing_identifier' });
  }

  if (!code) {
    return res.status(400).json({ success: false, reason: 'missing_code' });
  }

  const result = await verifyOtp({ email, phone, code });

  return res.status(200).json(result);
});

module.exports = router;
