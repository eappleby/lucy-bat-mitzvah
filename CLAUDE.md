# CLAUDE.md

Website for Lucy Appleby's bat mitzvah (March 20, 2027, Park Slope). Read `README.md` first for layout, commands, and setup.

## Stack

Vite + Vue 3 (script setup, plain JS), Supabase (Postgres, Auth, Storage), Cloudflare Pages with one Pages Function for Postmark. No other backend.

## Canonical files

- `src/content.js`: all public copy and photo captions. Change words here, not in components.
- `src/styles/base.css`: color tokens, fonts, buttons, fields. `dive.css` is the public page, `admin.css` the admin.
- `shared/public-config.js`: Supabase URL and publishable key. Imported by both `src/` and `functions/`. Public values only.
- `supabase/migrations/`: the schema. The hosted database must always match these files.
- `functions/api/send-email.js`: the only server code and the only place secrets are read.

## Rules

- Propose before changing architecture: schema, auth, routing, hosting, or the security model below.
- Visitors never touch tables directly. New public behavior means a new `security definer` function with `set search_path = ''`, input length checks, and an explicit `grant execute ... to anon, authenticated`. Keep RLS on every table.
- Never return a household's address, email, or guest names to a visitor, even with a valid token.
- Schema changes are new timestamped files in `supabase/migrations/`, written so they can be re-run (`if not exists`, `create or replace`, `drop policy if exists`). Apply with `npm run db:push`. Do not edit the database by hand.
- Secrets go in Cloudflare Pages settings and `.dev.vars`, never in the repo or in `shared/public-config.js`.
- The site is unlisted. Keep the noindex tag, `robots.txt`, and the `X-Robots-Tag` header.
- Art in `public/art/` is cut from the family's save the date. New art must match it: marker and colored pencil look, the palette in `base.css`. No characters from films.
- Do not put real guest names or addresses in code, tests, or fixtures. Use made-up names.
- All motion must respect `prefers-reduced-motion` (see the block at the end of `dive.css`).
- `/movie` must stay pure CSS animation with absolute delays on one timeline. No JavaScript timers, or `scripts/render-movie.cjs` cannot export it.
- Destructive admin actions use a two-click confirm on the button, not `window.confirm`.

## Writing style

American English. No em dashes, en dashes, or clause-joining hyphens in any copy, comments, or docs. Sentence case. Plain verbs. Buttons say what they do.

## Git

Single working checkout, no worktrees. Do not commit or push. Hand over one copy-pasteable shell block (`cd`, `git add`, `git commit`, `git push`). Commit messages are one plain subject line with no body and no trailers.

## After every change

Update `README.md` and this file, and remove anything in them that is no longer true.

## Status

Done: public dive page, animated save the date at `/movie` with an MP4 export script, address collection (shared link and personal links), admin (guest list, CSV import and export, address inbox, email through Postmark, bottle notes, Lucy's sketchbook, events), schema including RSVP tables.

Not built yet: RSVP pages on `/i/<token>` (tables `events`, `household_events`, `rsvps` and `households.personal_message` are ready), hotels and schedule pages, save the date and invitation emails.

Not yet verified against the live services: admin sign in with a real account, and a real Postmark send. Both were tested with stand-ins only.
