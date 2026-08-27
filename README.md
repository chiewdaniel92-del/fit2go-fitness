# Fit2Go — Fitness Assessment Demo

A standalone demo of the Fit2Go health & performance assessment: a short guided
intake (typed + voice) that produces a personalized, KB-grounded report card.

Built with Vite, TypeScript, React, shadcn-ui, Tailwind CSS, and Supabase
(Postgres + pgvector + Edge Functions).

## Prerequisites

- Node.js & npm ([install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating))
- A Supabase project (this demo uses its own, separate from any other deployment)
- An OpenAI API key (embeddings + assessment generation)

## Local setup

```sh
npm i

# Point the app at your Supabase project
cp .env.example .env   # then fill in the three VITE_SUPABASE_* values

npm run dev
```

## Supabase setup

1. Set `project_id` in `supabase/config.toml` to your project ref.
2. Push the schema:

   ```sh
   supabase link --project-ref <your-project-ref>
   supabase db push
   ```

3. Ingest the knowledge base:

   ```sh
   cp .env.ingest.example .env.ingest   # SUPABASE_URL, service-role key, OpenAI key
   python scripts/ingest_kb.py --env-file .env.ingest      --source <your-kb-source.md>      --storage-path knowledge-base/<your-kb-source.md>      --version-label v1 --set-active
   ```

   Server-side secrets go in `.env.ingest`, never in `.env` — Vite bundles
   `.env` into the client.
4. Deploy the edge functions:

   ```sh
   supabase functions deploy generate-assessment
   supabase functions deploy transcribe-audio
   supabase functions deploy send-assessment-email
   ```

### Edge function secrets

| Name | Required | Notes |
| --- | --- | --- |
| `OPENAI_API_KEY` | yes | Embeddings, transcription, assessment generation |
| `DEMO_MODE` | yes, for the demo | Set to exactly `true` to skip Turnstile bot verification. See note below. |
| `ALLOWED_ORIGINS` | recommended | Comma-separated CORS allowlist for your demo host |
| `RESEND_API_KEY` | for email | Resend API key |
| `RESEND_FROM` | for email | e.g. `Fit2Go <noreply@yourdomain.com>` |
| `SITE_URL` | for email | Public base URL of the demo |
| `BOOKING_URL` | optional | Leave unset to keep booking CTAs inert (demo default) |

### A note on `DEMO_MODE`

The edge functions verify a Cloudflare Turnstile token before doing any work.
Turnstile needs a browser-side widget to mint that token and this build has
none, so the check can never pass — every request would return
`403 Verification failed`.

`DEMO_MODE=true` skips that check. It must be set to the exact string `true`;
any other value (unset, empty, `1`, `yes`, a typo) leaves the normal
fail-closed behaviour intact, so the check can never be disabled by accident.

**Do not set this in production.** With it on, the persistent rate limiting in
`supabase/migrations/20260329000000_persistent_rate_limiting.sql` is the only
abuse control left. To go to production properly, add a Turnstile widget to the
frontend, pass the token to `supabase.functions.invoke`, set
`TURNSTILE_SECRET_KEY`, and leave `DEMO_MODE` unset.

## Branding

Brand config lives in three places:

- `src/lib/brand.ts` — brand name and the `BOOKING_URL` switch that controls
  whether booking CTAs navigate anywhere. It is `null` for the demo, so every
  CTA renders but stays inert.
- `src/index.css` — design tokens (`--fit2go-*`, plus the shadcn token layer).
  Theme is midnight navy `#141c2e` with electric lime `#c3f53c`.
- `tailwind.config.ts` — the `fit2go` color group and font families
  (Space Grotesk / Inter / IBM Plex Mono).

Logo and social assets: `src/assets/fit2go-logo.svg`, `public/favicon.png`,
`public/og-image.png`.

## Build

```sh
npm run build     # production
npm run build:dev # development mode build
npm run lint
```
