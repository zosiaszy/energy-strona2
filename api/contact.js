// Vercel Serverless Function: POST /api/contact
// Sends the contact form to the company inbox. Two ways, set ONE of them in
// Vercel → Project → Settings → Environment Variables (never in the frontend):
//
// A) the company's own mailbox at home.pl over SMTP (no extra service):
//   SMTP_HOST        e.g. cloudserver3223481-3223512.home.pl
//   SMTP_PORT        465 (SSL) – default
//   SMTP_USER        full mailbox address, e.g. formularz@energymgmt.pl
//   SMTP_PASS        that mailbox's password
//   CONTACT_TO       optional; defaults to SMTP_USER. Several addresses comma-separated.
//
// B) Resend (https://resend.com):
//   RESEND_API_KEY, CONTACT_TO, CONTACT_FROM (sender in a verified domain)
//
// Optional for both:
//   ALLOWED_ORIGINS  comma-separated list of origins allowed to post, e.g. https://www.energymgmt.pl
//
// Until one way is fully configured the endpoint answers 503 "not_configured"
// and the page tells the visitor to write by e-mail. It never reports a false success.

const MIN_FILL_MS = 2500;          // humans need at least a few seconds to fill the form
const MAX_AGE_MS = 1000 * 60 * 60 * 24;
const RATE_WINDOW_MS = 10 * 60 * 1000;
const RATE_MAX = 5;                // per IP per window, per warm instance (best effort)
const hits = new Map();

const LIMITS = { topic: 80, name: 120, email: 200, company: 160, phone: 40, message: 4000 };
const TOPICS = new Set([
  'Testy NC RfG i certyfikacja', 'Analiza jakości energii elektrycznej', 'Konfiguracja i programowanie',
  'Przeglądy stacji transformatorowych', 'Obsługa farm OZE', 'Pomiary dla firm i domów',
  'Nadzór inwestycji', 'Kompensacja mocy biernej', 'Audyty i optymalizacja zużycia', 'Inne', ''
]);

function clean(v, max) {
  return String(v == null ? '' : v).replace(/\r\n?/g, '\n').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim().slice(0, max);
}
function oneLine(v) { return v.replace(/\s+/g, ' '); }
function esc(s) { return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
const EMAIL_RE = /^[^\s@<>()[\]\\,;:"]+@[^\s@<>()[\]\\,;:"]+\.[^\s@<>()[\]\\,;:"]{2,}$/;

// SMTP through nodemailer; replaceable in tests.
let sendSmtp = async (msg) => {
  const { default: nodemailer } = await import('nodemailer');
  const port = Number(process.env.SMTP_PORT || 465);
  const transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST, port, secure: port === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    connectionTimeout: 8000, greetingTimeout: 8000, socketTimeout: 12000
  });
  return transport.sendMail(msg);
};
export function _setSmtpSender(fn) { sendSmtp = fn; }

export function validate(body) {
  const d = {};
  for (const k of Object.keys(LIMITS)) d[k] = clean(body[k], LIMITS[k]);
  for (const k of ['topic', 'name', 'email', 'company', 'phone']) d[k] = oneLine(d[k]);
  const errors = {};
  if (d.name.length < 2) errors.name = 'Podaj imię i nazwisko.';
  if (!EMAIL_RE.test(d.email)) errors.email = 'Podaj poprawny adres e-mail.';
  if (d.phone && !/^[0-9 +()\-./]{6,40}$/.test(d.phone)) errors.phone = 'Sprawdź numer telefonu.';
  if (!TOPICS.has(d.topic)) d.topic = 'Inne';
  return { data: d, errors };
}

function isSpam(body, now, plainForm) {
  if (clean(body.website, 200)) return true;                  // honeypot filled
  const t = Number(body.t);
  // time-trap: the page stamps the form with JS; a no-JS form post has no stamp
  // and relies on the honeypot and the rate limit instead
  if (!t && !plainForm) return true;
  if (t && (now - t < MIN_FILL_MS || now - t > MAX_AGE_MS)) return true;
  const links = (String(body.message || '').match(/https?:\/\//gi) || []).length;
  return links > 3;
}

function rateLimited(ip, now) {
  const list = (hits.get(ip) || []).filter((t) => now - t < RATE_WINDOW_MS);
  list.push(now);
  hits.set(ip, list);
  return list.length > RATE_MAX;
}

function wantsHtml(req) {
  const ct = String(req.headers['content-type'] || '');
  return ct.includes('application/x-www-form-urlencoded') || ct.includes('multipart/form-data');
}

// A no-JS form post gets a small, honest HTML page instead of JSON.
function page(res, status, title, text) {
  res.status(status).setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(`<!doctype html><html lang="pl"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${esc(title)} · Energy Management</title><body style="font:16px/1.6 system-ui,sans-serif;max-width:40rem;margin:4rem auto;padding:0 1.25rem;color:#0D1720"><h1 style="font-size:1.6rem">${esc(title)}</h1><p>${text}</p><p><a href="/#kontakt">Wróć na stronę</a></p></body></html>`);
}

function reply(req, res, status, payload) {
  if (wantsHtml(req)) {
    if (payload.ok) return page(res, 200, 'Dziękujemy, zapytanie wysłane', 'Odpowiemy na podany adres e-mail.');
    const msg = payload.error === 'not_configured'
      ? 'Formularz nie jest jeszcze podłączony. Napisz na <a href="mailto:info@energymgmt.pl">info@energymgmt.pl</a>.'
      : esc(payload.message || 'Nie udało się wysłać zapytania.') + ' Możesz też napisać na <a href="mailto:info@energymgmt.pl">info@energymgmt.pl</a>.';
    return page(res, status, 'Zapytanie nie zostało wysłane', msg);
  }
  res.status(status).json(payload);
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Robots-Tag', 'noindex');
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'method_not_allowed' });
  }

  const allowed = (process.env.ALLOWED_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean);
  const origin = req.headers.origin;
  if (allowed.length && origin && !allowed.includes(origin)) {
    return reply(req, res, 403, { ok: false, error: 'forbidden', message: 'Niedozwolone źródło zapytania.' });
  }

  let body = req.body || {};
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }

  const now = Date.now();
  const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown';
  if (rateLimited(ip, now)) {
    return reply(req, res, 429, { ok: false, error: 'rate_limited', message: 'Zbyt wiele zapytań w krótkim czasie.' });
  }

  const { data, errors } = validate(body);
  if (Object.keys(errors).length) {
    return reply(req, res, 422, { ok: false, error: 'invalid', fields: errors, message: Object.values(errors)[0] });
  }
  // Bots get a quiet, generic refusal: no hint about which trap they hit.
  if (isSpam(body, now, wantsHtml(req))) {
    return reply(req, res, 400, { ok: false, error: 'rejected', message: 'Nie udało się wysłać zapytania.' });
  }

  const { RESEND_API_KEY, CONTACT_TO, CONTACT_FROM, SMTP_HOST, SMTP_USER, SMTP_PASS } = process.env;
  const useSmtp = !!(SMTP_HOST && SMTP_USER && SMTP_PASS);
  const useResend = !!(RESEND_API_KEY && CONTACT_TO && CONTACT_FROM);
  if (!useSmtp && !useResend) {
    console.error('[contact] not configured: set SMTP_HOST/SMTP_USER/SMTP_PASS or RESEND_API_KEY/CONTACT_TO/CONTACT_FROM');
    return reply(req, res, 503, { ok: false, error: 'not_configured' });
  }

  const rows = [
    ['Temat', data.topic || '(nie wybrano)'], ['Imię i nazwisko', data.name], ['E-mail', data.email],
    ['Firma', data.company || '-'], ['Telefon', data.phone || '-']
  ];
  const text = rows.map(([k, v]) => `${k}: ${v}`).join('\n') + `\n\nWiadomość:\n${data.message || '-'}\n`;
  const html = `<table cellpadding="6" style="font:14px system-ui,sans-serif;border-collapse:collapse">${rows.map(([k, v]) => `<tr><td style="color:#555">${esc(k)}</td><td><strong>${esc(v)}</strong></td></tr>`).join('')}</table><p style="font:14px system-ui,sans-serif;white-space:pre-wrap">${esc(data.message || '-')}</p>`;

  const subject = `Zapytanie ze strony: ${data.topic || 'ogólne'} (${data.name})`;

  if (useSmtp) {
    try {
      const info = await sendSmtp({
        from: { name: 'Formularz Energy Management', address: SMTP_USER },
        to: (CONTACT_TO || SMTP_USER).split(',').map((s) => s.trim()).filter(Boolean),
        replyTo: { name: data.name, address: data.email },
        subject, text, html
      });
      // success only when the mail server accepted at least one recipient
      if (!info || !info.messageId || !(info.accepted && info.accepted.length)) {
        return reply(req, res, 502, { ok: false, error: 'send_failed', message: 'Brak potwierdzenia wysyłki.' });
      }
      return reply(req, res, 200, { ok: true, id: info.messageId });
    } catch (err) {
      console.error('[contact] smtp error', err && (err.code || ''), err && err.message);
      return reply(req, res, 502, { ok: false, error: 'send_failed', message: 'Serwer poczty odrzucił wiadomość.' });
    }
  }

  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: CONTACT_FROM,
        to: CONTACT_TO.split(',').map((s) => s.trim()).filter(Boolean),
        reply_to: data.email,
        subject,
        text, html
      }),
      signal: AbortSignal.timeout(10000)
    });
    if (!r.ok) {
      console.error('[contact] resend error', r.status, (await r.text()).slice(0, 300));
      return reply(req, res, 502, { ok: false, error: 'send_failed', message: 'Serwer poczty odrzucił wiadomość.' });
    }
    const out = await r.json().catch(() => ({}));
    if (!out.id) {
      return reply(req, res, 502, { ok: false, error: 'send_failed', message: 'Brak potwierdzenia wysyłki.' });
    }
    return reply(req, res, 200, { ok: true, id: out.id });
  } catch (err) {
    console.error('[contact] network error', err && err.message);
    return reply(req, res, 502, { ok: false, error: 'send_failed', message: 'Nie udało się połączyć z serwerem poczty.' });
  }
}
