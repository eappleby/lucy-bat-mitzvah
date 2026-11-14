// 8-bit sprites for "How I got here": Lucy at every age, her friends and family, and props.
//
// People are drawn by rules, not by hand: a head with a hair style, a body in an outfit,
// and arms and legs set at angles for each frame. Angles are degrees; 0 hangs straight
// down, positive swings toward the back (left), negative toward the front (right).
// Every frame gets a one pixel dark outline, like a NES sprite.

const OUTLINE = '#1b1d3a'
const EYE = '#1b1d3a'
const CHEEK = '#f2879c'
const MOUTH = '#b8323f'

const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16))
const shade = (h, t = 0.25) => {
  const c = hex(h)
  return '#' + c.map((v) => Math.round(v * (1 - t)).toString(16).padStart(2, '0')).join('')
}
const light = (h, t = 0.3) => {
  const c = hex(h)
  return '#' + c.map((v) => Math.round(v + (255 - v) * t).toString(16).padStart(2, '0')).join('')
}

class Sprite {
  constructor(w, h) {
    this.w = w
    this.h = h
    this.d = new Uint8Array(w * h * 4)
  }
  set(x, y, c) {
    x = Math.round(x)
    y = Math.round(y)
    if (!c || x < 0 || y < 0 || x >= this.w || y >= this.h) return
    const [r, g, b] = hex(c)
    const i = (y * this.w + x) * 4
    this.d[i] = r
    this.d[i + 1] = g
    this.d[i + 2] = b
    this.d[i + 3] = 255
  }
  on(x, y) {
    return x >= 0 && y >= 0 && x < this.w && y < this.h && this.d[(y * this.w + x) * 4 + 3] > 0
  }
  rect(x, y, w, h, c) {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.set(x + i, y + j, c)
  }
  // a thick line: a small square brush walked from one end to the other
  line(x0, y0, x1, y1, c, t = 1) {
    const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 2))
    const lo = -Math.floor((t - 1) / 2)
    for (let k = 0; k <= n; k++) {
      const x = Math.round(x0 + ((x1 - x0) * k) / n)
      const y = Math.round(y0 + ((y1 - y0) * k) / n)
      for (let i = 0; i < t; i++) for (let j = 0; j < t; j++) this.set(x + lo + i, y + lo + j, c)
    }
  }
  disc(cx, cy, rx, ry, c) {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++)
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++)
        if (((x - cx) / (rx + 0.35)) ** 2 + ((y - cy) / (ry + 0.35)) ** 2 <= 1) this.set(x, y, c)
  }
  outline(c = OUTLINE) {
    const add = []
    for (let y = 0; y < this.h; y++)
      for (let x = 0; x < this.w; x++)
        if (!this.on(x, y) && (this.on(x - 1, y) || this.on(x + 1, y) || this.on(x, y - 1) || this.on(x, y + 1))) add.push([x, y])
    for (const [x, y] of add) this.set(x, y, c)
    return this
  }
  // turn a quarter clockwise: the top of the sprite ends up on the right
  rotated() {
    const r = new Sprite(this.h, this.w)
    for (let y = 0; y < this.h; y++)
      for (let x = 0; x < this.w; x++) {
        const i = (y * this.w + x) * 4
        const j = (x * r.w + (this.h - 1 - y)) * 4
        for (let k = 0; k < 4; k++) r.d[j + k] = this.d[i + k]
      }
    return r
  }
}

// ---------- people ----------
const rad = (a) => (a * Math.PI) / 180

function body(s) {
  const build = s.build || 'kid'
  const headH = 11
  const leg = build === 'adult' ? Math.round(s.h * 0.42) : build === 'young' ? Math.round(s.h * 0.27) : Math.round(s.h * 0.32)
  const torso = s.h - headH - leg
  const W = 40
  const H = s.h + 9
  const footY = H - 2
  return { W, H, cx: 20, footY, leg, torso, headTop: footY - s.h + 1, tw: build === 'adult' ? 10 : 8, arm: build === 'adult' ? 12 : build === 'young' ? 7 : 9 }
}

function drawHair(sp, s, b, layer) {
  const { cx, headTop: t } = b
  const c = s.hair
  const hi = light(c, 0.25)
  const style = s.hairStyle
  if (layer === 'back') {
    if (style === 'long' || style === 'longWavy') {
      const len = style === 'longWavy' ? 16 : 14
      for (let y = t + 3; y < t + len; y++) {
        const wob = style === 'longWavy' && (y % 4 === 0) ? 1 : 0
        sp.rect(cx - 6 - wob, y, 2, 1, c)
        sp.rect(cx + 5 + wob, y, 2, 1, c)
      }
      sp.rect(cx - 5, t + 3, 11, 8, c)
    }
    if (style === 'ponytail') {
      sp.line(cx - 6, t + 2, cx - 8, t + 11, c, 2)
      sp.set(cx - 6, t + 2, s.tie || c)
      sp.set(cx - 7, t + 2, s.tie || c)
    }
    if (style === 'pigtails') {
      sp.rect(cx - 8, t + 5, 2, 6, c)
      sp.rect(cx + 7, t + 5, 2, 6, c)
      sp.set(cx - 7, t + 4, s.tie || '#ffd23f')
      sp.set(cx + 7, t + 4, s.tie || '#ffd23f')
    }
    if (style === 'curly') sp.disc(cx, t + 4, 7.5, 6.5, c)
    if (style === 'curlyBob' || style === 'bob') sp.rect(cx - 6, t + 2, 13, 8, c)
    if (style === 'bun') sp.disc(cx, t - 1, 2.5, 2, c)
    return
  }
  // the cap of hair on top of the head, and bangs
  sp.rect(cx - 4, t - 1, 9, 1, c)
  sp.rect(cx - 5, t, 11, 2, c)
  sp.rect(cx - 3, t, 4, 1, hi)
  if (style === 'curly') {
    sp.rect(cx - 6, t - 1, 13, 3, c)
    for (const [x, y] of [[-5, 0], [-2, -1], [1, 0], [4, -1]]) sp.set(cx + x, t + y, hi)
  } else if (style === 'curlyBob' || style === 'bob') {
    sp.rect(cx - 5, t + 2, 11, 1, c)
    for (let x = -4; x <= 4; x += 2) sp.set(cx + x, t + 3, c)
    sp.rect(cx - 6, t + 2, 2, 7, c)
    sp.rect(cx + 5, t + 2, 2, 7, c)
  } else if (style === 'short') {
    sp.rect(cx - 5, t + 2, 2, 2, c)
    sp.rect(cx + 4, t + 2, 2, 2, c)
  } else {
    // a side part sweeping to the left
    sp.rect(cx - 5, t + 2, 7, 1, c)
    sp.rect(cx - 5, t + 3, 3, 1, c)
    sp.rect(cx - 5, t + 2, 1, 5, c)
    sp.rect(cx + 5, t + 2, 1, 5, c)
  }
}

function drawFace(sp, s, b, blink) {
  const { cx, headTop: t } = b
  sp.rect(cx - 4, t + 2, 9, 7, s.skin)
  sp.rect(cx - 3, t + 9, 7, 1, s.skin)
  sp.rect(cx - 1, t + 10, 3, 1, shade(s.skin, 0.12))
  if (blink) {
    sp.set(cx - 2, t + 6, EYE)
    sp.set(cx + 2, t + 6, EYE)
  } else {
    sp.rect(cx - 2, t + 5, 1, 2, EYE)
    sp.rect(cx + 2, t + 5, 1, 2, EYE)
  }
  sp.set(cx - 3, t + 7, CHEEK)
  sp.set(cx + 3, t + 7, CHEEK)
  sp.rect(cx - 1, t + 8, 3, 1, MOUTH)
  if (s.glasses) {
    // Two small square frames in a lighter brown, so the eyes still read inside them.
    const FRAME = '#7a5a3c'
    for (const ex of [cx - 2, cx + 2]) {
      sp.rect(ex - 1, t + 4, 3, 1, FRAME)
      sp.rect(ex - 1, t + 7, 3, 1, FRAME)
      sp.rect(ex - 1, t + 5, 1, 2, FRAME)
      sp.rect(ex + 1, t + 5, 1, 2, FRAME)
    }
    sp.set(cx, t + 5, FRAME)
  }
  if (s.facepaint) {
    sp.set(cx - 3, t + 6, s.facepaint)
    sp.set(cx + 3, t + 6, s.facepaint)
  }
}

function limb(sp, x, y, angle, len, t, colors) {
  // colors: list of [fraction, color] from the joint outward
  const ex = x - Math.sin(rad(angle)) * len
  const ey = y + Math.cos(rad(angle)) * len
  let from = 0
  for (const [to, c] of colors) {
    sp.line(x + (ex - x) * from, y + (ey - y) * from, x + (ex - x) * to, y + (ey - y) * to, c, t)
    from = to
  }
  return [Math.round(ex), Math.round(ey)]
}

export function person(s, pose = {}, opts = {}) {
  const b = body(s)
  const sp = new Sprite(b.W, b.H)
  const { cx, tw } = b
  const legB = pose.legB || 0
  const legF = pose.legF || 0
  // lower the body when the legs swing, so both feet stay on the ground
  const drop = pose.seated ? 0 : Math.round(b.leg * (1 - Math.cos(rad(Math.min(Math.max(Math.abs(legB), Math.abs(legF)), 60)))))
  const lift = pose.lift || 0
  const hipY = b.footY - b.leg + drop - lift
  const shoulderY = hipY - b.torso
  const headTop = shoulderY - 11
  const bb = { ...b, headTop }

  const legColors = (() => {
    if (s.bottom === 'pants' || s.bottom === 'wide') return [[1, s.bottomColor]]
    if (s.bottom === 'shorts') return [[0.38, s.bottomColor], [s.socks ? 0.8 : 1, s.skin], ...(s.socks ? [[1, s.socks]] : [])]
    return [[s.socks ? 0.8 : 1, s.skin], ...(s.socks ? [[1, s.socks]] : [])]
  })()
  const legT = s.bottom === 'wide' ? 4 : 3
  const armColors = [[s.sleeve ?? 0.35, s.sleeveColor || s.top], [1, s.skin]]

  const shoe = (fx, fy, angle) => {
    const toe = angle > 60 || angle < -60 ? 0 : 1
    sp.rect(fx - 1, fy - 1, 3 + toe, 2, s.shoes)
    if (s.chunky) sp.rect(fx - 1, fy + 1, 4, 1, '#ffffff')
  }

  drawHair(sp, s, bb, 'back')
  if (s.backpack) sp.rect(cx - tw / 2 - 3, shoulderY + 1, 3, Math.min(8, b.torso), s.backpack)

  // back arm and leg
  const handB = limb(sp, cx - tw / 2, shoulderY + 1, pose.armB ?? 6, b.arm, 2, armColors)
  sp.rect(handB[0] - 1, handB[1], 2, 2, s.skin)
  const footB = limb(sp, cx - 1, hipY, legB, b.leg, legT, legColors)
  shoe(footB[0], footB[1], legB)

  // body
  sp.rect(cx - tw / 2, shoulderY, tw, b.torso + 1, s.top)
  sp.set(cx - tw / 2, shoulderY, null)
  sp.rect(cx + tw / 2 - 1, shoulderY + 1, 1, b.torso, shade(s.top, 0.15))
  if (s.under) sp.rect(cx - 1, shoulderY + 1, 3, b.torso - 2, s.under)
  if (s.logo) sp.rect(cx - 1, shoulderY + 3, 2, 2, s.logo)
  if (s.stripe) sp.rect(cx - tw / 2, shoulderY + Math.floor(b.torso / 2), tw, 1, s.stripe)

  // front leg
  const footF = limb(sp, cx + 1, hipY, legF, b.leg, legT, legColors)
  shoe(footF[0], footF[1], legF)

  // a dress or skirt over the top of the legs
  if (s.skirtColor) {
    const len = Math.round(b.leg * (s.skirtLen ?? 0.6))
    for (let j = 0; j < len; j++) {
      const half = tw / 2 + Math.round((j * (s.flare ?? 1)) / 2)
      sp.rect(cx - half, hipY - 1 + j, half * 2, 1, j === len - 1 ? shade(s.skirtColor, 0.2) : s.skirtColor)
    }
    if (s.sparkle) for (let k = 0; k < 6; k++) sp.set(cx - 3 + ((k * 5) % 7), hipY + 1 + ((k * 3) % Math.max(1, len - 2)), s.sparkle)
  }
  if (s.tallit) {
    for (const x of [cx - 3, cx + 1]) {
      sp.rect(x, shoulderY, 2, b.torso + 4, '#ffffff')
      sp.rect(x, shoulderY + b.torso, 2, 1, '#2b4b9b')
      sp.rect(x, shoulderY + b.torso + 2, 2, 1, '#2b4b9b')
    }
  }
  if (s.bag) {
    sp.line(cx - 3, shoulderY, cx + 3, hipY - 2, '#3a2a20', 1)
    sp.rect(cx + 2, hipY - 2, 3, 3, s.bag)
  }

  // head
  drawFace(sp, s, bb, opts.blink)
  drawHair(sp, s, bb, 'front')
  if (s.crown) {
    sp.rect(cx - 2, headTop - 2, 5, 2, '#ffd23f')
    sp.set(cx - 2, headTop - 3, '#ffd23f'); sp.set(cx, headTop - 3, '#ffd23f'); sp.set(cx + 2, headTop - 3, '#ffd23f')
    sp.set(cx, headTop - 2, '#f0517e')
  }
  if (s.bow) sp.rect(cx + 3, headTop - 1, 3, 2, s.bow)

  // front arm on top of everything
  const handF = limb(sp, cx + tw / 2, shoulderY + 1, pose.armF ?? -6, b.arm, 2, armColors)
  sp.rect(handF[0], handF[1], 2, 2, s.skin)
  if (s.wand) {
    const [hx, hy] = handF
    sp.line(hx + 1, hy, hx + 3, hy - 5, '#c08ae0', 1)
    for (const [dx, dy] of [[0, 0], [-1, 0], [1, 0], [0, -1], [0, 1]]) sp.set(hx + 3 + dx, hy - 7 + dy, '#ffd23f')
  }

  if (opts.muddy) {
    const mud = ['#7b5233', '#5c3c24']
    for (let k = 0; k < 16; k++) {
      const x = cx - 5 + ((k * 7) % 11)
      const y = shoulderY + ((k * 11) % (b.torso + b.leg))
      if (sp.on(x, y)) sp.set(x, y, mud[k % 2])
    }
    sp.set(cx + 3, headTop + 7, mud[0])
  }
  return sp.outline()
}

// The frames every person gets. lift raises a frame off the ground (for hops).
const walk = [
  { legB: 0, legF: 0, armB: 4, armF: -4 },
  { legB: 26, legF: -24, armB: -22, armF: 22 },
  { legB: 0, legF: 0, armB: 4, armF: -4 },
  { legB: -24, legF: 26, armB: 22, armF: -22 },
]
export const POSES = {
  walk,
  idle: [{ armB: 6, armF: -6 }, { armB: 6, armF: -6, blink: true }],
  hop: [{ armB: 24, armF: -140 }, { legB: 34, legF: 22, armB: 30, armF: -150 }],
  swing: [{ seated: true, legB: -78, legF: -88, armB: 172, armF: 188 }],
  paint: [{ legB: 3, legF: -3, armB: 8, armF: -100 }, { legB: 3, legF: -3, armB: 8, armF: -78 }],
  skate: [{ legB: 40, legF: -6, armB: 70, armF: -70 }, { legB: 6, legF: -34, armB: 70, armF: -70 }],
  cheer: [{ armB: 140, armF: -150 }, { armB: 160, armF: -128 }],
  dance: [
    { legB: 10, legF: -15, armB: 60, armF: -160 },
    { legB: -10, legF: 15, armB: 160, armF: -60 },
    { legB: 0, legF: -25, armB: 120, armF: -120 },
    { legB: 20, legF: 0, armB: -30, armF: -170 },
  ],
  celebrate: [{ armB: 150, armF: -150 }, { armB: 135, armF: -165 }],
  jump: [{ armB: 150, armF: -150 }, { legB: 30, legF: 20, armB: 160, armF: -160 }],
  push: walk.map((p) => ({ ...p, armB: -64, armF: -70 })),
  pull: walk.map((p) => ({ ...p, armB: 40 })),
}

// ---------- the cast ----------
const SKIN = { lucy: '#f6c9a8', light: '#f9d7bf', tan: '#e2a77c', brown: '#a8693f', deep: '#6f4329' }
const HAIR = { lucy: '#5a3420', dark: '#2e1d16', blonde: '#e8c05c', red: '#c4602f', black: '#1d1514', brown: '#7a4a2a' }
const lucy = { skin: SKIN.lucy, hair: HAIR.lucy }

export const CAST = {
  princess: { ...lucy, h: 25, build: 'young', hairStyle: 'curlyBob', top: '#e79bd0', skirtColor: '#e79bd0', skirtLen: 1, flare: 1.2, sparkle: '#ffffff', sleeve: 0.25, crown: true, wand: true, bottom: 'none', shoes: '#c35cc0' },
  kid: { ...lucy, h: 32, hairStyle: 'long', top: '#fc564b', bottom: 'shorts', bottomColor: '#5a7fc0', shoes: '#ffffff', socks: '#f0517e' },
  traveler: { ...lucy, h: 33, hairStyle: 'long', top: '#4bb5b2', bottom: 'pants', bottomColor: '#4c6fae', shoes: '#fc564b', backpack: '#fa8f0d' },
  camper: { ...lucy, h: 35, hairStyle: 'ponytail', tie: '#fc564b', top: '#f2b51c', logo: '#ffffff', bottom: 'shorts', bottomColor: '#2b3f73', shoes: '#ffffff', socks: '#f2b51c', facepaint: '#f2b51c' },
  teen: { ...lucy, h: 37, hairStyle: 'ponytail', tie: '#f0517e', top: '#9cc6ea', under: '#ffffff', bottom: 'wide', bottomColor: '#8f83d9', shoes: '#ffffff', chunky: true, bag: '#fc564b', sleeve: 0.9 },
  bat: { ...lucy, h: 37, hairStyle: 'longWavy', top: '#2b4b9b', skirtColor: '#2b4b9b', skirtLen: 0.75, flare: 0.9, sparkle: '#cfe0ff', sleeve: 0.3, bottom: 'none', shoes: '#c9a24a', tallit: true },

  friendA: { h: 31, skin: SKIN.brown, hair: HAIR.black, hairStyle: 'curly', top: '#ffd23f', bottom: 'shorts', bottomColor: '#fc564b', shoes: '#ffffff' },
  friendB: { h: 30, skin: SKIN.light, hair: HAIR.blonde, hairStyle: 'ponytail', tie: '#8f83d9', top: '#8f83d9', bottom: 'pants', bottomColor: '#2e3f6b', shoes: '#f0517e' },
  sister: { h: 26, build: 'young', skin: SKIN.lucy, hair: HAIR.dark, hairStyle: 'pigtails', top: '#f0517e', bottom: 'shorts', bottomColor: '#4bb5b2', shoes: '#ffd23f' },
  mom: { h: 42, build: 'adult', skin: SKIN.lucy, hair: HAIR.dark, hairStyle: 'longWavy', top: '#f0e3cf', bottom: 'pants', bottomColor: '#3b4c7a', shoes: '#9b6a42', bag: '#0a8067' },
  dad: { h: 44, build: 'adult', skin: SKIN.light, hair: HAIR.brown, hairStyle: 'short', top: '#5a8fd0', bottom: 'pants', bottomColor: '#6b6f7a', shoes: '#3a2a20', glasses: true },
  camperA: { h: 34, skin: SKIN.tan, hair: HAIR.brown, hairStyle: 'pigtails', top: '#f2b51c', logo: '#ffffff', bottom: 'shorts', bottomColor: '#2b3f73', shoes: '#ffffff', facepaint: '#f2b51c' },
  camperB: { h: 33, skin: SKIN.light, hair: HAIR.red, hairStyle: 'bun', top: '#f2b51c', logo: '#ffffff', bottom: 'shorts', bottomColor: '#2b3f73', shoes: '#f0517e', facepaint: '#f2b51c' },
  camperC: { h: 34, skin: SKIN.deep, hair: HAIR.black, hairStyle: 'curly', top: '#f2b51c', logo: '#ffffff', bottom: 'shorts', bottomColor: '#2b3f73', shoes: '#ffd23f', facepaint: '#f2b51c' },
  teenA: { h: 36, skin: SKIN.light, hair: HAIR.blonde, hairStyle: 'long', top: '#f0517e', bottom: 'wide', bottomColor: '#3d4f86', shoes: '#ffffff', chunky: true },
  teenB: { h: 35, skin: SKIN.brown, hair: HAIR.black, hairStyle: 'bun', top: '#fa8f0d', bottom: 'wide', bottomColor: '#ffffff', shoes: '#2b2f3a', chunky: true },
}

// Which poses each person needs.
const NEEDS = {
  princess: ['idle', 'hop'],
  kid: ['walk', 'idle', 'swing', 'paint', 'skate'],
  friendA: ['walk', 'idle', 'swing', 'paint', 'skate'],
  friendB: ['walk', 'idle', 'swing', 'paint', 'skate'],
  traveler: ['walk', 'idle', 'pull'],
  sister: ['walk', 'idle', 'cheer'],
  mom: ['walk', 'idle', 'cheer', 'push'],
  dad: ['walk', 'idle', 'cheer'],
  camper: ['walk', 'idle', 'jump'],
  camperA: ['walk', 'idle', 'jump'],
  camperB: ['walk', 'idle', 'jump'],
  camperC: ['walk', 'idle', 'jump'],
  teen: ['walk', 'idle', 'dance'],
  teenA: ['walk', 'idle', 'dance'],
  teenB: ['walk', 'idle', 'dance'],
  bat: ['walk', 'idle', 'celebrate'],
}

// ---------- things ----------
function worm(frame) {
  const sp = new Sprite(24, 16)
  const arch = [0, 3, 6][frame]
  const len = [17, 14, 11][frame]
  const g = '#7cc95a'
  for (let i = 0; i < 6; i++) {
    const u = i / 5
    const x = 3 + u * len
    const y = 12 - Math.sin(Math.PI * u) * arch
    sp.disc(x, y, 1.6, 1.6, i % 2 ? g : shade(g, 0.1))
    if (i === 0 || i === 5) sp.set(x, 14, '#3d7f2e')
  }
  const hx = 3 + len + 3
  sp.disc(hx, 10, 2.8, 2.8, '#8bd66a')
  sp.set(hx - 1, 9, EYE); sp.set(hx + 1, 9, EYE)
  sp.set(hx, 11, MOUTH); sp.set(hx - 2, 11, CHEEK); sp.set(hx + 2, 11, CHEEK)
  sp.set(hx - 2, 6, '#3d7f2e'); sp.set(hx - 2, 5, '#f0517e'); sp.set(hx + 2, 6, '#3d7f2e'); sp.set(hx + 2, 5, '#f0517e')
  sp.set(hx - 1, 7, HAIR.lucy); sp.set(hx, 7, HAIR.lucy)
  return sp.outline()
}

function pram(frame) {
  const sp = new Sprite(30, 26)
  const pink = '#f3a3c4'
  sp.disc(14, 15, 10, 5, pink)
  sp.rect(4, 11, 21, 4, pink)
  // hood over the baby, on the handle side
  for (let j = 0; j < 7; j++) sp.rect(3, 4 + j, 4 + j, 1, shade(pink, 0.15))
  sp.line(25, 11, 28, 5, '#3a3f4a', 1)
  sp.rect(27, 4, 3, 1, '#3a3f4a')
  // baby Lucy with curls
  sp.disc(14, 8, 3.2, 3.2, SKIN.lucy)
  for (const [x, y] of [[11, 5], [13, 4], [15, 4], [17, 5], [11, 7], [17, 7]]) sp.set(x, y, HAIR.lucy)
  sp.set(13, 8, EYE); sp.set(15, 8, EYE); sp.set(14, 10, MOUTH); sp.set(12, 9, CHEEK); sp.set(16, 9, CHEEK)
  // wheels with turning spokes
  for (const wx of [7, 21]) {
    sp.disc(wx, 22, 2.6, 2.6, '#3a3f4a')
    sp.set(wx, 22, '#c8ccd4')
    if (frame) { sp.set(wx - 1, 21, '#c8ccd4'); sp.set(wx + 1, 23, '#c8ccd4') } else { sp.set(wx + 1, 21, '#c8ccd4'); sp.set(wx - 1, 23, '#c8ccd4') }
  }
  return sp.outline()
}

function boogie(f) {
  const sp = new Sprite(36, 16)
  const skin = SKIN.lucy
  const hair = HAIR.lucy
  // legs first, kicking up and down behind her
  const back = f ? 7 : 10
  const front = f ? 10 : 7
  sp.line(13, 10, 7, back, skin, 2)
  sp.line(7, back, 3, back - 1, skin, 2)
  sp.line(13, 11, 7, front, shade(skin, 0.1), 2)
  sp.line(7, front, 3, front + 1, shade(skin, 0.1), 2)
  // a little splash at her feet
  sp.set(1, f ? 6 : 12, '#ffffff')
  sp.set(2, f ? 5 : 13, '#ffffff')
  // the board
  sp.rect(6, 12, 25, 2, '#ffd23f')
  sp.rect(7, 14, 23, 1, '#e5a92a')
  sp.rect(31, 12, 2, 2, '#ffd23f')
  sp.set(33, 12, '#ffd23f')
  sp.rect(9, 12, 20, 1, '#fff0a8')
  // swimsuit and body, lying flat
  sp.rect(12, 9, 4, 3, '#fc564b')
  sp.rect(16, 8, 7, 4, '#4bb5b2')
  sp.rect(17, 8, 5, 1, '#7fd3cf')
  // arm reaching forward to hold the nose of the board
  sp.line(22, 10, 30, 11, skin, 2)
  // head, up and looking ahead, with her hair streaming back
  sp.disc(26, 6, 3, 3, skin)
  sp.rect(21, 3, 5, 3, hair)
  sp.rect(22, 2, 5, 2, hair)
  sp.rect(19, 5, 4, 2, hair)
  sp.set(18, 6, hair)
  sp.set(27, 5, '#1b1d3a')
  sp.set(28, 7, '#e88a7a')
  return sp.outline()
}

function simple(w, h, draw) {
  const sp = new Sprite(w, h)
  draw(sp)
  return sp.outline()
}

export function things() {
  return {
    worm: [0, 1, 2, 1].map(worm),
    pram: [0, 1].map(pram),
    suitcase: [simple(12, 13, (s) => { s.rect(1, 1, 10, 9, '#fc564b'); s.rect(1, 4, 10, 1, '#c8423a'); s.disc(3, 11, 1, 1, '#3a3f4a'); s.disc(9, 11, 1, 1, '#3a3f4a') })],
    // Lucy boogie boarding, seen from the side: lying on her belly on the board, head up,
    // arms holding the nose, feet kicking behind her. Two frames for the kick.
    boogie: [0, 1].map(boogie),
    splat: [simple(6, 5, (s) => { s.disc(3, 2, 2, 1.5, '#7b5233') })],
    note: [simple(6, 8, (s) => { s.disc(2, 6, 1.6, 1.2, '#003b9d'); s.rect(3, 0, 1, 6, '#003b9d'); s.rect(4, 0, 2, 1, '#003b9d') })],
    sparkle: [0, 1].map((f) => simple(7, 7, (s) => {
      const c = f ? '#ffffff' : '#ffd23f'
      s.rect(3, 0, 1, 7, c); s.rect(0, 3, 7, 1, c); s.set(3, 3, '#fc564b')
    })),
    disco: [0, 1].map((f) => simple(13, 13, (s) => {
      s.disc(6, 6, 5.5, 5.5, '#cfd8e6')
      for (let y = 1; y < 12; y += 3) for (let x = 1 + ((y + f) % 2) * 2; x < 12; x += 4) if (s.on(x, y)) s.set(x, y, '#ffffff')
      s.set(4 + f * 4, 4, '#f0517e')
    })),
  }
}

// ---------- sheets ----------
export function buildSprites() {
  const sheets = {}
  for (const [name, spec] of Object.entries(CAST)) {
    const frames = []
    const index = {}
    for (const pose of NEEDS[name]) {
      index[pose] = []
      for (const p of POSES[pose]) {
        index[pose].push(frames.length)
        frames.push(person(spec, p, { blink: p.blink }))
      }
    }
    if (['camper', 'camperA', 'camperB', 'camperC'].includes(name)) {
      for (const pose of NEEDS[name]) {
        index[pose + 'Muddy'] = []
        for (const p of POSES[pose]) {
          index[pose + 'Muddy'].push(frames.length)
          frames.push(person(spec, p, { blink: p.blink, muddy: true }))
        }
      }
    }
    sheets[name] = { frames, index, ax: 20, ay: frames[0].h - 2, leg: body(spec).leg }
  }
  for (const [name, frames] of Object.entries(things())) sheets[name] = { frames, index: { all: frames.map((_, i) => i) }, ax: Math.floor(frames[0].w / 2), ay: frames[0].h - 1 }
  return sheets
}

// Lays the frames side by side into one RGBA image.
export function sheetPixels(sheet) {
  const w = sheet.frames[0].w
  const h = sheet.frames[0].h
  const out = new Uint8Array(w * sheet.frames.length * h * 4)
  sheet.frames.forEach((f, i) => {
    for (let y = 0; y < h; y++) out.set(f.d.subarray(y * w * 4, (y + 1) * w * 4), (y * w * sheet.frames.length + i * w) * 4)
  })
  return { data: out, width: w * sheet.frames.length, height: h, fw: w, fh: h }
}
