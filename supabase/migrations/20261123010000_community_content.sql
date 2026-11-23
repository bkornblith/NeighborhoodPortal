-- Content brought over from the old amherstwoods.com site: board titles, info pages,
-- documents, recommended services and wildlife sightings.

-- ---------- Board titles ----------
alter table public.profiles add column board_title text;

-- ---------- Sightings become a post type ----------
alter table public.posts drop constraint posts_type_check;
alter table public.posts add constraint posts_type_check
  check (type in ('listing', 'event', 'question', 'announcement', 'sighting'));

-- ---------- Neighborhood info pages (board-editable) ----------
create table public.info_pages (
  slug text primary key,
  title text not null,
  summary text not null default '',
  body text not null default '',
  position int not null default 0,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles (id) on delete set null
);
alter table public.info_pages enable row level security;
create policy "members read info" on public.info_pages for select using (public.is_member());
create policy "board edits info" on public.info_pages for all using (public.is_board()) with check (public.is_board());

insert into public.info_pages (slug, title, summary, position, body) values
('about', 'About Amherst Woods', 'The neighborhood, its boundaries and the Good Neighbor policy.', 1,
$$Amherst Woods is a neighborhood of 191 homes in South Amherst, Massachusetts, built in the early 1980s. It's surrounded by conservation land, with the Robert Frost Trail running through it and easy access to the Norwottuck Rail Trail.

## Boundaries
The neighborhood has three entrances and nine streets: Alyssum Drive, Foxglove Lane, Indian Pipe Lane, Ladyslipper Circle, Larkspur Drive, Teaberry Lane, Trillium Way, Wildflower Drive and Woodlot Road. It's sometimes confused with East Woods and Amherst Hills, which are separate neighborhoods.

## The association
The Amherst Woods Homeowners Association (AWHA) looks after the neighborhood's common land, keeps neighbors informed and holds an annual meeting each October or November, usually at Munson Memorial Library. The board is elected at the annual meeting. By-laws and past minutes are in Documents.

## Good Neighbor policy
The original Master Deed Restrictions expired in 2011, and a 2016–2017 committee found that reinstating them wasn't feasible. Instead, the association asks everyone to follow a simple Good Neighbor policy: be considerate of the people around you and of the shared land we all enjoy.$$),

('dues', 'Annual dues', 'How much, when they''re due, what they pay for and how to pay.', 2,
$$Dues are **$160 per household per year**, due by **December 1**. The association's fiscal year runs October 1 to September 30.

## What dues pay for
- Spring and fall cleanup and mowing of the three common parcels
- Insurance and taxes on the common property
- Landscaping of the cul-de-sac islands
- Hosting for the neighborhood website

Everything else (the email list, the directory, welcome letters, committees, the annual meeting and this portal) is run by volunteers.

## How to pay
- **Online:** use the PayPal button on the dues page at https://www.amherstwoods.com/annual-meetings. You don't need a PayPal account.
- **By check:** make it payable to "Amherst Woods Homeowners Association" and mail it to P.O. Box 118, Amherst, MA 01004-2607.

Questions about dues go to the Treasurer (see Your board on the About page).$$),

('common-property', 'Common property', 'The land the association owns and looks after.', 3,
$$The association owns three wooded parcels in the neighborhood. One of them runs along the Robert Frost Trail. Dues pay for spring and fall cleanup and mowing, plus insurance and taxes on this land.

## Cul-de-sac islands
The islands in the cul-de-sacs belong to the Town, but the association looks after their landscaping. A volunteer Landscape Committee plans the plantings and uses native plants where it can. The stone bench on the Wildflower/Trillium circle was added in 2023.

## Want to help?
The Landscape Committee and the watering volunteers are always glad of more hands. Post a question here or contact a board member.$$),

('trails-and-pets', 'Trails, pets and wildlife', 'Hiking, the dog park, picking up after dogs, and living with bears.', 4,
$$## Trails
The Robert Frost Trail is a 47-mile hiking trail from the Connecticut River in South Hadley to Wendell State Forest, and it passes right through Amherst Woods. It connects to the Norwottuck Rail Trail and to nearby Kestrel Land Trust and Amherst College trails.

The Old (South) Landfill nearby is permanently protected habitat for the Grasshopper Sparrow. Neighbors use it for dog walking and winter sledding.

## Dogs
- The Amherst Dog Park is just outside the neighborhood entrance on Old Belchertown Road.
- Please pick up after your dog and take the bag with you. Leaving dog waste on the Norwottuck Rail Trail is illegal and can be fined.
- Lost or found a pet? Contact the Town Animal Control Officer and post it here under Questions with a photo.

## Bears and other wildlife
Black bears, bobcats, coyotes, foxes, fishers and the occasional moose all pass through. Bears come back to food they've found before, so:
- Bring bird feeders in overnight.
- Put trash out the morning of pickup, not the night before.

Seen something interesting? Share it under Sightings.$$),

('town-links', 'Town and community links', 'Who to contact at the Town, and community services.', 5,
$$## Town of Amherst
- Town website: https://www.amherstma.gov
- Amherst Woods is in Town Council District 5. Current councilors and their emails are on the Town website.
- Report potholes and other road problems through SeeClickFix: https://seeclickfix.com

## Community
- **Orange Bag Food Project:** neighbors collect food for the Amherst Survival Center. Bags are picked up on alternate Saturdays; watch Events for the next pickup.$$);

-- ---------- Documents library ----------
create table public.documents (
  id bigint generated always as identity primary key,
  title text not null,
  category text not null check (category in ('By-laws and rules', 'Annual meeting minutes', 'Board meeting minutes', 'Financial', 'Neighborhood history', 'Other')),
  doc_date date,
  path text not null,
  file_name text not null,
  size_bytes int,
  uploaded_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);
alter table public.documents enable row level security;
create policy "members read documents" on public.documents for select using (public.is_member());
create policy "board manages documents" on public.documents for all using (public.is_board()) with check (public.is_board());

insert into storage.buckets (id, name, public) values ('documents', 'documents', false)
  on conflict (id) do nothing;
create policy "members read document files" on storage.objects for select
  using (bucket_id = 'documents' and public.is_member());
create policy "board uploads document files" on storage.objects for insert
  with check (bucket_id = 'documents' and public.is_board());
create policy "board deletes document files" on storage.objects for delete
  using (bucket_id = 'documents' and public.is_board());

-- ---------- Recommended services ----------
create table public.recommendations (
  id bigint generated always as identity primary key,
  name text not null check (char_length(name) between 1 and 120),
  category text not null,
  contact text,          -- phone, email or website, as the neighbor typed it
  note text,
  added_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);
create table public.recommendation_votes (
  recommendation_id bigint not null references public.recommendations (id) on delete cascade,
  member_id uuid not null references public.profiles (id) on delete cascade,
  comment text,
  created_at timestamptz not null default now(),
  primary key (recommendation_id, member_id)
);
alter table public.recommendations enable row level security;
alter table public.recommendation_votes enable row level security;
create policy "members read recs" on public.recommendations for select using (public.is_member());
create policy "members add recs" on public.recommendations for insert with check (public.is_member() and added_by = auth.uid());
create policy "owner or board edits recs" on public.recommendations for update using (added_by = auth.uid() or public.is_board());
create policy "owner or board deletes recs" on public.recommendations for delete using (added_by = auth.uid() or public.is_board());
create policy "members read rec votes" on public.recommendation_votes for select using (public.is_member());
create policy "members vouch" on public.recommendation_votes for all
  using (member_id = auth.uid()) with check (member_id = auth.uid() and public.is_member());
