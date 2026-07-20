-- Payers can read their own payment rows (needed for Realtime confirmation waits).
-- Enable Realtime so PaymentSheet can watch status flip to confirmed/expired.

alter table public.payments enable row level security;

drop policy if exists "Payers can read own payments" on public.payments;
create policy "Payers can read own payments"
  on public.payments for select
  using (payer_id = auth.uid());

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.payments;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
