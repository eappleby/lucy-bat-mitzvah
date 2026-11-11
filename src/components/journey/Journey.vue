<script setup>
// "How I got here": an 8-bit side scroller driven by the page scroll.
//
// Lucy stays put on screen while the world slides past, like an old NES game.
// Everything is drawn into one tiny canvas (1 pixel = 8 world units) that is scaled
// up with no smoothing, so scenery, sprites and props share the same chunky pixels.
// The motion eases toward the scroll position so it glides instead of jumping, and
// when the scrolling stops everyone stands and blinks.
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
const SCROLL_PER_UNIT = 0.7

const art = shallowRef(null)
const images = {}
const track = ref(null)
const canvas = ref(null)
const t = ref(0) // where the game is, easing toward target
const target = ref(0) // where the scroll says it should be
const speed = ref(0) // world units a second
const clock = ref(0) // seconds, for blinking, waving and drifting clouds
const size = ref({ w: 1200, h: 800 })

// Each art pixel is a whole number of screen pixels, so pixels never smear.
const pxCss = computed(() => Math.max(2, Math.floor(PX * Math.min(size.value.h / 1000, size.value.w / 560))))
const cw = computed(() => Math.ceil(size.value.w / pxCss.value))
const ch = computed(() => Math.ceil(size.value.h / pxCss.value))
const worldTop = computed(() => ch.value - W.WORLD_H / PX)
const lucyCol = computed(() => Math.round(cw.value * (size.value.w < 700 ? 0.42 : 0.34)))
const trackHeight = computed(() => Math.round(W.TIMELINE_LENGTH * SCROLL_PER_UNIT * (pxCss.value / PX) + size.value.h))

const st = computed(() => W.stateAt(t.value))
const camX = computed(() => st.value.x)
const place = computed(() => W.placeAt(camX.value))
const progress = computed(() => Math.min(1, t.value / W.TIMELINE_LENGTH))

// world x, y to canvas pixels
const sx = (x) => lucyCol.value + Math.round(x / PX) - Math.round(camX.value / PX)
const sy = (y) => worldTop.value + Math.round(y / PX)

const labels = computed(() => {
  if (!art.value) return []
  return art.value.labels
    .filter((l) => Math.abs(l.x - camX.value) < (cw.value * PX) + 400)
    .map((l) => ({ ...l, left: sx(l.x) * pxCss.value, top: sy(l.y) * pxCss.value, font: Math.max(8, Math.round(pxCss.value * 1.8 * (l.size / 36))) }))
})

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
function drawSprite(ctx, s) {
  const meta = art.value.sprites[s.name]
  const img = images[meta.file]
  if (!img) return
  const list = meta.index[s.pose] || meta.index.all || meta.index.idle
  const frame = list[Math.max(0, s.i) % list.length]
  const left = sx(s.x) - (s.center ? Math.round(meta.w / 2) : meta.ax)
  const top = sy(s.y) - (s.center ? Math.round(meta.h / 2) : meta.ay) - (s.lift || 0)
  if (s.alpha !== undefined && s.alpha < 0.02) return
  ctx.globalAlpha = s.alpha ?? 1
  if (s.shadow !== false && !s.center) {
    ctx.fillStyle = 'rgba(11, 42, 85, 0.22)'
    ctx.fillRect(sx(s.x) - 5, sy(s.y) + 1, 11, 1)
  }
  ctx.drawImage(img, frame * meta.w, 0, meta.w, meta.h, left, top, meta.w, meta.h)
  ctx.globalAlpha = 1
}

function line(ctx, x0, y0, x1, y1, color) {
  ctx.fillStyle = color
  const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1)
  for (let k = 0; k <= n; k++) ctx.fillRect(Math.round(x0 + ((x1 - x0) * k) / n), Math.round(y0 + ((y1 - y0) * k) / n), 1, 1)
}

function draw() {
  const el = canvas.value
  if (!el || !art.value) return
  const ctx = el.getContext('2d')
  ctx.imageSmoothingEnabled = false
  const w = cw.value
  const h = ch.value
  const x = camX.value

  // sky in flat bands, the way old games faded a sky
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
    const cwid = art.value.clouds.w / PX
    const off = Math.round(x / PX * 0.12 + (reducedMotion ? 0 : clock.value * 0.9)) % cwid
    for (let cx = -off; cx < w; cx += cwid) ctx.drawImage(cl, cx, worldTop.value)
    ctx.globalAlpha = 1
  }

  // far scenery for this stretch of the trip
  const P = art.value.parallax
  for (const f of art.value.far) {
    const a = clamp(1 - Math.max(0, f.from - x, x - f.to) / 450)
    const img = images[f.file]
    if (a <= 0 || !img) continue
    ctx.globalAlpha = a
    ctx.drawImage(img, lucyCol.value + Math.round((f.x - (x * P + art.value.farOffset)) / PX), worldTop.value)
  }
  ctx.globalAlpha = 1

  // near scenery
  for (const tile of art.value.near) {
    const left = sx(tile.x)
    if (left > w || left + tile.w / PX < 0 || !images[tile.file]) continue
    // on screens taller than the world, stretch a row near the top upward so indoor walls reach the ceiling
    if (worldTop.value > 0) ctx.drawImage(images[tile.file], 0, 2, tile.w / PX, 1, left, 0, tile.w / PX, worldTop.value)
    ctx.drawImage(images[tile.file], left, worldTop.value)
  }

  const s = scene()
  for (const b of s.back) {
    if (b.kind === 'swing') {
      const [px, py, sx0, sy0] = [sx(b.px), sy(b.py), sx(b.seat[0]), sy(b.seat[1])]
      line(ctx, px - 4, py, sx0 - 4, sy0, '#5d6575')
      line(ctx, px + 4, py, sx0 + 4, sy0, '#5d6575')
      ctx.fillStyle = '#1b1d3a'
      ctx.fillRect(sx0 - 6, sy0 - 1, 13, 3)
      ctx.fillStyle = '#1f9fe0'
      ctx.fillRect(sx0 - 5, sy0, 11, 1)
    } else if (b.kind === 'case') {
      if (b.hand) line(ctx, sx(b.x) + 3, sy(G) - 13, sx(b.hand[0]), sy(b.hand[1]), '#3a3f4a')
      drawSprite(ctx, { name: 'suitcase', pose: 'all', i: 0, x: b.x, y: G })
    } else if (b.kind === 'painting') {
      const left = sx(b.x) - 6
      const top = sy(G - 236) + 2
      const total = b.painting.strokes.reduce((n, st) => n + st.length, 0)
      let left2 = Math.round(total * b.p)
      b.painting.strokes.forEach((st, k) => {
        ctx.fillStyle = b.painting.c[k]
        for (const [px, py] of st) if (left2-- > 0) ctx.fillRect(left + px, top + py, 1, 1)
      })
    }
  }
  for (const sp of s.sprites) drawSprite(ctx, sp)
  for (const f of s.front) {
    if (f.kind === 'disco') {
      line(ctx, sx(f.x), 0, sx(f.x), sy(170), '#5d6575')
      drawSprite(ctx, { name: 'disco', pose: 'all', i: Math.floor(clock.value * 3) % 2, x: f.x, y: 230, shadow: false })
    } else drawSprite(ctx, { ...f, pose: 'all', shadow: false })
  }

  // buildings Lucy walks through go in front of her
  for (const d of art.value.doors) {
    const left = sx(d.x)
    if (left > w || left + d.w / PX < 0 || !images[d.file]) continue
    ctx.drawImage(images[d.file], left, worldTop.value)
  }
}

const hex = (h) => (h.startsWith('rgb') ? h.match(/\d+/g).map(Number) : [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)))
function blend(a, b, k) {
  const A = hex(a)
  const B = hex(b)
  return `rgb(${A.map((v, i) => Math.round(v + (B[i] - v) * k)).join(',')})`
}

// ---------- scrolling ----------
let raf = 0
let last = 0
let onScreen = false
let observer

function readScroll() {
  if (!track.value) return
  const rect = track.value.getBoundingClientRect()
  target.value = clamp(-rect.top / (rect.height - size.value.h)) * W.TIMELINE_LENGTH
}

function frame(now) {
  raf = 0
  const dt = last ? Math.min(0.05, (now - last) / 1000) : 0.016
  last = now
  const before = t.value
  const gap = target.value - t.value
  // a long jump (a click on the scrollbar, a link) glides quickly instead of crawling
  const k = 1 - Math.exp(-dt * (Math.abs(gap) > 3000 ? 14 : 7))
  t.value = Math.abs(gap) < 0.3 ? target.value : t.value + gap * k
  const v = Math.abs(t.value - before) / dt
  speed.value += (Math.min(v, 900) - speed.value) * Math.min(1, dt * 8)
  clock.value += dt
  draw()
  if (onScreen) raf = requestAnimationFrame(frame)
  else last = 0
}
const wake = () => {
  if (!raf) raf = requestAnimationFrame(frame)
}
const onScroll = () => {
  readScroll()
  wake()
}
function onResize() {
  size.value = { w: window.innerWidth, h: window.innerHeight }
  if (canvas.value) {
    canvas.value.width = cw.value
    canvas.value.height = ch.value
  }
  onScroll()
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
  t.value = target.value
  window.addEventListener('scroll', onScroll, { passive: true })
  window.addEventListener('resize', onResize)
  observer = new IntersectionObserver(([e]) => {
    onScreen = e.isIntersecting
    if (onScreen) wake()
  })
  observer.observe(track.value)
  const data = (await import('./art.json')).default
  const files = [...data.near, ...data.far, ...data.doors, data.clouds].map((f) => f.file).concat(Object.values(data.sprites).map((s) => s.file))
  for (const [src, img] of await Promise.all(files.map(load))) if (img) images[src] = img
  art.value = data
  onResize()
  wake()
})
onUnmounted(() => {
  window.removeEventListener('scroll', onScroll)
  window.removeEventListener('resize', onResize)
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

    <div ref="track" class="journey__track" :style="{ height: trackHeight + 'px' }">
      <div class="journey__stage" role="img" aria-label="An 8-bit video game of Lucy growing up, from an inchworm in Williamsburg to her bat mitzvah. Scroll to move her along.">
        <canvas ref="canvas" class="journey__canvas" :style="{ width: cw * pxCss + 'px', height: ch * pxCss + 'px' }"></canvas>
        <span v-for="l in labels" :key="l.text" class="journey__sign" :style="{ left: l.left + 'px', top: l.top + 'px', fontSize: l.font + 'px', color: l.color }" aria-hidden="true">{{ l.text }}</span>
        <p :key="place" class="journey__place">{{ place }}</p>
        <p class="journey__hint" :class="{ 'is-gone': t > 250 }">{{ copy.journey.hint }}</p>
        <div class="journey__progress" aria-hidden="true"><span :style="{ width: progress * 100 + '%' }"></span></div>
      </div>
    </div>

    <div class="zone__inner journey__outro">
      <Pearl id="journey-b" class="pearl--journey-b" />
    </div>
  </section>
</template>
