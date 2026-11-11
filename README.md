# Lucy's Bat Mitzvah

The website for Lucy Appleby's bat mitzvah on March 20, 2027 in Park Slope, Brooklyn. Under the sea theme, matched to the save the date card.

Right now the site does three jobs:

1. **Collects mailing addresses** for the save the dates. Each household gets a personal email asking "Is this your address?" with Yes and No buttons, or asking where to mail it when we have no address.
2. **Meet Lucy** (`/`), a fun page linked from the save the date card: a hello from Lucy, photos of her over the years, her friends, an 8-bit video game of her growing up that plays as you scroll, a message in a bottle, and "Invitation to follow. Stay tuned!"
3. **An admin** for the guest list and the address emails.

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
| `npm run email-art` | Redraw the email header and footer pictures (needs `npm run dev` running). |
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
  Dive.vue                  Meet Lucy, the page at /
  AddressPage.vue           The address page at /address and /i/<token>
  Movie.vue                 The animated save the date at /movie
  components/               One file per section of Meet Lucy
  components/journey/       The 8-bit video game ("How I got here")
  lib/supabase.js           Supabase client
  lib/state.js              Pearl hunt and lightbox
  admin/                    The admin, loaded only at /admin
  admin/emailTemplate.js    The address email
  styles/                   base.css (shared), dive.css, address.css, admin.css
functions/api/send-email.js Postmark sender, admin only
public/art/                 Illustrations cut from the save the date
public/photos/              Web sizes of the family photos
public/journey/             8-bit scenery and sprites (made by npm run journey)
public/email/               Email header and footer pictures (made by npm run email-art)
supabase/migrations/        Database schema
scripts/                    Photo resizer, game art, email art, movie export
exports/                    Rendered videos (not committed)
reference/                  Original photos and the card (not committed)
```

### Pages

| Path | Who it is for |
| --- | --- |
| `/i/<token>` | One household, from its email. Shows the address we have and asks if it is right. Yes confirms it; No opens a form filled in with what we have. With no address on file it asks where to mail it. |
| `/address` | Anyone. The shared link for people we have no email for. Answers land in Admin > Address inbox. |
| `/` | Meet Lucy. The link for the save the date card. |
| `/movie` | A 32 second animated save the date. |
| `/admin` | The family. Email and password sign in. |

The email buttons go to `/i/<token>?answer=yes` and `/i/<token>?answer=no`, so one tap from the email confirms the address or opens the form.

## Security model

- Every table has row level security turned on.
- Visitors cannot read or write any table. The one exception is published rows of `lucy_posts`.
- Visitors act only through database functions: `get_invite`, `confirm_address`, `submit_address`, `send_bottle`, `get_public_bottles`.
- `get_invite` returns a household's name and mailing address to whoever holds that household's personal link, so they can check it. It never returns emails or guest names, and nothing returns an address without a valid token.
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

The schema, including `20261111000000_confirm_address.sql`, is already applied to the hosted project. To change it:

```sh
npm run db:link          # one time, asks for the database password
npm run db:new add_something
# edit the new file in supabase/migrations/
npm run db:push
```

The first `db:push` re-runs the existing migrations. They are written to be safe to run again.

### 3. Deploy to Cloudflare Pages

Either connect the GitHub repo in the Cloudflare dashboard (**Workers & Pages > Create > Pages > Connect to Git**) with:

- Build command: `npm run build`
- Build output directory: `dist`

or deploy from this machine with `npm run deploy`.

### 4. Connect Postmark

In the Pages project open **Settings > Variables and Secrets** and add:

| Name | Type | Value |
| --- | --- | --- |
| `POSTMARK_SERVER_TOKEN` | Secret | The Server API token from Postmark |
| `POSTMARK_FROM` | Text | A verified sender, for example `Lucy's Bat Mitzvah <hello@yourdomain.com>` |
| `POSTMARK_REPLY_TO` | Text | Optional |
| `POSTMARK_MESSAGE_STREAM` | Text | Optional, defaults to `outbound` |

Redeploy after adding them. To test locally, copy `.dev.vars.example` to `.dev.vars`, fill it in, and run `npm run preview:cf`.

## Everyday jobs

- **Send the address emails:** Admin > Email. Pick who gets it (not emailed yet, not answered yet, or everyone), click a row to preview that household's email, send yourself a test, then send. The email images load from the live site, so send from the deployed admin, not localhost.
- **Watch the answers:** Admin > Guest list shows each household as Confirmed, Not confirmed, or Needs address. Addresses from the shared `/address` link arrive in Admin > Address inbox.
- **Mailing labels:** Admin > Guest list > Export for mailing labels.
- **Change words:** edit `src/content.js`.
- **Add a photo:** `npm run photo -- reference/IMG_1234.jpg beach-day`, then add the id to `timeline` (oldest last) or `friends` in `src/content.js`. `mainPhoto` is the big circle at the top of Meet Lucy.
- **Lucy's drawings and stories:** Admin > Lucy's sketchbook still works, but the sketchbook is not on the page right now. Add `<Sketchbook />` back to `src/Dive.vue` when she is ready.

## The video game

"How I got here" on Meet Lucy is a side scroller in the style of 1980s games. Lucy stays in the middle while the world scrolls past, and the page scroll moves her: an inchworm in Williamsburg, a baby in a stroller to Park Slope, a little princess hopping past PS 107, friends at the playground, art class and the ice rink, family trips to Paris, London, Berlin, Israel, Japan and Costa Rica with boogie boarding, color war at Camp Pembroke, dancing at MS 51, and finally the bema. She changes into the next version of herself each time she walks through a door.

- `src/components/journey/world.js` is the map: where every door, activity, place name, and sky change is, in world units (the world is 1000 tall).
- `scripts/journey/scenery.mjs` draws the buildings and props as shapes. `scripts/journey/sprites.mjs` draws every character pixel by pixel, with their walk and activity frames.
- `npm run journey` turns both into small pixel images in `public/journey/` (1 pixel = 8 world units) and writes their positions to `src/components/journey/art.json`. Run it after changing any of those three files.
- `src/components/journey/Journey.vue` paints it all into one small canvas every frame and scales it up with no smoothing. When the scrolling stops, everyone stands and blinks.

The characters are a light, cartoon version of Lucy and the family, not likenesses.

## The movie

`/movie` is built entirely from CSS animation on one timeline (`src/styles/movie.css`), so it can be exported frame by frame. The photo order is the `order` list at the top of `src/Movie.vue`. `exports/lucy-save-the-date.mp4` is a rendered copy (1080 x 1920, no sound) for texting.

To render it again after a change:

```sh
npm run dev                                               # leave running
node scripts/render-movie.cjs exports/lucy-save-the-date.mp4
```
