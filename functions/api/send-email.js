// Cloudflare Pages Function: sends admin emails through Postmark.
//
// Secrets and settings come from the Pages project (Settings > Variables and Secrets),
// or from .dev.vars when running `npm run preview:cf` locally:
//   POSTMARK_SERVER_TOKEN   required, secret
//   POSTMARK_FROM           required, e.g.  Lucy's Bat Mitzvah <hello@yourdomain.com>
//   POSTMARK_REPLY_TO       optional
//   POSTMARK_MESSAGE_STREAM optional, defaults to "outbound"
//
// Only signed-in admins can call this. The caller's Supabase session token is
// checked against the database's is_admin() function on every request.

import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from '../../shared/public-config.js'

const MAX_MESSAGES = 100

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } })

async function isAdmin(request) {
  const auth = request.headers.get('Authorization') || ''
  if (!auth.startsWith('Bearer ')) return false
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/is_admin`, {
    method: 'POST',
    headers: { apikey: SUPABASE_PUBLISHABLE_KEY, Authorization: auth, 'Content-Type': 'application/json' },
    body: '{}',
  })
  return res.ok && (await res.json()) === true
}

// GET: is Postmark set up? Lets the admin page show a helpful status line.
export async function onRequestGet({ request, env }) {
  if (!(await isAdmin(request))) return json({ error: 'Sign in as an admin first.' }, 401)
  return json({ configured: !!(env.POSTMARK_SERVER_TOKEN && env.POSTMARK_FROM), from: env.POSTMARK_FROM || null })
}

// POST { messages: [{ to, subject, text, html, tag }] }
export async function onRequestPost({ request, env }) {
  if (!(await isAdmin(request))) return json({ error: 'Sign in as an admin first.' }, 401)
  if (!env.POSTMARK_SERVER_TOKEN || !env.POSTMARK_FROM) {
    return json({ error: 'Postmark is not connected. Add POSTMARK_SERVER_TOKEN and POSTMARK_FROM.' }, 503)
  }

  let body
  try {
    body = await request.json()
  } catch {
    return json({ error: 'Send JSON.' }, 400)
  }
  const messages = Array.isArray(body?.messages) ? body.messages : []
  if (!messages.length || messages.length > MAX_MESSAGES) {
    return json({ error: `Send between 1 and ${MAX_MESSAGES} messages at a time.` }, 400)
  }
  for (const m of messages) {
    if (typeof m?.to !== 'string' || !m.to.includes('@') || typeof m?.subject !== 'string' || typeof m?.text !== 'string') {
      return json({ error: 'Every message needs to, subject, and text.' }, 400)
    }
  }

  const payload = messages.map((m) => ({
    From: env.POSTMARK_FROM,
    To: m.to,
    ReplyTo: env.POSTMARK_REPLY_TO || undefined,
    Subject: m.subject,
    TextBody: m.text,
    HtmlBody: typeof m.html === 'string' ? m.html : undefined,
    Tag: typeof m.tag === 'string' ? m.tag : undefined,
    MessageStream: env.POSTMARK_MESSAGE_STREAM || 'outbound',
  }))

  const res = await fetch('https://api.postmarkapp.com/email/batch', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'X-Postmark-Server-Token': env.POSTMARK_SERVER_TOKEN,
    },
    body: JSON.stringify(payload),
  })
  const out = await res.json().catch(() => null)
  if (!res.ok || !Array.isArray(out)) {
    return json({ error: out?.Message || `Postmark returned ${res.status}.` }, 502)
  }

  return json({
    results: out.map((r, i) => ({ to: messages[i].to, ok: r.ErrorCode === 0, id: r.MessageID || null, error: r.ErrorCode === 0 ? null : r.Message })),
  })
}
