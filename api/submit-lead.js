/**
 * Proxy verso Google Apps Script: evita 401 dal browser e non espone il secret nell'HTML.
 * Variabili ambiente su Vercel: GOOGLE_SHEET_WEBAPP_URL, GOOGLE_SHEET_SECRET
 */
module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const url = process.env.GOOGLE_SHEET_WEBAPP_URL;
  const secret = process.env.GOOGLE_SHEET_SECRET;
  if (!url || !secret) {
    return res.status(500).json({ ok: false, error: 'Server misconfigured: missing env' });
  }

  let b = req.body;
  if (typeof b === 'string') {
    try {
      b = JSON.parse(b || '{}');
    } catch (e) {
      b = {};
    }
  }
  if (typeof b !== 'object' || b === null) b = {};
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
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.status(r.status).send(text);
  } catch (err) {
    res.status(502).json({ ok: false, error: String(err && err.message ? err.message : err) });
  }
};
