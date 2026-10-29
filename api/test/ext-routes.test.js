// Fork extension (api/ext/routes.js): GET /api/ext/ptv4 against a local stand-in for the sidecar.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { extRoutes } from '../ext/routes.js';

let sidecar, url, seen = [];
before(async () => {
  sidecar = http.createServer((req, res) => {
    seen.push({ path: req.url, key: req.headers['x-ext-key'] });
    if (req.url === '/dashboard/kpi') { res.writeHead(200, { 'Content-Type': 'application/json' }); res.end('[{"ma7":84}]'); return; }
    if (req.url === '/health') { res.writeHead(200, { 'Content-Type': 'application/json' }); res.end('[{"id":"fitatu","ok":false}]'); return; }
    if (req.url === '/dashboard/body') { res.writeHead(503); res.end('{"error":"Limit 30 zapytań"}'); return; }
    res.writeHead(404); res.end();
  });
  await new Promise(r => sidecar.listen(0, '127.0.0.1', r));
  url = `http://127.0.0.1:${sidecar.address().port}`;
});
after(() => sidecar.close());

// The route with fakes for server.js's helpers; resolves to { code, body }.
function call(user, query, env = { PTV4_URL: url, PTV4_KEY: 'k', PTV4_UID: 'me' }) {
  return new Promise(resolve => {
    const res = {
      writeHead(code) { this.code = code; },
      end(body) { resolve({ code: this.code, body: JSON.parse(body) }); }
    };
    const json = (r, code, obj) => { r.writeHead(code); r.end(JSON.stringify(obj)); };
    extRoutes({ json, readSession: () => user, env })['GET /api/ext/ptv4']({ url: '/api/ext/ptv4' + query }, res);
  });
}

test('passes a set through with the key, never asked of the browser', async () => {
  assert.deepEqual(await call({ id: 'me' }, '?set=kpi'), { code: 200, body: [{ ma7: 84 }] });
  assert.deepEqual(seen.at(-1), { path: '/dashboard/kpi', key: 'k' });
  assert.deepEqual(await call({ id: 'me' }, '?set=health'), { code: 200, body: [{ id: 'fitatu', ok: false }] });
});

test('401 without a session, 403 for another profile, 400 for an unknown set', async () => {
  assert.equal((await call(null, '?set=kpi')).code, 401);
  assert.equal((await call({ id: 'someone' }, '?set=kpi')).code, 403);
  const bad = await call({ id: 'me' }, '?set=../secret');
  assert.equal(bad.code, 400);
  assert.ok(bad.body.sets.includes('energy'));
});

test('503 when the sidecar refuses, is down, or ptv4 is not set up', async () => {
  assert.deepEqual(await call({ id: 'me' }, '?set=body'), { code: 503, body: { error: 'Sidecar ptv4: HTTP 503', detail: 'Limit 30 zapytań' } });
  assert.equal((await call({ id: 'me' }, '?set=kpi', { PTV4_URL: 'http://127.0.0.1:1', PTV4_KEY: 'k', PTV4_UID: 'me' })).code, 503);
  assert.equal((await call({ id: 'me' }, '?set=kpi', {})).code, 503);
});
