/**
 * Proxy verso Google Apps Script.
 * Vercel: GOOGLE_SHEET_WEBAPP_URL, GOOGLE_SHEET_SECRET
 * Node 18+ (fetch nativo; niente node-fetch).
 */
function sendJson(res, status, obj) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(obj));
}

function parseUrlEncodedString(s) {
  const o = {};
  try {
    new URLSearchParams(s).forEach((v, k) => {
      o[k] = v;
    });
  } catch (_) {}
  return o;
}

function parseFromBodyValue(req, raw) {
  if (raw == null) return {};
  if (typeof raw === 'object' && !Buffer.isBuffer(raw) && !Array.isArray(raw)) return raw;
  const s = Buffer.isBuffer(raw) ? raw.toString('utf8') : String(raw);
  const ct = (req.headers['content-type'] || '').toLowerCase();
  if (ct.includes('application/x-www-form-urlencoded')) {
    return parseUrlEncodedString(s);
  }
  try {
    return JSON.parse(s || '{}');
  } catch (e) {
    return {};
  }
}

function parseJsonBody(req) {
  return parseFromBodyValue(req, req.body);
}

async function readRequestBodyStream(req) {
  try {
    const chunks = [];
    for await (const chunk of req) {
      chunks.push(chunk);
    }
    if (chunks.length === 0) return {};
    const text = Buffer.concat(chunks).toString('utf8');
    if (!text) return {};
    const ct = (req.headers['content-type'] || '').toLowerCase();
    if (ct.includes('application/x-www-form-urlencoded')) {
      return parseUrlEncodedString(text);
    }
    if (ct.includes('application/json')) {
      try {
        return JSON.parse(text);
      } catch (_) {
        return {};
      }
    }
    try {
      return JSON.parse(text);
    } catch (_) {
      return {};
    }
  } catch (_) {
    return {};
  }
}

async function getRequestBody(req) {
  const b = parseJsonBody(req);
  if (b && typeof b === 'object' && Object.keys(b).length > 0) {
    return b;
  }
  const streamed = await readRequestBodyStream(req);
  if (streamed && typeof streamed === 'object' && Object.keys(streamed).length > 0) {
    return streamed;
  }
  return b && typeof b === 'object' ? b : {};
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    return res.end();
  }
  if (req.method !== 'POST') {
    return sendJson(res, 405, { ok: false, error: 'Method not allowed' });
  }

  const url = process.env.GOOGLE_SHEET_WEBAPP_URL;
  const secret = process.env.GOOGLE_SHEET_SECRET;
  if (!url || !secret) {
    return sendJson(res, 500, {
      ok: false,
      error: 'Server misconfigured: set GOOGLE_SHEET_WEBAPP_URL and GOOGLE_SHEET_SECRET on Vercel',
    });
  }

  const b = await getRequestBody(req);
  const params = new URLSearchParams();
  params.set('secret', secret);
  params.set('nome', String(b.nome || '').trim());
  params.set('motivo', String(b.motivo || '').trim());
  params.set('dataRicezione', String(b.dataRicezione || '').trim());
  params.set('dataChiamata', String(b.dataChiamata || '').trim());
  params.set('tel', String(b.tel || '').trim());
  params.set('mail', String(b.mail || '').trim());
  params.set('lp', String(b.lp || '').trim());

  try {
    const r = await fetch(url, {
      method: 'POST',
      redirect: 'follow',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });
    const text = await r.text();
    res.writeHead(r.status, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(text);
  } catch (err) {
    sendJson(res, 502, {
      ok: false,
      error: err && err.message ? err.message : String(err),
    });
  }
};
