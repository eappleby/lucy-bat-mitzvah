// The map of Lucy's journey, shared by the build script that draws the scenery
// (scripts/build-journey.mjs) and the component that plays it (Journey.vue).
//
// Units: the world is 1000 units tall. x is how far Lucy has walked.
// Scrolling moves Lucy to the right. At an "act" the scenery holds still while
// scrolling plays the activity (swinging, painting, and so on).

export const WORLD_H = 1000
export const GROUND = 860
export const END_X = 17600

// Lucy changes into her next self while she is hidden behind each of these buildings.
export const doors = [
  { id: 'wburg-home', x: 1500, w: 460, to: 'stroller' },
  { id: 'slope-home', x: 3300, w: 440, to: 'princess' },
  { id: 'ps107', x: 4950, w: 600, to: 'kid' },
  { id: 'airport', x: 7700, w: 560, to: 'traveler' },
  { id: 'camp-gate', x: 13100, w: 480, to: 'camper' },
  { id: 'ms51', x: 15000, w: 600, to: 'teen' },
  { id: 'shul', x: 16450, w: 480, to: 'bat' },
]
export const FIRST_FORM = 'worm'

// The art class easels, by who paints at each one. Each painter stands EASEL_STAND to the left.
export const easels = { friendB: 6500, kid: 6720, friendA: 6940 }
export const EASEL_STAND = 125

// Places where the scenery stops and scrolling plays an activity instead.
// hold is how much scrolling (in world units) the activity takes.
export const acts = [
  { id: 'swings', x: 5800, hold: 700 },
  { id: 'art', x: 6650, hold: 600 },
  { id: 'boogie', x: 12500, hold: 800 },
  { id: 'mud', x: 14250, hold: 500 },
  { id: 'dance', x: 15850, hold: 700 },
  { id: 'bema', x: END_X, hold: 500 },
]

// Stretches where Lucy moves differently without stopping.
export const zones = [
  { id: 'skate', from: 7050, to: 7450 },
  { id: 'beach', from: 12150, to: 12850 },
  { id: 'water', from: 12300, to: 12720 },
  { id: 'mud', from: 14250, to: 14900 },
]

// The place name shown above the scene, from this x onward.
export const places = [
  { x: -9999, label: 'Williamsburg, Brooklyn' },
  { x: 1750, label: 'Park Slope, Brooklyn' },
  { x: 4250, label: 'PS 107' },
  { x: 5300, label: 'Friends!' },
  { x: 7950, label: 'Paris' },
  { x: 8750, label: 'London' },
  { x: 9550, label: 'Berlin' },
  { x: 10350, label: 'Israel' },
  { x: 11150, label: 'Japan' },
  { x: 11850, label: 'Costa Rica' },
  { x: 13300, label: 'Camp Pembroke' },
  { x: 15200, label: 'MS 51' },
  { x: 16650, label: 'The bema' },
]

// Sky colors along the way, blended between stops.
export const skies = [
  { x: 0, top: '#8fd3f4', bottom: '#e3f6fd' },
  { x: 3500, top: '#9fdcf7', bottom: '#f3fbff' },
  { x: 7600, top: '#bcdcf5', bottom: '#fde9ef' },
  { x: 8400, top: '#a9d4f2', bottom: '#eef6fb' },
  { x: 10300, top: '#78c6ef', bottom: '#fff4dd' },
  { x: 11200, top: '#a9dcf4', bottom: '#fde6ee' },
  { x: 12000, top: '#5cc1ec', bottom: '#dff6ff' },
  { x: 13200, top: '#8fd3f4', bottom: '#eaf8e6' },
  { x: 15100, top: '#9fdcf7', bottom: '#f3f0ff' },
  { x: 16300, top: '#f6e7cf', bottom: '#fff8ec' },
]

// Who walks with Lucy in each form, as offsets from her x. Negative is behind her.
export const companions = {
  worm: [],
  stroller: [],
  princess: [],
  kid: [{ who: 'friendA', dx: 135 }, { who: 'friendB', dx: -135 }],
  traveler: [{ who: 'sister', dx: 125 }, { who: 'mom', dx: -135 }, { who: 'dad', dx: -255 }],
  camper: [{ who: 'camperA', dx: 130 }, { who: 'camperB', dx: -125 }, { who: 'camperC', dx: -245 }],
  teen: [{ who: 'teenA', dx: 140 }, { who: 'teenB', dx: -140 }],
  bat: [],
}

// The bema scene: steps up to the platform.
export const steps = { from: 16950, rise: 32, count: 3, run: 70 }

export function formAt(x) {
  let form = FIRST_FORM
  for (const d of doors) if (x >= d.x) form = d.to
  return form
}

export function groundAt(x) {
  const lift = Math.max(0, Math.min(steps.count, Math.floor((x - steps.from) / steps.run) + 1))
  return GROUND - lift * steps.rise
}

export function zoneAt(x, id) {
  return zones.some((z) => z.id === id && x >= z.from && x <= z.to)
}

export function placeAt(x) {
  let label = places[0].label
  for (const p of places) if (x >= p.x) label = p.label
  return label
}

// Scroll position (in world units) to where Lucy is, and whether an act is playing.
const totalHold = acts.reduce((n, a) => n + a.hold, 0)
export const TIMELINE_LENGTH = END_X + totalHold + 200

export function stateAt(t) {
  let x = -200 + t
  for (const a of acts) {
    if (x < a.x) break
    if (x < a.x + a.hold) return { x: a.x, act: a.id, actProgress: (x - a.x) / a.hold }
    x -= a.hold
  }
  return { x: Math.min(x, END_X), act: null, actProgress: 0 }
}

const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16))
const mix = (a, b, t) => {
  const A = hex(a)
  const B = hex(b)
  return `rgb(${A.map((v, i) => Math.round(v + (B[i] - v) * t)).join(',')})`
}
export function skyAt(x) {
  let i = 0
  while (i < skies.length - 1 && skies[i + 1].x <= x) i++
  const a = skies[i]
  const b = skies[Math.min(i + 1, skies.length - 1)]
  // Hold each sky, then blend into the next one over the 400 units before it.
  const t = b === a ? 0 : Math.min(1, Math.max(0, (x - (b.x - 400)) / 400))
  return { top: mix(a.top, b.top, t), bottom: mix(a.bottom, b.bottom, t) }
}
