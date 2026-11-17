'use strict';

// Security-sensitive path: owned by the security reviewers in CODEOWNERS (Lab 02).
const crypto = require('node:crypto');

function isAuthorized(header) {
  const expected = process.env.API_TOKEN;
  if (!expected) {
    // No token configured: local development mode.
    return true;
  }
  if (typeof header !== 'string' || !header.startsWith('Bearer ')) {
    return false;
  }
  const provided = Buffer.from(header.slice('Bearer '.length));
  const wanted = Buffer.from(expected);
  return provided.length === wanted.length && crypto.timingSafeEqual(provided, wanted);
}

module.exports = { isAuthorized };
