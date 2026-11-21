// Tests for api/contact.js with a mocked mail provider. Run: npm test
import assert from 'node:assert/strict';
const mod = await import('../api/contact.js');
const handler = mod.default;

function call(body, { ct = 'application/json', method = 'POST', ip } = {}) {
  return new Promise((resolve) => {
    const req = { method, body, headers: { 'content-type': ct, 'x-forwarded-for': ip || '10.0.0.' + Math.random() } };
    const res = { code: 200, headers: {}, setHeader(k, v) { this.headers[k] = v; }, status(c) { this.code = c; return this; },
      json(o) { resolve({ code: this.code, json: o }); }, send(s) { resolve({ code: this.code, html: s }); } };
    handler(req, res);
  });
}
const good = () => ({ topic: 'Testy NC RfG i certyfikacja', name: 'Jan Test', email: 'jan@example.com', company: 'ACME', phone: '+48 600 000 000', message: 'Farma PV 2 MW', website: '', t: String(Date.now() - 10000) });
let sent = [];
let mockReply = () => ({ ok: true, status: 200, json: async () => ({ id: 'mock-123' }), text: async () => '' });
globalThis.fetch = async (url, opts) => { sent.push({ url, body: JSON.parse(opts.body) }); return mockReply(); };
const results = [];
const t = async (name, fn) => { await fn(); results.push('PASS ' + name); };

for (const k of ['RESEND_API_KEY', 'CONTACT_TO', 'CONTACT_FROM']) delete process.env[k];
await t('brak konfiguracji -> 503 not_configured, bez wysyłki', async () => {
  const r = await call(good()); assert.equal(r.code, 503); assert.equal(r.json.error, 'not_configured'); assert.equal(r.json.ok, false); assert.equal(sent.length, 0);
});
process.env.RESEND_API_KEY = 're_test'; process.env.CONTACT_TO = 'info@energymgmt.pl'; process.env.CONTACT_FROM = 'Formularz <formularz@energymgmt.pl>';
await t('GET -> 405', async () => { const r = await call({}, { method: 'GET' }); assert.equal(r.code, 405); });
await t('brak imienia i zły e-mail -> 422', async () => {
  const r = await call({ ...good(), name: '', email: 'zly' }); assert.equal(r.code, 422); assert.ok(r.json.fields.name && r.json.fields.email);
});
await t('wypełniony honeypot -> 400, bez wysyłki', async () => {
  sent = []; const r = await call({ ...good(), website: 'http://spam' }); assert.equal(r.code, 400); assert.equal(sent.length, 0);
});
await t('wysłane po 0,5 s (time-trap) -> 400', async () => {
  const r = await call({ ...good(), t: String(Date.now() - 500) }); assert.equal(r.code, 400);
});
await t('poprawne dane -> 200 ok:true tylko z id od dostawcy', async () => {
  sent = []; const r = await call(good()); assert.equal(r.code, 200); assert.equal(r.json.ok, true); assert.equal(r.json.id, 'mock-123');
  assert.equal(sent.length, 1); assert.equal(sent[0].body.reply_to, 'jan@example.com'); assert.deepEqual(sent[0].body.to, ['info@energymgmt.pl']);
});
await t('wstrzyknięcie HTML w treść jest escapowane', async () => {
  sent = []; await call({ ...good(), message: '<script>x</script>' }); assert.ok(!sent[0].body.html.includes('<script>'));
});
await t('błąd dostawcy -> 502, nie sukces', async () => {
  mockReply = () => ({ ok: false, status: 403, json: async () => ({}), text: async () => 'domain not verified' });
  const r = await call(good()); assert.equal(r.code, 502); assert.equal(r.json.ok, false);
});
await t('odpowiedź bez id -> 502', async () => {
  mockReply = () => ({ ok: true, status: 200, json: async () => ({}), text: async () => '' });
  const r = await call(good()); assert.equal(r.code, 502);
});
await t('awaria sieci -> 502', async () => {
  mockReply = () => { throw new Error('ECONNRESET'); };
  const r = await call(good()); assert.equal(r.code, 502);
});
await t('POST bez JS (urlencoded) -> strona HTML', async () => {
  mockReply = () => ({ ok: true, status: 200, json: async () => ({ id: 'x' }), text: async () => '' });
  const r = await call(good(), { ct: 'application/x-www-form-urlencoded' }); assert.equal(r.code, 200); assert.match(r.html, /Dziękujemy/);
});
await t('POST bez JS bez znacznika czasu -> przyjęty (honeypot nadal działa)', async () => {
  const r = await call({ ...good(), t: '' }, { ct: 'application/x-www-form-urlencoded' }); assert.equal(r.code, 200);
  const s = await call({ ...good(), t: '', website: 'x' }, { ct: 'application/x-www-form-urlencoded' }); assert.equal(s.code, 400);
});
await t('JSON bez znacznika czasu -> 400', async () => {
  const r = await call({ ...good(), t: '' }); assert.equal(r.code, 400);
});
await t('limit 5 zapytań z jednego IP / 10 min -> 429', async () => {
  let last; for (let i = 0; i < 6; i++) last = await call(good(), { ip: '1.2.3.4' }); assert.equal(last.code, 429);
});
for (const k of ['RESEND_API_KEY', 'CONTACT_TO', 'CONTACT_FROM']) delete process.env[k];
process.env.SMTP_HOST = 'smtp.test'; process.env.SMTP_USER = 'formularz@energymgmt.pl'; process.env.SMTP_PASS = 'x';
let smtpSent = [];
mod._setSmtpSender(async (m) => { smtpSent.push(m); return { messageId: '<id@test>', accepted: m.to }; });
await t('SMTP home.pl: sukces tylko gdy serwer przyjął odbiorcę', async () => {
  const r = await call(good()); assert.equal(r.code, 200); assert.equal(r.json.ok, true);
  assert.equal(smtpSent[0].from.address, 'formularz@energymgmt.pl'); assert.deepEqual(smtpSent[0].to, ['formularz@energymgmt.pl']);
  assert.equal(smtpSent[0].replyTo.address, 'jan@example.com');
});
await t('SMTP: CONTACT_TO nadpisuje odbiorcę', async () => {
  process.env.CONTACT_TO = 'info@energymgmt.pl, m@energymgmt.pl'; smtpSent = [];
  await call(good()); assert.deepEqual(smtpSent[0].to, ['info@energymgmt.pl', 'm@energymgmt.pl']); delete process.env.CONTACT_TO;
});
await t('SMTP: serwer nie przyjął odbiorcy -> 502', async () => {
  mod._setSmtpSender(async () => ({ messageId: '<x>', accepted: [] }));
  const r = await call(good()); assert.equal(r.code, 502);
});
await t('SMTP: błąd logowania -> 502, nie sukces', async () => {
  mod._setSmtpSender(async () => { const e = new Error('Invalid login'); e.code = 'EAUTH'; throw e; });
  const r = await call(good()); assert.equal(r.code, 502); assert.equal(r.json.ok, false);
});
await t('SMTP bez hasła -> 503 not_configured', async () => {
  delete process.env.SMTP_PASS; const r = await call(good()); assert.equal(r.code, 503);
});
console.log(results.join('\n') + `\n${results.length} testów OK`);
