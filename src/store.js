const crypto = require('crypto')

const OTP_TTL_MS = 5 * 60 * 1000 // 5 minutes

// email -> { otp, expiresAt }
const store = new Map()

function generate(email) {
  const otp = String(crypto.randomInt(100000, 999999))
  store.set(email.toLowerCase(), {
    otp,
    expiresAt: Date.now() + OTP_TTL_MS,
  })
  return otp
}

function verify(email, otp) {
  const entry = store.get(email.toLowerCase())
  if (!entry) return { valid: false, reason: 'no_otp' }
  if (Date.now() > entry.expiresAt) {
    store.delete(email.toLowerCase())
    return { valid: false, reason: 'expired' }
  }
  if (entry.otp !== otp) return { valid: false, reason: 'invalid' }
  store.delete(email.toLowerCase()) // single-use
  return { valid: true }
}

module.exports = { generate, verify }
