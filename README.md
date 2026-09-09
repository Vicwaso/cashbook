# Cashbook

Daily earnings tracker with a password-locked ledger UI, a Supabase database
so your data syncs across devices, and a GitHub Action that emails you a
monthly summary.

## 1. Set your password

Open `index.html`, find this line near the top of the `<script>`:

```js
const CASHBOOK_PASSWORD = 'changeme';
```

Change `'changeme'` to your real password.

## 2. Create the database (Supabase)

1. Go to https://supabase.com, sign up free, and create a new project.
2. Once it's ready, open **SQL Editor > New query**, paste in the contents
   of `sql/schema.sql`, and run it. This creates the `entries` table.
3. Go to **Project Settings > API**. Copy your **Project URL** and
   **anon public key**.
4. In `index.html`, fill these in:

```js
const SUPABASE_URL = 'https://YOUR-PROJECT.supabase.co';
const SUPABASE_ANON_KEY = 'YOUR-ANON-KEY';
```

## 3. Deploy to GitHub Pages

1. Create a new GitHub repo and push this whole folder to it.
2. In the repo, go to **Settings > Pages**, set source to your main branch
   (root folder), save. Your site will be live at
   `https://YOUR-USERNAME.github.io/YOUR-REPO/`.

## 4. Set up the monthly email (Resend)

1. Go to https://resend.com, sign up free, and grab an API key from the
   dashboard.
2. For quick testing you can send from `onboarding@resend.dev` (Resend's
   shared test address). For a real "from" address on your own domain,
   verify a domain in Resend first, then use an address on it.
3. In your GitHub repo, go to **Settings > Secrets and variables > Actions**
   and add these repository secrets:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `RESEND_API_KEY`
4. That's it — the workflow in `.github/workflows/monthly-summary.yml` runs
   automatically at 6am UTC on the 1st of each month and emails a summary
   to wasongav01@gmail.com. You can also trigger it manually any time from
   the **Actions** tab (select "Monthly earnings summary" → **Run workflow**)
   to test it before waiting for the real date.

## Privacy note — please read

The password screen only gates the browser UI. It is **not** real security:
- Your Supabase `anon` key lives in plain text inside `index.html`. If your
  GitHub repo is public, anyone who finds that key can read or write your
  `entries` table directly through Supabase's API, bypassing the password
  screen entirely.
- **Keep the GitHub repo private** if you want to avoid that. A private repo
  still deploys fine to GitHub Pages (Settings > Pages works the same way),
  though note GitHub may require a paid plan for private repo Pages
  depending on your account type — check your repo's Pages settings.
- If you want real per-user security later (so the key being public doesn't
  matter), the next step up is adding Supabase Auth (proper login) with a
  Row Level Security policy scoped to your user ID instead of open access —
  a bigger change than this version, happy to help with it if you want it.

## Local development

You can just open `index.html` directly in a browser to test — no build
step needed. It talks straight to Supabase over the internet.
