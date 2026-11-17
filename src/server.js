'use strict';

const http = require('node:http');
const { createStore } = require('./tasks');
const { isAuthorized } = require('./auth/token');

const store = createStore();

function send(res, code, body) {
  res.writeHead(code, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
}

function createServer() {
  return http.createServer((req, res) => {
    const url = new URL(req.url, 'http://localhost');

    if (req.method === 'GET' && url.pathname === '/health') {
      return send(res, 200, { status: 'ok' });
    }

    if (!isAuthorized(req.headers.authorization)) {
      return send(res, 401, { error: 'unauthorized' });
    }

    if (req.method === 'GET' && url.pathname === '/tasks') {
      return send(res, 200, store.list(url.searchParams.get('status')));
    }

    if (req.method === 'POST' && url.pathname === '/tasks') {
      let raw = '';
      req.on('data', (chunk) => (raw += chunk));
      req.on('end', () => {
        try {
          const { title } = JSON.parse(raw || '{}');
          return send(res, 201, store.add(title));
        } catch (err) {
          return send(res, 400, { error: err.message });
        }
      });
      return;
    }

    return send(res, 404, { error: 'not found' });
  });
}

if (require.main === module) {
  const port = process.env.PORT || 3000;
  createServer().listen(port, () => console.log(`task-api listening on :${port}`));
}

module.exports = { createServer };
