const express = require('express')
const app = express()

app.use(express.json())

app.use('/otp', require('./routes/otp'))

app.get('/health', (_, res) => res.json({ status: 'ok' }))

const PORT = process.env.PORT || 3003
app.listen(PORT, () => console.log(`OTP service running on port ${PORT}`))
