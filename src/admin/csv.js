// Small CSV reader and writer. Handles quoted fields, escaped quotes, and line breaks inside quotes.

export function parseCsv(text) {
  const rows = []
  let row = []
  let field = ''
  let quoted = false
  const src = text.replace(/^﻿/, '')
  for (let i = 0; i < src.length; i++) {
    const ch = src[i]
    if (quoted) {
      if (ch === '"' && src[i + 1] === '"') {
        field += '"'
        i++
      } else if (ch === '"') quoted = false
      else field += ch
    } else if (ch === '"') quoted = true
    else if (ch === ',' || ch === '\t') {
      row.push(field)
      field = ''
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && src[i + 1] === '\n') i++
      row.push(field)
      field = ''
      if (row.some((c) => c.trim() !== '')) rows.push(row)
      row = []
    } else field += ch
  }
  row.push(field)
  if (row.some((c) => c.trim() !== '')) rows.push(row)
  return rows
}

export function toCsv(rows) {
  const cell = (v) => {
    const s = v == null ? '' : String(v)
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  return rows.map((r) => r.map(cell).join(',')).join('\r\n')
}

export function downloadCsv(filename, rows) {
  const blob = new Blob(['﻿' + toCsv(rows)], { type: 'text/csv;charset=utf-8' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 1000)
}

// Column names people are likely to use, mapped to household fields.
const ALIASES = {
  name: ['name', 'household', 'household name', 'envelope name', 'family'],
  greeting: ['greeting', 'salutation', 'nickname'],
  email: ['email', 'e-mail', 'email address'],
  phone: ['phone', 'mobile', 'cell', 'phone number'],
  address1: ['address1', 'address', 'address 1', 'street', 'street address', 'address line 1'],
  address2: ['address2', 'address 2', 'apt', 'apartment', 'unit', 'address line 2'],
  city: ['city', 'town'],
  state: ['state', 'province', 'region'],
  postal_code: ['postal_code', 'zip', 'zip code', 'postal code', 'postcode'],
  country: ['country'],
  group_tag: ['group', 'group_tag', 'side', 'category'],
  notes: ['notes', 'note'],
  guests: ['guests', 'people', 'members', 'names'],
  birthday: ['birthday', 'bday', 'birth date', 'birthdate', 'date of birth'],
}

// Turns pasted spreadsheet rows into household objects. Returns { households, unknown }.
export function rowsToHouseholds(rows) {
  if (rows.length < 2) return { households: [], unknown: [] }
  const header = rows[0].map((h) => h.trim().toLowerCase())
  const map = header.map((h) => Object.keys(ALIASES).find((key) => ALIASES[key].includes(h)) || null)
  const unknown = header.filter((_, i) => !map[i])
  const households = []
  for (const row of rows.slice(1)) {
    const h = {}
    map.forEach((key, i) => {
      if (key && row[i] != null && row[i].trim() !== '') h[key] = row[i].trim()
    })
    if (!h.name) continue
    // "Dana Rivera; Sam Rivera (Spouse); Max Rivera (Son)". The first person is the main contact.
    const birthday = parseBirthday(h.birthday)
    const guests = (h.guests || '')
      .split(/[;\n]|,(?![^(]*\))/)
      .map((g) => g.trim())
      .filter(Boolean)
      .map((full, i) => {
        const rel = full.match(/\(([^)]*)\)\s*$/)
        const [first, ...rest] = full.replace(/\(([^)]*)\)\s*$/, '').trim().split(/\s+/)
        const relationship = i === 0 ? null : rel?.[1].trim() || null
        return {
          first_name: first,
          last_name: rest.join(' ') || null,
          sort: i,
          is_primary: i === 0,
          relationship,
          kind: /\b(son|daughter|child|kid)\b/i.test(relationship || '') ? 'kid' : 'adult',
          birthday_month: i === 0 ? birthday?.[0] ?? null : null,
          birthday_day: i === 0 ? birthday?.[1] ?? null : null,
        }
      })
    delete h.guests
    delete h.birthday
    households.push({ household: h, guests })
  }
  return { households, unknown }
}

const MONTH_NAMES = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']

// "July 1", "Jul 1st", "7/1", or "1990-07-01" -> [7, 1]. Anything else -> null.
export function parseBirthday(text) {
  const s = (text || '').trim().toLowerCase()
  if (!s) return null
  let m, d
  let x = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/)
  if (x) [m, d] = [+x[2], +x[3]]
  else if ((x = s.match(/^(\d{1,2})[/.-](\d{1,2})(?:[/.-]\d{2,4})?$/))) [m, d] = [+x[1], +x[2]]
  else if ((x = s.match(/^([a-z]+)\.?\s+(\d{1,2})/))) [m, d] = [MONTH_NAMES.indexOf(x[1].slice(0, 3)) + 1, +x[2]]
  return m >= 1 && m <= 12 && d >= 1 && d <= 31 ? [m, d] : null
}
