
-- Roles enum + table for admin gating
create type public.app_role as enum ('admin', 'user');

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role app_role not null default 'user',
  created_at timestamptz not null default now(),
  unique(user_id, role)
);
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create policy "users view own roles" on public.user_roles for select using (auth.uid() = user_id);
create policy "admins manage roles" on public.user_roles for all using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

-- updated_at trigger
create or replace function public.tg_set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

-- races
create table public.races (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  location text,
  election_date date,
  office_description text,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.races enable row level security;
create trigger races_updated before update on public.races for each row execute function public.tg_set_updated_at();

-- candidates
create table public.candidates (
  id uuid primary key default gen_random_uuid(),
  race_id uuid not null references public.races(id) on delete cascade,
  name text not null,
  party_or_affiliation text,
  website_url text,
  bio text,
  photo_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.candidates enable row level security;
create trigger candidates_updated before update on public.candidates for each row execute function public.tg_set_updated_at();

-- issues
create table public.issues (
  id uuid primary key default gen_random_uuid(),
  race_id uuid not null references public.races(id) on delete cascade,
  name text not null,
  description text,
  display_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.issues enable row level security;
create trigger issues_updated before update on public.issues for each row execute function public.tg_set_updated_at();

-- sources
create table public.sources (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references public.candidates(id) on delete cascade,
  title text not null,
  url text,
  source_type text,
  publication_date date,
  excerpt text,
  raw_text text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.sources enable row level security;
create trigger sources_updated before update on public.sources for each row execute function public.tg_set_updated_at();

-- position_claims
create table public.position_claims (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references public.candidates(id) on delete cascade,
  issue_id uuid not null references public.issues(id) on delete cascade,
  source_id uuid references public.sources(id) on delete set null,
  summary text not null,
  evidence_quote text,
  confidence text not null default 'Medium',
  status text not null default 'Draft',
  last_reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.position_claims enable row level security;
create trigger position_claims_updated before update on public.position_claims for each row execute function public.tg_set_updated_at();

-- audit_log
create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null,
  entity_id uuid,
  action text not null,
  old_value jsonb,
  new_value jsonb,
  created_at timestamptz not null default now()
);
alter table public.audit_log enable row level security;

-- Public read policies (nonpartisan voter info)
create policy "public read races" on public.races for select using (true);
create policy "public read candidates" on public.candidates for select using (true);
create policy "public read issues" on public.issues for select using (true);
create policy "public read sources" on public.sources for select using (true);
create policy "public read approved claims" on public.position_claims for select using (status = 'Approved' or public.has_role(auth.uid(),'admin'));

-- Admin write policies
create policy "admins manage races" on public.races for all using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
create policy "admins manage candidates" on public.candidates for all using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
create policy "admins manage issues" on public.issues for all using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
create policy "admins manage sources" on public.sources for all using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
create policy "admins manage claims" on public.position_claims for all using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
create policy "admins view audit" on public.audit_log for select using (public.has_role(auth.uid(),'admin'));

-- Helpful indexes
create index on public.candidates(race_id);
create index on public.issues(race_id);
create index on public.sources(candidate_id);
create index on public.position_claims(candidate_id);
create index on public.position_claims(issue_id);
create index on public.position_claims(status);
