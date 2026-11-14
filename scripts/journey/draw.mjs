// Drawing helpers for the journey art: smooth cartoon shapes with bold outlines and soft shading.

// ---------- color ----------
const toRgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16))
const toHex = (rgb) => '#' + rgb.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('')
export const mix = (a, b, t) => {
  const A = toRgb(a)
  const B = toRgb(b)
  return toHex(A.map((v, i) => v + (B[i] - v) * t))
}
export const darken = (c, t = 0.3) => mix(c, '#1b2340', t)
export const lighten = (c, t = 0.4) => mix(c, '#ffffff', t)

export const C = {
  ink: '#003b9d',
  cyan: '#1f9fe0',
  coral: '#fc564b',
  pink: '#f0517e',
  teal: '#0a8067',
  mint: '#4bb5b2',
  weed: '#44a784',
  lav: '#8f83d9',
  sun: '#fa8f0d',
  yellow: '#ffd23f',
  gold: '#f2b51c',
  pearl: '#f7ecd9',
  sand: '#f4dfb8',
  brick: '#c8634a',
  brown: '#8a5a44',
  bark: '#7a4e33',
  leaf: '#4caf63',
  grass: '#8fd17c',
  stone: '#d8cdb8',
  gray: '#b8c3cf',
  sidewalk: '#dfe3e8',
  street: '#9aa6b3',
  white: '#ffffff',
  skin: '#f6d2b8',
  hair: '#4a2a1c',
  night: '#2b3a67',
}

// ---------- the pixel style ----------
// Everything is drawn in world units and later shrunk so 1 pixel = PX units, with no
// smoothing, like an 8-bit game. Outlines are exactly one pixel wide and fills are flat.
export const PX = 8

// Clean shapes with a bold outline in a darker shade of the fill, and a soft
// light-to-dark gradient on anything big enough to notice it, like a video game.
const gradients = new Map()
function shadeFill(c) {
  if (!gradients.has(c)) gradients.set(c, `g${gradients.size}`)
  return `url(#${gradients.get(c)})`
}
export function defs() {
  return [...gradients].map(([c, id]) => `<linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${lighten(c, 0.22)}"/><stop offset="1" stop-color="${darken(c, 0.06)}"/></linearGradient>`).join('')
}

const n = (v) => Math.round(v * 10) / 10

// Catmull-Rom through the points, as smooth bezier curves.
function smoothPath(pts, closed = false) {
  if (pts.length < 3) return `M${pts.map((p) => p.map(n).join(' ')).join(' L ')}`
  const P = closed ? [pts[pts.length - 1], ...pts, pts[0], pts[1]] : [pts[0], ...pts, pts[pts.length - 1]]
  let d = `M${n(P[1][0])} ${n(P[1][1])}`
  for (let i = 1; i < P.length - 2; i++) {
    const [p0, p1, p2, p3] = [P[i - 1], P[i], P[i + 1], P[i + 2]]
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6]
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6]
    d += ` C ${n(c1[0])} ${n(c1[1])}, ${n(c2[0])} ${n(c2[1])}, ${n(p2[0])} ${n(p2[1])}`
  }
  return closed ? d + ' Z' : d
}

// opts: fill, stroke (false for none), sw (outline width), rx (corner radius), shade (false for flat)
export function style(kind, args, opts = {}) {
  const fill = opts.fill ? opts.fill : null
  let geom
  let area = 0
  switch (kind) {
    case 'rectangle': {
      const [x, y, w, h] = args
      const rx = opts.rx ?? 0
      geom = `<rect x="${n(x)}" y="${n(y)}" width="${n(w)}" height="${n(h)}"${rx ? ` rx="${n(rx)}"` : ''}`
      area = Math.abs(w * h)
      break
    }
    case 'ellipse': {
      const [cx, cy, w, h] = args
      geom = `<ellipse cx="${n(cx)}" cy="${n(cy)}" rx="${n(w / 2)}" ry="${n(h / 2)}"`
      area = w * h * 0.78
      break
    }
    case 'circle': {
      const [cx, cy, d] = args
      geom = `<circle cx="${n(cx)}" cy="${n(cy)}" r="${n(d / 2)}"`
      area = d * d * 0.78
      break
    }
    case 'polygon': {
      const pts = args[0]
      geom = `<path d="M${pts.map((p) => p.map(n).join(' ')).join(' L ')} Z"`
      const xs = pts.map((p) => p[0])
      const ys = pts.map((p) => p[1])
      area = (Math.max(...xs) - Math.min(...xs)) * (Math.max(...ys) - Math.min(...ys)) * 0.5
      break
    }
    case 'path':
      geom = `<path d="${args[0]}"`
      area = 5000
      break
    case 'line':
      geom = `<path d="M${n(args[0])} ${n(args[1])} L ${n(args[2])} ${n(args[3])}"`
      break
    case 'linearPath':
      geom = `<path d="M${args[0].map((p) => p.map(n).join(' ')).join(' L ')}"`
      break
    case 'curve':
      geom = `<path d="${smoothPath(args[0])}"`
      break
  }
  const fillAttr = fill || 'none'
  const stroke = opts.stroke === false ? 'none' : opts.stroke || (fill ? darken(fill, 0.5) : '#2a2d4a')
  const sw = opts.stroke === false ? 0 : (opts.sw ?? 3) > 6 ? PX * 2 : PX
  return `${geom} fill="${fillAttr}"${stroke !== 'none' ? ` stroke="${stroke}" stroke-width="${n(sw)}"` : ''}${opts.opacity ? ` opacity="${opts.opacity}"` : ''}/>`
}

export const rect = (x, y, w, h, o) => style('rectangle', [x, y, w, h], o)
export const ellipse = (cx, cy, w, h, o) => style('ellipse', [cx, cy, w, h], o)
export const circle = (cx, cy, d, o) => style('circle', [cx, cy, d], o)
export const poly = (pts, o) => style('polygon', [pts], o)
export const path = (d, o) => style('path', [d], o)
export const line = (x1, y1, x2, y2, o = {}) => style('line', [x1, y1, x2, y2], { ...o, fill: undefined })
export const lines = (pts, o = {}) => style('linearPath', [pts], { ...o, fill: undefined })
export const curve = (pts, o = {}) => style('curve', [pts], { ...o, fill: undefined })

// Plain SVG for tiny details where a sketchy outline would just be noise.
export const dot = (cx, cy, r, fill, extra = '') => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}"${extra}/>`
export const g = (inner, transform) => (transform ? `<g transform="${transform}">${inner}</g>` : `<g>${inner}</g>`)

// A scatter of little colored pencil marks, for grass, gravel, sparkle and so on.
export function speckle(x, y, w, h, n, colors, len = 7, seed = 1) {
  let s = seed * 9301 + 49297
  const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280)
  let out = ''
  for (let i = 0; i < n; i++) {
    const px = x + rnd() * w
    const py = y + rnd() * h
    const a = -1.2 + rnd() * 0.8
    const c = colors[Math.floor(rnd() * colors.length)]
    out += `<path d="M${px.toFixed(1)} ${py.toFixed(1)} l${(Math.cos(a) * len).toFixed(1)} ${(Math.sin(a) * len).toFixed(1)}" stroke="${c}" stroke-width="${PX}" stroke-linecap="square"/>`
  }
  return out
}

export function svgDoc(x, w, h, inner) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x} 0 ${w} ${h}" width="${w / PX}" height="${h / PX}" shape-rendering="crispEdges" stroke-linecap="square" stroke-linejoin="miter">${inner}</svg>`
}
