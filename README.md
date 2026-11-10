# Lucy's Bat Mitzvah

The website for Lucy Appleby's bat mitzvah on March 20, 2027 in Park Slope, Brooklyn. Under the sea theme, matched to the save the date card.

Right now the site does three jobs:

1. A fun "dive" from the surface to the sea floor with photos, a short movie, Lucy's sketchbook, and a pearl hunt.
2. Collects mailing addresses for the save the dates.
3. Gives the family an admin for the guest list.

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
| `node scripts/render-movie.cjs` | Export `/movie` as an MP4. See "The movie" below. |

## How it is built

- **Frontend:** Vite and Vue 3, built to static files.
- **Data:** Supabase (project `vmiubhxtijtsunqouwvk`). There is no server of our own.
- **Hosting:** Cloudflare Pages. One Pages Function sends email through Postmark.

```
index.html
shared/public-config.js     Supabase URL and publishable key (public values only)
src/
  content.js                Every word and photo caption on the public site
  Dive.vue                  The public page
  Movie.vue                 The animated save the date at /movie
  components/               One file per section of the dive
  lib/supabase.js           Supabase client
  lib/state.js              Personal link, pearl hunt, lightbox
  admin/                    The admin, loaded only at /admin
  styles/                   base.css (shared), dive.css (public), admin.css
functions/api/send-email.js Postmark sender, admin only
public/art/                 Illustrations cut from the save the date
public/photos/              Web sizes of the family photos
supabase/migrations/        Database schema
scripts/add-photo.mjs       Photo resizer
scripts/render-movie.cjs    Exports /movie as an MP4
exports/                    Rendered videos (not committed)
reference/                  Original photos and the card (not committed)
```

### Pages

| Path | Who it is for |
| --- | --- |
| `/` | Everyone. The link to text or email around. |
| `/i/<token>` | One household. Greets them by name and saves their address straight to their record. |
| `/movie` | A 32 second animated save the date. Linked from the porthole section. |
| `/admin` | The family. Email and password sign in. |

## Security model

- Every table has row level security turned on.
- Visitors cannot read or write any table. The one exception is published rows of `lucy_posts`.
- Visitors act only through four database functions: `get_invite`, `submit_address`, `send_bottle`, `get_public_bottles`. `get_invite` never returns an address.
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

Repeat steps 1 and 2 for each person who should have access, including Lucy if she will post to her sketchbook.

### 2. Database changes

The schema is already applied to the hosted project. To change it:

```sh
npm run db:link          # one time, asks for the database password
npm run db:new add_something
# edit the new file in supabase/migrations/
npm run db:push
```

The first `db:push` re-runs `20261110000000_init.sql`. That file is written to be safe to run again.

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

- **Change words or captions:** edit `src/content.js`.
- **Add a photo:** `npm run photo -- reference/IMG_1234.jpg beach-day`, then add it to the `photos` list in `src/content.js`. The first three photos in the list are the featured ones in the shallows. The movie order is set at the top of `src/components/Cinema.vue`.
- **Add Lucy's drawings and stories:** Admin > Lucy's sketchbook. Publish each page when it is ready.
- **Collect addresses:** text the shared link, or use Admin > Email to send each household its personal link. Addresses from the shared link arrive in Admin > Address inbox.
- **Mailing labels:** Admin > Guest list > Export for mailing labels.

## The movie

`/movie` is built entirely from CSS animation on one timeline (`src/styles/movie.css`), so it can be exported frame by frame. The photo order is the `order` list at the top of `src/Movie.vue`. `exports/lucy-save-the-date.mp4` is a rendered copy (1080 x 1920, no sound) for texting.

To render it again after a change:

```sh
npm i -D playwright && npx playwright install chromium   # one time, also needs ffmpeg
npm run dev                                               # leave running
node scripts/render-movie.cjs exports/lucy-save-the-date.mp4
```
