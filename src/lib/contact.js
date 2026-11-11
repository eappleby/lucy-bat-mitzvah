// Formatting shared by the contact page, the contact email, and the admin.

export const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

function ordinal(n) {
  const s = n % 100 >= 11 && n % 100 <= 13 ? 'th' : { 1: 'st', 2: 'nd', 3: 'rd' }[n % 10] || 'th'
  return `${n}${s}`
}

// birthdayText(7, 1) -> "July 1st"
export function birthdayText(month, day) {
  if (!month || !day) return ''
  return `${MONTHS[month - 1]} ${ordinal(day)}`
}

// Street, apartment, "City, ST 12345", and the country when it is not the United States.
export function addressLines(a) {
  if (!a || !a.address1 || !String(a.address1).trim()) return []
  const cityLine = [a.city, [a.state, a.postal_code].filter(Boolean).join(' ')].filter(Boolean).join(', ')
  return [a.address1, a.address2, cityLine, a.country && a.country !== 'United States' ? a.country : null].filter(Boolean)
}

export const fullName = (p) => [p?.first_name, p?.last_name].filter(Boolean).join(' ')

// "Rachel Appleby (Spouse)"
export const familyLine = (p) => fullName(p) + (p.relationship ? ` (${p.relationship})` : '')

// Relationships offered in the family list. People can type anything else.
export const RELATIONSHIPS = ['Spouse', 'Partner', 'Daughter', 'Son', 'Child', 'Parent', 'Sibling', 'Grandparent', 'Grandchild']
