'use strict';

const crypto = require('crypto');
const fetch = require('node-fetch');
const redis = require('./redis');

function redisKey(identifier) {
  return `otp:${identifier}`;
}

async function generateOtp({ email, phone, userId }) {
  const code = String(crypto.randomInt(100000, 999999));
  const identifier = email || phone;
  const key = redisKey(identifier);
  const ttl = parseInt(process.env.OTP_TTL_SECONDS || '300', 10);

  const payload = JSON.stringify({ code, used: false, userId });
  await redis.setex(key, ttl, payload);

  await deliverOtp({ email, phone, code });

  return code;
}

async function deliverOtp({ email, phone, code }) {
  const webhookUrl = process.env.WEBHOOK_URL;
  if (!webhookUrl) return;

  const body = { code };
  if (email) body.email = email;
  if (phone) body.phone = phone;

  try {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch (err) {
    console.error('Webhook delivery failed:', err.message);
  }
}

async function verifyOtp({ email, phone, code }) {
  const identifier = email || phone;
  const key = redisKey(identifier);

  const raw = await redis.get(key);
  if (!raw) {
    return { success: false, reason: 'otp_expired_or_not_found' };
  }

  const stored = JSON.parse(raw);

  if (stored.used === true) {
    return { success: false, reason: 'otp_already_used' };
  }

  if (stored.code !== String(code)) {
    return { success: false, reason: 'otp_invalid' };
  }

  // Mark used with short TTL to block replay without leaking the code
  const usedPayload = JSON.stringify({ ...stored, used: true });
  await redis.setex(key, 30, usedPayload);

  return { success: true, userId: stored.userId, reason: 'otp_verified' };
}

module.exports = { generateOtp, verifyOtp };
