/* Kona Passport — Brevo handoff (Netlify Function, modern runtime)
   Env vars (Netlify dashboard → Environment variables):
     BREVO_API_KEY   — Brevo → SMTP & API → API Keys
     BREVO_LIST_ID   — numeric ID of your Kona list                    */

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export default async (req) => {
  // Pre-flight
  if (req.method === 'OPTIONS') {
    return new Response('', { status: 204, headers: CORS });
  }
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: CORS });
  }

  let data;
  try { data = await req.json(); }
  catch { return new Response('Bad JSON', { status: 400, headers: CORS }); }

  const { email, consent, sessionId, scanOrder, completedAt } = data;
  if (!email || !consent) {
    return new Response('Email and consent required', { status: 400, headers: CORS });
  }

  try {
    const res = await fetch('https://api.brevo.com/v3/contacts', {
      method: 'POST',
      headers: {
        'api-key': process.env.BREVO_API_KEY,
        'Content-Type': 'application/json',
        'accept': 'application/json',
      },
      body: JSON.stringify({
        email,
        listIds: [Number(process.env.BREVO_LIST_ID)],
        updateEnabled: true,
        attributes: {
          KONA_CONSENT: true,
          KONA_SCAN_ORDER: (scanOrder || []).join('-'),
          KONA_COMPLETED_AT: completedAt || new Date().toISOString(),
          KONA_SESSION: sessionId || '',
        },
      }),
    });

    if (res.status === 201 || res.status === 204) {
      return new Response(JSON.stringify({ ok: true }), {
        status: 200, headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }
    console.error('Brevo error', res.status, await res.text());
    return new Response(JSON.stringify({ ok: false }), {
      status: 502, headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ ok: false }), {
      status: 500, headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }
};
