# Amherst Woods Neighborhood Portal

A small private website for the Amherst Woods Neighborhood Association (about 180 houses).

- **Members** sell or give away items, post events and questions, comment, RSVP, and message sellers privately.
- **Board members** also post announcements and email them to everyone, add and remove members, approve join requests, and hide posts that get reported.
- Everyone logs in with their own email and password and **stays logged in until they log out**. Forgotten passwords are reset by email.

Built with Next.js, Supabase (login, database, photo storage) and plain CSS. See [`design/DESIGN.md`](design/DESIGN.md) for the design, decisions and the original clickable mockups.

## Run it on your computer

You need **Node.js 20+** and **Docker Desktop** (running). Then, in this folder:

```bash
npm install
npm run setup     # starts the local database, writes .env.local, loads sample data
npm run dev       # http://localhost:3000
```

The first `npm run setup` downloads the Supabase Docker images and takes a few minutes.

Log in with any sample account. The password for all of them is `amherst123`.

| Email | Who |
|---|---|
| `maria@example.com` | Board member (sees Announcements and Members) |
| `tom@example.com` | Member selling the rocking chair (seller's view of private messages) |
| `raj@example.com` | Member (buyer's view) |

Everyone and everything in the sample data is made up.

**Email while running locally:** nothing is really sent. Invites, password resets, board blasts and notifications all land in a local test inbox at **http://127.0.0.1:54324**. Open it to click invite and reset links.

Other handy commands:

| Command | What it does |
|---|---|
| `npm run reset` | Wipe the local database and reload the sample data |
| `npm run db:stop` | Stop the local database containers |
| `npm run typecheck` | Check the TypeScript |
| Supabase Studio | http://127.0.0.1:54323, to browse the tables |

## What's where

| Path | What |
|---|---|
| `app/(auth)` | Log in, forgot password, ask to join, choose a password |
| `app/(app)` | The signed-in site: home feed, for sale, events, neighbors, settings, posts |
| `app/(app)/board` | Board-only: announcements and email blasts, members, join requests, reports, houses |
| `app/actions` | Server actions (everything that changes data or sends email) |
| `supabase/migrations` | Database tables and the row-level security rules for who can see and change what |
| `supabase/templates` | Invite and password-reset email wording |
| `lib/email.ts` | Outgoing email (local test inbox for now) |
| `scripts/seed.mjs` | Sample data |

## Not done yet

- **Production email provider** (decision 7: hold off). `lib/email.ts` sends over SMTP; pointing `SMTP_*` at Resend or Postmark is the remaining step, plus the same settings for Supabase's own invite/reset emails.
- **Hosting.** Plan is Vercel + a hosted Supabase project, on the domain the association already owns.
- **Spreadsheet import** of the initial member list.
- Photos are uploaded as-is (no resizing yet).
- Members can technically read each other's email addresses through the database API even though the site only shows the opt-in directory. Fine for a low-security site; worth tightening before launch.
