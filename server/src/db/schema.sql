-- ភូមិខ្ញុំ (Phum Khnhom) — Phase 7 Supabase PostgreSQL Schema
-- Paste into Supabase SQL Editor to create all persistent tables.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Core Player Account, Currencies, Life Stats, Appearance & 12-Skill RPG Profile
CREATE TABLE IF NOT EXISTS public.players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  coins INTEGER NOT NULL DEFAULT 2500,
  gold INTEGER NOT NULL DEFAULT 10,
  diamonds INTEGER NOT NULL DEFAULT 50,
  level INTEGER NOT NULL DEFAULT 1,
  xp INTEGER NOT NULL DEFAULT 0,
  life_stats JSONB NOT NULL DEFAULT '{}'::jsonb,
  appearance JSONB NOT NULL DEFAULT '{}'::jsonb,
  skills JSONB NOT NULL DEFAULT '{}'::jsonb,
  meta_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_players_username_lower ON public.players (LOWER(username));

-- 2. Player Inventory (Container Stacks + Equipped 8-Slot Loadout)
CREATE TABLE IF NOT EXISTS public.player_inventory (
  player_id UUID PRIMARY KEY REFERENCES public.players(id) ON DELETE CASCADE,
  inventory_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  equipped_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Personal Homestead Farm (Real-Timestamp Plots, Trees, Livestock & Artisan Machines)
CREATE TABLE IF NOT EXISTS public.player_farm (
  player_id UUID PRIMARY KEY REFERENCES public.players(id) ON DELETE CASCADE,
  plots_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  trees_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  livestock_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  machines_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Social Friendships (Pending Requests & Accepted Friends)
CREATE TABLE IF NOT EXISTS public.friendships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  addressee_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('pending', 'accepted')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT friendships_no_self CHECK (requester_id <> addressee_id),
  CONSTRAINT friendships_unique_pair UNIQUE (requester_id, addressee_id)
);

CREATE INDEX IF NOT EXISTS idx_friendships_requester ON public.friendships (requester_id);
CREATE INDEX IF NOT EXISTS idx_friendships_addressee ON public.friendships (addressee_id);

-- 5. Player-to-Player Village Market Listings (5% Coin Tax Sink)
CREATE TABLE IF NOT EXISTS public.market_listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id TEXT NOT NULL,
  seller_name TEXT NOT NULL,
  item_id TEXT NOT NULL,
  item_name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  quality TEXT NOT NULL DEFAULT 'normal',
  price_coins INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_market_listings_created ON public.market_listings (created_at DESC);
