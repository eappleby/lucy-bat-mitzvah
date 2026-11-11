// Scenery for the journey. Every function returns SVG markup in world units.
// The ground line is y = GROUND; up is smaller y.

import { GROUND as G } from '../../src/components/journey/world.js'
import { C, mix, darken, lighten, rect, rect as R, ellipse, circle, poly, path, line, lines, curve, dot, g, speckle } from './draw.mjs'

// ---------- ground ----------
export function ground(x0, x1, kind) {
  const w = x1 - x0
  const h = 1000 - G
  const rect = (x, y, w, h, o) => R(x, y, w, h, { ...o, rx: 0 })
  switch (kind) {
    case 'sidewalk':
      return (
        rect(x0, G, w, 46, { fill: C.sidewalk, gap: 11, sw: 2, stroke: '#9aa6b3' }) +
        rect(x0, G + 46, w, h - 46, { fill: C.street, gap: 10, sw: 2 }) +
        Array.from({ length: Math.ceil(w / 120) }, (_, i) => line(x0 + i * 120, G + 4, x0 + i * 120 - 6, G + 44, { stroke: '#a8b3bf', sw: 1.6 })).join('') +
        Array.from({ length: Math.ceil(w / 260) }, (_, i) => rect(x0 + 60 + i * 260, G + 92, 90, 9, { fill: '#f4f1e6', hatch: false, stroke: false })).join('')
      )
    case 'grass':
      return rect(x0, G, w, h, { fill: C.grass, gap: 9, sw: 2, stroke: darken(C.grass, 0.25) }) + speckle(x0, G + 6, w, h - 10, Math.floor(w / 9), ['#5fb35a', '#a7e08f', '#4c9d4c'], 9, x0)
    case 'path':
      return rect(x0, G, w, h, { fill: C.grass, gap: 9, sw: 2 }) + rect(x0, G + 6, w, 54, { fill: '#e9dcc0', gap: 12, sw: 2, stroke: '#c7b38d' })
    case 'ice':
      return rect(x0, G, w, h, { fill: '#dff3fb', gap: 14, sw: 2, stroke: '#8cc8e4', hatch: '#bfe4f4' }) + curve([[x0 + 40, G + 40], [x0 + 160, G + 70], [x0 + 300, G + 50]], { stroke: '#ffffff', sw: 3 })
    case 'cobble':
      return rect(x0, G, w, h, { fill: '#cbbfae', gap: 9, sw: 2 }) + speckle(x0, G + 8, w, h - 10, Math.floor(w / 6), ['#a7998a', '#e2d9cb'], 12, x0)
    case 'stone':
      return rect(x0, G, w, h, { fill: '#e9d9b5', gap: 10, sw: 2 }) + speckle(x0, G + 8, w, h - 10, Math.floor(w / 10), ['#cdb88f', '#f6ead0'], 10, x0)
    case 'gravel':
      return rect(x0, G, w, h, { fill: '#e6e0d4', gap: 10, sw: 2 }) + speckle(x0, G + 6, w, h - 10, Math.floor(w / 5), ['#b6ab98', '#d3cabb', '#9c917f'], 4, x0)
    case 'dirt':
      return rect(x0, G, w, h, { fill: '#b98a5e', gap: 9, sw: 2 }) + speckle(x0, G + 6, w, h - 10, Math.floor(w / 8), ['#8f6640', '#d2a979', '#5fb35a'], 8, x0)
    case 'sand':
      return rect(x0, G, w, h, { fill: C.sand, gap: 10, sw: 2, stroke: '#d9b57c' }) + speckle(x0, G + 6, w, h - 10, Math.floor(w / 9), ['#e3c48f', '#fff1d4'], 4, x0)
    case 'wood':
      return (
        rect(x0, G, w, h, { fill: '#e2b77d', gap: 8, sw: 2, angle: 0 }) +
        Array.from({ length: 4 }, (_, i) => line(x0, G + 26 + i * 30, x1, G + 26 + i * 30, { stroke: '#c08a4f', sw: 1.6 })).join('')
      )
    case 'carpet':
      return rect(x0, G, w, h, { fill: '#b8483f', gap: 9, sw: 2 }) + rect(x0, G + 20, w, 10, { fill: C.sun, hatch: false, stroke: false })
    default:
      return ''
  }
}

// ---------- city ----------
function windows(x, y, cols, rows, cw, ch, gx, gy, frame = '#f6efe2', glass = '#7fc4e8', extra = () => '') {
  let out = ''
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) {
      const wx = x + c * (cw + gx)
      const wy = y + r * (ch + gy)
      out += rect(wx, wy, cw, ch, { fill: glass, gap: 6, sw: 2, stroke: darken(frame, 0.5), wash: lighten(glass, 0.35) })
      out += line(wx, wy + ch, wx + cw, wy + ch, { stroke: frame, sw: 5 })
      out += extra(wx, wy, cw, ch, r, c)
    }
  return out
}

export function brickBuilding(x, w, h, { color = C.brick, tower = false, fireEscape = true, door = true } = {}) {
  const top = G - h
  let out = rect(x, top, w, h, { fill: color, gap: 8 })
  out += rect(x - 8, top - 14, w + 16, 18, { fill: darken(color, 0.15), hatch: false })
  const cols = Math.max(2, Math.floor((w - 40) / 70))
  const cw = 40
  const gx = (w - 40 - cols * cw) / Math.max(1, cols - 1)
  out += windows(x + 20, top + 30, cols, Math.floor((h - 150) / 95), cw, 58, gx, 37)
  if (fireEscape) {
    for (let y = top + 96; y < G - 140; y += 95) {
      out += lines([[x + w * 0.3, y], [x + w * 0.75, y]], { stroke: '#3a3f4a', sw: 3 })
      out += lines([[x + w * 0.32, y], [x + w * 0.42, y + 95 - 2]], { stroke: '#3a3f4a', sw: 2.4 })
    }
  }
  if (door) out += rect(x + w / 2 - 28, G - 92, 56, 92, { fill: '#5b3a2a', gap: 6 })
  if (tower) {
    const tx = x + w * 0.62
    out += lines([[tx, top - 14], [tx - 6, top - 70]], { stroke: '#6b4a32', sw: 3 }) + lines([[tx + 56, top - 14], [tx + 62, top - 70]], { stroke: '#6b4a32', sw: 3 })
    out += rect(tx - 10, top - 150, 76, 82, { fill: '#a87a52', gap: 6 })
    out += poly([[tx - 16, top - 150], [tx + 28, top - 196], [tx + 72, top - 150]], { fill: '#7d5537', gap: 6 })
  }
  return out
}

export function brownstone(x, w, h, { color = C.brown, doorColor = '#2f6f5f', flowers = true } = {}) {
  const top = G - h
  let out = rect(x, top, w, h, { fill: color, gap: 8 })
  out += rect(x - 10, top - 16, w + 20, 22, { fill: darken(color, 0.2), hatch: false })
  out += windows(x + 24, top + 34, 2, Math.floor((h - 190) / 100), 52, 70, w - 48 - 104, 30, '#efe6d6', '#8cc9ea', (wx, wy, cw, ch) =>
    flowers ? rect(wx - 4, wy + ch + 2, cw + 8, 12, { fill: '#7a4e33', hatch: false, sw: 2 }) + dot(wx + 10, wy + ch, 6, C.pink) + dot(wx + 26, wy + ch - 2, 6, C.sun) + dot(wx + 42, wy + ch, 6, C.coral) : '',
  )
  // stoop with railing
  const sx = x + w - 110
  for (let i = 0; i < 5; i++) out += rect(sx - i * 14, G - 18 - i * 18, 90 + i * 14, 18, { fill: darken(color, 0.08), hatch: false, sw: 2 })
  out += lines([[sx - 70, G], [sx + 4, G - 110]], { stroke: '#2b2f3a', sw: 3 })
  out += rect(sx + 22, G - 210, 52, 118, { fill: doorColor, gap: 6 })
  return out
}

export function tree(x, h = 300, { color = C.leaf, blossom = null, trunk = C.bark } = {}) {
  const top = G - h
  let out = path(`M${x - 12} ${G} C ${x - 8} ${G - h * 0.4}, ${x - 14} ${top + 90}, ${x - 4} ${top + 60} L ${x + 8} ${top + 60} C ${x + 14} ${top + 90}, ${x + 10} ${G - h * 0.4}, ${x + 14} ${G} Z`, { fill: trunk, gap: 5 })
  const blobs = [[0, 30, 210, 150], [-70, 70, 150, 120], [70, 70, 150, 120], [-30, 0, 140, 110], [40, 10, 140, 110]]
  for (const [dx, dy, bw, bh] of blobs) out += ellipse(x + dx, top + dy + 40, bw, bh, { fill: color, gap: 8, sw: 2.4 })
  if (blossom) out += speckle(x - 110, top - 10, 220, 150, 70, blossom, 5, Math.round(x))
  return out
}

export function lamp(x, h = 300, color = '#3a3f4a') {
  return line(x, G, x, G - h, { stroke: color, sw: 5 }) + curve([[x, G - h], [x + 18, G - h - 22], [x + 40, G - h - 8]], { stroke: color, sw: 4 }) + ellipse(x + 42, G - h + 2, 26, 18, { fill: C.yellow, sw: 2 })
}

export function hydrant(x) {
  return rect(x - 13, G - 52, 26, 52, { fill: C.coral, gap: 5, sw: 2 }) + ellipse(x, G - 54, 30, 18, { fill: C.coral, sw: 2 }) + rect(x - 20, G - 40, 40, 10, { fill: darken(C.coral, 0.2), hatch: false, sw: 2 })
}

export function signPost(x, h = 250, w = 220, color = C.teal) {
  return line(x, G, x, G - h + 20, { stroke: '#4a4f5a', sw: 6 }) + rect(x - w / 2, G - h - 34, w, 58, { fill: color, gap: 7, sw: 3 })
}

export function waterTower(x, y) {
  return rect(x, y - 70, 70, 76, { fill: '#a87a52', gap: 6 }) + poly([[x - 6, y - 70], [x + 35, y - 112], [x + 76, y - 70]], { fill: '#7d5537', gap: 6 })
}

// ---------- far city ----------
export function skyline(x0, x1, seed, color, minH = 120, maxH = 380) {
  let s = seed
  const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280)
  let out = ''
  let x = x0
  while (x < x1) {
    const w = 60 + rnd() * 90
    const h = minH + rnd() * (maxH - minH)
    out += rect(x, G - 40 - h, w, h + 40, { fill: color, gap: 12, sw: 1.8, stroke: darken(color, 0.15), hatch: lighten(color, 0.25) })
    for (let wy = G - 20 - h; wy < G - 70; wy += 34) for (let wx = x + 12; wx < x + w - 14; wx += 22) out += `<rect x="${wx.toFixed(0)}" y="${wy.toFixed(0)}" width="8" height="12" fill="${lighten(color, 0.45)}"/>`
    if (rnd() > 0.7) out += line(x + w / 2, G - 40 - h, x + w / 2, G - 100 - h, { stroke: darken(color, 0.2), sw: 2 })
    x += w + 6
  }
  return out
}

export function suspensionBridge(x, w, color = '#7f97b8') {
  const deck = G - 150
  const t1 = x + w * 0.22
  const t2 = x + w * 0.78
  let out = rect(x, deck, w, 16, { fill: color, gap: 8, sw: 2 })
  for (const t of [t1, t2]) out += rect(t - 16, deck - 270, 32, 286, { fill: color, gap: 7, sw: 2 }) + rect(t - 22, deck - 180, 44, 12, { fill: darken(color, 0.1), hatch: false, sw: 1.6 })
  out += curve([[x, deck - 40], [t1, deck - 270]], { stroke: darken(color, 0.25), sw: 3 })
  out += curve([[t1, deck - 268], [(t1 + t2) / 2, deck - 40], [t2, deck - 268]], { stroke: darken(color, 0.25), sw: 3 })
  out += curve([[t2, deck - 270], [x + w, deck - 40]], { stroke: darken(color, 0.25), sw: 3 })
  for (let i = 1; i < 12; i++) {
    const vx = t1 + ((t2 - t1) * i) / 12
    const k = Math.abs(i - 6) / 6
    out += line(vx, deck, vx, deck - 40 - 228 * k * k, { stroke: darken(color, 0.25), sw: 1.4 })
  }
  return out
}

export function river(x0, x1) {
  return rect(x0, G - 140, x1 - x0, 140, { fill: '#7cc3e6', gap: 10, sw: 1.6, stroke: '#5aa9d3' }) + speckle(x0, G - 130, x1 - x0, 120, Math.floor((x1 - x0) / 25), ['#ffffff', '#b9e3f6'], 18, x0)
}

// ---------- school and home doors (drawn in front of Lucy) ----------
export function schoolFacade(x, w, h, color, signColor) {
  const x0 = x - w / 2
  const top = G - h
  let out = rect(x0, top, w, h, { fill: color, gap: 8 })
  out += rect(x0 - 10, top - 16, w + 20, 22, { fill: darken(color, 0.2), hatch: false })
  const art = [
    (wx, wy) => circle(wx + 26, wy + 26, 24, { fill: C.yellow, sw: 2 }),
    (wx, wy) => curve([[wx + 6, wy + 50], [wx + 26, wy + 12], [wx + 48, wy + 50]], { stroke: C.coral, sw: 5 }) + curve([[wx + 12, wy + 50], [wx + 26, wy + 22], [wx + 42, wy + 50]], { stroke: C.yellow, sw: 5 }) + curve([[wx + 18, wy + 50], [wx + 26, wy + 32], [wx + 36, wy + 50]], { stroke: C.cyan, sw: 5 }),
    (wx, wy) => path(`M${wx + 27} ${wy + 48} C ${wx + 4} ${wy + 30}, ${wx + 10} ${wy + 8}, ${wx + 27} ${wy + 22} C ${wx + 44} ${wy + 8}, ${wx + 50} ${wy + 30}, ${wx + 27} ${wy + 48} Z`, { fill: C.pink, sw: 2 }),
    (wx, wy) => circle(wx + 27, wy + 28, 16, { fill: C.sun, sw: 2 }) + [0, 72, 144, 216, 288].map((a) => circle(wx + 27 + Math.cos((a * Math.PI) / 180) * 14, wy + 28 + Math.sin((a * Math.PI) / 180) * 14, 14, { fill: C.lav, sw: 1.6, hatch: false })).join(''),
    (wx, wy) => poly([[wx + 10, wy + 50], [wx + 27, wy + 12], [wx + 44, wy + 50]], { fill: C.weed, sw: 2 }) + rect(wx + 23, wy + 50, 8, 8, { fill: C.bark, hatch: false, sw: 1.4 }),
  ]
  let i = 0
  const cols = Math.floor((w - 60) / 90)
  const gx = (w - 60 - cols * 56) / (cols - 1)
  out += windows(x0 + 30, top + 40, cols, Math.floor((h - 190) / 100), 56, 64, gx, 36, '#f6efe2', '#a9d9f0', (wx, wy) => (i++ % 2 === 0 ? art[i % art.length](wx, wy) : ''))
  // the entrance
  out += rect(x - 70, G - 150, 140, 150, { fill: '#5b3a2a', gap: 6 })
  out += line(x, G - 150, x, G, { stroke: '#3a2418', sw: 3 })
  out += rect(x - 120, G - 210, 240, 44, { fill: signColor, gap: 6, sw: 3 })
  out += rect(x0, G - 18, w, 18, { fill: darken(color, 0.12), hatch: false, sw: 2 })
  return out
}

export function homeFacade(x, w, h, kind) {
  const x0 = x - w / 2
  return kind === 'brick'
    ? brickBuilding(x0, w, h, { tower: true, fireEscape: true, door: false }) + rect(x - 40, G - 120, 80, 120, { fill: C.coral, gap: 6 }) + rect(x - 60, G - 132, 120, 16, { fill: '#e8dccb', hatch: false, sw: 2 }) + circle(x + 24, G - 60, 8, { fill: C.yellow, sw: 1.4, hatch: false })
    : brownstone(x0, w, h, { color: '#9a6248', doorColor: C.coral })
}

export function airportFacade(x, w) {
  const x0 = x - w / 2
  let out = rect(x0, G - 360, w, 360, { fill: '#e8eef4', gap: 9, stroke: '#7a8796' })
  out += path(`M${x0 - 20} ${G - 360} Q ${x} ${G - 470} ${x0 + w + 20} ${G - 360} Z`, { fill: '#c9d6e3', gap: 9, stroke: '#7a8796' })
  out += windows(x0 + 24, G - 300, Math.floor((w - 48) / 76), 2, 64, 90, 12, 20, '#ffffff', '#7fc4e8')
  out += rect(x - 70, G - 130, 140, 130, { fill: '#9fd3ee', gap: 6, stroke: '#4d6b86' }) + line(x, G - 130, x, G, { stroke: '#4d6b86', sw: 3 })
  out += rect(x - 130, G - 190, 260, 44, { fill: C.cyan, gap: 6, sw: 3 })
  return out
}

export function campGate(x, w) {
  const x0 = x - w / 2
  const post = (px) => rect(px - 24, G - 470, 48, 470, { fill: '#9b6a42', gap: 6 })
  let out = post(x0 + 24) + post(x0 + w - 24)
  out += rect(x0 - 20, G - 520, w + 40, 80, { fill: '#b07d4f', gap: 7, sw: 3 })
  out += poly([[x0 - 34, G - 520], [x, G - 600], [x0 + w + 34, G - 520]], { fill: '#2f7d55', gap: 7 })
  // a wooden fence on either side hides whoever is walking through
  for (let px = x0 + 50; px < x0 + w - 40; px += 44) out += rect(px, G - 300, 36, 300, { fill: '#c49264', gap: 6, sw: 2 })
  out += rect(x0 + 40, G - 250, w - 80, 22, { fill: '#9b6a42', hatch: false, sw: 2 }) + rect(x0 + 40, G - 120, w - 80, 22, { fill: '#9b6a42', hatch: false, sw: 2 })
  out += line(x0 + 70, G - 440, x0 + w - 70, G - 440, { stroke: C.ink, sw: 2 })
  out += pennants(x0 + 70, G - 440, w - 140, [C.cyan, C.yellow])
  return out
}

export function shulDoors(x, w) {
  const x0 = x - w / 2
  let out = rect(x0, G - 520, w, 520, { fill: '#efe3c8', gap: 9, stroke: '#a68f62' })
  out += path(`M${x - 110} ${G} L ${x - 110} ${G - 230} Q ${x} ${G - 360} ${x + 110} ${G - 230} L ${x + 110} ${G} Z`, { fill: '#8a5a3a', gap: 6 })
  out += line(x, G - 290, x, G, { stroke: '#5b3a24', sw: 3 })
  out += circle(x - 22, G - 120, 12, { fill: C.sun, hatch: false, sw: 1.6 }) + circle(x + 22, G - 120, 12, { fill: C.sun, hatch: false, sw: 1.6 })
  out += star(x, G - 430, 56, C.cyan)
  for (const dx of [-170, 170]) out += path(`M${x + dx - 34} ${G - 170} L ${x + dx - 34} ${G - 360} Q ${x + dx} ${G - 410} ${x + dx + 34} ${G - 360} L ${x + dx + 34} ${G - 170} Z`, { fill: '#9fd3ee', gap: 6, stroke: '#a68f62' })
  return out
}

export function star(cx, cy, r, color) {
  const tri = (rot) => [0, 1, 2].map((i) => [cx + r * Math.cos(rot + (i * 2 * Math.PI) / 3), cy + r * Math.sin(rot + (i * 2 * Math.PI) / 3)])
  return poly(tri(-Math.PI / 2), { stroke: color, sw: 5, fill: undefined }) + poly(tri(Math.PI / 2), { stroke: color, sw: 5, fill: undefined })
}

export function pennants(x, y, w, colors) {
  let out = ''
  const n = Math.floor(w / 40)
  for (let i = 0; i < n; i++) {
    const px = x + i * 40 + 4
    out += poly([[px, y], [px + 32, y], [px + 16, y + 38]], { fill: colors[i % colors.length], gap: 5, sw: 1.8 })
  }
  return out
}

// ---------- park ----------
export function swingFrame(x) {
  const top = G - 470
  const legs = [-300, 300]
  let out = ''
  for (const lx of legs) out += lines([[x + lx - 50, G], [x + lx, top], [x + lx + 50, G]], { stroke: '#d04a3d', sw: 9 })
  out += line(x - 312, top + 4, x + 312, top + 4, { stroke: '#d04a3d', sw: 11 })
  return out
}

export function slide(x) {
  let out = lines([[x, G], [x, G - 260]], { stroke: C.cyan, sw: 7 }) + lines([[x + 40, G], [x + 40, G - 260]], { stroke: C.cyan, sw: 7 })
  for (let y = G - 40; y > G - 260; y -= 44) out += line(x, y, x + 40, y, { stroke: C.cyan, sw: 5 })
  out += rect(x - 10, G - 268, 70, 14, { fill: C.cyan, hatch: false })
  out += path(`M${x + 60} ${G - 262} Q ${x + 170} ${G - 230} ${x + 230} ${G - 20} L ${x + 260} ${G - 20} Q ${x + 200} ${G - 250} ${x + 60} ${G - 284} Z`, { fill: C.yellow, gap: 6 })
  return out
}

export function easel(x) {
  // x is where the canvas sits; the painting itself is drawn live on top.
  return (
    lines([[x - 46, G], [x, G - 250], [x + 46, G]], { stroke: '#9b6a42', sw: 6 }) +
    line(x, G - 250, x + 6, G, { stroke: '#9b6a42', sw: 5 }) +
    rect(x - 54, G - 236, 108, 120, { fill: '#ffffff', hatch: false, stroke: '#9b6a42', sw: 3 }) +
    rect(x - 60, G - 118, 120, 10, { fill: '#9b6a42', hatch: false, sw: 2 })
  )
}

export function rinkBoards(x0, x1) {
  return (
    rect(x0, G - 110, x1 - x0, 110, { fill: '#ffffff', hatch: false, stroke: '#8cc8e4', sw: 3 }) +
    rect(x0, G - 110, x1 - x0, 14, { fill: C.cyan, hatch: false, sw: 2 }) +
    rect(x0, G - 30, x1 - x0, 10, { fill: C.coral, hatch: false, stroke: false })
  )
}

// ---------- travel landmarks ----------
export function eiffel(x) {
  const c = '#8a6a4f'
  const base = G
  let out = ''
  out += path(`M${x - 170} ${base} Q ${x - 60} ${base - 300} ${x - 20} ${base - 700} L ${x + 20} ${base - 700} Q ${x + 60} ${base - 300} ${x + 170} ${base} L ${x + 110} ${base} Q ${x} ${base - 170} ${x - 110} ${base} Z`, { fill: c, gap: 6, sw: 2.4 })
  out += rect(x - 120, base - 240, 240, 18, { fill: darken(c, 0.1), hatch: false, sw: 2 })
  out += rect(x - 62, base - 450, 124, 14, { fill: darken(c, 0.1), hatch: false, sw: 2 })
  out += line(x, base - 700, x, base - 790, { stroke: c, sw: 5 })
  for (let y = base - 220; y > base - 680; y -= 42) {
    const half = 20 + (170 - 20) * Math.pow((y - (base - 700)) / 700, 1.8)
    out += line(x - half * 0.8, y, x + half * 0.8, y - 30, { stroke: darken(c, 0.15), sw: 1.4 }) + line(x + half * 0.8, y, x - half * 0.8, y - 30, { stroke: darken(c, 0.15), sw: 1.4 })
  }
  return out
}

export function cafe(x, color = C.coral) {
  let out = rect(x, G - 330, 300, 330, { fill: '#f3e6cf', gap: 9 })
  out += poly([[x - 10, G - 330], [x + 30, G - 400], [x + 270, G - 400], [x + 310, G - 330]], { fill: '#5a7da6', gap: 7 })
  out += rect(x + 30, G - 300, 70, 80, { fill: '#9fd3ee', gap: 6 }) + rect(x + 200, G - 300, 70, 80, { fill: '#9fd3ee', gap: 6 })
  for (let i = 0; i < 6; i++) out += poly([[x + i * 50, G - 180], [x + i * 50 + 50, G - 180], [x + i * 50 + 50, G - 140], [x + i * 50, G - 140]], { fill: i % 2 ? '#ffffff' : color, gap: 6, sw: 2 })
  out += rect(x + 115, G - 130, 70, 130, { fill: '#2f6f5f', gap: 6 })
  out += ellipse(x + 40, G - 60, 70, 10, { fill: '#ffffff', hatch: false, sw: 2 }) + line(x + 40, G - 60, x + 40, G, { stroke: '#4a4f5a', sw: 3 })
  return out
}

export function bigBen(x) {
  const c = '#d9b46a'
  let out = rect(x - 70, G - 640, 140, 640, { fill: c, gap: 7 })
  for (let y = G - 600; y < G - 40; y += 60) out += rect(x - 46, y, 92, 34, { fill: '#9fc4dd', gap: 6, sw: 1.6 })
  out += rect(x - 84, G - 700, 168, 70, { fill: darken(c, 0.08), gap: 7 })
  out += circle(x, G - 666, 70, { fill: '#ffffff', hatch: false, sw: 3 }) + line(x, G - 666, x, G - 690, { stroke: '#2b2f3a', sw: 3 }) + line(x, G - 666, x + 18, G - 666, { stroke: '#2b2f3a', sw: 3 })
  out += poly([[x - 84, G - 700], [x, G - 840], [x + 84, G - 700]], { fill: '#3e6b5b', gap: 7 })
  return out
}

export function bus(x) {
  let out = rect(x, G - 320, 360, 290, { fill: '#d6332c', gap: 7 })
  out += rect(x + 20, G - 300, 320, 70, { fill: '#cfe8f5', gap: 8, sw: 2 }) + rect(x + 20, G - 190, 320, 70, { fill: '#cfe8f5', gap: 8, sw: 2 })
  for (const wx of [80, 160, 240]) out += line(x + wx, G - 300, x + wx, G - 230, { stroke: '#8a2420', sw: 2 }) + line(x + wx, G - 190, x + wx, G - 120, { stroke: '#8a2420', sw: 2 })
  out += circle(x + 70, G - 26, 56, { fill: '#2b2f3a', hatch: false }) + circle(x + 290, G - 26, 56, { fill: '#2b2f3a', hatch: false })
  return out
}

export function phoneBox(x) {
  return rect(x - 34, G - 230, 68, 230, { fill: '#d6332c', gap: 6 }) + rect(x - 24, G - 190, 48, 120, { fill: '#cfe8f5', gap: 6, sw: 2 }) + poly([[x - 40, G - 230], [x, G - 256], [x + 40, G - 230]], { fill: '#b52a24', gap: 5 })
}

export function brandenburg(x) {
  const c = '#e7d3a4'
  let out = rect(x - 330, G - 400, 660, 70, { fill: c, gap: 8 }) + rect(x - 300, G - 440, 600, 44, { fill: darken(c, 0.06), gap: 8 })
  for (let i = 0; i < 6; i++) out += rect(x - 300 + i * 112, G - 330, 40, 330, { fill: lighten(c, 0.1), gap: 6 })
  // the horses and chariot on top
  out += rect(x - 70, G - 480, 140, 40, { fill: '#5f8f78', gap: 6 })
  for (let i = 0; i < 4; i++) out += path(`M${x - 66 + i * 36} ${G - 480} q 10 -46 26 -40 q 6 10 -4 18 l 0 22 z`, { fill: '#5f8f78', gap: 5, sw: 1.8 })
  return out
}

export function tvTower(x, color) {
  return line(x, G - 40, x, G - 560, { stroke: color, sw: 12 }) + circle(x, G - 470, 70, { fill: color, gap: 7, sw: 2 }) + line(x, G - 560, x, G - 650, { stroke: darken(color, 0.2), sw: 4 })
}

export function cityWall(x0, x1, gateX) {
  const c = '#ead6a7'
  let out = rect(x0, G - 320, x1 - x0, 320, { fill: c, gap: 9 })
  for (let x = x0; x < x1 - 20; x += 56) out += rect(x, G - 352, 32, 34, { fill: c, gap: 6, sw: 2 })
  for (let y = G - 290; y < G - 20; y += 46) for (let x = x0 + ((y / 46) % 2 ? 0 : 30); x < x1 - 40; x += 70) out += line(x, y, x + 40, y, { stroke: darken(c, 0.18), sw: 1.4 })
  out += path(`M${gateX - 70} ${G} L ${gateX - 70} ${G - 150} Q ${gateX} ${G - 240} ${gateX + 70} ${G - 150} L ${gateX + 70} ${G} Z`, { fill: '#5b4632', gap: 6 })
  out += rect(gateX - 130, G - 470, 260, 160, { fill: darken(c, 0.04), gap: 8 })
  for (let x = gateX - 130; x < gateX + 120; x += 52) out += rect(x, G - 500, 30, 32, { fill: c, gap: 6, sw: 2 })
  return out
}

export function palm(x, h = 420) {
  let out = path(`M${x - 14} ${G} C ${x - 4} ${G - h * 0.5}, ${x + 20} ${G - h * 0.8}, ${x + 30} ${G - h} L ${x + 46} ${G - h + 6} C ${x + 34} ${G - h * 0.8}, ${x + 14} ${G - h * 0.5}, ${x + 14} ${G} Z`, { fill: '#b08155', gap: 5 })
  const tx = x + 38
  const ty = G - h
  for (const [dx, dy] of [[-150, 40], [-120, -50], [0, -110], [130, -60], [160, 40], [60, 70], [-60, 80]]) out += path(`M${tx} ${ty} Q ${tx + dx * 0.5} ${ty + dy * 0.5 - 50} ${tx + dx} ${ty + dy} Q ${tx + dx * 0.55} ${ty + dy * 0.5 - 18} ${tx} ${ty + 8} Z`, { fill: C.weed, gap: 6, sw: 2 })
  return out
}

export function camel(x) {
  const c = '#d6a466'
  let out = ellipse(x, G - 150, 190, 90, { fill: c, gap: 6 }) + ellipse(x - 20, G - 196, 70, 60, { fill: c, gap: 6 })
  out += path(`M${x + 80} ${G - 170} Q ${x + 120} ${G - 220} ${x + 120} ${G - 270} L ${x + 150} ${G - 272} Q ${x + 168} ${G - 262} ${x + 152} ${G - 246} Q ${x + 146} ${G - 200} ${x + 100} ${G - 140} Z`, { fill: c, gap: 6 })
  for (const lx of [-60, -30, 40, 70]) out += line(x + lx, G - 120, x + lx + (lx % 20 ? 4 : -4), G, { stroke: darken(c, 0.25), sw: 7 })
  out += dot(x + 146, G - 260, 4, '#2b2f3a')
  return out
}

export function torii(x, h = 420, color = '#e8552d') {
  let out = rect(x - 130, G - h, 30, h, { fill: color, gap: 6 }) + rect(x + 100, G - h, 30, h, { fill: color, gap: 6 })
  out += path(`M${x - 190} ${G - h - 30} Q ${x} ${G - h - 4} ${x + 190} ${G - h - 30} L ${x + 180} ${G - h + 6} Q ${x} ${G - h + 26} ${x - 180} ${G - h + 6} Z`, { fill: '#2b2f3a', gap: 6 })
  out += rect(x - 160, G - h + 40, 320, 24, { fill: color, gap: 6 })
  out += rect(x - 130, G - 26, 30, 26, { fill: '#2b2f3a', hatch: false }) + rect(x + 100, G - 26, 30, 26, { fill: '#2b2f3a', hatch: false })
  return out
}

export function mountain(x, w, h, color, snow = false) {
  let out = poly([[x - w / 2, G], [x, G - h], [x + w / 2, G]], { fill: color, gap: 10, sw: 2 })
  if (snow) out += poly([[x - w * 0.12, G - h * 0.76], [x, G - h], [x + w * 0.12, G - h * 0.76], [x + w * 0.05, G - h * 0.7], [x - w * 0.02, G - h * 0.78], [x - w * 0.07, G - h * 0.7]], { fill: '#ffffff', gap: 8, sw: 2, stroke: '#9fb4c8' })
  return out
}

export function volcano(x, w, h, color) {
  return poly([[x - w / 2, G], [x - w * 0.06, G - h], [x + w * 0.06, G - h], [x + w / 2, G]], { fill: color, gap: 10, sw: 2 }) + ellipse(x - 10, G - h - 50, 120, 70, { fill: '#e9eef2', hatch: false, sw: 1.6, stroke: '#c5cfd8' }) + ellipse(x + 40, G - h - 110, 90, 60, { fill: '#e9eef2', hatch: false, sw: 1.6, stroke: '#c5cfd8' })
}

export function jungle(x, n, seed) {
  let s = seed
  const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280)
  let out = ''
  for (let i = 0; i < n; i++) {
    const lx = x + i * 70 + rnd() * 30
    const h = 120 + rnd() * 140
    const col = [C.weed, '#2f8f5b', '#5cbf74'][i % 3]
    out += path(`M${lx} ${G} Q ${lx - 50} ${G - h * 0.6} ${lx - 10} ${G - h} Q ${lx + 40} ${G - h * 0.6} ${lx} ${G} Z`, { fill: col, gap: 6, sw: 2 })
  }
  return out
}

export function toucan(x, y) {
  return ellipse(x, y, 60, 74, { fill: '#2b2f3a', gap: 6, sw: 2 }) + ellipse(x + 4, y - 6, 34, 40, { fill: C.yellow, hatch: false, sw: 1.6 }) + path(`M${x + 16} ${y - 26} Q ${x + 80} ${y - 34} ${x + 92} ${y - 6} Q ${x + 60} ${y - 6} ${x + 16} ${y - 8} Z`, { fill: C.sun, gap: 5, sw: 2 }) + dot(x + 10, y - 22, 4, '#2b2f3a')
}

export function sloth(x, y) {
  const c = '#a98a6c'
  return line(x - 160, y - 70, x + 160, y - 60, { stroke: C.bark, sw: 10 }) + ellipse(x, y, 110, 70, { fill: c, gap: 6 }) + line(x - 34, y - 20, x - 40, y - 64, { stroke: darken(c, 0.2), sw: 8 }) + line(x + 30, y - 20, x + 36, y - 64, { stroke: darken(c, 0.2), sw: 8 }) + circle(x + 50, y + 4, 46, { fill: lighten(c, 0.3), sw: 2 }) + dot(x + 42, y, 4, '#2b2f3a') + dot(x + 60, y, 4, '#2b2f3a') + curve([[x + 42, y + 12], [x + 51, y + 18], [x + 60, y + 12]], { stroke: '#2b2f3a', sw: 2 })
}

export function umbrella(x) {
  return line(x, G, x - 20, G - 250, { stroke: '#6b4a32', sw: 5 }) + path(`M${x - 150} ${G - 230} Q ${x - 20} ${G - 340} ${x + 110} ${G - 250} Z`, { fill: C.coral, gap: 6 }) + path(`M${x - 80} ${G - 250} Q ${x - 30} ${G - 320} ${x + 20} ${G - 258} Z`, { fill: '#ffffff', hatch: false, sw: 1.6 })
}

export function ocean(x0, x1, level) {
  // the sea in the distance, behind the beach
  return rect(x0, level, x1 - x0, G - level, { fill: '#56b8e6', gap: 10, sw: 1.8, stroke: '#3a9fd2' }) + speckle(x0, level + 10, x1 - x0, G - level - 20, Math.floor((x1 - x0) / 20), ['#ffffff', '#a9dcf4'], 16, x0)
}

// ---------- camp ----------
export function pine(x, h = 380, color = '#2f7d55') {
  let out = rect(x - 10, G - 60, 20, 60, { fill: C.bark, hatch: false, sw: 2 })
  for (let i = 0; i < 3; i++) {
    const w = 190 - i * 44
    const y = G - 50 - i * (h * 0.25)
    out += poly([[x - w / 2, y], [x, y - h * 0.42], [x + w / 2, y]], { fill: color, gap: 7, sw: 2 })
  }
  return out
}

export function cabin(x, w = 300) {
  let out = rect(x, G - 220, w, 220, { fill: '#f4f1e8', gap: 10, stroke: '#9a9486' })
  out += poly([[x - 20, G - 220], [x + w / 2, G - 320], [x + w + 20, G - 220]], { fill: '#3e6b5b', gap: 7 })
  out += rect(x + 30, G - 170, 70, 60, { fill: '#9fd3ee', gap: 6 }) + rect(x + w - 100, G - 170, 70, 60, { fill: '#9fd3ee', gap: 6 })
  out += rect(x + w / 2 - 30, G - 120, 60, 120, { fill: '#2f6f5f', gap: 6 })
  return out
}

export function flagPole(x, color) {
  return line(x, G, x, G - 420, { stroke: '#6b6f7a', sw: 6 }) + path(`M${x} ${G - 418} Q ${x + 60} ${G - 432} ${x + 120} ${G - 410} L ${x + 120} ${G - 336} Q ${x + 60} ${G - 358} ${x} ${G - 344} Z`, { fill: color, gap: 6 })
}

export function mudPit(x0, x1) {
  return path(`M${x0} ${G + 4} Q ${(x0 + x1) / 2} ${G - 18} ${x1} ${G + 4} L ${x1 - 20} ${G + 60} Q ${(x0 + x1) / 2} ${G + 80} ${x0 + 20} ${G + 60} Z`, { fill: '#7b5233', gap: 6, stroke: '#4d331f' }) + speckle(x0 + 20, G - 6, x1 - x0 - 40, 50, 30, ['#5c3c24', '#9c6b43'], 10, x0)
}

// ---------- middle school gym ----------
export function gymWall(x0, x1) {
  let out = rect(x0, 0, x1 - x0, G, { fill: '#f6efe0', gap: 14, stroke: '#cbbb9c', hatch: '#efe4cc' })
  for (let x = x0 + 60; x < x1 - 120; x += 260) out += rect(x, 120, 160, 120, { fill: '#a9d9f0', gap: 7, sw: 2 })
  out += rect(x0, G - 140, x1 - x0, 140, { fill: '#e8d9ba', gap: 12, sw: 2 })
  return out
}

export function hoop(x) {
  return rect(x - 80, 300, 160, 110, { fill: '#ffffff', hatch: false, stroke: '#9a9486', sw: 3 }) + rect(x - 30, 350, 60, 40, { fill: undefined, stroke: C.coral, sw: 3 }) + ellipse(x, 420, 70, 16, { stroke: C.sun, sw: 4 }) + lines([[x - 32, 420], [x - 20, 470], [x + 20, 470], [x + 32, 420]], { stroke: '#cccccc', sw: 2 })
}

export function stageLights(x0, x1) {
  let out = line(x0, 40, x1, 40, { stroke: '#3a3f4a', sw: 6 })
  const colors = [C.pink, C.cyan, C.yellow, C.lav, C.coral]
  for (let i = 0, x = x0 + 60; x < x1 - 40; x += 160, i++) out += rect(x - 18, 40, 36, 40, { fill: '#3a3f4a', hatch: false }) + `<path d="M${x - 16} 80 L ${x - 120} ${G} L ${x + 120} ${G} L ${x + 16} 80 Z" fill="${colors[i % colors.length]}" opacity="0.12"/>`
  return out
}

// ---------- synagogue ----------
export function shulInterior(x0, x1) {
  let out = rect(x0, 0, x1 - x0, G, { fill: '#fbf1dc', gap: 14, stroke: '#d8c49a', hatch: '#f3e4c2' })
  const glass = [C.cyan, C.sun, C.lav, C.coral, C.weed]
  for (let x = x0 + 120, i = 0; x < x1 - 200; x += 330, i++) {
    out += path(`M${x} 560 L ${x} 220 Q ${x + 70} 120 ${x + 140} 220 L ${x + 140} 560 Z`, { fill: '#cfe8f5', gap: 8, stroke: '#a68f62' })
    for (let k = 0; k < 4; k++) out += rect(x + 12 + (k % 2) * 62, 250 + Math.floor(k / 2) * 150, 54, 130, { fill: glass[(i + k) % glass.length], gap: 6, sw: 1.6 })
  }
  return out
}

export function pews(x0, x1) {
  let out = ''
  for (let x = x0; x < x1; x += 190) out += rect(x, G - 150, 160, 40, { fill: '#9b6a42', gap: 6 }) + rect(x, G - 110, 20, 110, { fill: '#8a5a3a', hatch: false }) + rect(x + 140, G - 110, 20, 110, { fill: '#8a5a3a', hatch: false }) + rect(x - 6, G - 76, 172, 18, { fill: '#9b6a42', hatch: false })
  return out
}

export function bimah(x0, x1, top) {
  return rect(x0, top, x1 - x0, G - top, { fill: '#b07d4f', gap: 8 }) + rect(x0, top, x1 - x0, 14, { fill: '#8a5a3a', hatch: false })
}

export function stairs(x0, run, rise, count) {
  let out = ''
  for (let i = 0; i < count; i++) out += rect(x0 + i * run, G - (i + 1) * rise, (count - i) * run + 20, rise, { fill: '#c08d5c', gap: 7, sw: 2 })
  return out
}

export function ark(x, top) {
  let out = rect(x - 150, top - 460, 300, 460, { fill: '#8a5a3a', gap: 7 })
  out += rect(x - 120, top - 400, 240, 380, { fill: '#2b4b9b', gap: 6 })
  out += star(x, top - 230, 50, C.sun)
  out += path(`M${x - 80} ${top - 470} L ${x - 80} ${top - 560} Q ${x - 40} ${top - 600} ${x} ${top - 560} L ${x} ${top - 470} Z`, { fill: '#f3e6cf', gap: 6, sw: 2 }) + path(`M${x} ${top - 470} L ${x} ${top - 560} Q ${x + 40} ${top - 600} ${x + 80} ${top - 560} L ${x + 80} ${top - 470} Z`, { fill: '#f3e6cf', gap: 6, sw: 2 })
  return out
}

export function eternalLight(x, y) {
  return line(x, 0, x, y - 30, { stroke: '#a68f62', sw: 3 }) + path(`M${x - 26} ${y - 30} L ${x + 26} ${y - 30} L ${x + 12} ${y + 10} L ${x - 12} ${y + 10} Z`, { fill: C.sun, gap: 5, sw: 2 }) + `<circle cx="${x}" cy="${y + 4}" r="40" fill="${C.yellow}" opacity="0.25"/>`
}

export function readingTable(x, top) {
  return poly([[x - 100, top - 170], [x + 100, top - 150], [x + 80, top], [x - 80, top]], { fill: '#9b6a42', gap: 6 }) + rect(x - 110, top - 186, 220, 22, { fill: '#2b4b9b', gap: 6, sw: 2 })
}

export function torah(x, y) {
  return rect(x - 46, y - 30, 92, 34, { fill: '#fff6e0', hatch: false, sw: 2 }) + rect(x - 60, y - 40, 18, 54, { fill: '#8a5a3a', hatch: false, sw: 2 }) + rect(x + 42, y - 40, 18, 54, { fill: '#8a5a3a', hatch: false, sw: 2 })
}

export { mix, darken, lighten, g }
