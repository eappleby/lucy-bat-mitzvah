<script setup>
// "Pearl dive": a tiny 8-bit game for the Coming soon page.
// Tap, click, or press space to swim up. Grab the pearl in each gap, dodge the coral.
// Everything is drawn into a 192 x 128 canvas that CSS scales up without smoothing.
import { onMounted, onUnmounted, ref } from 'vue'
import '@fontsource/press-start-2p/400.css'

const W = 192
const H = 128
const FLOOR = 116
const GAP = 56
const SPACING = 88
const PILLAR_W = 16
const GRAVITY = 520
const FLAP = -140
const MAX_FALL = 220
const START_SPEED = 52
const TURTLE_X = 46

const canvas = ref(null)
const reduced = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches

let ctx
let raf = 0
let last = 0
let clock = 0
let state = 'ready' // ready | playing | over
let y = 56
let vy = 0
let speed = START_SPEED
let score = 0
let best = readBest()
let scroll = 0
let pillars = []
let bubbles = []
let sparkles = []
let overAt = 0

function readBest() {
  try {
    return Number(localStorage.getItem('pearl-dive-best')) || 0
  } catch {
    return 0
  }
}
function saveBest() {
  try {
    localStorage.setItem('pearl-dive-best', String(best))
  } catch {
    // Private windows can refuse storage; the best score just will not stick.
  }
}

// ---------- sprites, built once from simple shapes ----------
const C = {
  ink: '#1b1d3a',
  shell: '#2fae8f',
  shellHi: '#7fd6b8',
  skin: '#bfe36b',
  coral: '#fc564b',
  coralHi: '#ff8a7a',
  coralDark: '#a8302a',
  rock: '#4b5a9a',
  rockHi: '#6f7fc0',
  weed: '#2f9a5b',
  weedHi: '#5cc47e',
  sand: '#f1d9a6',
  sandDark: '#d9b97b',
  pearl: '#fdf6ea',
  pearlShade: '#d8cfe8',
}

function makeSprite(w, h, paint) {
  const px = Array.from({ length: h }, () => Array(w).fill(null))
  paint((x, y, c) => {
    if (x >= 0 && y >= 0 && x < w && y < h) px[y][x] = c
  })
  // Dark outline around everything, like an old game sprite.
  const out = px.map((row) => row.slice())
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      if (px[y][x]) continue
      const near = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => px[y + dy]?.[x + dx])
      if (near) out[y][x] = C.ink
    }
  const el = document.createElement('canvas')
  el.width = w
  el.height = h
  const g = el.getContext('2d')
  out.forEach((row, y) => row.forEach((c, x) => {
    if (!c) return
    g.fillStyle = c
    g.fillRect(x, y, 1, 1)
  }))
  return el
}

function turtle(finUp) {
  return makeSprite(20, 13, (set) => {
    // flippers first, so the shell sits on top
    const f = finUp ? -2 : 1
    for (let i = 0; i < 4; i++) set(10 + i, 8 + f + Math.floor(i / 2), C.skin), set(11 + i, 8 + f + Math.floor(i / 2), C.skin)
    for (let i = 0; i < 3; i++) set(4 + i, 9 - f + Math.floor(i / 2), C.skin), set(5 + i, 9 - f + Math.floor(i / 2), C.skin)
    set(1, 7, C.skin), set(2, 7, C.skin)
    // head
    for (let yy = 3; yy <= 7; yy++) for (let xx = 15; xx <= 18; xx++) if ((xx - 16.5) ** 2 + (yy - 5) ** 2 < 5.5) set(xx, yy, C.skin)
    // shell dome
    for (let yy = 1; yy <= 8; yy++)
      for (let xx = 2; xx <= 15; xx++) {
        const d = ((xx - 8.5) / 6.6) ** 2 + ((yy - 7.6) / 6.4) ** 2
        if (d < 1) set(xx, yy, (xx + yy) % 4 === 0 || (xx * 3 + yy) % 7 === 0 ? C.shellHi : C.shell)
      }
    for (let xx = 3; xx <= 14; xx++) set(xx, 8, C.shellHi)
    set(17, 4, C.ink)
  })
}

const sprites = {}
function buildSprites() {
  sprites.turtle = [turtle(false), turtle(true)]
  sprites.pearl = makeSprite(6, 6, (set) => {
    for (let yy = 1; yy < 5; yy++) for (let xx = 1; xx < 5; xx++) if ((xx - 2.5) ** 2 + (yy - 2.5) ** 2 < 4) set(xx, yy, yy > 3 || xx > 3 ? C.pearlShade : C.pearl)
    set(2, 2, '#ffffff')
  })
}

// ---------- the world ----------
function reset() {
  y = 56
  vy = 0
  speed = START_SPEED
  score = 0
  scroll = 0
  sparkles = []
  pillars = []
  for (let i = 0; i < 4; i++) addPillar(W + 40 + i * SPACING)
}

function addPillar(x) {
  const top = 16 + Math.random() * (FLOOR - GAP - 30)
  pillars.push({ x, top, pearl: true, seed: Math.floor(Math.random() * 1000) })
}

function flap() {
  if (state === 'over') {
    if (clock - overAt < 0.5) return // a short pause so a frantic tap does not restart by accident
    reset()
    state = 'ready'
    return
  }
  if (state === 'ready') state = 'playing'
  vy = FLAP
}

function hit(p) {
  const tx = TURTLE_X + 3
  const tw = 14
  const ty = y + 3
  const th = 8
  if (tx + tw < p.x || tx > p.x + PILLAR_W) return false
  return ty < p.top || ty + th > p.top + GAP
}

function update(dt) {
  clock += dt
  if (!reduced) {
    if (Math.random() < dt * 3) bubbles.push({ x: Math.random() * W, y: FLOOR, r: Math.random() < 0.3 ? 2 : 1 })
    bubbles.forEach((b) => (b.y -= dt * (14 + b.r * 6)))
    bubbles = bubbles.filter((b) => b.y > -4)
  }
  sparkles.forEach((s) => (s.t += dt))
  sparkles = sparkles.filter((s) => s.t < 0.5)

  if (state === 'ready') {
    y = 56 + (reduced ? 0 : Math.sin(clock * 3) * 3)
    return
  }
  if (state === 'over') {
    if (y < FLOOR - 12) {
      vy = Math.min(MAX_FALL, vy + GRAVITY * dt)
      y = Math.min(FLOOR - 12, y + vy * dt)
    }
    return
  }

  vy = Math.min(MAX_FALL, vy + GRAVITY * dt)
  y += vy * dt
  if (y < 2) {
    y = 2
    vy = 0
  }
  const move = speed * dt
  scroll += move
  for (const p of pillars) {
    p.x -= move
    if (p.pearl && TURTLE_X + 16 > p.x + 4 && TURTLE_X + 2 < p.x + 12) {
      const py = p.top + GAP / 2
      if (Math.abs(y + 6 - py) < 10) {
        p.pearl = false
        score += 1
        speed = Math.min(90, START_SPEED + score * 1.5)
        sparkles.push({ x: p.x + 8, y: py, t: 0 })
      }
    }
  }
  if (pillars[0].x < -PILLAR_W - 4) {
    pillars.shift()
    addPillar(pillars[pillars.length - 1].x + SPACING)
  }
  if (y + 12 >= FLOOR || pillars.some(hit)) {
    state = 'over'
    overAt = clock
    if (score > best) {
      best = score
      saveBest()
    }
  }
}

// ---------- drawing ----------
function rect(x, y, w, h, c) {
  ctx.fillStyle = c
  ctx.fillRect(Math.round(x), Math.round(y), w, h)
}

function drawCoral(p) {
  const x = Math.round(p.x)
  const bottom = Math.round(p.top + GAP)
  const n = (k) => Math.sin(p.seed * 0.37 + k * 1.9) // a little wobble that stays put for each pillar

  // Branching coral growing up from the sand: a trunk, with arms reaching up on both sides.
  const branch = (bx, by, len, dir) => {
    for (let i = 0; i < len; i++) {
      const xx = bx + dir * Math.floor(i / 2)
      rect(xx - 1, by - i - 1, 4, 3, C.ink)
    }
    for (let i = 0; i < len; i++) {
      const xx = bx + dir * Math.floor(i / 2)
      rect(xx, by - i, 2, 1, i % 4 === 1 ? C.coralHi : C.coral)
    }
    const tx = bx + dir * Math.floor((len - 1) / 2)
    rect(tx - 1, by - len - 1, 4, 3, C.ink)
    rect(tx, by - len, 2, 2, C.coralHi)
  }
  const trunkL = x + 6
  for (let yy = bottom + 6, k = 0; yy < FLOOR - 4; yy += 9, k++) {
    branch(trunkL + (k % 2 ? 4 : -1), yy + 6, 7 + Math.round(n(k) * 2), k % 2 ? 1 : -1)
  }
  rect(trunkL - 1, bottom + 2, 6, FLOOR - bottom - 2, C.ink)
  rect(trunkL, bottom + 3, 4, FLOOR - bottom - 3, C.coral)
  rect(trunkL + 1, bottom + 5, 1, FLOOR - bottom - 7, C.coralHi)
  // three tips at the top, at uneven heights
  ;[[-4, 3], [0, 0], [4, 2]].forEach(([dx, dy], i) => {
    const tx = trunkL + 1 + dx
    const ty = bottom + dy + Math.round(n(i + 7))
    rect(tx - 1, ty - 1, 4, 8, C.ink)
    rect(tx, ty, 2, 6, C.coral)
    rect(tx, ty, 2, 1, C.coralHi)
  })

  // A craggy rock hanging from above, with seaweed trailing off it.
  const top = Math.round(p.top)
  for (let yy = 0; yy < top; yy++) {
    const inset = Math.max(0, Math.round(1.5 + n(yy * 0.31) * 1.5 + (yy > top - 6 ? (yy - top + 6) * 0.9 : 0)))
    rect(x - 1 + inset, yy, PILLAR_W + 2 - inset * 2, 1, C.ink)
    if (PILLAR_W - inset * 2 > 0) {
      rect(x + inset, yy, PILLAR_W - inset * 2, 1, C.rock)
      rect(x + inset + 1, yy, 2, 1, C.rockHi)
    }
  }
  rect(x + 5, top, 6, 1, C.ink)
  for (let k = 0; k < 2; k++) {
    const wx = x + 5 + k * 5
    const len = 6 + ((p.seed >> k) % 5)
    for (let i = 0; i < len; i++) {
      const sway = reduced ? 0 : Math.round(Math.sin(clock * 2 + i * 0.6 + k) * 1)
      rect(wx + sway, top - 2 + i, 2, 1, i % 3 ? C.weed : C.weedHi)
    }
  }
}

function draw() {
  // water in flat bands, lighter toward the top
  const bands = ['#7fd3f2', '#5fc3ec', '#41afe2', '#2f97d2', '#2380c0', '#1b6cab', '#175c97']
  bands.forEach((c, i) => rect(0, Math.floor((FLOOR * i) / bands.length), W, Math.ceil(FLOOR / bands.length) + 1, c))
  // light rays
  ctx.globalAlpha = 0.12
  for (let i = 0; i < 4; i++) {
    const x0 = ((i * 61 - scroll * 0.2) % (W + 60)) + 10
    for (let yy = 0; yy < 70; yy += 2) rect(x0 + yy * 0.4, yy, 6, 2, '#ffffff')
  }
  ctx.globalAlpha = 1
  for (const b of bubbles) {
    ctx.fillStyle = 'rgba(255,255,255,0.7)'
    ctx.fillRect(Math.round(b.x), Math.round(b.y), b.r, b.r)
  }

  pillars.forEach(drawCoral)

  // sand
  rect(0, FLOOR, W, H - FLOOR, C.sand)
  rect(0, FLOOR, W, 1, C.sandDark)
  for (let i = 0; i < 24; i++) {
    const sx = (((i * 37 - scroll) % W) + W) % W
    rect(sx, FLOOR + 3 + ((i * 5) % (H - FLOOR - 4)), 2, 1, C.sandDark)
  }

  for (const p of pillars) {
    if (!p.pearl) continue
    const bob = reduced ? 0 : Math.round(Math.sin(clock * 4 + p.seed) * 1)
    ctx.drawImage(sprites.pearl, Math.round(p.x + 5), Math.round(p.top + GAP / 2 - 3 + bob))
  }
  for (const s of sparkles) {
    const r = 3 + s.t * 14
    for (let k = 0; k < 4; k++) {
      const a = (k / 4) * Math.PI * 2 + 0.6
      rect(s.x + Math.cos(a) * r, s.y + Math.sin(a) * r, 2, 2, '#fff4b0')
    }
  }

  const frame = state === 'playing' ? (vy < 0 ? 1 : Math.floor(clock * 6) % 2) : Math.floor(clock * 2) % 2
  ctx.save()
  const tilt = state === 'over' ? 1 : Math.max(-0.35, Math.min(0.5, vy / 400))
  ctx.translate(TURTLE_X + 10, Math.round(y) + 6)
  ctx.rotate(state === 'ready' ? 0 : Math.round(tilt * 8) / 8)
  if (state === 'over') ctx.scale(1, -1)
  ctx.drawImage(sprites.turtle[frame], -10, -6)
  ctx.restore()

  // the score, and the words on the start and end screens
  ctx.font = '8px "Press Start 2P"'
  ctx.textBaseline = 'top'
  const text = (s, x, y, c = '#ffffff', align = 'center') => {
    ctx.textAlign = align
    ctx.fillStyle = C.ink
    ctx.fillText(s, x + 1, y + 1)
    ctx.fillStyle = c
    ctx.fillText(s, x, y)
  }
  if (state !== 'ready') text(String(score), W - 6, 6, '#ffffff', 'right')
  if (state === 'ready') {
    text('PEARL DIVE', W / 2, 18, '#fff4b0')
    if (reduced || Math.floor(clock * 2) % 2 === 0) text('TAP TO SWIM', W / 2, 90)
    if (best) text(`BEST ${best}`, W / 2, 30, '#ffffff')
  }
  if (state === 'over') {
    rect(W / 2 - 58, 30, 116, 52, C.ink)
    rect(W / 2 - 56, 32, 112, 48, '#ffffff')
    rect(W / 2 - 54, 34, 108, 44, C.ink)
    text('GAME OVER', W / 2, 40, '#fff4b0')
    text(`PEARLS ${score}`, W / 2, 54)
    text(`BEST ${best}`, W / 2, 66)
    if (clock - overAt > 0.5 && (reduced || Math.floor(clock * 2) % 2 === 0)) text('TAP TO PLAY', W / 2, 92)
  }
}

function frame(now) {
  const dt = last ? Math.min(0.05, (now - last) / 1000) : 0.016
  last = now
  update(dt)
  draw()
  raf = requestAnimationFrame(frame)
}

function onKey(e) {
  if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
    // Only take over the space bar while the game is on screen.
    const r = canvas.value?.getBoundingClientRect()
    if (!r || r.bottom < 0 || r.top > window.innerHeight) return
    e.preventDefault()
    flap()
  }
}

onMounted(async () => {
  ctx = canvas.value.getContext('2d')
  ctx.imageSmoothingEnabled = false
  buildSprites()
  reset()
  try {
    await document.fonts.load('8px "Press Start 2P"')
  } catch {
    // The game still works with a fallback font.
  }
  window.addEventListener('keydown', onKey)
  raf = requestAnimationFrame(frame)
})
onUnmounted(() => {
  cancelAnimationFrame(raf)
  window.removeEventListener('keydown', onKey)
})
</script>

<template>
  <div class="pd">
    <canvas
      ref="canvas"
      class="pd__screen"
      :width="W"
      :height="H"
      tabindex="0"
      role="img"
      aria-label="Pearl dive, a small game. Tap, click, or press space to swim up, grab the pearls, and dodge the coral."
      @pointerdown.prevent="flap"
    ></canvas>
    <p class="pd__help">Tap, click, or press space to swim. Grab the pearls and dodge the coral.</p>
  </div>
</template>

<style scoped>
.pd { margin: 0 auto; max-width: 576px; }
.pd__screen {
  display: block;
  width: 100%;
  aspect-ratio: 3 / 2;
  image-rendering: pixelated;
  image-rendering: crisp-edges;
  background: #2380c0;
  border: 4px solid var(--ink);
  border-radius: 6px;
  box-shadow: 6px 7px 0 var(--coral);
  cursor: pointer;
  touch-action: manipulation;
}
.pd__screen:focus-visible { outline: 3px solid var(--sun, #ffd23f); outline-offset: 3px; }
.pd__help { margin: 0.9rem 0 0; font-size: 1.1rem; color: #33507e; }
</style>
