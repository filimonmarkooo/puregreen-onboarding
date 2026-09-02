# Pure Green Onboarding Portal: Developer Handoff

A franchise onboarding tracker. Franchisees register, work through a checklist of
platform setup tasks, and upload proof. Corporate staff monitor every location
from an admin dashboard.

**Live:** https://puregreen-onboarding-production.up.railway.app
**Hosting:** Railway (Node server + PostgreSQL)
**Repo:** github.com/filimonmarkooo/puregreen-onboarding

---

## Stack

Deliberately boring, no build step, no framework.

- **Node.js + Express** for the server
- **PostgreSQL** for data
- **Vanilla HTML, CSS, and JavaScript** on the front end

There is no webpack, no npm run build, no React. Edit an HTML file, refresh the
browser, see the change. This was intentional so the project stays maintainable
by anyone who knows basic web development.

---

## Running it locally

```bash
npm install
cp .env.example .env      # then fill in the values
node server.js            # http://localhost:3000
```

You need a PostgreSQL connection string in `DATABASE_URL`. Easiest option is to
copy the one from Railway, though be aware that points at production data. For
real development work, create a second free PostgreSQL service in Railway and
use that as a staging database.

Tables are created automatically on first boot. No migrations to run.

---

## File map

```
server.js              Express setup, route mounting, scheduled reminder job
.env.example           Template for environment variables

db/
  postgres.js          ALL database logic. Table creation, every query.
  tasks.js             The 29 default tasks, seeded into the DB on first boot only.
                       Editing this does NOT change a live database. Use the
                       admin UI's Manage Tasks tab instead.

routes/
  auth.js              Register, login, logout, password reset
  tasks.js             Task list, completing tasks, file uploads, task CRUD
  admin.js             Franchisee list, upcoming locations, invites, calendar

middleware/
  auth.js              JWT verification, admin-only gate

utils/
  sender.js            Unified email sender. Uses Resend if RESEND_API_KEY is
                       set, otherwise falls back to SMTP.
  mailer.js            Admin notification emails
  reminders.js         Welcome email, invite email, 30-day and 2-week reminders,
                       and the daily check that sends them

public/
  css/brand.css        ALL design tokens. Start here for branding work.
  img/                 logo-mark.svg (leaf), pure-green-primary.png and
                       pure-green-white.svg (wordmarks), same assets as the intranet
  fonts/               Licensed brand fonts, self-hosted (same files as the intranet)
  index.html           Login and registration
  dashboard.html       Franchisee view
  admin.html           Corporate admin view
  forgot-password.html
  reset-password.html
  uploads/             Proof files land here
```

Each HTML page is self-contained: markup, a page-specific `<style>` block, and
its JavaScript all in one file. Shared design tokens live in `brand.css`.

---

## Making branding changes

### Colors

Everything routes through CSS custom properties at the top of
`public/css/brand.css`. Change them there and the whole app follows.

```css
--pg-green:       #046A38;   /* Pantone 349 C, primary */
--pg-green-deep:  #04331C;   /* bands, hero panels */
--pg-lime:        #87CE21;   /* Pantone 368 C, accent */
--pg-lime-soft:   #A7E063;   /* lime on dark backgrounds */
--pg-mint:        #EAF3E0;   /* pills, tab groups */
--pg-canvas:      #F4F6F3;   /* page background */
--pg-ink:         #3A4046;   /* headings, strong text */
--pg-body:        #4A5056;   /* body copy */
```

The older names (`--pg-dark-green`, `--pg-light-green`, `--pg-offwhite`,
`--pg-charcoal`) still work as aliases.

Two important extras. The brand light green and orange are too low-contrast to
use as small text on white, so there are darkened variants used specifically for
type. Full-brightness versions stay for large display text and border rules.

```css
--pg-lime-text:   #4A7F0F;   /* 4.8:1 on white */
--pg-orange-text: #B45309;   /* 4.9:1 on white */
```

The neutral scale is tuned for accessibility. Do not lighten these without
checking contrast, since the earlier values failed WCAG AA badly.

```css
--pg-muted: #6B7078;   /* 5.0:1 on white, secondary text */
--pg-faint: #9AA0A6;   /* decorative only, never for text */
--ink-3:    #5F6661;   /* 6.1:1 on white, legacy meta text */
```

### Typography

The three licensed brand typefaces are self-hosted from `public/fonts/`
(the same files the Franchise Intranet uses) and declared with `@font-face`
at the top of `brand.css`. No Google Fonts request is made.

| Brand font | Used for | File |
|---|---|---|
| Alternate Gothic ATF Demi | Headlines, display type, big percentages | AlternateGothicATF-Demi.otf |
| Gotham Rounded Book / Medium / Bold | Body copy | GothamRnd-*.otf |
| Basis Grotesque Mono / Mono Bold | Small uppercase labels, buttons | BasisGrotesque-Mono*.ttf |

Each page preloads the display face and Gotham Medium; everything else loads
with `font-display: swap`.

```css
--font-display: 'Alternate Gothic ATF', ...;
--font-body:    'Gotham Rounded', ...;
--font-mono:    'Basis Grotesque Mono', ...;
```

### Logo

`public/img/logo-mark.svg` is the official two-tone leaf mark (favicon and
band watermark). The wordmark is an image now, not live text:
`public/img/pure-green-primary.png` on light backgrounds and
`public/img/pure-green-white.svg` on the dark green panels. All three are the
same assets the Franchise Intranet ships. `.pg-logo-text` stays in `brand.css`
only for backwards compatibility.

### Email templates

Separate from the web styling. HTML emails need inline styles, so the templates
in `utils/reminders.js` and `utils/mailer.js` have brand colors hardcoded rather
than using CSS variables. If you change the palette, update these too:

- `sendWelcomeEmail` and `sendInviteEmail` in `utils/reminders.js`
- `buildEmail` in `utils/reminders.js` for the milestone reminders
- All three functions in `utils/mailer.js` for admin notifications

Search for `#046A38` and `#87CE21` to find every instance.

---

## Design conventions in place

The portal mirrors the Pure Green Franchise Intranet design system
(puregreenfranchiseintranet.com) so the two read as one product. Worth
understanding before editing:

- **Palette is the intranet palette.** Primary green `#046A38`, deep green
  `#04331C`, lime `#87CE21`, soft lime `#A7E063`, mint `#EAF3E0`, canvas
  `#F4F6F3`. Text-safe variants (`--pg-lime-text`, `--pg-orange-text`) exist
  because full-brightness lime and orange fail contrast as small type on white.
- **Dark brand bands** (`.pg-band`) carry each page's hero: the store header on
  the franchisee dashboard, the masthead on admin, the left panel on sign-in.
  Same radial gradient and faint leaf watermark as the intranet's "Start Here"
  panel.
- **Rounded white cards with a hairline border and a soft green shadow** are
  the content surface. One card per platform on the dashboard, one per location
  on admin. Status is a coloured left edge plus a small pill.
- **Headlines are condensed uppercase** (Alternate Gothic), often stacked with
  the second line in lime. Percentages are large display type.
- **Every small label is mono, uppercase, wide tracking.** Buttons and tab
  groups are pills; the active tab is deep green with soft-lime text.
- **No em dashes anywhere**, in the interface or in emails. Client preference.
- Every page links back to the Franchise Intranet (top bar and footer); the
  intranet links here from "Step 2: On-Boarding Process".

---

## Deploying

Railway watches the `main` branch and redeploys on every push.

```bash
git add .
git commit -m "describe the change"
git push
```

Watch the Deployments tab in Railway. If it goes red, open the deploy logs.

**To roll back:** Railway → Deployments → find the last working deploy → three
dots → Redeploy.

---

## Environment variables

All live in Railway → Variables. Never commit real values; `.gitignore` blocks
`.env` for this reason.

**The server refuses to start if `DATABASE_URL`, `JWT_SECRET` or `SEED_SECRET`
is missing.** There are no built-in defaults any more (the old ones sat in a
public repo). Generate secrets with `openssl rand -hex 32`.

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection, set automatically by Railway. Required. |
| `BASE_URL` | Public URL, used in email links and as the only allowed CORS origin |
| `JWT_SECRET` | Signs login sessions. Required. Rotating it logs everyone out. |
| `SEED_SECRET` | Guards `/api/admin/seed`, `/api/admin/rotate-admin`, `/api/run-reminders`, `/api/email-test`. Required. |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | Corporate admin credentials (needed by seed and rotate-admin) |
| `ADMIN_EMAIL_1/2/3` | Who gets notified on registrations and task completions |
| `RESEND_API_KEY` | Email sending. Preferred over SMTP. |
| `MAIL_FROM` | Sender address for outgoing email |

---

## Security hardening (September 2026)

Applied after a code audit. Keep these in place:

- **CORS** only allows `BASE_URL` (or nothing). The old `origin: true` reflected
  any site and, combined with the session cookie, let any web page read admin
  data from a logged-in admin's browser.
- **Session cookie** is `httpOnly`, `sameSite=lax` and `secure` on HTTPS.
- **Rate limits** on login, register, forgot/reset password and every
  secret-gated maintenance endpoint (`express-rate-limit`).
- **Proof uploads** accept only images, PDF and Word files; the stored filename
  is a UUID plus an extension from a fixed allow-list, never the user's name;
  `/uploads` is served with `Content-Disposition: attachment`.
- **Password length** (8+) is enforced server-side, not just in the browser.
- **No default secrets** anywhere in the code (see Environment variables).
- `uploadPath` / `videoUrl` are HTML-escaped before being placed in `href`.

Still open, in priority order:

1. **Platform credentials are stored in plaintext.** The "Upload ... Login
   Credentials" tasks (Square, Uber Eats, DoorDash, Grubhub) save the
   franchisee's third-party passwords as JSON in `completions.credentials` and
   show them to admins with a Copy button. Encrypt at rest (AES-GCM with a key
   in Railway) and reveal on demand, or stop collecting passwords through the
   portal at all.
2. **Uploads are ephemeral** (see below). Move to object storage.
3. Hash the password-reset token before storing it.
4. Escape user fields in the HTML email templates (`utils/mailer.js`,
   `utils/reminders.js`).

---

## Things that will bite you

**Railway blocks outbound SMTP.** Gmail and any other SMTP provider will time
out. This is why the app uses Resend, which sends over HTTPS. Do not spend time
debugging SMTP connection errors; they will not work on this host.

**Uploaded files do not survive redeploys.** Railway's filesystem is ephemeral,
so anything in `public/uploads/` is wiped on every deploy. Proof files are
currently temporary. Fixing this properly means moving uploads to object
storage such as Cloudinary or S3. This is the biggest known gap in the app.

**Emails land in spam.** The sending domain is not verified in Resend yet. Fix
is to add DNS records for puregreenfranchise.com in the Resend dashboard, then
set `MAIL_FROM` to an address on that domain.

**`db/tasks.js` only seeds an empty database.** Editing it will not change tasks
on the live site. Use the admin Manage Tasks tab.

**Test before pushing.** There is no test suite. At minimum, run the app locally
and click through the login page, franchisee dashboard, and all five admin tabs.
A JavaScript error in one render function can blank an entire page.

---

## Admin recovery

If the admin password is lost or needs rotating, set `ADMIN_PASSWORD` in Railway
to the new value, then call this from the browser console on the live site:

```js
fetch('/api/admin/rotate-admin', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ secret: 'THE_SEED_SECRET' })
}).then(r => r.json()).then(console.log)
```

The endpoint reads the new password from the environment rather than accepting
it over the wire, so the password never travels through a browser or a chat log.
