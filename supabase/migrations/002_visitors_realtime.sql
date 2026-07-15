-- Enable Realtime for visitor tables so gate + resident screens stay in sync
alter publication supabase_realtime add table public.visitors;
alter publication supabase_realtime add table public.visitor_logs;
