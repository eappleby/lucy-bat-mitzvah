<script setup>
// "How I got here": an 8-bit side scroller you walk through with the arrows.
//
// Lucy stays put on screen while the world slides past, like an old NES game.
// Everything is drawn into one tiny canvas (1 pixel = 8 world units) that is scaled
// up with no smoothing, so scenery, sprites and props share the same chunky pixels.
// Holding left or right walks her at a steady pace that eases in and out, and
// when she stops everyone stands and blinks.
//
// The pixel art comes from scripts/build-journey.mjs; the map is world.js.
import { computed, onMounted, onUnmounted, ref, shallowRef } from 'vue'
import * as W from './world.js'
import { copy } from '../../content.js'
import { reducedMotion } from '../../lib/state.js'
import Pearl from '../Pearl.vue'
import '@fontsource/press-start-2p/400.css'
import './journey.css'

const PX = 8
const G = W.GROUND
// Walking: holding left or right moves Lucy at a steady pace, easing in and out.
const WALK = 360 // timeline units a second, a gentle stroll
const ACCEL = 1500 // how quickly she gets up to speed and stops
const FLING = 1200 // fastest a swipe can send her

const art = shallowRef(null)
const images = {}
const stage = ref(null)
const canvas = ref(null)
const t = ref(0) // where the game is along the timeline
const speed = ref(0) // world units a second, smoothed, for walking versus standing
const started = ref(false) // hides the hint once someone moves her
const clock = ref(0) // seconds, for blinking, waving and drifting clouds
const size = ref({ w: 1200, h: 800 })

// Each art pixel is a whole number of screen pixels (S), so pixels never smear.
// The canvas itself is full screen resolution, so the world can slide by single screen
// pixels instead of jumping a whole art pixel at a time.
const pxCss = computed(() => Math.max(2, Math.floor(PX * Math.min(size.value.h / 1000, size.value.w / 560))))
const worldTop = computed(() => size.value.h - (W.WORLD_H / PX) * pxCss.value) // screen px
const lucyScreen = computed(() => Math.round(size.value.w * (size.value.w < 700 ? 0.42 : 0.34)))
const touchy = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches

const st = computed(() => W.stateAt(t.value))
const camX = computed(() => st.value.x)
const place = computed(() => W.placeAt(camX.value))
const progress = computed(() => Math.min(1, t.value / W.TIMELINE_LENGTH))

// world x, y to screen pixels on the canvas. Each thing rounds on its own, so Lucy (who
// moves with the camera) never wobbles, and the world glides past her smoothly.
const sx = (x) => lucyScreen.value + Math.round(((x - camX.value) / PX) * pxCss.value)
const sy = (y) => worldTop.value + Math.round((y / PX) * pxCss.value)

// ---------- helpers ----------
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v))
const TAU = Math.PI * 2
const moving = () => speed.value > 18
const blink = () => (clock.value % 3.4 > 3.25 ? 1 : 0)

function doorFade(x) {
  let a = 1
  for (const d of W.doors) a = Math.min(a, clamp((Math.abs(x - d.x) - d.w / 2 + 30) / 160))
  return a
}
function mudOn(x, act, ap) {
  if (W.formAt(x) !== 'camper' || x < 14250) return false
  return act === 'mud' ? ap > 0.35 : true
}

// Pixel paintings on the easels: each stroke is a list of [x, y] pixels on a 13 by 14 canvas.
const paintings = [
  { c: ['#1f9fe0', '#1f9fe0', '#ffd23f', '#0a8067'], strokes: [[[1, 10], [2, 9], [3, 10], [4, 11], [5, 10], [6, 9], [7, 10], [8, 11], [9, 10], [10, 9], [11, 10]], [[1, 12], [3, 11], [5, 12], [7, 11], [9, 12], [11, 11]], [[9, 2], [10, 2], [9, 3], [10, 3], [8, 3], [11, 3], [9, 4], [10, 4]], [[4, 6], [5, 5], [6, 5], [7, 6], [6, 7], [5, 7]]] },
  { c: ['#fc564b', '#ffd23f', '#1f9fe0'], strokes: [[[1, 12], [2, 9], [3, 7], [5, 5], [7, 5], [9, 7], [10, 9], [11, 12]], [[3, 12], [4, 10], [5, 8], [6, 7], [7, 8], [8, 10], [9, 12]], [[5, 12], [6, 10], [7, 12]]] },
  { c: ['#44a784', '#f0517e', '#ffd23f'], strokes: [[[6, 12], [6, 11], [6, 10], [6, 9], [6, 8], [5, 10], [4, 9]], [[5, 4], [6, 3], [7, 4], [8, 5], [7, 6], [6, 7], [5, 6], [4, 5]], [[6, 5]]] },
]

// ---------- what to draw this frame ----------
function scene() {
  const A = art.value
  const { x, act, actProgress: ap } = st.value
  const form = W.formAt(x)
  const go = moving()
  const step = (k = 40) => (go ? Math.floor(x / k) % 4 : 0)
  const idle = () => blink()
  const sprites = [] // { name, pose, i, x, y, lift, alpha, shadow }
  const back = []
  const front = []

  // the swings, the easels and the disco ball belong to the world
  if (Math.abs(x - 5800) < 2000) {
    const swinging = act === 'swings'
    const env = swinging ? clamp(ap / 0.2) * clamp((1 - ap) / 0.2) : 0
    ;[0, 135, -135].forEach((dx, i) => {
      const angle = 0.42 * env * Math.sin(ap * TAU * 4 + i * 0.35)
      const px = 5800 + dx
      const py = G - 466
      const seat = [px - Math.sin(angle) * 300, py + Math.cos(angle) * 300]
      back.push({ kind: 'swing', px, py, seat })
      if (swinging) {
        const who = ['kid', 'friendA', 'friendB'][i]
        sprites.push({ name: who, pose: 'swing', i: 0, x: seat[0], y: seat[1] + A.sprites[who].leg * PX, shadow: false })
      }
    })
  }
  if (Math.abs(x - 6650) < 2000) {
    const done = x > 6650
    ;['kid', 'friendA', 'friendB'].forEach((who, i) => {
      const p = act === 'art' ? clamp(((ap - 0.15) / 0.65) * 1.2 - i * 0.08) : done ? 1 : 0
      back.push({ kind: 'painting', x: W.easels[who], p, painting: paintings[i] })
    })
  }
  // In art class everyone walks over to an easel, paints, then walks back into line.
  const ease = (v) => v * v * (3 - 2 * v)
  const atEasel = act === 'art' ? ease(clamp(ap / 0.15)) * ease(clamp((1 - ap) / 0.12)) : 0
  const painter = (who, from, i) => {
    const to = W.easels[who] - W.EASEL_STAND
    const px = from + (to - from) * atEasel
    if (atEasel > 0.98) return { name: who, pose: 'paint', i: Math.floor(ap * 24 + i) % 2, x: px, y: G }
    return { name: who, pose: 'walk', i: (Math.floor(clock.value * 8) + i) % 4, x: px, y: G }
  }
  if (Math.abs(x - 15900) < 1800) front.push({ kind: 'disco', x: 15900 })

  // the people walking with Lucy
  const crew = W.companions[form] || []
  const beachStand = { sister: 12160, mom: 12070, dad: 11975 }
  const muddy = mudOn(x, act, ap)
  crew.forEach((c, i) => {
    let cx = x + c.dx
    let pose = go ? 'walk' : 'idle'
    let fi = go ? (step() + i) % 4 : idle()
    let alpha = doorFade(x)
    let lift = 0
    if (form === 'traveler' && cx >= beachStand[c.who]) {
      cx = beachStand[c.who]
      pose = 'cheer'
      fi = Math.floor(clock.value * 3 + i) % 2
      alpha = 1
    } else if (act === 'swings') return
    else if (act === 'art') {
      sprites.push(painter(c.who, cx, i + 1))
      return
    } else if (W.zoneAt(x, 'skate')) {
      pose = 'skate'
      fi = Math.floor(x / 90 + i) % 2
    } else if (act === 'mud') {
      pose = 'jump'
      const h = Math.abs(Math.sin(ap * TAU * 3 + i))
      fi = h > 0.4 ? 1 : 0
      lift = Math.round(h * 7)
    } else if (act === 'dance') {
      pose = 'dance'
      fi = (Math.floor(ap * 14) + i) % 4
    }
    if (muddy && A.sprites[c.who].index[pose + 'Muddy']) pose += 'Muddy'
    sprites.push({ name: c.who, pose, i: fi, x: cx, y: W.groundAt(cx), lift, alpha })
  })

  // Lucy herself
  const gy = W.groundAt(x)
  if (form === 'worm') {
    sprites.push({ name: 'worm', pose: 'all', i: go ? Math.floor(x / 30) % 4 : 0, x: x + 40, y: G })
  } else if (form === 'stroller') {
    sprites.push({ name: 'mom', pose: go ? 'push' : 'idle', i: go ? step() : idle(), x: x - 150, y: G, alpha: doorFade(x) })
    sprites.push({ name: 'pram', pose: 'all', i: go ? Math.floor(x / 24) % 2 : 0, x: x + 30, y: G })
  } else if (form === 'princess') {
    const h = go ? Math.abs(Math.sin((Math.PI * x) / 190)) : 0
    sprites.push({ name: 'princess', pose: go ? 'hop' : 'idle', i: go ? (h > 0.3 ? 1 : 0) : idle(), x, y: gy, lift: Math.round(h * 8) })
  } else if (form === 'kid') {
    if (act === 'art') sprites.push(painter('kid', x, 0))
    else if (act !== 'swings') {
      const skate = W.zoneAt(x, 'skate')
      sprites.push({ name: 'kid', pose: skate ? 'skate' : go ? 'walk' : 'idle', i: skate ? Math.floor(x / 90) % 2 : go ? step() : idle(), x, y: gy })
    }
  } else if (form === 'traveler') {
    if (W.zoneAt(x, 'water')) {
      const bob = Math.round(Math.sin((act === 'boogie' ? ap * 6 : x / 80) * Math.PI) * 2)
      sprites.push({ name: 'wave', pose: 'all', i: Math.floor(clock.value * 3) % 2, x: x - 10, y: G + 30 + bob * PX, shadow: false })
      sprites.push({ name: 'board', pose: 'all', i: 0, x: x + 4, y: G - 60 + bob * PX, shadow: false })
      sprites.push({ name: 'prone', pose: 'kick', i: Math.floor(clock.value * 6) % 2, x: x + 4, y: G - 112 + bob * PX, shadow: false, center: true })
      if (act === 'boogie') for (let k = 0; k < 4; k++) front.push({ kind: 'sprite', name: 'sparkle', i: k % 2, x: x + 160 - ((ap * 900 + k * 60) % 240), y: G - 120 - ((ap * 700 + k * 33) % 60) })
    } else {
      const carrying = x < 12150
      sprites.push({ name: 'traveler', pose: go ? (carrying ? 'pull' : 'walk') : 'idle', i: go ? step() : idle(), x, y: gy })
      if (carrying) back.push({ kind: 'case', x: x - 96, hand: [x - 52, gy - 128] })
    }
    if (x >= 12150) back.push({ kind: 'case', x: 12215 })
  } else if (form === 'camper') {
    let pose = go ? 'walk' : 'idle'
    let fi = go ? step() : idle()
    let lift = 0
    if (act === 'mud') {
      pose = 'jump'
      const h = Math.abs(Math.sin(ap * TAU * 3))
      fi = h > 0.4 ? 1 : 0
      lift = Math.round(h * 7)
      for (let k = 0; k < 8; k++) {
        const u = (ap * 3 + k / 8) % 1
        front.push({ kind: 'sprite', name: 'splat', i: 0, x: x - 200 + k * 55 + u * 40 * (k % 2 ? 1 : -1), y: G - Math.sin(u * Math.PI) * 180 })
      }
    }
    if (muddy) pose += 'Muddy'
    sprites.push({ name: 'camper', pose, i: fi, x, y: gy, lift })
  } else if (form === 'teen') {
    if (act === 'dance') {
      sprites.push({ name: 'teen', pose: 'dance', i: Math.floor(ap * 14) % 4, x, y: gy })
      for (let k = 0; k < 6; k++) {
        const u = (ap * 2.5 + k / 6) % 1
        front.push({ kind: 'sprite', name: 'note', i: 0, x: x - 260 + k * 100 + Math.sin(u * TAU) * 20, y: G - 300 - u * 300 })
      }
    } else sprites.push({ name: 'teen', pose: go ? 'walk' : 'idle', i: go ? step() : idle(), x, y: gy })
  } else if (form === 'bat') {
    if (act === 'bema') {
      sprites.push({ name: 'bat', pose: 'celebrate', i: Math.floor(clock.value * 2) % 2, x, y: gy, lift: ap > 0.3 && Math.floor(clock.value * 4) % 2 ? 1 : 0 })
      for (let k = 0; k < 10; k++) {
        const a = (k / 10) * TAU + ap * 2
        const r = 130 + 50 * clamp(ap * 2)
        if (ap > 0.1) front.push({ kind: 'sprite', name: 'sparkle', i: (k + Math.floor(clock.value * 4)) % 2, x: x + Math.cos(a) * r, y: gy - 150 + Math.sin(a) * r * 0.8 })
      }
    } else sprites.push({ name: 'bat', pose: go ? 'walk' : 'idle', i: go ? step() : idle(), x, y: gy })
  }

  // a burst of sparkles just after Lucy comes out of each building
  for (const d of W.doors) {
    const k = (x - d.x - d.w / 2 + 80) / 260
    if (k > 0 && k < 1) for (let i = 0; i < 6; i++) {
      const a = (i / 6) * TAU + 0.4
      front.push({ kind: 'sprite', name: 'sparkle', i: (i + Math.floor(k * 8)) % 2, x: x + Math.cos(a) * (60 + 140 * k), y: gy - 130 + Math.sin(a) * (60 + 110 * k) })
    }
  }
  return { sprites, back, front }
}

// ---------- drawing ----------
// Every picture is drawn in art pixels under a transform that scales by S and moves the
// origin to a whole screen pixel, so it stays crisp wherever it lands.
function at(ctx, x, y) {
  const S = pxCss.value
  ctx.setTransform(S, 0, 0, S, x, y)
}

function drawSprite(ctx, s) {
  const meta = art.value.sprites[s.name]
  const img = images[meta.file]
  if (!img) return
  if (s.alpha !== undefined && s.alpha < 0.02) return
  const list = meta.index[s.pose] || meta.index.all || meta.index.idle
  const frame = list[Math.max(0, s.i) % list.length]
  at(ctx, sx(s.x), sy(s.y))
  ctx.globalAlpha = s.alpha ?? 1
  if (s.shadow !== false && !s.center) {
    ctx.fillStyle = 'rgba(11, 42, 85, 0.22)'
    ctx.fillRect(-5, 1, 11, 1)
  }
  const left = s.center ? -Math.round(meta.w / 2) : -meta.ax
  const top = (s.center ? -Math.round(meta.h / 2) : -meta.ay) - (s.lift || 0)
  ctx.drawImage(img, frame * meta.w, 0, meta.w, meta.h, left, top, meta.w, meta.h)
  ctx.globalAlpha = 1
}

// A one art pixel wide line, from the current origin, in art pixels.
function line(ctx, x0, y0, x1, y1, color) {
  ctx.fillStyle = color
  const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1)
  for (let k = 0; k <= n; k++) ctx.fillRect(Math.round(x0 + ((x1 - x0) * k) / n), Math.round(y0 + ((y1 - y0) * k) / n), 1, 1)
}

// Signs and shop names, painted in the game font. Most go behind the people; the ones on
// a building Lucy walks through go with that building, in front of her.
function drawLabel(ctx, l) {
  const S = pxCss.value
  const fontPx = Math.max(8, Math.round(S * 1.8 * (l.size / 36)))
  const x = sx(l.x)
  if (x < -300 || x > size.value.w + 300) return
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.font = `${fontPx}px "Press Start 2P"`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'
  const y = sy(l.y)
  ctx.fillStyle = '#1b1d3a'
  ctx.fillText(l.text, x + 2, y + 2)
  ctx.fillStyle = l.color
  ctx.fillText(l.text, x, y)
}
const onDoor = (l) => art.value.doors.some((d) => l.x >= d.x && l.x <= d.x + d.w)

function draw() {
  const el = canvas.value
  if (!el || !art.value) return
  const ctx = el.getContext('2d')
  ctx.imageSmoothingEnabled = false
  const S = pxCss.value
  const w = size.value.w
  const h = size.value.h
  const x = camX.value
  const top = worldTop.value
  const visible = (left, width) => left < w && left + width * S > 0

  // sky in flat bands, the way old games faded a sky
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  const sky = W.skyAt(x)
  const bands = 8
  for (let b = 0; b < bands; b++) {
    ctx.fillStyle = blend(sky.top, sky.bottom, b / (bands - 1))
    ctx.fillRect(0, Math.floor((h * b) / bands), w, Math.ceil(h / bands) + 1)
  }

  // clouds drift slowly, and hide indoors
  const cl = images[art.value.clouds.file]
  const indoors = clamp((x - 15150) / 250)
  if (cl && indoors < 1) {
    ctx.globalAlpha = 1 - indoors
    const span = (art.value.clouds.w / PX) * S
    const off = ((((x / PX) * 0.12 + (reducedMotion ? 0 : clock.value * 0.9)) * S) % span + span) % span
    for (let cx = -Math.round(off); cx < w; cx += span) {
      at(ctx, cx, top)
      ctx.drawImage(cl, 0, 0)
    }
    ctx.globalAlpha = 1
  }

  // far scenery for this stretch of the trip, sliding slower than the street
  const P = art.value.parallax
  for (const f of art.value.far) {
    const a = clamp(1 - Math.max(0, f.from - x, x - f.to) / 450)
    const img = images[f.file]
    if (a <= 0 || !img) continue
    const left = lucyScreen.value + Math.round(((f.x - (x * P + art.value.farOffset)) / PX) * S)
    if (!visible(left, f.w / PX)) continue
    ctx.globalAlpha = a
    at(ctx, left, top)
    ctx.drawImage(img, 0, 0)
  }
  ctx.globalAlpha = 1

  // near scenery
  for (const tile of art.value.near) {
    const img = images[tile.file]
    const left = sx(tile.x)
    if (!img || !visible(left, tile.w / PX)) continue
    at(ctx, left, top)
    // on screens taller than the world, stretch a row near the top upward so indoor walls reach the ceiling
    if (top > 0) ctx.drawImage(img, 0, 2, tile.w / PX, 1, 0, -top / S, tile.w / PX, top / S)
    ctx.drawImage(img, 0, 0)
  }

  const s = scene()
  for (const b of s.back) {
    if (b.kind === 'swing') {
      at(ctx, sx(b.px), sy(b.py))
      const dx = Math.round((b.seat[0] - b.px) / PX)
      const dy = Math.round((b.seat[1] - b.py) / PX)
      line(ctx, -4, 0, dx - 4, dy, '#5d6575')
      line(ctx, 4, 0, dx + 4, dy, '#5d6575')
      ctx.fillStyle = '#1b1d3a'
      ctx.fillRect(dx - 6, dy - 1, 13, 3)
      ctx.fillStyle = '#1f9fe0'
      ctx.fillRect(dx - 5, dy, 11, 1)
    } else if (b.kind === 'case') {
      if (b.hand) {
        at(ctx, sx(b.x), sy(G))
        line(ctx, 3, -13, Math.round((b.hand[0] - b.x) / PX), Math.round((b.hand[1] - G) / PX), '#3a3f4a')
      }
      drawSprite(ctx, { name: 'suitcase', pose: 'all', i: 0, x: b.x, y: G })
    } else if (b.kind === 'painting') {
      at(ctx, sx(b.x), sy(G - 236))
      const total = b.painting.strokes.reduce((n, st) => n + st.length, 0)
      let left = Math.round(total * b.p)
      b.painting.strokes.forEach((st, k) => {
        ctx.fillStyle = b.painting.c[k]
        for (const [px, py] of st) if (left-- > 0) ctx.fillRect(px - 6, py + 2, 1, 1)
      })
    }
  }

  for (const l of art.value.labels) if (!onDoor(l)) drawLabel(ctx, l)

  for (const sp of s.sprites) drawSprite(ctx, sp)
  for (const f of s.front) {
    if (f.kind === 'disco') {
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.fillStyle = '#5d6575'
      ctx.fillRect(sx(f.x), 0, S, sy(170))
      drawSprite(ctx, { name: 'disco', pose: 'all', i: Math.floor(clock.value * 3) % 2, x: f.x, y: 230, shadow: false })
    } else drawSprite(ctx, { ...f, pose: 'all', shadow: false })
  }

  // buildings Lucy walks through go in front of her, with their signs
  for (const d of art.value.doors) {
    const img = images[d.file]
    const left = sx(d.x)
    if (!img || !visible(left, d.w / PX)) continue
    at(ctx, left, top)
    ctx.drawImage(img, 0, 0)
  }
  for (const l of art.value.labels) if (onDoor(l)) drawLabel(ctx, l)
  ctx.setTransform(1, 0, 0, 1, 0, 0)
}

const hex = (h) => (h.startsWith('rgb') ? h.match(/\d+/g).map(Number) : [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)))
function blend(a, b, k) {
  const A = hex(a)
  const B = hex(b)
  return `rgb(${A.map((v, i) => Math.round(v + (B[i] - v) * k)).join(',')})`
}

// ---------- moving ----------
// Arrow keys (or A and D), the two buttons, a sideways swipe or drag on the game,
// and a sideways trackpad swipe all move Lucy. Scrolling the page up and down does not.
let raf = 0
let last = 0
let onScreen = false
let observer
let resizer
let vel = 0
let lastFrameT = 0
const held = { key: 0, button: 0 }
let drag = null // { id, x, y, t, lastX, lastT, v, horizontal }

const dir = () => Math.sign(held.key + held.button)

function frame(now) {
  raf = 0
  const dt = last ? Math.min(0.05, (now - last) / 1000) : 0.016
  last = now
  // Measured from the last frame, so drags and trackpad swipes count as walking too.
  const before = lastFrameT
  if (!drag) {
    const want = dir() * WALK
    const step = ACCEL * dt
    vel += Math.max(-step, Math.min(step, want - vel))
    t.value = clamp(t.value + vel * dt, 0, W.TIMELINE_LENGTH)
    if (t.value === 0 || t.value === W.TIMELINE_LENGTH) vel = 0
  }
  const v = Math.abs(t.value - before) / dt
  lastFrameT = t.value
  speed.value += (Math.min(v, 900) - speed.value) * Math.min(1, dt * 10)
  if (v > 1) started.value = true
  clock.value += dt
  draw()
  if (onScreen) raf = requestAnimationFrame(frame)
  else last = 0
}
const wake = () => {
  if (!raf) raf = requestAnimationFrame(frame)
}

// screen pixels to timeline units, so a drag moves the world with your finger
const perPixel = () => PX / pxCss.value

function onKey(e, down) {
  if (e.altKey || e.ctrlKey || e.metaKey) return
  const k = e.key
  const d = k === 'ArrowRight' || k === 'd' || k === 'D' ? 1 : k === 'ArrowLeft' || k === 'a' || k === 'A' ? -1 : 0
  if (!d || !onScreen || !inView()) return
  if (e.target.closest?.('input, textarea, select, [contenteditable]')) return
  e.preventDefault()
  if (down) held.key = d
  else if (held.key === d) held.key = 0
  wake()
}
const keydown = (e) => onKey(e, true)
const keyup = (e) => onKey(e, false)
// Most of the game has to be on screen for the arrow keys to drive it.
function inView() {
  const r = stage.value?.getBoundingClientRect()
  return !!r && r.top < window.innerHeight * 0.6 && r.bottom > window.innerHeight * 0.4
}

function press(d) {
  held.button = d
  wake()
}
const release = () => (held.button = 0)

function onPointerDown(e) {
  if (e.button > 0 || e.target.closest('button')) return
  drag = null
  const d = { id: e.pointerId, x: e.clientX, y: e.clientY, t: t.value, lastX: e.clientX, lastT: performance.now(), v: 0, horizontal: null }
  drag = d
  vel = 0
}
function onPointerMove(e) {
  const d = drag
  if (!d || e.pointerId !== d.id) return
  const dx = e.clientX - d.x
  const dy = e.clientY - d.y
  if (d.horizontal === null) {
    if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return
    d.horizontal = Math.abs(dx) > Math.abs(dy)
    if (!d.horizontal) return (drag = null) // an up and down swipe scrolls the page as usual
    stage.value.setPointerCapture?.(e.pointerId)
  }
  // Dragging left pulls the world past Lucy, so she walks forward.
  t.value = clamp(d.t - dx * perPixel(), 0, W.TIMELINE_LENGTH)
  const now = performance.now()
  const ms = Math.max(1, now - d.lastT)
  d.v = d.v * 0.6 + ((-(e.clientX - d.lastX) * perPixel()) / ms) * 1000 * 0.4
  d.lastX = e.clientX
  d.lastT = now
  wake()
}
function onPointerUp(e) {
  const d = drag
  if (!d || e.pointerId !== d.id) return
  drag = null
  if (d.horizontal) vel = Math.max(-FLING, Math.min(FLING, d.v))
  wake()
}

// Sideways trackpad swipes move her too. Up and down wheel movement is left to the page.
function onWheel(e) {
  if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return
  e.preventDefault()
  t.value = clamp(t.value + e.deltaX * perPixel() * 1.5, 0, W.TIMELINE_LENGTH)
  vel = 0
  wake()
}

function onResize() {
  const el = stage.value
  if (!el) return
  size.value = { w: el.clientWidth, h: el.clientHeight }
  if (canvas.value) {
    canvas.value.width = size.value.w
    canvas.value.height = size.value.h
  }
  wake()
}

function load(src) {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => resolve([src, img])
    img.onerror = () => resolve([src, null])
    img.src = `/journey/${src}`
  })
}

onMounted(async () => {
  onResize()
  window.addEventListener('keydown', keydown)
  window.addEventListener('keyup', keyup)
  window.addEventListener('blur', release)
  stage.value.addEventListener('wheel', onWheel, { passive: false })
  resizer = new ResizeObserver(onResize)
  resizer.observe(stage.value)
  observer = new IntersectionObserver(([e]) => {
    onScreen = e.isIntersecting
    if (onScreen) wake()
    else held.key = held.button = 0
  })
  observer.observe(stage.value)
  try {
    await document.fonts.load('16px "Press Start 2P"') // the signs are painted in it
  } catch {
    // Signs fall back to another font.
  }
  const data = (await import('./art.json')).default
  const files = [...data.near, ...data.far, ...data.doors, data.clouds].map((f) => f.file).concat(Object.values(data.sprites).map((s) => s.file))
  for (const [src, img] of await Promise.all(files.map(load))) if (img) images[src] = img
  art.value = data
  onResize()
  // For screenshot scripts in development only: jump to a point on the timeline.
  if (import.meta.env.DEV) window.__journey = { go: (v) => ((t.value = lastFrameT = v), (vel = 0), wake()) }
})
onUnmounted(() => {
  window.removeEventListener('keydown', keydown)
  window.removeEventListener('keyup', keyup)
  window.removeEventListener('blur', release)
  stage.value?.removeEventListener('wheel', onWheel)
  resizer?.disconnect()
  observer?.disconnect()
  cancelAnimationFrame(raf)
})
</script>

<template>
  <section class="journey" data-zone="How I got here">
    <div class="zone__inner journey__intro">
      <h2 class="zone__title">{{ copy.journey.heading }}</h2>
      <p class="zone__body">{{ copy.journey.body }}</p>
      <Pearl id="journey-a" class="pearl--journey-a" />
    </div>

    <!-- The hold: the game sticks in place while the page scrolls past it for a moment. -->
    <div class="journey__hold">
    <div
      ref="stage"
      class="journey__stage"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="onPointerUp"
      @pointercancel="onPointerUp"
    >
      <canvas ref="canvas" class="journey__canvas" role="img" aria-label="An 8-bit video game of Lucy growing up, from an inchworm in Williamsburg to her bat mitzvah. Hold the right arrow or the forward button to walk her along."></canvas>
      <p :key="place" class="journey__place">{{ place }}</p>
      <p class="journey__hint" :class="{ 'is-gone': started }">{{ touchy ? copy.journey.hintTouch : copy.journey.hint }}</p>
      <button
        v-for="b in [{ d: -1, label: 'Walk back', cls: 'back' }, { d: 1, label: 'Walk forward', cls: 'fwd' }]"
        :key="b.cls"
        type="button"
        class="journey__pad"
        :class="'journey__pad--' + b.cls"
        :aria-label="b.label"
        @pointerdown.prevent="press(b.d)"
        @pointerup="release"
        @pointerleave="release"
        @pointercancel="release"
        @keydown.enter.prevent="press(b.d)"
        @keydown.space.prevent="press(b.d)"
        @keyup="release"
        @contextmenu.prevent
      >
        <svg viewBox="0 0 7 7" aria-hidden="true"><path :d="b.d > 0 ? 'M2 0h1v1h1v1h1v1h1v1h-1v1h-1v1h-1v1h-1z' : 'M5 0h-1v1h-1v1h-1v1h-1v1h1v1h1v1h1v1h1z'" /></svg>
      </button>
      <div class="journey__progress" aria-hidden="true"><span :style="{ width: progress * 100 + '%' }"></span></div>
    </div>
    </div>

    <div class="zone__inner journey__outro">
      <Pearl id="journey-b" class="pearl--journey-b" />
    </div>
  </section>
</template>
