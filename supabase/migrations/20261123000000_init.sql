-- Amherst Woods Neighborhood Association portal: initial schema

-- ---------- Houses ----------
create table public.houses (
  id bigint generated always as identity primary key,
  street_number text not null,
  street text not null,
  unique (street_number, street)
);

-- ---------- Member profiles (1:1 with auth.users) ----------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text not null default '',
  house_id bigint references public.houses (id) on delete set null,
  role text not null default 'member' check (role in ('member', 'board')),
  status text not null default 'active' check (status in ('active', 'removed')),
  phone text,
  -- Directory (decision 8: opt-in)
  in_directory boolean not null default false,
  show_phone boolean not null default false,
  -- Notification settings (decision 6: board blasts by default, the rest opt-in)
  notify_board boolean not null default true,
  notify_replies boolean not null default true,     -- private messages on my listings
  notify_comments boolean not null default false,   -- public comments on my posts
  notify_new_listings boolean not null default false,
  notify_new_events boolean not null default false,
  created_at timestamptz not null default now()
);

-- Create a profile whenever an auth user is created (invites, approvals, seed)
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, house_id, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    nullif(new.raw_user_meta_data ->> 'house_id', '')::bigint,
    coalesce(new.raw_user_meta_data ->> 'role', 'member')
  );
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Helper checks used by row level security
create function public.is_member() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and status = 'active')
$$;

create function public.is_board() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and status = 'active' and role = 'board')
$$;

-- Members may edit their own profile but not their role/status/email
create function public.protect_profile_fields() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and not public.is_board() then
    new.role := old.role;
    new.status := old.status;
    new.email := old.email;
    new.house_id := old.house_id;
  end if;
  return new;
end $$;

create trigger profiles_protect before update on public.profiles
  for each row execute function public.protect_profile_fields();

-- ---------- Join requests (decision 5: self sign-up, board approves) ----------
create table public.join_requests (
  id bigint generated always as identity primary key,
  full_name text not null,
  email text not null,
  address text not null,
  note text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'declined')),
  created_at timestamptz not null default now(),
  decided_by uuid references public.profiles (id),
  decided_at timestamptz
);

-- ---------- Posts: listings, events, questions, announcements ----------
create table public.posts (
  id bigint generated always as identity primary key,
  type text not null check (type in ('listing', 'event', 'question', 'announcement')),
  author_id uuid not null references public.profiles (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 140),
  body text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  hidden boolean not null default false,
  hidden_by uuid references public.profiles (id),
  -- announcements
  pinned_until timestamptz,
  emailed_at timestamptz,
  emailed_count int,
  -- listings
  price_cents int check (price_cents is null or price_cents >= 0),
  is_free boolean not null default false,
  category text,
  listing_status text check (listing_status in ('available', 'pending', 'sold')),
  expires_at timestamptz,
  -- events
  starts_at timestamptz,
  ends_at timestamptz,
  location text
);
create index posts_created_idx on public.posts (created_at desc);
create index posts_type_idx on public.posts (type, created_at desc);

create table public.post_photos (
  id bigint generated always as identity primary key,
  post_id bigint not null references public.posts (id) on delete cascade,
  path text not null,
  position int not null default 0
);

-- Public comments (events, questions, announcements, and public questions on listings)
create table public.comments (
  id bigint generated always as identity primary key,
  post_id bigint not null references public.posts (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade,
  parent_id bigint references public.comments (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 4000),
  hidden boolean not null default false,
  created_at timestamptz not null default now()
);
create index comments_post_idx on public.comments (post_id, created_at);

-- Private messages between a seller and one buyer (decision 4: public questions + private replies)
create table public.listing_messages (
  id bigint generated always as identity primary key,
  post_id bigint not null references public.posts (id) on delete cascade,
  buyer_id uuid not null references public.profiles (id) on delete cascade,
  sender_id uuid not null references public.profiles (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 4000),
  created_at timestamptz not null default now()
);
create index listing_messages_idx on public.listing_messages (post_id, buyer_id, created_at);

create table public.rsvps (
  post_id bigint not null references public.posts (id) on delete cascade,
  member_id uuid not null references public.profiles (id) on delete cascade,
  status text not null check (status in ('going', 'maybe', 'no')),
  group_size int not null default 1 check (group_size between 1 and 20),
  updated_at timestamptz not null default now(),
  primary key (post_id, member_id)
);

-- Reports (decision 9: members report, board hides)
create table public.reports (
  id bigint generated always as identity primary key,
  post_id bigint references public.posts (id) on delete cascade,
  comment_id bigint references public.comments (id) on delete cascade,
  reporter_id uuid not null references public.profiles (id) on delete cascade,
  reason text,
  resolved boolean not null default false,
  created_at timestamptz not null default now()
);

-- ---------- Row level security ----------
alter table public.houses enable row level security;
alter table public.profiles enable row level security;
alter table public.join_requests enable row level security;
alter table public.posts enable row level security;
alter table public.post_photos enable row level security;
alter table public.comments enable row level security;
alter table public.listing_messages enable row level security;
alter table public.rsvps enable row level security;
alter table public.reports enable row level security;

create policy "members read houses" on public.houses for select using (public.is_member());
create policy "board manages houses" on public.houses for all using (public.is_board()) with check (public.is_board());

create policy "members read profiles" on public.profiles for select using (public.is_member());
create policy "update own profile" on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());
create policy "board updates profiles" on public.profiles for update using (public.is_board()) with check (public.is_board());

-- join requests are inserted by the server (service role); board reads and decides
create policy "board reads join requests" on public.join_requests for select using (public.is_board());
create policy "board updates join requests" on public.join_requests for update using (public.is_board());

create policy "members read visible posts" on public.posts for select
  using (public.is_member() and (not hidden or author_id = auth.uid() or public.is_board()));
create policy "members create posts" on public.posts for insert
  with check (public.is_member() and author_id = auth.uid() and (type <> 'announcement' or public.is_board()));
create policy "authors update own posts" on public.posts for update
  using (author_id = auth.uid() and public.is_member()) with check (author_id = auth.uid());
create policy "board updates any post" on public.posts for update using (public.is_board()) with check (public.is_board());
create policy "authors or board delete posts" on public.posts for delete
  using (author_id = auth.uid() or public.is_board());

create policy "members read photos" on public.post_photos for select using (public.is_member());
create policy "authors add photos" on public.post_photos for insert
  with check (exists (select 1 from public.posts p where p.id = post_id and p.author_id = auth.uid()));
create policy "authors or board delete photos" on public.post_photos for delete
  using (public.is_board() or exists (select 1 from public.posts p where p.id = post_id and p.author_id = auth.uid()));

create policy "members read comments" on public.comments for select
  using (public.is_member() and (not hidden or author_id = auth.uid() or public.is_board()));
create policy "members comment" on public.comments for insert
  with check (public.is_member() and author_id = auth.uid());
create policy "authors or board delete comments" on public.comments for delete
  using (author_id = auth.uid() or public.is_board());
create policy "board hides comments" on public.comments for update using (public.is_board()) with check (public.is_board());

create policy "seller and buyer read messages" on public.listing_messages for select
  using (
    buyer_id = auth.uid()
    or exists (select 1 from public.posts p where p.id = post_id and p.author_id = auth.uid())
  );
create policy "buyer or seller send messages" on public.listing_messages for insert
  with check (
    public.is_member() and sender_id = auth.uid() and (
      (buyer_id = auth.uid() and not exists (select 1 from public.posts p where p.id = post_id and p.author_id = auth.uid()))
      or exists (select 1 from public.posts p where p.id = post_id and p.author_id = auth.uid() and p.type = 'listing')
    )
  );

create policy "members read rsvps" on public.rsvps for select using (public.is_member());
create policy "members manage own rsvp" on public.rsvps for all
  using (member_id = auth.uid()) with check (member_id = auth.uid() and public.is_member());

create policy "members report" on public.reports for insert with check (public.is_member() and reporter_id = auth.uid());
create policy "board reads reports" on public.reports for select using (public.is_board());
create policy "board resolves reports" on public.reports for update using (public.is_board());

-- ---------- Photo storage ----------
insert into storage.buckets (id, name, public) values ('photos', 'photos', true)
  on conflict (id) do nothing;

create policy "members upload photos" on storage.objects for insert
  with check (bucket_id = 'photos' and public.is_member() and (storage.foldername(name))[1] = auth.uid()::text);
create policy "owners delete photos" on storage.objects for delete
  using (bucket_id = 'photos' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_board()));
