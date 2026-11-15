import { computed, reactive, ref, watch } from 'vue'
import { reducedMotion } from './state.js'

// Hide and seek on Meet Lucy. Lucy (the 8-bit Lucy from "How I got here") hides behind
// drawings down the page (components/LucyPeek.vue). Nothing on the page explains it.
// She peeks out only from a spot that has been on screen for a few seconds while the
// page is still, once per visit to that spot, and never two at a time. Found spots are
// remembered on this device only.

// Every hiding spot on the page. Each one needs a <LucyPeek> with the same id.
export const SPOTS = ['hero', 'portrait', 'reef-left', 'reef-right', 'bottle', 'clam', 'floor']
const KEY = 'lucy-hide-seek'

const SHOW_MS = reducedMotion ? 2600 : 1700 // how long she stays out
const REST_MS = 6000 // quiet time after a peek before the next one anywhere
const SETTLE_MS = 1500 // the page has to be still this long

function readFound() {
  try {
    const ids = JSON.parse(localStorage.getItem(KEY) || '[]')
    return Array.isArray(ids) ? ids.filter((id) => SPOTS.includes(id)) : []
  } catch {
    return []
  }
}

export const found = ref(readFound())
export const allFound = computed(() => found.value.length >= SPOTS.length)
export const peek = reactive({ id: null, caught: false })

watch(
  found,
  (v) => {
    try {
      localStorage.setItem(KEY, JSON.stringify(v))
    } catch {
      // Private windows can refuse storage. The game still works for this visit.
    }
  },
  { deep: true },
)

// ---------- which spots are on screen ----------
const spots = new Map() // id -> { since, wait, done }
let lastScroll = 0
let restUntil = 0
let ticker = 0
let hideTimer = 0

const onScroll = () => (lastScroll = Date.now())

export function register(id) {
  spots.set(id, { since: 0, wait: 0, done: false })
  if (!ticker) {
    window.addEventListener('scroll', onScroll, { passive: true })
    restUntil = Date.now() + 4000
    ticker = setInterval(tick, 500)
  }
}

export function unregister(id) {
  spots.delete(id)
  if (peek.id === id) peek.id = null
  if (!spots.size) {
    clearInterval(ticker)
    ticker = 0
    window.removeEventListener('scroll', onScroll)
  }
}

export function setVisible(id, visible) {
  const s = spots.get(id)
  if (!s) return
  if (visible && !s.since) {
    s.since = Date.now()
    s.wait = 3000 + Math.random() * 4000 // looked at for a few seconds first
    s.done = false // a new visit to this spot
  } else if (!visible) s.since = 0
}

function tick() {
  const now = Date.now()
  if (peek.id || document.hidden || now < restUntil || now - lastScroll < SETTLE_MS) return
  const ready = [...spots.entries()].filter(
    ([id, s]) => s.since && !s.done && now - s.since > s.wait && !found.value.includes(id),
  )
  if (!ready.length) return
  const [id, s] = ready[Math.floor(Math.random() * ready.length)]
  s.done = true
  peek.id = id
  peek.caught = false
  hideTimer = setTimeout(duck, SHOW_MS)
}

function duck() {
  peek.id = null
  peek.caught = false
  restUntil = Date.now() + REST_MS
}

export function catchLucy(id) {
  if (peek.id !== id || peek.caught) return
  peek.caught = true
  if (!found.value.includes(id)) found.value.push(id)
  clearTimeout(hideTimer)
  hideTimer = setTimeout(duck, 700)
}

// For tuning spots in `npm run dev`: __hideSeek.show('clam') holds her out at one spot,
// __hideSeek.hide() puts her back, __hideSeek.reset() forgets what was found.
if (import.meta.env.DEV && typeof window !== 'undefined') {
  window.__hideSeek = {
    show(id) {
      clearTimeout(hideTimer)
      peek.id = id
      peek.caught = false
      return SPOTS
    },
    hide: duck,
    reset: () => (found.value = []),
  }
}
