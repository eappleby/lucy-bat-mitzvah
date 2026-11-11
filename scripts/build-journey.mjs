// Draws the 8-bit scenery and sprites for "How I got here" (src/components/journey/).
//
//   node scripts/build-journey.mjs
//
// The scenery is drawn as shapes in world units, then shrunk into small pixel images
// (1 pixel = 8 world units, no smoothing) in public/journey/. The sprites come from
// scripts/journey/sprites.mjs. Positions go to src/components/journey/art.json.
// Needs Playwright with Chromium (npm i -D playwright && npx playwright install chromium).
// Run it again after changing anything in scripts/journey/ or src/components/journey/world.js.

import { mkdir, writeFile, readdir, unlink } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { doors, easels, GROUND as G, WORLD_H, steps } from '../src/components/journey/world.js'
import { C, mix, darken, lighten, rect, ellipse, circle, poly, path, line, curve, speckle, svgDoc, PX } from './journey/draw.mjs'
import * as S from './journey/scenery.mjs'
import { buildSprites, sheetPixels } from './journey/sprites.mjs'

const TILE = 1200
const NEAR_FROM = -1200
const NEAR_TO = 19200
const PARALLAX = 0.45

// Far things are placed by the world x they should line up with.
const far = (anchor) => anchor * PARALLAX + 420

const near = []
const farItems = []
const labels = []
const add = (list, x0, x1, svg) => list.push({ x0, x1, svg })
const N = (x0, x1, svg) => add(near, x0, x1, svg)
// Far scenery belongs to one stretch of the trip and fades out once Lucy leaves it,
// so a slow moving landmark never drifts into the next country.
let farChapter = null
const farChapters = {}
const chapter = (id, from, to) => {
  farChapter = id
  farChapters[id] = { from, to }
}
const F = (x0, x1, svg) => farItems.push({ x0, x1, svg, ch: farChapter })
const label = (x, y, text, size = 34, color = '#ffffff') => labels.push({ x, y, text, size, color })

const fade = (c, t = 0.45) => mix(c, '#cfe6f5', t)

// ---------- Williamsburg ----------
chapter('wburg', -1400, 1750)
F(far(-1400), far(1900), S.river(far(-1400), far(1900)))
F(far(-1300), far(400), S.skyline(far(-1300), far(400), 11, fade('#8aa0c2', 0.35), 150, 360))
F(far(-200), far(-200) + 520, S.suspensionBridge(far(-200), 520, fade('#9a7fb5', 0.25)))
F(far(800), far(1900), S.skyline(far(800), far(1900), 23, fade('#8aa0c2', 0.35), 120, 300))

N(-1200, 1760, S.ground(-1200, 1760, 'sidewalk'))
N(-1150, -830, S.brickBuilding(-1150, 320, 480, { tower: true }))
N(-800, -470, S.brickBuilding(-800, 300, 410, { color: '#b85a45' }))
N(-420, -400, S.hydrant(-410))
N(-330, -110, S.tree(-220, 290))
N(-20, 140, S.signPost(60, 270, 220, C.teal))
label(60, G - 275, 'Bedford Ave', 30)
N(220, 560, S.brickBuilding(220, 340, 520, { color: '#c06a50', tower: true }))
N(640, 700, S.lamp(650))
N(760, 1060, S.brickBuilding(760, 300, 440, { color: '#a9533f', tower: true }))
N(1060, 1260, S.tree(1150, 300))

// ---------- Park Slope ----------
chapter('slope', 1750, 5000)
F(far(1700), far(4300), S.skyline(far(1700), far(4300), 37, fade('#8aa0c2', 0.5), 90, 220))
for (let a = 1800; a < 5200; a += 260) F(far(a) - 120, far(a) + 120, S.tree(far(a), 230 + ((a / 260) % 3) * 30, { color: fade(C.leaf, 0.35), trunk: fade(C.bark, 0.35) }))
F(far(2700) - 200, far(2700) + 200, rect(far(2700) - 170, G - 330, 340, 330, { fill: fade('#d8c9a6', 0.3), gap: 9 }) + path(`M${far(2700) - 80} ${G} L ${far(2700) - 80} ${G - 150} Q ${far(2700)} ${G - 260} ${far(2700) + 80} ${G - 150} L ${far(2700) + 80} ${G} Z`, { fill: fade('#9fb8cf', 0.2), gap: 8 }))

N(1760, 5300, S.ground(1760, 5300, 'sidewalk'))
N(1700, 1900, S.tree(1800, 320))
N(1870, 2190, S.brownstone(1880, 300, 460))
N(2180, 2500, S.brownstone(2190, 300, 490, { color: '#97604a' }))
N(2450, 2670, S.tree(2560, 330))
N(2630, 2690, S.lamp(2640))
N(2700, 3010, S.brownstone(2710, 300, 470, { color: '#8f5c46', doorColor: '#2b4b9b' }))
N(2990, 3030, S.hydrant(3010))
N(3500, 3720, S.tree(3610, 320))
N(3700, 4020, S.brownstone(3710, 300, 460, { doorColor: C.coral }))
N(4010, 4330, S.brownstone(4020, 300, 490, { color: '#9a6248', doorColor: '#2f6f5f' }))
N(4330, 4560, S.tree(4440, 340, { color: '#f0a33c' }))
N(4500, 4560, S.lamp(4520))

// ---------- the park with friends ----------
chapter('park', 5000, 7700)
F(far(5200), far(7800), path(`M${far(5200)} ${G} Q ${far(5800)} ${G - 260} ${far(6600)} ${G - 120} Q ${far(7200)} ${G - 40} ${far(7800)} ${G - 200} L ${far(7800)} ${G} Z`, { fill: fade(C.grass, 0.25), gap: 12 }))
for (let a = 5300; a < 7700; a += 330) F(far(a) - 120, far(a) + 120, S.tree(far(a), 200 + ((a / 330) % 2) * 50, { color: fade('#3f9d5a', 0.35), trunk: fade(C.bark, 0.4) }))

N(5300, 7020, S.ground(5300, 7020, 'path'))
N(7020, 7480, S.ground(7020, 7480, 'ice'))
N(7480, 8000, S.ground(7480, 8000, 'sidewalk'))
N(5170, 5440, S.slide(5180))
N(5400, 6200, S.swingFrame(5800))
N(6180, 6420, S.tree(6300, 330))
for (const ex of Object.values(easels)) N(ex - 60, ex + 60, S.easel(ex))
N(7020, 7480, S.rinkBoards(7020, 7480))
N(7050, 7250, S.signPost(7150, 300, 200, C.cyan))
label(7150, G - 305, 'Ice rink', 30)

// ---------- Paris ----------
chapter('paris', 7800, 8750)
F(far(7900), far(8800), S.skyline(far(7900), far(8800), 51, fade('#e3d2b5', 0.2), 120, 240))
N(8000, 8760, S.ground(8000, 8760, 'cobble'))
N(7990, 8320, S.cafe(8000))
label(8150, G - 205, 'Café', 30, '#2b2f3a')
N(8270, 8630, S.eiffel(8460))
N(8680, 8740, S.lamp(8690, 300, '#2f4f3f'))

// ---------- London ----------
chapter('london', 8750, 9550)
F(far(8700), far(9600), S.skyline(far(8700), far(9600), 61, fade('#aab3c0', 0.3), 130, 260))
F(far(9000) - 160, far(9000) + 160, circle(far(9000), G - 260, 300, { stroke: fade('#7f8ea3', 0.2), sw: 5 }) + line(far(9000), G - 260, far(9000) - 70, G, { stroke: fade('#7f8ea3', 0.2), sw: 5 }) + line(far(9000), G - 260, far(9000) + 70, G, { stroke: fade('#7f8ea3', 0.2), sw: 5 }))
N(8760, 9560, S.ground(8760, 9560, 'sidewalk'))
N(8780, 9150, S.bus(8790))
N(9220, 9380, S.bigBen(9300))
N(9440, 9520, S.phoneBox(9480))

// ---------- Berlin ----------
chapter('berlin', 9550, 10350)
F(far(9500), far(10400), S.skyline(far(9500), far(10400), 71, fade('#b9c0c9', 0.3), 110, 220))
F(far(9750) - 80, far(9750) + 80, S.tvTower(far(9750), fade('#8d98a8', 0.2)))
N(9560, 10360, S.ground(9560, 10360, 'sidewalk'))
N(9610, 10290, S.brandenburg(9950))

// ---------- Israel ----------
chapter('israel', 10350, 11150)
F(far(10300), far(11200), path(`M${far(10300)} ${G} Q ${far(10600)} ${G - 240} ${far(10900)} ${G - 140} Q ${far(11100)} ${G - 80} ${far(11200)} ${G - 160} L ${far(11200)} ${G} Z`, { fill: fade('#e2c48d', 0.2), gap: 12 }))
F(far(10700) - 60, far(10700) + 60, circle(far(10700), 160, 110, { fill: '#ffd66b', hatch: false, sw: 2, stroke: '#f2b13a' }))
N(10360, 11160, S.ground(10360, 11160, 'stone'))
N(10450, 11060, S.cityWall(10450, 11060, 10770))
N(10360, 10560, S.palm(10390, 400))
N(10470, 10730, S.camel(10580))
N(11000, 11200, S.palm(11080, 440))

// ---------- Japan ----------
chapter('japan', 11150, 11850)
F(far(11100), far(12000), S.mountain(far(11500), 700, 420, fade('#7f9cc4', 0.2), true))
N(11160, 11860, S.ground(11160, 11860, 'gravel'))
N(11100, 11330, S.tree(11220, 320, { color: '#f6b8cf', blossom: ['#ffffff', C.pink, '#ffd6e5'] }))
for (const x of [11450, 11600, 11750]) N(x - 200, x + 200, S.torii(x, 420 - (x - 11450) / 8))

// ---------- Costa Rica ----------
chapter('costa', 11850, 12950)
F(far(11800), far(12500), S.volcano(far(12000), 600, 420, fade('#6b8f5a', 0.2)))
F(far(12150), far(13000), S.ocean(far(12150), far(13000), G - 170))
N(11860, 12160, S.ground(11860, 12160, 'dirt'))
N(11850, 12160, S.jungle(11850, 4, 7))
N(11850, 12010, S.palm(11920, 460))
N(11900, 12200, S.sloth(12040, G - 470) + S.toucan(12120, G - 360))

// ---------- the beach ----------
N(12160, 12300, S.ground(12160, 12300, 'sand'))
N(12300, 12720, rect(12300, G - 6, 420, 1000 - G + 6, { fill: '#4fb3e8', gap: 9, sw: 2, stroke: '#2a8cc4' }) + speckle(12300, G + 4, 420, 120, 40, ['#ffffff', '#b9e3f6'], 16, 12300))
N(12720, 13000, S.ground(12720, 13000, 'sand'))
N(12160, 12320, S.umbrella(12240))
N(12820, 13000, S.palm(12900, 420))

// ---------- Camp Pembroke ----------
chapter('camp', 12950, 15000)
F(far(12900), far(15000), rect(far(12900), G - 120, far(15000) - far(12900), 120, { fill: fade('#6fbbe0', 0.15), gap: 10, sw: 1.6 }))
for (let a = 12900; a < 15000; a += 200) F(far(a) - 100, far(a) + 100, S.pine(far(a), 260 + ((a / 200) % 3) * 40, fade('#2f7d55', 0.35)))
N(13000, 14260, S.ground(13000, 14260, 'grass'))
N(14260, 14560, S.ground(14260, 14560, 'dirt') + S.mudPit(14270, 14550))
N(14560, 14700, S.ground(14560, 14700, 'grass'))
N(13350, 13680, S.cabin(13370))
N(13690, 13800, S.pine(13740, 400))
N(13800, 13940, S.flagPole(13820, C.cyan))
N(13950, 14270, S.cabin(13960, 280))
N(14000, 14240, S.pine(14200, 380))
N(14560, 14700, S.flagPole(14600, C.yellow))
N(13990, 14130, line(14050, G, 14050, G - 270, { stroke: '#6b4a32', sw: 6 }) + rect(13940, G - 330, 220, 70, { fill: C.yellow, gap: 6, sw: 3 }))
label(14050, G - 295, 'Color war!', 34, C.ink)
N(13820, 14620, line(13820, G - 400, 14600, G - 400, { stroke: C.ink, sw: 2 }) + S.pennants(13840, G - 400, 740, [C.cyan, C.yellow]))

// ---------- MS 51 and the dance ----------
N(14700, 15400, S.ground(14700, 15400, 'sidewalk'))
N(15350, 16480, S.gymWall(15350, 16480))
N(15350, 16480, S.ground(15350, 16480, 'wood'))
N(15420, 15580, S.hoop(15500))
N(15620, 16200, S.stageLights(15620, 16200))

// ---------- the bema ----------
const bimahTop = G - steps.rise * steps.count
const shulFrom = 16420
const shulTo = 19200
N(shulFrom, shulTo, S.shulInterior(shulFrom, shulTo))
N(shulFrom, shulTo, S.ground(shulFrom, shulTo, 'carpet'))
N(16620, 16960, S.pews(16640, 16940))
N(steps.from, shulTo, S.stairs(steps.from, steps.run, steps.rise, steps.count) + S.bimah(steps.from + steps.count * steps.run, shulTo, bimahTop))
N(17880, 18200, S.ark(18040, bimahTop))
N(18000, 18080, S.eternalLight(18040, 210))
N(17630, 17880, S.readingTable(17760, bimahTop) + S.torah(17760, bimahTop - 196))

// ---------- the buildings Lucy walks through ----------
const doorArt = {
  'wburg-home': (d) => S.homeFacade(d.x, d.w, 560, 'brick'),
  'slope-home': (d) => S.homeFacade(d.x, d.w, 520, 'brownstone'),
  ps107: (d) => S.schoolFacade(d.x, d.w, 520, '#c8634a', C.ink),
  airport: (d) => S.airportFacade(d.x, d.w),
  'camp-gate': (d) => S.campGate(d.x, d.w),
  ms51: (d) => S.schoolFacade(d.x, d.w, 540, '#b35a48', C.coral),
  shul: (d) => S.shulDoors(d.x, d.w),
}
label(4950, G - 177, 'PS 107', 38)
label(7700, G - 157, 'Airport', 36)
label(13100, G - 470, 'Camp Pembroke', 40)
label(15000, G - 177, 'MS 51', 38)

// ---------- write it all out ----------
const snap = (v) => Math.floor(v / PX) * PX

function tiles(items, from, to, prefix) {
  const out = []
  for (let x = from, i = 0; x < to; x += TILE, i++) {
    const inside = items.filter((it) => it.x1 >= x - 40 && it.x0 <= x + TILE + 40).map((it) => it.svg)
    if (!inside.length) continue
    out.push({ x, w: TILE, file: `${prefix}-${String(i).padStart(2, '0')}.png`, svg: svgDoc(x, TILE, WORLD_H, inside.join('')) })
  }
  return out
}

const nearTiles = tiles(near, NEAR_FROM, NEAR_TO, 'near')
const farTiles = Object.entries(farChapters).map(([id, range]) => {
  const items = farItems.filter((it) => it.ch === id)
  const x0 = snap(Math.min(...items.map((it) => it.x0)) - 40)
  const x1 = snap(Math.max(...items.map((it) => it.x1)) + 48)
  return { id, from: range.from, to: range.to, x: x0, w: x1 - x0, file: `far-${id}.png`, svg: svgDoc(x0, x1 - x0, WORLD_H, items.map((it) => it.svg).join('')) }
})
const doorFiles = doors.map((d) => {
  const x0 = snap(d.x - d.w / 2 - 64)
  const w = snap(d.w + 136)
  return { id: d.id, x: x0, w, file: `door-${d.id}.png`, svg: svgDoc(x0, w, WORLD_H, doorArt[d.id](d)) }
})

// Puffy pixel clouds, repeated across the sky by the page.
const cloud = (cx, cy, k) =>
  [[-60, 10, 90], [-10, -14, 120], [50, 4, 100], [90, 18, 70], [0, 22, 140]].map(([dx, dy, d]) => circle(cx + dx * k, cy + dy * k, d * k, { fill: '#ffffff', stroke: false })).join('') +
  rect(cx - 96 * k, cy + 36 * k, 220 * k, 16, { fill: '#d4ecf8', stroke: false })
const cloudsFile = { x: 0, w: 2400, file: 'clouds.png', svg: svgDoc(0, 2400, WORLD_H, [[220, 150, 1], [760, 90, 0.7], [1240, 210, 1.15], [1750, 120, 0.8], [2180, 240, 0.9]].map(([x, y, k]) => cloud(x, y, k)).join('')) }

// Shrink every drawing into a small pixel image, with no smoothing, through Chromium.
const require = createRequire(import.meta.url)
const { chromium } = require('playwright')
const sharp = require('sharp')

await mkdir('public/journey/sprites', { recursive: true })
for (const dir of ['public/journey', 'public/journey/sprites']) for (const f of await readdir(dir)) if (/\.(svg|png)$/.test(f)) await unlink(`${dir}/${f}`)

const browser = await chromium.launch()
const page = await browser.newPage({ deviceScaleFactor: 1 })
let bytes = 0
for (const t of [...nearTiles, ...farTiles, ...doorFiles, cloudsFile]) {
  const w = t.w / PX
  const h = WORLD_H / PX
  await page.setViewportSize({ width: w, height: h })
  await page.setContent(`<style>html,body{margin:0;background:transparent}svg{display:block}</style>${t.svg}`)
  const png = await page.screenshot({ omitBackground: true, clip: { x: 0, y: 0, width: w, height: h } })
  const out = await sharp(png).png({ palette: true, colours: 128, dither: 0, compressionLevel: 9 }).toBuffer()
  await writeFile(`public/journey/${t.file}`, out)
  bytes += out.length
}
await browser.close()

// Sprites: one strip of frames per person or thing.
const sheets = buildSprites()
const spriteMeta = {}
for (const [name, sheet] of Object.entries(sheets)) {
  const px = sheetPixels(sheet)
  const out = await sharp(Buffer.from(px.data), { raw: { width: px.width, height: px.height, channels: 4 } }).png({ compressionLevel: 9 }).toBuffer()
  await writeFile(`public/journey/sprites/${name}.png`, out)
  bytes += out.length
  spriteMeta[name] = { file: `sprites/${name}.png`, w: px.fw, h: px.fh, ax: sheet.ax, ay: sheet.ay, leg: sheet.leg, index: sheet.index }
}

const strip = ({ svg, ...rest }) => rest
const art = {
  px: PX,
  parallax: PARALLAX,
  farOffset: 420,
  near: nearTiles.map(strip),
  far: farTiles.map(strip),
  doors: doorFiles.map(strip),
  clouds: strip(cloudsFile),
  labels,
  sprites: spriteMeta,
}
await writeFile('src/components/journey/art.json', JSON.stringify(art))
console.log(`near ${nearTiles.length}, far ${farTiles.length}, doors ${doorFiles.length}, sprites ${Object.keys(spriteMeta).length}, images ${(bytes / 1024).toFixed(0)} KB`)
