// The "Is this your address?" email, personalized for one household.
// Email programs ignore most CSS, so this is old fashioned table HTML with inline styles.
// The header picture (public/email/header.jpg) carries the hand lettering
// "Lucy Appleby's Bat Mitzvah is coming soon!"; see scripts/render-email-art.cjs.

export const defaultSubject = "Lucy Appleby's Bat Mitzvah is coming soon!"

const INK = '#003b9d'
const CORAL = '#fc564b'
const CYAN = '#1f9fe0'
const FONT = "'Avenir Next', 'Trebuchet MS', Helvetica, Arial, sans-serif"

const esc = (s) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

export function addressLines(h) {
  if (!h.address1 || !h.address1.trim()) return []
  const cityLine = [h.city, [h.state, h.postal_code].filter(Boolean).join(' ')].filter(Boolean).join(', ')
  return [h.address1, h.address2, cityLine, h.country && h.country !== 'United States' ? h.country : null].filter(Boolean)
}

function button(href, label, color) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="display:inline-table; margin:0 5px;"><tr>
<td align="center" bgcolor="#ffffff" style="border:3px solid ${INK}; border-radius:14px; box-shadow:4px 5px 0 ${color};">
<a href="${href}" style="display:inline-block; min-width:72px; padding:12px 22px; font-family:${FONT}; font-size:20px; font-weight:bold; color:${INK}; text-decoration:none;">${label}</a>
</td></tr></table>`
}

const heading = (text) =>
  `<p style="margin:4px 0 14px; font-family:${FONT}; font-size:24px; font-weight:bold; color:${INK};">${text}</p>`

export function buildAddressEmail({ household: h, origin, subject = defaultSubject }) {
  const link = `${origin}/i/${h.invite_token}`
  const lines = addressLines(h)
  const hasAddress = lines.length > 0

  const body = hasAddress
    ? `${heading('Is this your address?')}
<table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:0 auto 22px;"><tr>
<td style="padding:16px 26px; background:#f7ecd9; border:3px solid ${INK}; border-radius:16px; font-family:${FONT}; font-size:18px; line-height:1.45; color:${INK}; text-align:center;">
<strong>${esc(h.name)}</strong><br>${lines.map(esc).join('<br>')}
</td></tr></table>
<div>${button(`${link}?answer=yes`, 'Yes', CYAN)}${button(`${link}?answer=no`, 'No', CORAL)}</div>`
    : `${heading('Where should we mail it?')}
<div>${button(link, 'Add my address', CYAN)}</div>`

  const html = `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${esc(subject)}</title></head>
<body style="margin:0; padding:0; background:#d9f3fb;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#d9f3fb"><tr><td align="center" style="padding:24px 12px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" bgcolor="#ffffff" style="width:100%; max-width:600px; border-radius:8px; overflow:hidden;">
<tr><td><img src="${origin}/email/header.jpg" width="600" alt="Lucy Appleby's Bat Mitzvah is coming soon!" style="display:block; width:100%; height:auto; border:0;"></td></tr>
<tr><td align="center" style="padding:6px 24px 26px; text-align:center;">
${body}
</td></tr>
<tr><td><img src="${origin}/email/footer.jpg" width="600" alt="" style="display:block; width:100%; height:auto; border:0;"></td></tr>
</table>
<p style="margin:14px 0 0; font-family:${FONT}; font-size:12px; color:#33507e;">This link is just for you: <a href="${link}" style="color:#33507e;">${esc(link)}</a></p>
</td></tr></table>
</body></html>`

  const text = [
    "Lucy Appleby's Bat Mitzvah is coming soon!",
    '',
    ...(hasAddress
      ? ['Is this your address?', '', h.name, ...lines, '', `Yes: ${link}?answer=yes`, `No: ${link}?answer=no`]
      : ['Where should we mail it?', link]),
  ].join('\n')

  return { to: h.email, subject, html, text, tag: 'address-check' }
}
