-- ══════════════════════════════════════════
-- B-Mak ServicePro — Supabase Schema
-- Coller ce SQL dans l'éditeur SQL de Supabase
-- ══════════════════════════════════════════

-- Clients
create table if not exists clients (
  id text primary key,
  nom text not null,
  adresse text,
  ville text,
  province text,
  tel text,
  contact text,
  email text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Machines
create table if not exists machines (
  id text primary key,
  cid text references clients(id) on delete cascade,
  type text not null,
  marque text not null,
  modele text,
  serial text,
  annee text,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Techniciens
create table if not exists techs (
  id text primary key,
  prenom text not null,
  nom text not null,
  titre text,
  cell text,
  email text,
  spec text,
  notes text,
  statut text default 'Actif',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Appels de service
create table if not exists appels (
  id text primary key,
  cid text references clients(id) on delete cascade,
  mid text references machines(id) on delete set null,
  titre text not null,
  date text not null,
  dates jsonb,
  heure text,
  tech text,
  notes text,
  prio text default 'Normale',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Rapports de service
create table if not exists rapports (
  id text primary key,
  cid text references clients(id) on delete cascade,
  mid text references machines(id) on delete set null,
  tech text,
  date text not null,
  rnum text,
  dur text,
  tstart text,
  tend text,
  taches jsonb,
  signer text,
  sig_img text,
  saved_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ── Row Level Security (lecture/écriture publique avec clé anon) ──
alter table clients  enable row level security;
alter table machines enable row level security;
alter table techs    enable row level security;
alter table appels   enable row level security;
alter table rapports enable row level security;

create policy "public_all" on clients  for all using (true) with check (true);
create policy "public_all" on machines for all using (true) with check (true);
create policy "public_all" on techs    for all using (true) with check (true);
create policy "public_all" on appels   for all using (true) with check (true);
create policy "public_all" on rapports for all using (true) with check (true);

-- Add rapport_id to appels (run if missing)
ALTER TABLE appels ADD COLUMN IF NOT EXISTS rapport_id text;
ALTER TABLE appels ADD COLUMN IF NOT EXISTS statut text DEFAULT 'Non-cédulé';

-- Add statut to rapports table
ALTER TABLE rapports ADD COLUMN IF NOT EXISTS statut text DEFAULT 'final';
