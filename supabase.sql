-- Run once in your own Supabase project: SQL Editor > New Query > Run.
-- Keep SUPABASE_SERVICE_ROLE_KEY on the Node server only. Never put it in public/app.js.
CREATE TABLE IF NOT EXISTS public.bascule_rooms (
  code TEXT PRIMARY KEY,
  payload JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.bascule_rooms ENABLE ROW LEVEL SECURITY;
-- No anonymous or authenticated browser policies: only service-role backend may read/write.
CREATE INDEX IF NOT EXISTS bascule_rooms_updated ON public.bascule_rooms (updated_at);
