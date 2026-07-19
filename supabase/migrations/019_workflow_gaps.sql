-- Component 1: Database Schema Migration for Workflow Gaps

-- 1. Visitors enhancements
ALTER TABLE public.visitors 
  ADD COLUMN IF NOT EXISTS expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS reject_reason text,
  ADD COLUMN IF NOT EXISTS responded_at timestamptz,
  ADD COLUMN IF NOT EXISTS is_missed boolean default false;

-- 2. Visitor Logs enhancements
ALTER TABLE public.visitor_logs 
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS is_flagged boolean default false;

-- 3. Complaints enhancements
ALTER TABLE public.complaints 
  ADD COLUMN IF NOT EXISTS priority text default 'medium' check (priority in ('low', 'medium', 'high', 'critical')),
  ADD COLUMN IF NOT EXISTS photo_urls text[];

-- 4. Complaint Comments Table
CREATE TABLE public.complaint_comments (
  id uuid primary key default gen_random_uuid(),
  complaint_id uuid not null references public.complaints (id) on delete cascade,
  author_id uuid references public.profiles (id) on delete set null,
  content text not null,
  created_at timestamptz not null default now()
);

-- RLS for complaint_comments
ALTER TABLE public.complaint_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Residents can view comments for own flat complaints"
  ON public.complaint_comments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.complaints c
      WHERE c.id = complaint_id AND c.flat_id = public.current_flat_id()
    )
  );

CREATE POLICY "Admins can view comments for society complaints"
  ON public.complaint_comments FOR SELECT
  USING (
    public.is_admin() AND
    EXISTS (
      SELECT 1 FROM public.complaints c
      WHERE c.id = complaint_id AND public.complaint_society_id(c.flat_id) = public.current_society_id()
    )
  );

CREATE POLICY "Residents can insert comments for own flat complaints"
  ON public.complaint_comments FOR INSERT
  WITH CHECK (
    author_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.complaints c
      WHERE c.id = complaint_id AND c.flat_id = public.current_flat_id()
    )
  );

CREATE POLICY "Admins can insert comments for society complaints"
  ON public.complaint_comments FOR INSERT
  WITH CHECK (
    author_id = auth.uid() AND
    public.is_admin() AND
    EXISTS (
      SELECT 1 FROM public.complaints c
      WHERE c.id = complaint_id AND public.complaint_society_id(c.flat_id) = public.current_society_id()
    )
  );

-- 5. Notices enhancements
ALTER TABLE public.notices 
  ADD COLUMN IF NOT EXISTS target_audience text default 'all',
  ADD COLUMN IF NOT EXISTS target_tower_id uuid references public.towers(id) on delete set null,
  ADD COLUMN IF NOT EXISTS is_pinned boolean default false,
  ADD COLUMN IF NOT EXISTS publish_at timestamptz,
  ADD COLUMN IF NOT EXISTS expires_at timestamptz;

-- 6. Staff Directory enhancements
ALTER TABLE public.staff_directory 
  ADD COLUMN IF NOT EXISTS staff_type text default 'staff' check (staff_type in ('staff', 'service_provider')),
  ADD COLUMN IF NOT EXISTS shift_start time,
  ADD COLUMN IF NOT EXISTS shift_end time,
  ADD COLUMN IF NOT EXISTS shift_days text[],
  ADD COLUMN IF NOT EXISTS is_on_duty boolean default false,
  ADD COLUMN IF NOT EXISTS company_name text,
  ADD COLUMN IF NOT EXISTS service_category text,
  ADD COLUMN IF NOT EXISTS rating numeric(2,1);

-- 7. Storage Bucket for complaint photos
INSERT INTO storage.buckets (id, name, public) 
VALUES ('complaint-photos', 'complaint-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for complaint-photos
CREATE POLICY "Public Access for complaint-photos" 
  ON storage.objects FOR SELECT 
  USING (bucket_id = 'complaint-photos');

CREATE POLICY "Residents can upload complaint-photos" 
  ON storage.objects FOR INSERT 
  WITH CHECK (
    bucket_id = 'complaint-photos' AND 
    auth.role() = 'authenticated'
  );

CREATE POLICY "Residents can update complaint-photos" 
  ON storage.objects FOR UPDATE 
  WITH CHECK (
    bucket_id = 'complaint-photos' AND 
    auth.role() = 'authenticated'
  );

CREATE POLICY "Admins can delete complaint-photos" 
  ON storage.objects FOR DELETE 
  USING (
    bucket_id = 'complaint-photos' AND 
    public.is_admin()
  );
