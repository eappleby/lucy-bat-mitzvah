// Renders the header and footer pictures used in the address email.
// Email programs cannot load web fonts, so the hand lettering is baked into a picture.
//
//   npm run dev                       (in one terminal)
//   node scripts/render-email-art.cjs [base url]
//
// Writes public/email/header.jpg and public/email/footer.jpg at twice their email size.

const { chromium } = require('playwright')

const base = process.argv[2] || 'http://localhost:5173'

const css = `
  * { box-sizing: border-box; }
  html, body { margin: 0; background: #fff; }
  .sheet { position: relative; width: 600px; background: #fff; overflow: hidden; color: #003b9d; text-align: center; }
  .sheet img { position: absolute; }
  .head { height: 290px; }
  .whose { position: absolute; left: 0; right: 0; top: 96px; margin: 0; font: 400 36px/1 'Patrick Hand'; transform: rotate(-3deg); }
  .title { position: absolute; left: 0; right: 0; top: 138px; margin: 0; font-family: 'Shantell Sans Variable'; font-weight: 520;
    font-variation-settings: 'BNCE' 0, 'INFM' 100; font-size: 58px; line-height: 1; letter-spacing: 0.02em; text-transform: uppercase; }
  .soon { position: absolute; left: 0; right: 0; top: 202px; margin: 0; font: 400 34px/1 'Patrick Hand'; color: #fc564b; transform: rotate(-2deg); }
  .wave { left: 235px; top: 248px; width: 130px; }
  .foot { height: 120px; }
`

const header = `
  <div class="sheet head">
    <img src="/art/coral-orange-a.webp" style="left:-14px; top:-14px; width:170px" />
    <img src="/art/fish-orange-trio.webp" style="left:18px; top:180px; width:70px" />
    <img src="/art/coral-pink.webp" style="left:-10px; top:206px; width:84px" />
    <img src="/art/turtle.webp" style="right:92px; top:8px; width:118px" />
    <img src="/art/starfish.webp" style="right:6px; top:4px; width:74px" />
    <img src="/art/shell-pearls.webp" style="right:6px; top:170px; width:62px" />
    <img src="/art/seaweed-a.webp" style="right:74px; top:222px; width:40px" />
    <p class="whose">Lucy Appleby's</p>
    <p class="title">Bat Mitzvah</p>
    <p class="soon">is coming soon!</p>
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
  for (const [name, html] of [['header', header], ['footer', footer]]) {
    await page.evaluate(({ css, html }) => {
      document.head.insertAdjacentHTML('beforeend', `<style>${css}</style>`)
      document.body.innerHTML = html
    }, { css, html })
    await page.evaluate(() =>
      Promise.all([
        document.fonts.load("400 36px 'Patrick Hand'"),
        document.fonts.load("520 58px 'Shantell Sans Variable'"),
      ]).then(() => document.fonts.ready),
    )
    await page.evaluate(() => Promise.all([...document.images].map((i) => i.decode().catch(() => {}))))
    await page.locator('.sheet').screenshot({ path: `public/email/${name}.jpg`, type: 'jpeg', quality: 88 })
    console.log('wrote', `public/email/${name}.jpg`)
  }
  await browser.close()
})()
