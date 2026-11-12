# Lucy's Bat Mitzvah

The website for Lucy Appleby's bat mitzvah on March 20, 2027 in Park Slope, Brooklyn. Under the sea theme, matched to the save the date card.

Right now the site does three jobs:

1. **Checks everyone's contact info.** Each household gets a personal email, "Contact info up to date?", that shows what we have for them (address, phone, email, and family with relationships). When everything is there it offers Confirm info and Update info. Anything missing is marked "We still need this" and the button becomes Add missing info, so people fill it in rather than confirm an incomplete card. When we have no address, it asks for their contact info instead.
2. **Meet Lucy** (`/`), a fun page linked from the save the date card: a hello from Lucy, photos of her over the years, her friends, an 8-bit video game of her growing up that you walk through with the arrows, a message in a bottle, and "Invitation to follow. Stay tuned!" It stays behind a "Coming soon" page with a small game (Pearl dive, with a shared top 10 of arcade style initials) until it is switched on in the admin.
3. **An admin** for the guest list, the contact emails, and the Meet Lucy switch.

RSVPs by personal link, hotels, and the schedule come later. The database tables for RSVPs already exist.

## Run it

```sh
npm install
npm run dev
```

Open http://localhost:5173. The admin is at http://localhost:5173/admin.

| Command | What it does |
| --- | --- |
| `npm run dev` | Site with hot reload. Email sending is not available in this mode. |
| `npm run build` | Production build into `dist/`. |
| `npm run preview:cf` | Build, then run the way Cloudflare does, including the email function. |
| `npm run deploy` | Build and deploy to Cloudflare Pages with Wrangler. |
| `npm run db:link` | One time: connect the Supabase CLI to the hosted project. |
| `npm run db:push` | Apply new files in `supabase/migrations/` to the hosted database. |
| `npm run db:new <name>` | Create an empty migration file. |
| `npm run photo -- <image> <name>` | Make web sizes of a photo in `public/photos/`. |
| `npm run journey` | Redraw the 8-bit game art. See "The video game" below. |
| `npm run email-art` | Redraw the email heading and footer pictures (needs `npm run dev` running). |
| `node scripts/render-movie.cjs` | Export `/movie` as an MP4. See "The movie" below. |

`npm run journey`, `npm run email-art`, and the movie export need Playwright with Chromium, one time: `npm i -D playwright && npx playwright install chromium`. The movie also needs ffmpeg.

## How it is built

- **Frontend:** Vite and Vue 3, built to static files.
- **Data:** Supabase (project `vmiubhxtijtsunqouwvk`). There is no server of our own.
- **Hosting:** Cloudflare Pages. One Pages Function sends email through Postmark.

```
index.html
shared/public-config.js     Supabase URL and publishable key (public values only)
src/
  content.js                Every word and photo choice on the public pages
  Home.vue                  The page at /: Meet Lucy when switched on, Coming soon when off
  Dive.vue                  Meet Lucy
  ComingSoon.vue            Coming soon, with the Pearl dive game (components/coming-soon/)
  ContactPage.vue           The contact page at /address and /i/<token>
  Movie.vue                 The animated save the date at /movie
  components/               One file per section of Meet Lucy
  components/journey/       The 8-bit video game ("How I got here")
  lib/supabase.js           Supabase client
  lib/state.js              Pearl hunt and lightbox
  lib/contact.js            The contact card (address, family, what is missing), shared by the page, email, and admin
  admin/                    The admin, loaded only at /admin
  admin/emailTemplate.js    The contact email
  styles/                   base.css (shared), dive.css, address.css, admin.css
functions/api/send-email.js Postmark sender, admin only
public/art/                 Illustrations cut from the save the date
public/photos/              Web sizes of the family photos
public/journey/             8-bit scenery and sprites (made by npm run journey)
public/email/               Email heading and footer pictures (made by npm run email-art)
supabase/migrations/        Database schema
scripts/                    Photo resizer, game art, email art, movie export
exports/                    Rendered videos (not committed)
reference/                  Original photos and the card (not committed)
```

### Pages

| Path | Who it is for |
| --- | --- |
| `/i/<token>` | One household, from its email. Shows everything we have for them and asks "Still correct?". Confirm info saves that it is right and says "Thanks <first name>!"; Update info opens a form filled in with what we have, where they can also add or remove family. With no address on file the form opens right away. |
| `/address` | Anyone. The shared contact form for people we have no email for. Answers land in Admin > Inbox. |
| `/` | Meet Lucy, the link for the save the date card. Shows "Coming soon" and Pearl dive until it is switched on (Admin > Guest list). Signed in admins always see the real page, with a note at the bottom. |
| `/movie` | A 32 second animated save the date. |
| `/admin` | The family. Email and password sign in. |

The email buttons go to `/i/<token>?answer=yes` and `/i/<token>?answer=no`, so one tap from the email confirms the info or opens the form.

Each household has one main contact (the first person, unless you pick another in the guest list). Everyone else is listed under Family with their relationship to the main contact.

## Security model

- Every table has row level security turned on.
- Visitors cannot read or write any table. The one exception is published rows of `lucy_posts`.
- Visitors act only through database functions: `get_invite`, `confirm_info`, `submit_contact`, `send_bottle`, `get_public_bottles`, `get_site_status`, `get_pearl_scores`, `submit_pearl_score`.
- `get_invite` returns a household's contact card (envelope name, address, phone, email, the main contact's name, and family names with relationships) to whoever holds that household's personal link, so they can check it. Notes, groups, and other households are never returned, and nothing is returned without a valid token.
- `submit_contact` with a personal token updates that household right away, including adding and removing family members. Every send is also kept in `address_submissions` as a record.
- The Coming soon switch is checked in the browser. Meet Lucy's code is only downloaded when it is shown, but its photos in `public/photos/` can still be opened by exact address.
- Admins are Supabase Auth users whose email is in the `admins` table.
- The site asks search engines not to index it (`robots.txt`, a meta tag, and an `X-Robots-Tag` header). Anyone with the link can still open it.

## First time setup

### 1. Create the admin login

1. In the Supabase dashboard open **Authentication > Users > Add user > Create new user**. Enter the email and a password and leave **Auto Confirm User** on.
2. Open the **SQL Editor** and run, with the same email:

   ```sql
   insert into public.admins (email) values ('you@example.com');
   ```

3. Recommended: under **Authentication > Sign In / Providers**, turn off **Allow new users to sign up**.

Repeat steps 1 and 2 for each person who should have access.

### 2. Database changes

Every file in `supabase/migrations/` is already applied to the hosted project, through `20261112030000_pearl_scores.sql`. To change it:

```sh
npm run db:link          # one time, asks for the database password
npm run db:new add_something
# edit the new file in supabase/migrations/
npm run db:push
```

The first `db:push` re-runs the existing migrations. They are written to be safe to run again.

### 3. Deploy to Cloudflare Pages

Connect the GitHub repo once, and every push to `main` deploys on its own.

1. In the Cloudflare dashboard open **Workers & Pages > Create > Pages > Connect to Git** and pick `eappleby/lucy-bat-mitzvah`.
2. Production branch `main`, framework preset **None**, build command `npm run build`, build output directory `dist`, root directory blank. `.node-version` tells the build to use Node 22, which Vite needs.
3. **Save and Deploy.** The site comes up at `https://lucy-bat-mitzvah.pages.dev` (or a similar name if that one is taken).

`wrangler.toml` is the source of truth for the project's settings, so the dashboard shows some fields as read only. That is expected.

To deploy from this machine instead: `npx wrangler login` once, then `npm run deploy`.

### 4. Connect Postmark

In the Pages project open **Settings > Variables and Secrets** and add these for **Production**, each as type **Secret**:

| Name | Value |
| --- | --- |
| `POSTMARK_SERVER_TOKEN` | The Server API token from Postmark |
| `POSTMARK_FROM` | A sender Postmark has verified, for example `Lucy's Bat Mitzvah <hello@yourdomain.com>` |
| `POSTMARK_REPLY_TO` | Optional |
| `POSTMARK_MESSAGE_STREAM` | Optional, defaults to `outbound` |

If the dashboard will not let you add them, use `npx wrangler pages secret put POSTMARK_SERVER_TOKEN` (and so on) from this folder.

Redeploy after adding them. To test locally, copy `.dev.vars.example` to `.dev.vars`, fill it in, and run `npm run preview:cf`.

## Everyday jobs

- **Pearl dive top 10:** scores live in the `pearl_scores` table. A score that makes the top 10 asks for up to 3 letters or digits. To remove one, delete its row in Supabase (**Table Editor > pearl_scores**).
- **Open Meet Lucy to everyone:** Admin > Guest list > Open it to everyone. Switch to Coming soon puts it back.
- **Send the contact emails:** Admin > Email. Pick who gets it (not emailed yet, not confirmed yet, or everyone), click a row to preview that household's email, send yourself a test, then send. There is one subject for households we have info for and another for those we don't. The email images load from the live site, so send from the deployed admin, not localhost.
- **Watch the answers:** Admin > Guest list shows each household as Confirmed, Not confirmed, or Needs address. Info from the shared `/address` link arrives in Admin > Inbox; saving it to a household fills in the address and adds any family members it does not have yet.
- **Mailing labels:** Admin > Guest list > Export for mailing labels.
- **Change words:** edit `src/content.js`.
- **Add a photo:** `npm run photo -- reference/IMG_1234.jpg beach-day`, then add the id to `timeline` (oldest last) or `friends` in `src/content.js`. `mainPhoto` is the big circle at the top of Meet Lucy.
- **Lucy's drawings and stories:** Admin > Lucy's sketchbook still works, but the sketchbook is not on the page right now. Add `<Sketchbook />` back to `src/Dive.vue` when she is ready.

## The video game

"How I got here" on Meet Lucy is a side scroller in the style of 1980s games. Lucy stays in the middle while the world slides past. Holding the right arrow key (or D), the forward button on screen, or swiping or dragging sideways on the game moves her forward at a gentle walk; left goes back. Scrolling the page up and down just scrolls the page, except that the game settles in the middle of the screen and holds there for a short stretch of scrolling so people notice it (the `.journey__hold` rules in `journey.css`). The walking speed is `WALK` at the top of `Journey.vue`. The story: an inchworm in Williamsburg, a baby in a stroller to Park Slope, a little princess hopping past PS 107, friends at the playground, art class and the ice rink, family trips to Paris, London, Berlin, Israel, Japan and Costa Rica with boogie boarding, color war at Camp Pembroke, dancing at MS 51, and finally the bema. She changes into the next version of herself each time she walks through a door.

- `src/components/journey/world.js` is the map: where every door, activity, place name, and sky change is, in world units (the world is 1000 tall).
- `scripts/journey/scenery.mjs` draws the buildings and props as shapes. `scripts/journey/sprites.mjs` draws every character pixel by pixel, with their walk and activity frames.
- `npm run journey` turns both into small pixel images in `public/journey/` (1 pixel = 8 world units) and writes their positions to `src/components/journey/art.json`. Run it after changing any of those three files.
- `src/components/journey/Journey.vue` paints it all, signs included, into one canvas every frame. Each art pixel is drawn as a solid block of screen pixels, so the art stays chunky while the world glides past by single screen pixels. When Lucy stops, everyone stands and blinks. In development, `window.__journey.go(t)` jumps to a point on the timeline for screenshots.

The characters are a light, cartoon version of Lucy and the family, not likenesses.

## The movie

`/movie` is built entirely from CSS animation on one timeline (`src/styles/movie.css`), so it can be exported frame by frame. The photo order is the `order` list at the top of `src/Movie.vue`. `exports/lucy-save-the-date.mp4` is a rendered copy (1080 x 1920, no sound) for texting.

To render it again after a change:

```sh
npm run dev                                               # leave running
node scripts/render-movie.cjs exports/lucy-save-the-date.mp4
```
