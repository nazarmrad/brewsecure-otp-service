const express = require('express')
const router = express.Router()
const store = require('../store')

const WEBHOOK_URL = 'https://go.webhooks.cc/w/spos39e569'

function sendWebhook(email, otp) {
  fetch(WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      event: 'otp_requested',
      email,
      otp,
      message: `Your BrewSecure verification code is: ${otp}. It expires in 5 minutes.`,
    }),
  }).catch((err) => console.error('[webhook] failed:', err.message))
}

// POST /otp/request
router.post('/request', (req, res) => {
  const { email } = req.body
  if (!email || typeof email !== 'string') {
    return res.status(400).json({ error: 'email is required' })
  }

  const otp = store.generate(email)

  // fire webhook in parallel — do not await
  sendWebhook(email, otp)

  console.log(`[otp] generated for ${email}`)
  return res.status(200).json({ success: true, message: 'OTP sent to email' })
})

// POST /otp/verify
router.post('/verify', (req, res) => {
  const { email, otp } = req.body
  if (!email || !otp) {
    return res.status(400).json({ error: 'email and otp are required' })
  }

  const result = store.verify(email, String(otp))

  if (!result.valid) {
    const status = result.reason === 'expired' ? 410 : 401
    return res.status(status).json({ success: false, reason: result.reason })
  }

  return res.status(200).json({ success: true, message: 'OTP verified' })
})

module.exports = router
