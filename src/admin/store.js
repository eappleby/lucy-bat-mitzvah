import { reactive } from 'vue'
import { supabase } from '../lib/supabase.js'

// One shared copy of the guest list for every admin tab.
export const store = reactive({
  households: [],
  events: [],
  submissions: [],
  meetLucyOpen: false,
  loading: false,
  toast: '',
  toastKind: 'ok',
})

let toastTimer
export function toast(message, kind = 'ok') {
  store.toast = message
  store.toastKind = kind
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => (store.toast = ''), kind === 'error' ? 7000 : 3200)
}

// Reports a Supabase error in the toast and returns true when there was one.
export function failed(error, doing) {
  if (!error) return false
  toast(`Could not ${doing}: ${error.message}`, 'error')
  return true
}

export async function loadHouseholds() {
  const { data, error } = await supabase
    .from('households')
    .select('*, guests(*), household_events(event_id)')
    .order('name')
  if (failed(error, 'load households')) return
  for (const h of data) h.guests.sort((a, b) => a.sort - b.sort)
  store.households = data
}

export async function loadEvents() {
  const { data, error } = await supabase.from('events').select('*').order('sort')
  if (failed(error, 'load events')) return
  store.events = data
}

export async function loadSubmissions() {
  const { data, error } = await supabase
    .from('address_submissions')
    .select('*')
    .order('created_at', { ascending: false })
  if (failed(error, 'load the inbox')) return
  store.submissions = data
}

export async function loadSettings() {
  const { data, error } = await supabase.from('site_settings').select('key, value')
  if (failed(error, 'load site settings')) return
  store.meetLucyOpen = data.find((r) => r.key === 'meet_lucy_open')?.value === true
}

// Turns the Meet Lucy page on or off for visitors.
export async function setMeetLucyOpen(open) {
  const { error } = await supabase.from('site_settings').upsert({ key: 'meet_lucy_open', value: open, updated_at: new Date().toISOString() })
  if (failed(error, 'change the Meet Lucy page')) return
  store.meetLucyOpen = open
  toast(open ? 'Meet Lucy is open to everyone' : 'Visitors now see Coming soon')
}

export async function loadAll() {
  store.loading = true
  await Promise.all([loadHouseholds(), loadEvents(), loadSubmissions(), loadSettings()])
  store.loading = false
}

export const hasAddress = (h) => !!(h.address1 && h.address1.trim())

// needed: no address yet. unconfirmed: we have one but the guest has not confirmed their info. confirmed: they confirmed it or sent it.
export function addressStatus(h) {
  if (!hasAddress(h)) return 'needed'
  return h.address_confirmed_at ? 'confirmed' : 'unconfirmed'
}
export const statusLabel = { needed: 'Needs address', unconfirmed: 'Not confirmed', confirmed: 'Confirmed' }

export function addressLine(h) {
  if (!hasAddress(h)) return ''
  const cityLine = [h.city, [h.state, h.postal_code].filter(Boolean).join(' ')].filter(Boolean).join(', ')
  const parts = [h.address1, h.address2, cityLine]
  if (h.country && h.country !== 'United States') parts.push(h.country)
  return parts.filter(Boolean).join(', ')
}

export const guestNames = (h) => h.guests.map((g) => [g.first_name, g.last_name].filter(Boolean).join(' ')).join(', ')

export const inviteLink = (h) => `${window.location.origin}/i/${h.invite_token}`

export async function copyText(text, label = 'Copied') {
  try {
    await navigator.clipboard.writeText(text)
    toast(label)
  } catch {
    toast('Copy did not work. Select the text and copy it by hand.', 'error')
  }
}

export function formatWhen(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

// plural(1, 'household') -> "1 household"; plural(3, 'household') -> "3 households"
export const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`
