-- Realtime update events keep already-open CRM batch screens current.
-- Existing public.batches RLS controls which rows each user may subscribe to.
DO $sql$
BEGIN
 IF EXISTS(SELECT 1 FROM pg_publication WHERE pubname='supabase_realtime')
    AND NOT EXISTS(
      SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime'
       AND schemaname='public' AND tablename='batches'
    ) THEN
   ALTER PUBLICATION supabase_realtime ADD TABLE public.batches;
 END IF;
END;
$sql$;