// The "Contact info up to date?" email, personalized for one household.
// Email programs ignore most CSS, so this is old fashioned table HTML with inline styles.
// The heading is hand lettering baked into a picture (public/email/header-check.jpg, or
// header-new.jpg when we have no address yet); see scripts/render-email-art.cjs.
import { copy } from '../content.js'
import { addressLines, birthdayText, familyLine } from '../lib/contact.js'

const t = copy.contact
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

export const hasInfo = (h) => addressLines(h).length > 0
export const subjectFor = (h) => (hasInfo(h) ? t.subjectCheck : t.subjectNew)
export const primaryOf = (h) => (h.guests || []).find((g) => g.is_primary) || null

// The blocks shown on the card, in order. Empty ones are left out.
export function infoBlocks(h) {
  const p = primaryOf(h)
  const family = (h.guests || []).filter((g) => !g.is_primary).map(familyLine)
  const bday = birthdayText(p?.birthday_month, p?.birthday_day)
  return [
    { label: t.labels.address, lines: [h.name, ...addressLines(h)] },
    { label: t.labels.phone, lines: h.phone ? [h.phone] : [] },
    { label: t.labels.email, lines: h.email ? [h.email] : [] },
    { label: t.labels.birthday, lines: bday ? [bday] : [] },
    { label: t.labels.family, lines: family },
  ].filter((b) => b.lines.length)
}

function button(href, label, color) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="display:inline-table; margin:6px 5px;"><tr>
<td align="center" bgcolor="#ffffff" style="border:3px solid ${INK}; border-radius:14px; box-shadow:4px 5px 0 ${color};">
<a href="${href}" style="display:inline-block; min-width:120px; padding:12px 20px; font-family:${FONT}; font-size:19px; font-weight:bold; color:${INK}; text-decoration:none;">${label}</a>
</td></tr></table>`
}

const para = (text, size = 18) =>
  `<p style="margin:0 auto 18px; max-width:460px; font-family:${FONT}; font-size:${size}px; line-height:1.45; color:${INK};">${esc(text)}</p>`

function card(blocks) {
  const rows = blocks
    .map(
      (b, i) => `<tr><td style="padding:${i ? 14 : 0}px 0 0; font-family:${FONT}; color:${INK};">
<div style="font-size:14px; font-weight:bold; color:${CORAL}; margin-bottom:2px;">${esc(b.label)}</div>
<div style="font-size:18px; line-height:1.4;">${b.lines.map(esc).join('<br>')}</div>
</td></tr>`,
    )
    .join('')
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:0 auto 24px; min-width:260px;"><tr>
<td style="padding:18px 28px 20px; background:#f7ecd9; border:3px solid ${INK}; border-radius:16px; text-align:left;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0">${rows}</table>
</td></tr></table>`
}

export function buildContactEmail({ household: h, origin, subject }) {
  const link = `${origin}/i/${h.invite_token}`
  const check = hasInfo(h)
  const blocks = infoBlocks(h)
  subject = subject || subjectFor(h)

  const body = check
    ? `${para(t.checkIntro)}
${card(blocks)}
<p style="margin:0 0 8px; font-family:${FONT}; font-size:24px; font-weight:bold; color:${INK};">${esc(t.stillHeading)}</p>
${para(t.stillBody, 17)}
<div>${button(`${link}?answer=yes`, t.confirm, CYAN)}${button(`${link}?answer=no`, t.update, CORAL)}</div>`
    : `${para(t.newIntro)}
<div>${button(link, 'Add my info', CYAN)}</div>`

  const html = `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${esc(subject)}</title></head>
<body style="margin:0; padding:0; background:#d9f3fb;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#d9f3fb"><tr><td align="center" style="padding:24px 12px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" bgcolor="#ffffff" style="width:100%; max-width:600px; border-radius:8px; overflow:hidden;">
<tr><td><img src="${origin}/email/header-${check ? 'check' : 'new'}.jpg" width="600" alt="${esc(check ? t.checkHeading : t.newHeading)}" style="display:block; width:100%; height:auto; border:0;"></td></tr>
<tr><td align="center" style="padding:4px 24px 26px; text-align:center;">
${body}
</td></tr>
<tr><td><img src="${origin}/email/footer.jpg" width="600" alt="" style="display:block; width:100%; height:auto; border:0;"></td></tr>
</table>
<p style="margin:14px 0 0; font-family:${FONT}; font-size:12px; color:#33507e;">This link is just for you: <a href="${link}" style="color:#33507e;">${esc(link)}</a></p>
</td></tr></table>
</body></html>`

  const text = check
    ? [
        t.checkHeading, '', t.checkIntro, '',
        ...blocks.flatMap((b) => [b.label, ...b.lines, '']),
        t.stillHeading, t.stillBody, '',
        `${t.confirm}: ${link}?answer=yes`,
        `${t.update}: ${link}?answer=no`,
      ].join('\n')
    : [t.newHeading, '', t.newIntro, '', link].join('\n')

  return { to: h.email, subject, html, text, tag: 'contact-check' }
}
