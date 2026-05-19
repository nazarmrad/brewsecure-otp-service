'use strict';

const fetch = require('node-fetch');

/**
 * Looks up a user by email or phone via the web server's internal VLAN endpoint.
 * @returns {{ exists: boolean, userId?: number, name?: string }}
 * @throws if the network call fails or the server returns 5xx
 */
async function lookupUser({ email, phone }) {
  const url = process.env.WEB_SERVER_INTERNAL_URL;
  const secret = process.env.INTERNAL_SECRET;

  const body = {};
  if (email) body.email = email;
  if (phone) body.phone = phone;

  let res;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Internal-Secret': secret,
      },
      body: JSON.stringify(body),
    });
  } catch (err) {
    throw new Error(`user_lookup_network_error: ${err.message}`);
  }

  if (!res.ok) {
    throw new Error(`user_lookup_upstream_error: HTTP ${res.status}`);
  }

  return res.json();
}

module.exports = { lookupUser };
