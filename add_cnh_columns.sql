ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS cnh_number TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS cnh_category TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS cnh_expiration_date TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS cnh_first_date TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS photo_url TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS doc_cnh_url TEXT;
