/* Kona Passport — Brevo handoff (Netlify Function)
   Env vars required (set in Netlify dashboard, never in this file):
     BREVO_API_KEY   — Brevo → SMTP & API → API Keys
     BREVO_LIST_ID   — numeric ID of your Kona list in Brevo            */

export async function handler(event) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: 'Method not allowed' };

  let data;
  try { data = JSON.parse(event.body); } catch { return { statusCode: 400, headers, body: 'Bad JSON' }; }

  const { email, consent, sessionId, scanOrder, completedAt } = data;
  if (!email || !consent) return { statusCode: 400, headers, body: 'Email and consent required' };

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
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
    }
    console.error('Brevo error', res.status, await res.text());
    return { statusCode: 502, headers, body: JSON.stringify({ ok: false }) };
  } catch (e) {
    console.error(e);
    return { statusCode: 500, headers, body: JSON.stringify({ ok: false }) };
  }
}
