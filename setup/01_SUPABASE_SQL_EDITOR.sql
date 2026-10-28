-- OITA FRIENDS (2026-10-28) - isolated from Tripkku's existing trips tables.
-- Run in Supabase Dashboard > SQL Editor as the project owner.
-- Only signed-in members can read shared itinerary / expenses.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.oita_rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invite_code text NOT NULL UNIQUE,
  data jsonb NOT NULL,
  revision integer NOT NULL DEFAULT 1,
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.oita_room_members (
  room_id uuid NOT NULL REFERENCES public.oita_rooms(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (room_id,user_id)
);
CREATE INDEX IF NOT EXISTS idx_oita_room_members_user ON public.oita_room_members(user_id);
CREATE INDEX IF NOT EXISTS idx_oita_rooms_updated ON public.oita_rooms(updated_at DESC);
ALTER TABLE public.oita_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.oita_room_members ENABLE ROW LEVEL SECURITY;

-- Read rooms only when user is a member. Members table is self-read only,
-- so this policy does not recurse through table RLS.
DROP POLICY IF EXISTS oita_room_select_member ON public.oita_rooms;
CREATE POLICY oita_room_select_member ON public.oita_rooms FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.oita_room_members m
  WHERE m.room_id=oita_rooms.id AND m.user_id=(SELECT auth.uid())));
DROP POLICY IF EXISTS oita_member_select_self ON public.oita_room_members;
CREATE POLICY oita_member_select_self ON public.oita_room_members FOR SELECT TO authenticated
USING (user_id=(SELECT auth.uid()));

-- No direct INSERT/UPDATE/DELETE policies: writes only through server-side RPCs.
REVOKE ALL ON TABLE public.oita_rooms FROM anon,authenticated;
REVOKE ALL ON TABLE public.oita_room_members FROM anon,authenticated;
GRANT SELECT ON TABLE public.oita_rooms,public.oita_room_members TO authenticated;

CREATE OR REPLACE FUNCTION public.oita_create_room(p_code text,p_initial jsonb)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp
AS $$
DECLARE v_uid uuid := auth.uid(); v_id uuid;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'LOGIN_REQUIRED'; END IF;
  IF p_code IS NULL OR p_code !~ '^[0-9a-f]{48}$' THEN RAISE EXCEPTION 'INVALID_INVITE_CODE'; END IF;
  IF p_initial IS NULL OR jsonb_typeof(p_initial) <> 'object' OR pg_column_size(p_initial)>150000 THEN
    RAISE EXCEPTION 'INVALID_INITIAL_DATA';
  END IF;
  INSERT INTO public.oita_rooms(owner_id,invite_code,data,updated_by)
  VALUES(v_uid,p_code,p_initial,v_uid) RETURNING id INTO v_id;
  INSERT INTO public.oita_room_members(room_id,user_id) VALUES(v_id,v_uid);
  RETURN v_id;
END $$;

CREATE OR REPLACE FUNCTION public.oita_join_room(p_code text)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp
AS $$
DECLARE v_uid uuid := auth.uid(); v_id uuid; v_member_count integer;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'LOGIN_REQUIRED'; END IF;
  IF p_code IS NULL THEN RAISE EXCEPTION 'INVALID_LINK'; END IF;
  -- Lock room to prevent two simultaneous users joining the final slot.
  SELECT id INTO v_id FROM public.oita_rooms WHERE invite_code=p_code FOR UPDATE;
  IF v_id IS NULL THEN RAISE EXCEPTION 'INVITE_NOT_FOUND'; END IF;
  IF EXISTS (SELECT 1 FROM public.oita_room_members WHERE room_id=v_id AND user_id=v_uid) THEN
    RETURN v_id;
  END IF;
  SELECT COUNT(*) INTO v_member_count FROM public.oita_room_members WHERE room_id=v_id;
  IF v_member_count >= 2 THEN RAISE EXCEPTION 'ROOM_FULL_TWO_PEOPLE'; END IF;
  INSERT INTO public.oita_room_members(room_id,user_id) VALUES(v_id,v_uid);
  RETURN v_id;
END $$;

CREATE OR REPLACE FUNCTION public.oita_save_room(p_id uuid,p_data jsonb,p_revision integer)
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp
AS $$
DECLARE v_uid uuid := auth.uid(); v_revision integer;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'LOGIN_REQUIRED'; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.oita_room_members
     WHERE room_id=p_id AND user_id=v_uid) THEN RAISE EXCEPTION 'NOT_A_ROOM_MEMBER'; END IF;
  IF p_data IS NULL OR jsonb_typeof(p_data)<>'object' OR pg_column_size(p_data)>150000 THEN
    RAISE EXCEPTION 'INVALID_DATA'; END IF;
  SELECT revision INTO v_revision FROM public.oita_rooms WHERE id=p_id FOR UPDATE;
  IF v_revision IS NULL THEN RAISE EXCEPTION 'ROOM_NOT_FOUND'; END IF;
  IF v_revision<>p_revision THEN RAISE EXCEPTION 'OITA_VERSION_CONFLICT'; END IF;
  UPDATE public.oita_rooms SET data=p_data,revision=revision+1,updated_at=now(),updated_by=v_uid WHERE id=p_id;
  RETURN v_revision+1;
END $$;

-- Block default PUBLIC execute rights: only authenticated end users can call.
REVOKE ALL ON FUNCTION public.oita_create_room(text,jsonb) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.oita_join_room(text) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.oita_save_room(uuid,jsonb,integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.oita_create_room(text,jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.oita_join_room(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.oita_save_room(uuid,jsonb,integer) TO authenticated;

-- Set up Postgres Changes realtime (safe to run again if table is already added).
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.oita_rooms;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
