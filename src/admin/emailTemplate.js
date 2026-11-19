// The "Contact info up to date?" email, personalized for one household.
// Email programs ignore most CSS, so this is old fashioned table HTML with inline styles.
// The first email's heading is hand lettering baked into a picture (public/email/header-check.jpg,
// or header-new.jpg when we have no address yet); see scripts/render-email-art.cjs.
// The follow up (followUp: true) is a short personal note in plain text with no HTML part,
// which spam filters treat more kindly. It shows only the address and phone; the link has the rest.
import { copy } from '../content.js'
import { addressLines, contactBlocks, missingFrom } from '../lib/contact.js'

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
export const subjectFor = (h, followUp = false) =>
  followUp ? (hasInfo(h) ? t.followUp.subjectCheck : t.followUp.subjectNew) : hasInfo(h) ? t.subjectCheck : t.subjectNew

// The household's card, in the shape contactBlocks expects.
export function infoBlocks(h) {
  const others = (h.guests || []).filter((g) => !g.is_primary)
  return contactBlocks({ name: h.name, address: h, phone: h.phone, email: h.email, family: others }, t.labels)
}

function button(href, label, color) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="display:inline-table; margin:6px 5px;"><tr>
<td align="center" bgcolor="#ffffff" style="border:3px solid ${INK}; border-radius:14px; box-shadow:4px 5px 0 ${color};">
<a href="${href}" style="display:inline-block; min-width:120px; padding:12px 20px; font-family:${FONT}; font-size:19px; font-weight:bold; color:${INK}; text-decoration:none;">${label}</a>
</td></tr></table>`
}

const para = (text, size = 18) =>
  `<p style="margin:0 auto 18px; max-width:460px; font-family:${FONT}; font-size:${size}px; line-height:1.45; color:${INK};">${esc(text)}</p>`

// The info box: centered, a heading per section, and a soft note where something is missing.
function card(blocks) {
  const rows = blocks
    .map(
      (b, i) => `<tr><td align="center" style="padding:${i ? 22 : 0}px 0 0; font-family:${FONT}; color:${INK}; text-align:center;">
<div style="font-size:20px; font-weight:bold; color:${CORAL}; margin-bottom:6px;">${esc(b.label)}</div>
${b.missing
  ? `<div style="display:inline-block; padding:4px 12px; border:2px dashed ${CORAL}; border-radius:10px; font-size:16px; font-style:italic; color:${CORAL};">${esc(t.missingNote)}</div>`
  : `<div style="font-size:18px; line-height:1.45;">${b.lines.map(esc).join('<br>')}</div>`}
</td></tr>`,
    )
    .join('')
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto 26px; max-width:420px;"><tr>
<td align="center" style="padding:24px 22px 26px; background:#f7ecd9; border:3px solid ${INK}; border-radius:16px; text-align:center;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${rows}</table>
</td></tr></table>`
}

// Three endings: everything is there (confirm or update), something is missing (add it),
// or we have no address at all (add my info).
function endingFor(link, check, missing) {
  if (!check) return { buttons: [{ href: `${link}?answer=no`, label: t.addMine, color: CYAN, primary: true }] }
  if (missing) {
    return { heading: t.missingHeading, body: t.missingBody, buttons: [{ href: `${link}?answer=no`, label: t.addMissing, color: CORAL, primary: true }] }
  }
  return {
    heading: t.stillHeading,
    body: t.stillBody,
    buttons: [
      { href: `${link}?answer=yes`, label: t.confirm, color: CYAN, primary: true },
      { href: `${link}?answer=no`, label: t.update, color: CORAL },
    ],
  }
}

function decoratedHtml({ subject, link, check, intro, blocks, ending: e, origin }) {
  const ending = `${e.heading
    ? `<p style="margin:0 0 8px; font-family:${FONT}; font-size:24px; font-weight:bold; color:${INK};">${esc(e.heading)}</p>
${para(e.body, 17)}
`
    : ''}<div>${e.buttons.map((b) => button(b.href, b.label, b.color)).join('')}</div>`

  const body = `${para(intro)}
${card(blocks)}
${ending}`

  return `<!doctype html>
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
}

// The follow up note. With an address and phone it asks them to confirm or update; with
// either one missing it asks them to reply with it or use the form.
function followUpText(h, link) {
  const f = t.followUp
  const first = (h.guests || []).find((g) => g.is_primary)?.first_name?.trim()
  const addr = addressLines(h)
  const phone = (h.phone || '').trim()
  const missing = !addr.length && !phone ? f.yourBoth : !addr.length ? f.yourAddress : !phone ? f.yourPhone : ''
  const lines = [first ? f.greeting.replace('{name}', first) : f.greetingNoName, '']
  if (!addr.length) {
    lines.push(`${f.intro} ${f.askNew.replace('{missing}', missing)}`, `${link}?answer=no`)
  } else {
    const shown = [h.name, ...addr, phone].filter(Boolean)
    if (missing) {
      lines.push(`${f.intro} ${f.askAddress}`, '', ...shown, '', f.askMissing.replace('{missing}', missing), `${link}?answer=no`)
    } else {
      lines.push(`${f.intro} ${f.askInfo}`, '', ...shown, '', f.confirmLead, `${link}?answer=yes`, '', f.updateLead, `${link}?answer=no`)
    }
  }
  lines.push('', ...f.signoff)
  return lines.join('\n')
}

export function buildContactEmail({ household: h, origin, subject, followUp = false }) {
  const link = `${origin}/i/${h.invite_token}`
  subject = subject || subjectFor(h, followUp)
  if (followUp) return { to: h.email, subject, html: null, text: followUpText(h, link), tag: 'contact-followup' }

  const check = hasInfo(h)
  const blocks = infoBlocks(h)
  const missing = missingFrom(blocks).length > 0
  const intro = check ? t.checkIntro : t.newIntro
  const ending = endingFor(link, check, missing)
  const html = decoratedHtml({ subject, link, check, intro, blocks, ending, origin })

  const text = [
    check ? t.checkHeading : t.newHeading, '', intro, '',
    ...blocks.flatMap((b) => [b.label, ...(b.missing ? [t.missingNote] : b.lines), '']),
    ...(ending.heading ? [ending.heading, ending.body, ''] : []),
    ...ending.buttons.map((x) => `${x.label}: ${x.href}`),
  ].join('\n')

  return { to: h.email, subject, html, text, tag: 'contact-check' }
}
