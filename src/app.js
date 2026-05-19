'use strict';

require('dotenv').config();

const express = require('express');
const apiKey = require('./middleware/apiKey');
const otpRoutes = require('./routes/otp');

const app = express();
app.use(express.json());
app.use(apiKey);
app.use('/otp', otpRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`brewsecure-otp-service listening on port ${PORT}`);
});
