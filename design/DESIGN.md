# Neighborhood Association Portal: rough design

Status: decisions made 2026-11-23 (see "Decisions made" below); first version built. Open `design/mockups.html` in a browser to click through the screens (all data is sample data for a made-up "Willow Creek" neighborhood).

## Who uses it

| Persona | Can do |
|---|---|
| Board member | Everything a member can, plus: post announcements, email all members, pin posts, add/remove members, make someone board, hide posts |
| Member | Log in with own email, list items for sale or free, post events and questions, comment, RSVP, reply privately to sellers |

## Screens (in the mockup)

1. **Log in**: email + password, no sign-up button. Stays logged in until Log out.
2. **Password reset**: enter email, get one-time link (expires in 1 hour), choose new password.
3. **Home feed**: pinned board notice, then all posts newest first, filter by type.
4. **For sale & free**: grid of listings with price or Free, category filter, auto-archive after 30 days.
5. **Listing + replies**: photos, details; buyers reply privately to the seller; seller marks Pending / Sold.
6. **Event + RSVP**: date/place, Going / Maybe / Can't go with group size, public comments, add to calendar.
7. **Board announcement / email blast**: one composer that posts to the site, pins, and/or emails all members, with inbox preview and test send.
8. **Members (admin)**: grouped by house, invite-pending status, add member (sends invite), remove member.

## Recommended stack

- **Next.js** web app, responsive (phone first), installable to home screen.
- **Supabase**: auth (email + password, long-lived sessions via refresh token, built-in reset-password and invite emails), Postgres database, photo storage. Board/member permissions enforced with row-level security.
- **Vercel**: hosting, auto-deploys from this repo.
- **Resend or Postmark** (or Amazon SES) for sending email from the association's own domain.

### Data model sketch

- `houses` (address)
- `members` (name, email, house_id, role: member | board, status: invited | active | removed, email prefs)
- `posts` (type: listing | event | question | announcement, title, body, author, created_at, pinned_until, hidden)
- `listings` (post_id, price or free, category, status: available | pending | sold, archives_at)
- `events` (post_id, starts_at, ends_at, location)
- `rsvps` (event_id, member_id, status, group_size)
- `comments` (post_id, author, body, parent_id) — public
- `listing_replies` (listing_id, buyer_id, author, body) — visible only to seller and that buyer
- `photos` (post_id, storage path)
- `email_blasts` (post_id, sent_by, recipients, sent_at)

### Rough yearly cost

| Item | Per year |
|---|---|
| Domain | ~$12–20 |
| Vercel (hobby) | $0 |
| Supabase (free tier; Pro is $25/mo if outgrown) | $0 |
| Email sending (~350 addresses per blast; free tiers cap near 100/day) | ~$5 (SES) to ~$240 (Resend/Postmark) |
| **Total** | **~$20–260** |

Prices are estimates from public price lists; confirm before signing up.

## Decisions needed (recommendation first)

1. **Build or buy?** Rec: build this small custom portal. Alternatives: HOA software (HOA Express, PayHOA), private Facebook/Nextdoor group.
2. **Stack?** Rec: Next.js + Supabase + Vercel. Alternatives: single Django/Rails app on Render/Fly; Google Sites + Groups.
3. **Accounts per person or per household?** Rec: per person, grouped by house.
4. **How buyers respond to listings?** Rec: private replies to the seller. Alternatives: public comments; both.
5. **How people get accounts?** Rec: board adds them and they get an invite email (plus spreadsheet import at launch). Alternatives: self sign-up with approval; open sign-up.
6. **Automatic emails?** Rec: board blasts + replies to my posts + optional weekly digest. Alternatives: every post; board blasts only.
7. **Email service?** Rec: Resend or Postmark (~$15–20/mo). Alternatives: Amazon SES (cheapest, more setup); Gmail (spam/limits).
8. **Neighbor directory?** Rec: not in v1. Alternative: opt-in directory.
9. **Moderation?** Rec: board can hide any post, members can report. Alternative: board pre-approves every post.
10. **Listing lifetime?** Rec: auto-archive after 30 days, renewable.
11. **Domain?** Rec: buy a short .org (or use one the association already owns).

## Decisions made (2026-11-23)

| # | Decision | Choice |
|---|---|---|
| 1 | Build or buy | Build a small custom portal |
| 2 | Stack | Next.js + Supabase + Vercel |
| 3 | Accounts | Per person, grouped by house |
| 4 | Listing responses | Both: public questions plus private messages to the seller |
| 5 | Getting accounts | People ask to join and the board approves; the board can also add members directly |
| 6 | Automatic emails | Board announcements by default; each member picks their own notifications in Settings |
| 7 | Email service | Resend/Postmark, but not wired up yet (local test inbox for now) |
| 8 | Directory | Opt-in directory: name and street, phone optional |
| 9 | Moderation | Board can hide any post or comment; members can report |
| 10 | Listing lifetime | Auto-archive after 30 days, seller can renew |
| 11 | Domain | Association already owns one; set up later |
