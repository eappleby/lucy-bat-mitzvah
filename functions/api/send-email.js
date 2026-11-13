// Cloudflare Pages Function: sends admin emails through CloudMailin.
//
// Settings come from the Pages project (Settings > Variables and Secrets),
// or from .dev.vars when running `npm run preview:cf` locally:
//   CLOUDMAILIN_SMTP_URL        secret, the SMTP URL from CloudMailin:
//                               smtp://USERNAME:PASSWORD@smtp.cloudmta.net:587?starttls=true
//   or both of these instead of the URL:
//   CLOUDMAILIN_SMTP_USERNAME   secret
//   CLOUDMAILIN_SMTP_PASSWORD   secret
//   EMAIL_FROM                  required, e.g.  Lucy <itsmelucy@lucybatmitzvah.com>
//   EMAIL_REPLY_TO              optional
//   CLOUDMAILIN_TEST_MODE       optional, "true" checks each message without sending it
//
// Mail goes out through CloudMailin's HTTP API, which takes the same SMTP
// username and password. Pages Functions cannot hold an SMTP connection open.
//
// Only signed-in admins can call this. The caller's Supabase session token is
// checked against the database's is_admin() function on every request.

import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from '../../shared/public-config.js'

// Each message is its own request to CloudMailin, and a Pages Function on the
// free plan gets 50 outgoing requests per call (one is the admin check).
const MAX_MESSAGES = 40
const PARALLEL = 5

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

function credentials(env) {
  if (env.CLOUDMAILIN_SMTP_URL) {
    try {
      const url = new URL(env.CLOUDMAILIN_SMTP_URL)
      const username = decodeURIComponent(url.username)
      const password = decodeURIComponent(url.password)
      if (username && password) return { username, password }
    } catch {
      return null
    }
  }
  if (env.CLOUDMAILIN_SMTP_USERNAME && env.CLOUDMAILIN_SMTP_PASSWORD) {
    return { username: env.CLOUDMAILIN_SMTP_USERNAME, password: env.CLOUDMAILIN_SMTP_PASSWORD }
  }
  return null
}

const NOT_SET_UP = 'CloudMailin is not connected. Add CLOUDMAILIN_SMTP_URL and EMAIL_FROM.'

// GET: is CloudMailin set up? Lets the admin page show a helpful status line.
export async function onRequestGet({ request, env }) {
  if (!(await isAdmin(request))) return json({ error: 'Sign in as an admin first.' }, 401)
  return json({
    configured: !!(credentials(env) && env.EMAIL_FROM),
    from: env.EMAIL_FROM || null,
    testMode: env.CLOUDMAILIN_TEST_MODE === 'true',
  })
}

async function sendOne(m, env, creds) {
  const res = await fetch(`https://api.cloudmailin.com/api/v0.1/${encodeURIComponent(creds.username)}/messages`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: `Bearer ${creds.password}`,
    },
    body: JSON.stringify({
      from: env.EMAIL_FROM,
      to: m.to,
      subject: m.subject,
      plain: m.text,
      html: typeof m.html === 'string' ? m.html : undefined,
      tags: typeof m.tag === 'string' ? [m.tag] : undefined,
      headers: env.EMAIL_REPLY_TO ? { 'Reply-To': env.EMAIL_REPLY_TO } : undefined,
      test_mode: env.CLOUDMAILIN_TEST_MODE === 'true' || undefined,
    }),
  })
  const out = await res.json().catch(() => null)
  if (!res.ok) {
    return { to: m.to, ok: false, id: null, error: out?.error || out?.message || `CloudMailin returned ${res.status}.` }
  }
  return { to: m.to, ok: true, id: out?.id || null, error: null }
}

// POST { messages: [{ to, subject, text, html, tag }] }
export async function onRequestPost({ request, env }) {
  if (!(await isAdmin(request))) return json({ error: 'Sign in as an admin first.' }, 401)
  const creds = credentials(env)
  if (!creds || !env.EMAIL_FROM) return json({ error: NOT_SET_UP }, 503)

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

  const results = []
  for (let i = 0; i < messages.length; i += PARALLEL) {
    const batch = messages.slice(i, i + PARALLEL)
    results.push(
      ...(await Promise.all(
        batch.map((m) => sendOne(m, env, creds).catch((e) => ({ to: m.to, ok: false, id: null, error: e.message || 'Could not reach CloudMailin.' }))),
      )),
    )
  }
  return json({ results })
}
