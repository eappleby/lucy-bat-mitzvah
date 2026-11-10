// Renders the /movie page to an MP4, frame by frame, so the video is perfectly smooth.
//
// Needs (one time):  npm i -D playwright && npx playwright install chromium   and ffmpeg on the PATH.
// Then:              npm run dev          (in one terminal)
//                    node scripts/render-movie.cjs [output.mp4] [base url]
//
// How it works: the movie is all CSS animation on one timeline. For each frame we
// pause every animation, set its clock to that frame's time, and take a picture.

const { chromium } = require('playwright')
const { spawn } = require('node:child_process')

const out = process.argv[2] || 'lucy-save-the-date.mp4'
const base = process.argv[3] || 'http://localhost:5173'
const FPS = 30
const SECONDS = 32

;(async () => {
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 })
  await page.goto(`${base}/movie?capture`, { waitUntil: 'networkidle' })
  await page.evaluate(() => document.fonts.ready)
  await page.evaluate(() => Promise.all([...document.images].map((img) => img.decode().catch(() => {}))))

  const ffmpeg = spawn(
    'ffmpeg',
    ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-i', '-', '-c:v', 'libx264', '-pix_fmt', 'yuv420p',
      '-crf', '20', '-preset', 'slow', '-movflags', '+faststart', out],
    { stdio: ['pipe', 'inherit', 'inherit'] },
  )

  const total = FPS * SECONDS
  for (let f = 0; f < total; f++) {
    await page.evaluate((ms) => {
      for (const a of document.getAnimations()) {
        a.pause()
        a.currentTime = ms
      }
    }, (f / FPS) * 1000)
    const frame = await page.screenshot({ type: 'jpeg', quality: 95 })
    if (!ffmpeg.stdin.write(frame)) await new Promise((resolve) => ffmpeg.stdin.once('drain', resolve))
    if (f % 150 === 0) console.log(`frame ${f} of ${total}`)
  }
  ffmpeg.stdin.end()
  await new Promise((resolve) => ffmpeg.on('close', resolve))
  await browser.close()
  console.log('wrote', out)
})()
