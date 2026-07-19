-- Enable Realtime for notices so badges + notice lists update without refresh.
-- Idempotent: safe if the table is already in the publication.
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.notices;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
