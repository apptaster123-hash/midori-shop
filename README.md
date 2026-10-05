# Midori (緑) — a nurse's wellness shop in Accra

A beginner's guide to running, configuring, and deploying this shop. Everything below was checked against this project's actual scripts (`package.json`), variables (`.env.example`), and code — see the [verification appendix](#appendix-what-was-verified-and-when) at the end for what was actually executed.

---

## 1. What is Midori?

Midori (緑 — "green" in Japanese) is the online shop of a small health-and-wellness store in Accra, Ghana, founded and run by **Elizabeth David, RN**: 20 curated products across five categories (Vitamins, Devices, Personal Care, Mother & Baby, First Aid), priced in Ghana cedis (GHS), with free delivery in Accra over GHS 200 (otherwise GHS 25). Shoppers can browse and search, save a wishlist, chat with "the nurse", check out as guests or with Google, see their order history under **/profile**, get an order-confirmation email, and can always reach the real shop on WhatsApp at [+233 55 163 2777](https://wa.me/233551632777).

**It already works out of the box in "demo mode"** — before you create any accounts anywhere:

- The full one-page shop runs locally, seeded with all 20 products.
- **Sign in is a fake Google**: click **Sign in** in the nav and a small form pops up right on the page — type any name and any email address, press **Continue**, and you're in. No Google account, no Google project needed, no page reload.
- **Confirmation emails are not sent** — the complete rendered email is printed in your terminal (every line prefixed `[mailgun:demo]`) instead of going to an inbox.
- Real orders are saved to a local database file (`prisma/dev.db`, SQLite — just a file on disk, no database server).
- Cart and wishlist persist in your browser (localStorage); nothing is sent to any external service.

You only need the three real services — Supabase/Neon (database), Google (sign-in), Mailgun (email) — when you want to move past demo mode. Each has its own section below.

---

## 2. Run it locally

You need [Node.js](https://nodejs.org) version **20.9 or newer** — the app runs on Next.js 16, which refuses to start on older versions including Node 18 (the requirement is declared by Next itself: `node_modules/next/package.json` says `"node": ">=20.9.0"`). Check yours with `node -v`. This guide was verified on Node 24, npm 11, Windows 11. The commands work in Git Bash, PowerShell, cmd, and on macOS/Linux terminals.

1. Open a terminal in the project folder and install the dependencies:

   ```
   npm install
   ```

2. Create and fill the local database:

   ```
   npm run db:setup
   ```

   This single command does two things in a row: `prisma db push` (creates the SQLite file `prisma/dev.db` and its tables) and the seed script (inserts the 20 products from `docs/catalogue.json`). Success ends with `Seeded 20 products.` It is safe to re-run — it refreshes the products without duplicating them.

3. Start the app:

   ```
   npm run dev
   ```

4. Open **http://localhost:3000** in your browser.

**What you should see:** a cream-colored page with a green top ribbon ("Sealed & nurse-checked · Free delivery in Accra over GHS 200"), a sticky `MIDORI 緑` navigation bar (search icon, links, heart, cart, "Sign in"), a hero reading *"Wellness, the calm way."* signed *Kept by Elizabeth David, RN · Founder*, a 3-item Featured spread, then the full 20-product shop grid with category filter chips (All, Vitamins, Devices, Personal Care, Mother & Baby, First Aid), an About section signed *Elizabeth David, RN · Founder*, testimonials, contact details, and a footer. Floating over it: click any product for a quick-view modal, press **Ctrl+K** (Mac: **Cmd+K**) for live search, click the cart/heart icons for slide-in drawers, and a green "Ask a nurse" chat bubble in the bottom-right.

**Exactly what demo mode does:**

- **Demo sign-in, in the page** — click **Sign in** in the nav and a small form opens right there: type *any* name and *any* email (the email can't be empty; there is no password check), press **Continue**, and you're signed in without leaving the page — the nav now shows your avatar/initials; click it for **Your profile**, **Settings**, and **Sign out**. Nothing is sent to Google; the session lives in an encrypted cookie. Signing in pre-fills your name/email at checkout and unlocks **/profile**, where every order placed with your email is listed. Guests can still check out without signing in at all.
- **Emails are logged, not sent** — after you place an order, the entire confirmation email (subject, plain-text version, HTML version) appears in the terminal running `npm run dev`, with every line prefixed `[mailgun:demo]`. No email reaches any inbox.
- **Orders go to `prisma/dev.db`** — a real Order row with a number like `MDR-20261003-A1B2`, stored in that single file. Delete the file and re-run `npm run db:setup` for a clean slate.
- **Money is computed on the server** — prices come from the database, and delivery (GHS 25, free over GHS 200) is recalculated when the order is placed; the browser's own total is never trusted.

---

## 3. The `.env` file, line by line

`.env` holds configuration values (including secrets) that the app reads at startup. It is not committed to git. This project ships with a working `.env` already in demo state; if you ever lose it, recreate it by copying `.env.example` to a file named exactly `.env` — in cmd run `copy .env.example .env`, in PowerShell, Git Bash, or on macOS/Linux run `cp .env.example .env`. If you create the file by hand in an editor instead, watch out for it saving as `.env.txt` — that won't be read; the name must end in `.env`. **After any change to `.env`, restart the app** (Ctrl+C in the terminal, then `npm run dev` again — the file is only read once, at startup).

One line per variable, exactly as they appear in `.env.example`:

| Variable | What it is for | While it says `placeholder` |
|---|---|---|
| `DATABASE_URL="file:./dev.db"` | Where the database is. This value is a local SQLite file (`prisma/dev.db`), so no database server or account is needed. | Never says placeholder — it's already real. Section 4 replaces it with a cloud database URL. |
| `NEXTAUTH_SECRET` | A random string used to sign and encrypt the sign-in session cookie. | The shipped value (`"generate-and-paste"`) works fine locally. Replace it with a long random string before deploying — generate one with Node, which you already have: run `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"` and paste the output. |
| `NEXTAUTH_URL` | The app's web address, used for sign-in redirects. | Always real: keep `http://localhost:3000` locally; set your real domain when you deploy. If you run the dev server on a different port, this must match. |
| `GOOGLE_CLIENT_ID` | The OAuth "app ID" from Google Cloud Console that lets people sign in with their Google account. | Says `placeholder` → the app swaps real Google sign-in for the "Demo sign-in" form from section 2. Section 5 activates it. |
| `GOOGLE_CLIENT_SECRET` | The matching secret for that Google app. | Says `placeholder` (or empty) → demo sign-in stays active. |
| `MAILGUN_API_KEY` | The secret key for the Mailgun email service, used to send order confirmations. | Says `placeholder` → no email is sent; the rendered email is logged to the terminal with `[mailgun:demo]`. Section 6 activates it. |
| `MAILGUN_DOMAIN` | The domain emails are sent from — e.g. `sandbox123abc.mailgun.org` for testing. | Says `placeholder` (or `MAILGUN_API_KEY` is unset) → demo logging stays active. |
| `MAILGUN_FROM_EMAIL` | The From address on confirmation emails. | Always real: already set to the shop's email `takumistudio26@gmail.com`; change it if you'd rather send from an address on your Mailgun domain. |

The demo switches are decided in code, not magic: `src/lib/auth.ts` treats `placeholder`/empty as "not configured" for the Google variables, and `src/lib/mailgun.ts` does the same for the Mailgun pair.

---

## 4. Switch the database to a cloud Postgres

The app ships on SQLite (a file), which is perfect locally but not for a deployed site. Below: **Supabase** first, then **Neon** as an alternative. Both are free-tier hosted Postgres databases. A "connection string" is just a URL that says where the database is and how to log into it.

### 4a. Supabase

1. Go to **https://supabase.com** and click **Start your project** → create an account (signing up with GitHub works).
2. Click **New project**. Name it (e.g. `midori`), click **Generate a password** and **copy the database password somewhere safe** (you'll need it in step 4), pick a region near your users, then **Create new project**. Wait a minute or two while it provisions.
3. On the project dashboard, click the **Connect** button at the top. A panel opens with ready-made connection strings.
4. Copy the **Session pooler** string (port **5432**). It looks like:

   ```
   postgresql://postgres.<project-ref>:<password>@aws-0-<region>.pooler.supabase.com:5432/postgres
   ```

   Replace `<password>` with the database password from step 2. **If the password contains special characters** — `@`, `#`, `&`, `?`, `/`, `:` and similar — they must be percent-encoded in the URL (e.g. `@` becomes `%40`, `#` becomes `%23`), or the login will fail with an authentication error at step 7. Easiest outs: encode the special characters, or in the Supabase dashboard go to **Project Settings → Database**, click **Reset database password**, and generate one made of only letters and numbers.

   *Which port should you pick?* The **session pooler (5432)** is right for an app you run yourself, like `npm run dev` — use it. The **transaction pooler (port 6543)** exists for serverless hosting platforms; if you deploy there later, use the 6543 string and append `?pgbouncer=true` to the end (Supabase's own Prisma guide specifies this — the transaction pooler doesn't support Prisma's prepared statements without the flag).
5. Open `.env` and set `DATABASE_URL` to your edited string, keeping the quotes.
6. Open `prisma/schema.prisma` and find the `datasource db` block. Change `provider = "sqlite"` to `provider = "postgresql"`. Leave the `tags Json` field on the Product model exactly as it is — it's intentional and works on both databases.
7. Run:

   ```
   npm run db:setup
   ```

   This creates the same tables in Supabase and seeds the 20 products. It ends with `Seeded 20 products.`
8. Restart `npm run dev` and reload http://localhost:3000 — the shop now reads from Supabase. You can confirm in the Supabase dashboard under **Table Editor** → the `Product` table should show 20 rows.

To go back to local development: restore `provider = "sqlite"` and the `file:./dev.db` URL in `.env`, then re-run `npm run db:setup`.

### 4b. Neon (alternative)

1. Go to **https://neon.tech** → **Sign up** → **Create project** (name it, pick a region near your users, keep the default Postgres version).
2. In the dashboard click **Connect** and copy a connection string. Neon strings come in two flavors, distinguished by the hostname: the **pooled** string contains `-pooler` (e.g. `ep-xxx-pooler.<region>.aws.neon.tech`), the **direct** one does not.
3. For local development, the **direct (unpooled)** string is the simplest choice and just works. The pooled string is aimed at serverless deployments (Neon's strings already include `?sslmode=require`; if you use the pooled string with Prisma and hit "prepared statement" errors, append `&pgbouncer=true`).
4. If the copied string shows a `<password>`-style placeholder, replace it with your database password (shown in the connect panel; resettable in the dashboard under Roles).
5. Set `DATABASE_URL` in `.env` to that string, and flip `provider = "sqlite"` → `provider = "postgresql"` in `prisma/schema.prisma` (same as Supabase steps 5–6).
6. Run `npm run db:setup`, restart `npm run dev`, and reload the shop.

---

## 5. Google sign-in (real)

These steps replace the demo sign-in with real Google accounts. It all happens at **https://console.cloud.google.com** — Google's control panel for developer projects.

1. Go to **https://console.cloud.google.com** and sign in with any Google account.
2. In the top bar, open the project dropdown → **New project** → name it (e.g. `midori-shop`) → **Create**. When it finishes, select that project in the same dropdown.
3. Configure the **OAuth consent screen** (this is what users see when Google asks "Sign in to Midori?"): in the left menu go to **APIs & Services** → **OAuth consent screen** (newer consoles label this area **Google Auth Platform**). Choose **External** as the user type → **Create**. Fill in the app name (`Midori`), a support email (yours), and a developer contact email (yours). Save through the remaining screens (Scopes, Test users, Summary) accepting the defaults.
4. Now go to **APIs & Services** → **Credentials** → click **+ Create credentials** → **OAuth client ID**.
5. For **Application type** choose **Web application**, and give it a name (e.g. `midori web`).
6. Under **Authorized JavaScript origins**, click **Add URI** and enter:

   ```
   http://localhost:3000
   ```

7. Under **Authorized redirect URIs**, click **Add URI** and enter *exactly*:

   ```
   http://localhost:3000/api/auth/callback/google
   ```

   (This is the address Google sends the user back to after they agree — NextAuth listens there. Spelling it wrong is the #1 cause of "redirect_uri_mismatch" errors later.)
8. Finish this same form: click **Create** at the bottom of the OAuth client form (don't navigate away before this). A dialog appears showing the **Client ID** (ends in `.apps.googleusercontent.com`) and the **Client secret**. Copy both now.
9. **Add yourself as a test user** — this happens on a different page, after the client is created. While the consent screen is in "Testing" mode, only accounts you list can sign in. Go to **APIs & Services → OAuth consent screen → Test users** (or **Audience → Test users** in newer consoles), click **+ Add users**, and add the Gmail address you'll test with.
10. Paste them into `.env` (keep the quotes), then restart `npm run dev`:

    ```
    GOOGLE_CLIENT_ID="1234567890-abcdef.apps.googleusercontent.com"
    GOOGLE_CLIENT_SECRET="GOCSPX-..."
    ```

11. Verify: reload the shop and click **Sign in** — you should now get a real Google account picker instead of the "Demo sign-in" form. (You can also open http://localhost:3000/api/auth/providers in a new tab; it should list `"google"`.)

**When you deploy for real**, come back to this same credential and add your production domain as an authorized origin (`https://your-domain.com`) and redirect URI (`https://your-domain.com/api/auth/callback/google`), set `NEXTAUTH_URL` in `.env` to your domain, and click **Publish app** on the consent screen so any Google account can sign in (not just test users).

---

## 6. Mailgun (real confirmation emails)

Mailgun is an email-sending service. These steps replace the `[mailgun:demo]` terminal logging with real emails.

1. Go to **https://app.mailgun.com** and create an account with an email you actually control — for the real shop that's **takumistudio26@gmail.com**; if you're just testing this project, your own email address works just as well. Confirm the verification email Mailgun sends to that inbox. (Mailgun may ask for a payment method even on the free trial — that's their onboarding, not a charge.)
2. Find your **sandbox domain**. In the left sidebar go to **Sending → Domains**: Mailgun automatically creates one test domain per account, named like `sandbox<random-id>.mailgun.org`. **A sandbox domain can only deliver to Authorized Recipients** — specific email addresses you add and who click a confirmation link Mailgun emails them; mail to anyone else is rejected.
3. Add the inbox you'll test with: on the sandbox domain's page, open **Authorized Recipients** → **Invite New Recipient**, enter an email you actually check (e.g. your personal Gmail), and click the confirmation link that inbox receives from Mailgun.
4. Copy the **API key**: go to **Settings → API Keys**, and under **Private API keys** reveal (or create) one and copy it. Treat it like a password.
5. Fill in `.env` (keep the quotes) and restart `npm run dev`:

   ```
   MAILGUN_API_KEY="<your private key>"
   MAILGUN_DOMAIN="sandbox<your-id>.mailgun.org"
   MAILGUN_FROM_EMAIL="takumistudio26@gmail.com"
   ```

   If Mailgun refuses to send because the From address isn't on the sandbox domain, set `MAILGUN_FROM_EMAIL` to `postmaster@<your-sandbox-domain>` instead. (Accounts on Mailgun's EU region may also need one extra, optional line — `MAILGUN_URL="https://api.eu.mailgun.net"` — which the app's email code understands even though it isn't listed in `.env.example`.)
6. Place a test order: add a product to the cart, go to **/checkout**, fill the form using the authorized recipient's email, and click **Place order — GHS …**.
7. Check that inbox (and its spam folder) for the Midori order-confirmation email, subject line referencing your order number `MDR-…`.

Two useful facts: email failures can never break an order — the send is wrapped so any error is logged and swallowed (the order is already saved). And once both `MAILGUN_API_KEY` and `MAILGUN_DOMAIN` are real, the `[mailgun:demo]` logging stops automatically — nothing else to turn off.

---

## 7. The smoke test

```
npm run build
node scripts/smoke.mjs
```

`npm run build` compiles the production bundle (expect a minute or two). `node scripts/smoke.mjs` then **starts that production server by itself** on port **3100** (you don't run anything else, but port 3100 must be free), waits for it to come up, runs seven checks against the real app and database, and prints a JSON summary like `{ "passed": true, "checks": [...] }` as its last output. The process exits with code 0 **only if all checks pass**.

The seven checks, and what each proves:

1. `GET / returns 200 and contains "Midori"` — the homepage renders.
2. `GET /api/products returns 200 with 20 items` — the catalogue API serves all 20 products.
3. `POST /api/seed returns 200` — reseeding works.
4. `POST /api/checkout (valid) returns 200 with orderNumber matching /^MDR-/` — the golden path: a valid order goes through.
5. `Order row exists with >=1 item and totals match the response (recomputed from DB price)` — the order was really written to the database, and subtotal/delivery/total were recomputed server-side from database prices, not copied from the browser.
6. `POST /api/checkout with malformed email returns 400` — bad input is rejected.
7. `server stdout captured [mailgun:demo] after the order` — the confirmation-email path ran. (If you've configured real Mailgun keys, this check auto-passes as "skipped" — the demo marker is gone by design.)

**What a failure means:**

- *"production server exited early"* or *"did not return 200 … within 90s"* → you skipped `npm run build`, or something else occupies port 3100. To find and stop it: in **cmd or PowerShell** run `netstat -ano | findstr :3100` (in Git Bash use `netstat -ano | grep 3100`) — the last column of a matching line is the process ID (PID) — then run `taskkill /PID <that-number> /F` and re-run the smoke test. Use cmd or PowerShell for the `taskkill` step: Git Bash mangles its `/PID` flag. On macOS/Linux: `lsof -i :3100` then `kill <PID>`. The smoke test always needs 3100 free.
- Check 2 fails → the database is empty → run `npm run db:setup` and retry.
- Checks 4/5 fail → a checkout or database-write problem; the smoke output prints the server's error tail to read.
- Check 7 says *"marker missing"* → your `MAILGUN_API_KEY`/`MAILGUN_DOMAIN` are set, so demo logging is off — expected, not a bug.
- A crash with no JSON at the end → read the error message; it names the failing step.

---

## 8. Where things live

Products live in **`docs/catalogue.json`** — the single source of the 20-item catalogue; edit a price, name, or photo there, then run `npm run db:seed` to refresh the database (it upserts by product id, so re-running never duplicates rows; `docs/PHOTO-GUIDE.md` explains how to shoot your own product photos and swap them in). The database schema (tables) is defined in **`prisma/schema.prisma`** with the seed loader in **`prisma/seed.ts`** and the SQLite file at **`prisma/dev.db`**. The web pages are **`src/app/page.tsx`** (the landing page + shop), **`src/app/checkout/page.tsx`**, **`src/app/profile/page.tsx`** (your orders), and **`src/app/settings/page.tsx`** (device-local checkout preferences), backed by five API routes under **`src/app/api/`** (`products`, `seed`, `checkout`, `orders`, `auth`). Every visible component lives in **`src/components/midori/`** (nav with the account menu, hero/sections, shop grid, drawers, search overlay, quick-view, chat, sign-in dialog — all assembled by `midori-shop.tsx`), and shared logic sits in **`src/lib/`** (`store.ts` for the cart/wishlist state, `settings.ts` for device preferences, `products.ts` for types/prices/delivery math, `db.ts` for the database client, `auth.ts`/`auth-client.ts` for sign-in, `mailgun.ts`/`email-template.ts` for emails). The end-to-end gate is `scripts/smoke.mjs`, and `npm run start` serves the last production build.

---

## 9. Troubleshooting

**"Port 3000 is already in use."** Something else (often an older `npm run dev`) is listening on port 3000. The dev server will tell you and may offer port 3001 — you can just open the URL it prints, or stop the other process and retry, or explicitly choose a port with `npm run dev -- -p 3001`. If you change the port, update `NEXTAUTH_URL` in `.env` to match, or sign-in redirects will break.

**Prisma engine download hiccups.** Prisma downloads a small database-engine binary during `npm install`; on flaky or corporate-proxied networks you may see errors mentioning "engines" or failed downloads (often from `binaries.prisma.sh`). Fix: get on a stable connection and re-run `npm install`, then `npx prisma generate`. If you're behind a proxy, set the `HTTPS_PROXY` environment variable first. Once install succeeds, `npm run db:setup` works offline.

**Google Fonts offline.** The app loads its typefaces (Fraunces, Inter, Noto Serif JP) via `next/font/google` (see `src/app/layout.tsx`), which downloads the font files from Google when the dev server or build starts. With no internet you'll see warnings like *"Failed to download … from Google Fonts"* in the terminal, and the page renders with fallback system fonts — nothing breaks. Reconnect and restart the dev server (or re-run `npm run build`) and the real fonts come back; they're cached after the first successful download.

**npm peer-dependency conflicts (ERESOLVE).** If `npm install` stops with an `ERESOLVE` error listing peer dependencies, re-run it as:

```
npm install --legacy-peer-deps
```

This tells npm to use its older, more permissive dependency-resolution rules — harmless here, and often needed when a project mixes packages that expect different major versions of React or Node.

---

## Appendix: what was verified, and when

This README was written on 2026-10-03 against this exact workspace. Actually executed during that pass, all on Windows 11 / Node 24 / npm 11:

- `npm install` → exit 0.
- `npm run db:setup` → exit 0, output ends `Seeded 20 products.`
- `npm run build` → exit 0 (Next.js 16, Turbopack).
- `node scripts/smoke.mjs` → exit 0, `"passed": true`, all 7 checks PASS.
- Revised the same day after a beginner-path review, with the replacements executed in this workspace: the Node requirement was corrected to 20.9+ (read from the installed `node_modules/next/package.json` — next 16.3.8 declares `"node": ">=20.9.0"`); the secret generator `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"` ran with exit 0; `netstat -ano | findstr :3100` ran (no listener, exit 1); `taskkill /PID 999999 /F` was verified via cmd ("The process \"999999\" not found" — no real process touched) and confirmed broken under Git Bash's path mangling, which is why the README says to use cmd/PowerShell for that step.
- Cross-checked by reading the files: every command in this README matches a script in `package.json`; every variable in section 3 matches `.env.example` exactly (all 8 names, and the live `.env` carries the same 8 keys); the smoke-test check names are quoted from `scripts/smoke.mjs`; the demo-mode behaviors are quoted from `src/lib/auth.ts` and `src/lib/mailgun.ts`.
- The Supabase/Neon connection-string details were checked against Supabase's and Neon's official Prisma guides (pooled vs session/direct ports, `pgbouncer=true`, `sslmode=require`) as of this writing. Console button names for Google Cloud, Mailgun, Supabase, and Neon occasionally change — if a menu doesn't match, look for the nearest wording on that page.
- Not executed here (needs accounts with real services): the Google Cloud Console, Mailgun, Supabase, and Neon walkthroughs — they follow each provider's documented flow but were not clicked through live in this session.
