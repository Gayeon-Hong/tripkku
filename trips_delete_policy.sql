-- Run ONCE in Supabase SQL Editor. Maintains RLS and only allows own trips.
DO $$
BEGIN
 IF NOT EXISTS (
   SELECT 1 FROM pg_policies
   WHERE schemaname='public' AND tablename='trips'
     AND policyname='trips_delete_owner'
 ) THEN
   CREATE POLICY trips_delete_owner ON public.trips
   FOR DELETE TO authenticated
   USING (owner_id = (SELECT auth.uid()));
 END IF;
END $$;
