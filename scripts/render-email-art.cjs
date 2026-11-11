// Renders the header and footer pictures used in the contact email.
// Email programs cannot load web fonts, so the hand lettering is baked into a picture.
//
//   npm run dev                       (in one terminal)
//   node scripts/render-email-art.cjs [base url]
//
// Writes public/email/header-check.jpg, header-new.jpg, and footer.jpg at twice their email size.
// The headings come from copy.contact in src/content.js; keep them in step if those change.

const { chromium } = require('playwright')

const base = process.argv[2] || 'http://localhost:5173'

const css = `
  * { box-sizing: border-box; }
  html, body { margin: 0; background: #fff; }
  .sheet { position: relative; width: 600px; background: #fff; overflow: hidden; color: #003b9d; text-align: center; }
  .sheet img { position: absolute; }
  .head { height: 250px; }
  .title { position: absolute; left: 150px; right: 150px; top: 92px; margin: 0; font-family: 'Shantell Sans Variable'; font-weight: 560;
    font-variation-settings: 'BNCE' 0, 'INFM' 100; font-size: 46px; line-height: 1; transform: rotate(-1.5deg); }
  .wave { left: 235px; top: 206px; width: 130px; }
  .foot { height: 120px; }
`

const header = (text) => `
  <div class="sheet head">
    <img src="/art/coral-orange-a.webp" style="left:-14px; top:-14px; width:160px" />
    <img src="/art/fish-orange-trio.webp" style="left:18px; top:168px; width:66px" />
    <img src="/art/coral-pink.webp" style="left:-10px; top:180px; width:78px" />
    <img src="/art/turtle.webp" style="right:70px; top:6px; width:104px" />
    <img src="/art/starfish.webp" style="right:6px; top:4px; width:68px" />
    <img src="/art/shell-pearls.webp" style="right:6px; top:150px; width:58px" />
    <img src="/art/seaweed-a.webp" style="right:70px; top:186px; width:38px" />
    <p class="title">${text}</p>
    <img class="wave" src="/art/wave.webp" />
  </div>`

const footer = `
  <div class="sheet foot">
    <img src="/art/shell-big.webp" style="left:8px; bottom:2px; width:100px" />
    <img src="/art/seaweed-pearls.webp" style="left:120px; bottom:0; width:120px" />
    <img src="/art/clownfish.webp" style="left:262px; bottom:44px; width:74px" />
    <img src="/art/coral-mix.webp" style="left:340px; bottom:-4px; width:150px" />
    <img src="/art/coral-orange-b.webp" style="right:-8px; bottom:-8px; width:110px" />
  </div>`

;(async () => {
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 600, height: 400 }, deviceScaleFactor: 2 })
  // Load a real page first so the site's fonts are registered, then swap in the art.
  await page.goto(`${base}/address`, { waitUntil: 'networkidle' })
  const sheets = [
    ['header-check', header('Contact info up to date?')],
    ['header-new', header("What's your contact info?")],
    ['footer', footer],
  ]
  for (const [name, html] of sheets) {
    await page.evaluate(({ css, html }) => {
      document.head.insertAdjacentHTML('beforeend', `<style>${css}</style>`)
      document.body.innerHTML = html
    }, { css, html })
    await page.evaluate(() =>
      Promise.all([
        document.fonts.load("560 46px 'Shantell Sans Variable'"),
      ]).then(() => document.fonts.ready),
    )
    await page.evaluate(() => Promise.all([...document.images].map((i) => i.decode().catch(() => {}))))
    await page.locator('.sheet').screenshot({ path: `public/email/${name}.jpg`, type: 'jpeg', quality: 88 })
    console.log('wrote', `public/email/${name}.jpg`)
  }
  await browser.close()
})()
