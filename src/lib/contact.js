// Formatting shared by the contact page, the contact email, and the admin.

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

// The blocks on a contact card, in order. Address, phone, and email always show, with a
// note when we don't have them yet; family shows only when there is someone listed.
// card: { name, address, phone, email, family }
export function contactBlocks(card, labels) {
  const addr = addressLines(card.address)
  const blocks = [
    { key: 'address', label: labels.address, lines: addr.length ? [card.name, ...addr].filter(Boolean) : [] },
    { key: 'phone', label: labels.phone, lines: card.phone ? [card.phone] : [] },
    { key: 'email', label: labels.email, lines: card.email ? [card.email] : [] },
    { key: 'family', label: labels.family, lines: (card.family || []).map(familyLine), optional: true },
  ]
  return blocks.filter((b) => b.lines.length || !b.optional).map((b) => ({ ...b, missing: !b.lines.length }))
}

// What the card needs before it can be confirmed.
export const missingFrom = (blocks) => blocks.filter((b) => b.missing).map((b) => b.key)
