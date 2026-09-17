# My Relationship Needs

**[myrelationshipneeds.com](https://myrelationshipneeds.com)**

Most people can say that something is missing in a relationship long before
they can say *what*. This is a short assessment that helps someone find the
words — and then, if they choose, compare notes with their partner.

It asks you to choose the ten relationship needs that matter most to you out
of 46, then puts those ten against each other two at a time. Picking between
two things you both want is a much easier question to answer honestly than
"rate how important closeness is to you," and it forces the trade-offs that
rating scales let people avoid.

## How it works

**1. Choose ten.** All 46 needs, grouped into nine Core Needs — Love &
Affection, Security & Trust, Autonomy & Boundaries, and so on. You pick the
ten that matter most. No quota per category; the whole ten can come from one
area if that's the truth.

**2. Rank them.** 36 forced choices between two of your ten. *If you could
have more of only one, which would you choose?*

**3. See what emerges.** Your needs, ordered by how consistently you leaned
toward them.

**4. Optionally, compare.** Invite a partner by email. They take the same
assessment without seeing your answers first, and afterwards you each see
what you both chose, and what only one of you did.

## What the results actually mean

The ranking comes from a [Bradley–Terry
model](https://en.wikipedia.org/wiki/Bradley%E2%80%93Terry_model) fitted over
the raw choices, with a Fisher information matrix giving a standard error per
need. It's a batch fit, not a running score, so the result doesn't depend on
the order the questions happened to arrive in.

Being honest about the limits matters more here than looking precise:

- **The top of the list is meaningful. The exact order is not.** Simulation
  over 300 trials per profile puts top-1 accuracy at roughly 73–91% when a
  real gap exists, and near chance when your top needs are genuinely close
  together.
- **That ceiling isn't a bug to be optimised away.** If your two strongest
  needs are close, you yourself will pick the "weaker" one a good fraction of
  the time — because there isn't a stable winner to find. More questions
  don't help; this was tested (see below).
- **Needs you didn't choose are not ranked low.** They simply weren't part of
  your ten, and the data model keeps that distinction — which is what makes
  the partner comparison honest rather than adversarial.
- **There is no compatibility score**, deliberately. Two people can need
  different things and both be right.

`scripts/simulate-selected.ts` reproduces all of the above:

```bash
npx tsx scripts/simulate-selected.ts
```

### Known limitation

With ten needs there are only 45 possible pairs, so even after allowing the
final stage to re-ask its most decisive pair, the two leaders meet a handful
of times at most. Raising the repeat cap, weakening the repeat penalty, and
extending to a full 45-comparison round-robin were each measured and none
moved accuracy. The remaining uncertainty is in how close the needs truly
are, not in how often they were compared.

Separately: the results screen currently presents a confident #1 while the
confidence evaluation reports a *clustered* top nearly every time. The maths
knows; the UI doesn't say so yet.

## Privacy

There are no accounts, passwords or logins. Finishing an assessment emails
you a private link containing a 256-bit random token; only a SHA-256 hash of
it is stored. Links last 30 days and can be reissued or revoked.

An invitation carries no part of the sender's results — the invited partner
sees nothing until they've finished their own assessment, is told before
starting what will be shared, and can decline. Their email comes from the
invitation rather than a form, so results always reach the address that was
actually invited.

## Running it locally

```bash
npm install
npm run dev
```

The assessment and results work with no configuration. Saving results and
sending email need environment variables — copy `.env.local.example` to
`.env.local` and fill in:

| Variable | Needed for | Notes |
| --- | --- | --- |
| `DATABASE_URL` | Saving results | Any Postgres; Neon works well on Vercel |
| `RESEND_API_KEY` | Sending email | [resend.com](https://resend.com) |
| `RESEND_FROM_EMAIL` | Sending email | Requires a verified domain — the shared test sender only delivers to your own Resend account |
| `APP_URL` | Links inside emails | Deliberately not derived from the request host |

Without them the app degrades rather than crashing: the assessment still
runs, and the persistence routes report that they aren't configured.

### Database

Run the migrations in `drizzle/` against your database in order, once each.
They're plain SQL and safe to re-run.

## Project layout

| Path | What's in it |
| --- | --- |
| `src/data/needs.ts` | The 46 needs and nine categories — one source of truth |
| `src/lib/bradleyTerry.ts` | Model fit, Fisher information, standard errors |
| `src/lib/adaptivePairing.ts` | Which two needs to show next |
| `src/lib/confidence.ts` | Whether a result is clearly separated or clustered |
| `src/lib/selection.ts` | Selection size and comparison budget |
| `src/lib/storage.ts` | Browser state for an in-progress assessment |
| `src/lib/server/` | Server-side persistence and token handling |
| `src/app/select/` | Choosing your ten |
| `src/app/assessment/` | The pairwise comparisons |
| `src/app/r/[token]/` | Saved results and the partner comparison |
| `scripts/` | Simulation harnesses |

Built with Next.js, React and Tailwind. Deployed on Vercel.
